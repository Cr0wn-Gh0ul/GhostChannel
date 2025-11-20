/**
 * Device Management Service
 * 
 * Manages cryptographic device identities for end-to-end encryption.
 * Each device has a unique ECDH P-256 keypair (generated client-side).
 * Server stores only public keys; private keys never leave the device.
 * 
 * Key Features:
 * - Device registration with public key storage
 * - First device auto-set as default for offline messaging
 * - Device revocation (soft delete)
 * - Public key retrieval for encryption
 * - Last-seen tracking for presence
 * 
 * @class DevicesService
 */

import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DevicesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Register a new device or update existing device name
   * 
   * Behavior:
   * - If device with publicKey exists and active: update name if different
   * - If device with publicKey exists but revoked: create new device
   * - If first device for user: automatically set as default device
   * 
   * @param userId - User ID who owns the device
   * @param publicKey - ECDH P-256 public key in base64 SPKI format
   * @param deviceName - Human-readable name (e.g., "My Laptop")
   * @returns Created or updated device record
   */
  async registerDevice(
    userId: string,
    publicKey: string,
    deviceName?: string,
  ) {
    // Check if this public key already exists for this user
    const existingDevice = await this.prisma.device.findFirst({
      where: {
        userId,
        publicKey,
        revokedAt: null,
      },
    });

    if (existingDevice) {
      // If device name is provided and different from existing, update it
      if (deviceName && deviceName !== existingDevice.deviceName) {
        console.log('Updating device name from', existingDevice.deviceName, 'to', deviceName);
        return this.prisma.device.update({
          where: { id: existingDevice.id },
          data: { deviceName },
        });
      }
      // Return existing device if no name update needed
      return existingDevice;
    }

    // Check if this is the user's first device
    const deviceCount = await this.prisma.device.count({
      where: { userId, revokedAt: null },
    });

    const newDevice = await this.prisma.device.create({
      data: {
        userId,
        publicKey,
        deviceName,
        lastSeenAt: new Date(),
      },
    });

    // If this is the first device, set it as default
    if (deviceCount === 0) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { defaultDeviceId: newDevice.id },
      });
    }

    return newDevice;
  }

  async findByUserId(userId: string) {
    return this.prisma.device.findMany({
      where: { userId, revokedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(deviceId: string) {
    return this.prisma.device.findUnique({ where: { id: deviceId } });
  }

  async updateLastSeen(deviceId: string): Promise<void> {
    await this.prisma.device.update({
      where: { id: deviceId },
      data: { lastSeenAt: new Date() },
    });
  }

  async revokeDevice(deviceId: string): Promise<void> {
    await this.prisma.device.update({
      where: { id: deviceId },
      data: { revokedAt: new Date() },
    });
  }

  async deleteDevice(deviceId: string, userId: string): Promise<void> {
    // Verify device belongs to user before deleting
    const device = await this.findById(deviceId);
    if (!device || device.userId !== userId) {
      throw new Error('Device not found or does not belong to user');
    }

    await this.prisma.device.delete({
      where: { id: deviceId },
    });
  }

  /**
   * Get all device public keys for a user (including revoked)
   * 
   * Returns ALL devices (even revoked) to allow decryption of old messages
   * that were encrypted for devices that are no longer active.
   * 
   * @param userId - User ID to fetch devices for
   * @returns Array of device IDs and their public keys
   */
  async getDevicePublicKeys(userId: string): Promise<{ id: string; publicKey: string }[]> {
    // Include ALL devices (even revoked) so users can decrypt old messages
    const devices = await this.prisma.device.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return devices.map((d) => ({ id: d.id, publicKey: d.publicKey }));
  }

  async findByPublicKey(userId: string, publicKey: string) {
    return this.prisma.device.findFirst({
      where: {
        userId,
        publicKey,
      },
    });
  }
}
