/**
 * Messages Service
 * 
 * Manages encrypted message storage and retrieval.
 * Server stores only ciphertext; cannot decrypt message contents.
 * 
 * Message Format:
 * - ciphertext: Base64-encoded AES-256-GCM encrypted content
 * - nonce: Base64-encoded 96-bit IV for GCM mode
 * - senderDeviceId: Device that encrypted the message
 * - conversationId: Target conversation
 * 
 * Security:
 * - Zero-knowledge: server never sees plaintext
 * - Perfect forward secrecy: each message uses same derived key
 * - Authentication: GCM provides authenticity via auth tag
 * 
 * @class MessagesService
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Store an encrypted message
   * 
   * @param conversationId - Target conversation ID
   * @param senderUserId - User who sent the message
   * @param senderDeviceId - Device that encrypted the message
   * @param ciphertext - Base64-encoded AES-256-GCM ciphertext
   * @param nonce - Base64-encoded 96-bit GCM nonce/IV
   * @param messageIndex - Optional sequence number for ordering
   * @returns Created message record
   */
  async createMessage(
    conversationId: string,
    senderUserId: string,
    senderDeviceId: string,
    ciphertext: string,
    nonce?: string,
    messageIndex?: number,
  ) {
    return this.prisma.message.create({
      data: {
        conversationId,
        senderUserId,
        senderDeviceId,
        ciphertext,
        nonce,
        messageIndex,
      },
    });
  }

  async findByConversationId(conversationId: string, limit = 50, offset = 0) {
    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: limit,
      skip: offset,
    });
  }

  async deleteByConversationId(conversationId: string): Promise<number> {
    const result = await this.prisma.message.deleteMany({
      where: { conversationId },
    });
    return result.count;
  }

  async markDelivered(messageId: string): Promise<void> {
    await this.prisma.message.update({
      where: { id: messageId },
      data: { deliveredAt: new Date() },
    });
  }

  /**
   * Mark a message as read
   * 
   * Updates readAt timestamp for read receipt functionality.
   * 
   * @param messageId - Message ID to mark as read
   * @returns Updated message record
   */
  async markRead(messageId: string) {
    return this.prisma.message.update({
      where: { id: messageId },
      data: { readAt: new Date() },
    });
  }

  async findById(messageId: string) {
    return this.prisma.message.findUnique({ where: { id: messageId } });
  }
}
