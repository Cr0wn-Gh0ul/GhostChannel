/**
 * Authentication Service
 * 
 * Handles user authentication, session management, and device registration.
 * Implements security features for end-to-end encrypted messaging.
 * 
 * Key Features:
 * - Password-based authentication with bcrypt hashing
 * - JWT token generation with httpOnly cookies
 * - Device-specific authentication for E2E encryption
 * - Session management with expiration
 * - First-device auto-default selection
 * 
 * @class AuthService
 */

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { DevicesService } from '../devices/devices.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private usersService: UsersService,
    private devicesService: DevicesService,
  ) {}

  /**
   * Validate user credentials
   * 
   * @param email - User's email address
   * @param password - Plain text password to verify
   * @returns User object if valid, null otherwise
   */
  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user && await bcrypt.compare(password, user.passwordHash)) {
      return user;
    }
    return null;
  }

  /**
   * Check if a device is new without performing full login
   * 
   * Used to determine if device naming flow is needed before login completes.
   * 
   * @param email - User's email address
   * @param password - User's password
   * @param devicePublicKey - ECDH P-256 public key for this device
   * @returns Object indicating if device is new
   * @throws UnauthorizedException if credentials are invalid
   */
  async checkDevice(email: string, password: string, devicePublicKey: string) {
    // Validate credentials first
    const user = await this.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if device exists
    const existingDevice = await this.devicesService.findByPublicKey(user.id, devicePublicKey);
    const isNewDevice = !existingDevice || existingDevice.revokedAt !== null;
    
    return { isNewDevice };
  }

  /**
   * Authenticate user and create session
   * 
   * Process:
   * 1. Register/update device with provided public key
   * 2. Set as default device if it's the user's first device
   * 3. Generate JWT token with user and device information
   * 4. Create session record with expiration
   * 
   * @param user - User object from validateUser
   * @param devicePublicKey - ECDH P-256 public key (base64)
   * @param deviceName - Human-readable device name
   * @returns Authentication result with token, user info, and device info
   */
  async login(user: any, devicePublicKey?: string, deviceName?: string) {
    // Register device if public key provided
    let device = null;
    let isNewDevice = false;
    if (devicePublicKey) {
      try {
        // Check if a device with this public key already exists
        const existingDevice = await this.devicesService.findByPublicKey(user.id, devicePublicKey);
        
        if (existingDevice) {
          // If the device was revoked, don't use it
          if (existingDevice.revokedAt) {
            // Old revoked device - user needs to generate new keys on client
            device = null;
          } else {
            // Active device with same key - reuse/update it
            // Always call registerDevice to handle potential name updates
            device = await this.devicesService.registerDevice(user.id, devicePublicKey, deviceName);
            await this.devicesService.updateLastSeen(device.id);
            // Mark as new device if the existing device name was "Temporary Device" 
            // This indicates it was created during the temp login check
            isNewDevice = existingDevice.deviceName === 'Temporary Device' && deviceName !== 'Temporary Device';
            console.log('[Auth] Existing device check - existing name:', existingDevice.deviceName, 'new name:', deviceName, 'isNewDevice:', isNewDevice);
          }
        } else {
          // New public key - register new device
          device = await this.devicesService.registerDevice(user.id, devicePublicKey, deviceName);
          isNewDevice = true;
        }

        // Update user's current device
        if (device) {
          await this.prisma.user.update({
            where: { id: user.id },
            data: { currentDeviceId: device.id },
          });
        }
      } catch (error) {
        console.error('Failed to register device:', error);
        // Continue with login even if device registration fails
        device = null;
      }
    }

    // Create JWT with deviceId
    const payload = { email: user.email, sub: user.id, deviceId: device?.id };
    const token = this.jwtService.sign(payload);

    // Create session
    await this.prisma.session.create({
      data: {
        userId: user.id,
        tokenHash: token.substring(0, 32), // Store partial hash for revocation
        deviceId: device?.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    return {
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        handle: user.handle,
        displayName: user.displayName,
        avatarColor: user.avatarColor,
      },
      device: device
        ? {
            id: device.id,
            deviceName: device.deviceName,
          }
        : null,
      isNewDevice,
      requiresNewKeys: !device && !!devicePublicKey, // Flag if old keys were rejected
    };
  }

  /**
   * Register a new user account
   * 
   * Creates user with:
   * - Bcrypt-hashed password (10 rounds)
   * - Random avatar color from preset palette
   * - Unique email and handle
   * 
   * @param email - User's email address (must be unique)
   * @param handle - User's handle/username (must be unique)
   * @param password - Plain text password (will be hashed)
   * @returns Created user object without password hash
   */
  async register(email: string, handle: string, password: string) {
    const user = await this.usersService.create(email, handle, password);
    const { passwordHash, ...result } = user;
    return {
      ...result,
      avatarColor: user.avatarColor,
    };
  }
}
