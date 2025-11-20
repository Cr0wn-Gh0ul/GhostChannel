/**
 * Users Service
 * 
 * Manages user accounts, profiles, and preferences.
 * 
 * Features:
 * - User registration with password hashing (bcrypt, 10 rounds)
 * - Profile management (display name, handle, avatar color)
 * - Password changes with current password verification
 * - Handle availability checking
 * - Default device management for offline messaging
 * 
 * Security:
 * - Passwords hashed with bcrypt
 * - Handle uniqueness enforced
 * - User data access control
 * 
 * @class UsersService
 */

import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  /** Preset avatar colors for visual user identification */
  private readonly PRESET_COLORS = [
    '#06b6d4', // cyan
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#f59e0b', // amber
    '#10b981', // emerald
    '#3b82f6', // blue
    '#f43f5e', // rose
    '#a855f7', // purple
    '#14b8a6', // teal
    '#6366f1', // indigo
  ];

  constructor(private prisma: PrismaService) {}

  /**
   * Create a new user account
   * 
   * Security:
   * - Password hashed with bcrypt (10 rounds)
   * - Random avatar color assigned from preset palette
   * 
   * @param email - User's email (must be unique)
   * @param handle - User's handle/username (must be unique)
   * @param password - Plain text password (will be hashed)
   * @returns Created user record
   * @throws ConflictException if email or handle already exists
   */
  async create(email: string, handle: string, password: string) {
    const passwordHash = await bcrypt.hash(password, 10);
    // Select a random color from the preset colors
    const randomColor = this.PRESET_COLORS[Math.floor(Math.random() * this.PRESET_COLORS.length)];
    
    return this.prisma.user.create({
      data: {
        email,
        handle,
        passwordHash,
        avatarColor: randomColor,
      },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findByHandle(handle: string) {
    return this.prisma.user.findUnique({ where: { handle } });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async validatePassword(user: any, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.passwordHash);
  }

  async searchByHandle(query: string) {
    return this.prisma.user.findMany({
      where: {
        handle: {
          contains: query,
          mode: 'insensitive',
        },
      },
      take: 20,
    });
  }

  async updateProfile(
    userId: string,
    updates: { displayName?: string; handle?: string; avatarUrl?: string; avatarColor?: string; bio?: string },
  ) {
    // Check if handle is being updated and if it's already taken
    if (updates.handle) {
      const existingUser = await this.findByHandle(updates.handle);
      if (existingUser && existingUser.id !== userId) {
        throw new ConflictException('Handle already taken');
      }
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: updates,
    });
  }

  /**
   * Change user's password
   * 
   * Requires verification of current password for security.
   * 
   * @param userId - User ID
   * @param currentPassword - Current password for verification
   * @param newPassword - New password to set (will be hashed)
   * @returns Updated user record
   * @throws UnauthorizedException if current password is incorrect
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isValid = await this.validatePassword(user, currentPassword);
    if (!isValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    return this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });
  }

  async checkHandleAvailability(handle: string, excludeUserId?: string): Promise<boolean> {
    const existingUser = await this.findByHandle(handle);
    if (!existingUser) return true;
    if (excludeUserId && existingUser.id === excludeUserId) return true;
    return false;
  }

  async updateCurrentDevice(userId: string, deviceId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { currentDeviceId: deviceId },
    });
  }

  /**
   * Set user's default device for offline messaging
   * 
   * When a user is offline, messages are encrypted for their default device.
   * This allows secure delivery even when the user isn't actively connected.
   * 
   * @param userId - User ID
   * @param deviceId - Device ID to set as default
   * @returns Updated user record
   */
  async setDefaultDevice(userId: string, deviceId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { defaultDeviceId: deviceId },
    });
  }

  async updateDeviceName(deviceId: string, userId: string, deviceName: string) {
    // First verify the device belongs to the user
    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
    });

    if (!device) {
      throw new Error('Device not found');
    }

    if (device.userId !== userId) {
      throw new Error('You do not have permission to update this device');
    }

    // Update the device name
    return this.prisma.device.update({
      where: { id: deviceId },
      data: { deviceName },
    });
  }

  async deleteUser(userId: string) {
    // Delete all related data in the correct order due to foreign key constraints
    // Prisma will handle cascading deletes based on the schema
    return this.prisma.user.delete({
      where: { id: userId },
    });
  }
}

