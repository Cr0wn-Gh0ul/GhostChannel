/**
 * Conversations Service
 * 
 * Manages conversation creation and participant management for encrypted messaging.
 * Supports both direct (1-to-1) and group conversations.
 * 
 * Device-to-Device Conversations:
 * - Each conversation is tied to specific device pairs
 * - Allows same users to have multiple conversations (one per device pair)
 * - Enables device-specific encryption keys
 * 
 * Security:
 * - Only friends can create direct conversations
 * - Prevents duplicate device-pair conversations
 * - Validates participant authorization
 * 
 * @class ConversationsService
 */

import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FriendsService } from '../friends/friends.service';

@Injectable()
export class ConversationsService {
  constructor(
    private prisma: PrismaService,
    private friendsService: FriendsService,
  ) {}

  /**
   * Create a new conversation
   * 
   * For direct messages:
   * - Validates that users are friends
   * - Checks for existing conversation with same device pair
   * - Creates device-specific conversation if devices specified
   * 
   * For groups:
   * - Allows multiple participants
   * - Optional group name
   * 
   * @param createdByUserId - User creating the conversation
   * @param participantUserIds - All participants (including creator)
   * @param isGroup - Whether this is a group conversation
   * @param groupName - Optional name for group conversations
   * @param createdByDeviceId - Creator's device ID for E2E encryption
   * @param targetDeviceId - Other user's device ID for E2E encryption
   * @returns Created or existing conversation
   * @throws BadRequestException if users are not friends (for DMs)
   */
  async createConversation(
    createdByUserId: string,
    participantUserIds: string[],
    isGroup = false,
    groupName?: string,
    createdByDeviceId?: string,
    targetDeviceId?: string, // The other user's current device
  ) {
    // For non-group conversations (direct messages), validate friendship and check for existing conversation
    if (!isGroup) {
      // Find the other user (not the creator)
      const otherUsers = participantUserIds.filter(id => id !== createdByUserId);
      
      if (otherUsers.length === 1) {
        const otherUserId = otherUsers[0];
        const areFriends = await this.friendsService.areFriends(createdByUserId, otherUserId);
        
        if (!areFriends) {
          throw new BadRequestException('Can only start conversations with friends');
        }
        
        // For device-to-device conversations, check if conversation already exists with SAME device pair
        // Only check for existing if both devices are specified
        if (createdByDeviceId && targetDeviceId) {
          const existingConversation = await this.prisma.conversation.findFirst({
            where: {
              isGroup: false,
              OR: [
                {
                  createdByDeviceId: createdByDeviceId,
                  targetDeviceId: targetDeviceId,
                },
                {
                  createdByDeviceId: targetDeviceId,
                  targetDeviceId: createdByDeviceId,
                },
              ],
              participants: {
                every: {
                  userId: {
                    in: participantUserIds
                  }
                }
              }
            },
            include: {
              participants: true,
            },
          });
          
          if (existingConversation && (existingConversation as any).participants?.length === participantUserIds.length) {
            console.log('[Conversations] Found existing device-specific conversation:', existingConversation.id, 'devices:', createdByDeviceId, targetDeviceId);
            return existingConversation;
          }
        }
        
        // If no device match, allow creating new conversation (device-to-device encryption)
      }
    }

    console.log('[Conversations] Creating new conversation - creator device:', createdByDeviceId, 'target device:', targetDeviceId);
    
    const conversationData: any = {
      createdByUserId,
      isGroup,
      groupName,
      participants: {
        create: participantUserIds.map((userId) => ({
          userId,
        })),
      },
    };
    
    if (createdByDeviceId) {
      conversationData.createdByDeviceId = createdByDeviceId;
    }
    
    if (targetDeviceId) {
      conversationData.targetDeviceId = targetDeviceId;
    }
    
    return this.prisma.conversation.create({
      data: conversationData,
    });
  }

  async findByUserId(userId: string) {
    return this.prisma.conversation.findMany({
      where: {
        participants: {
          some: {
            userId: userId,
          },
        },
      },
      include: {
        participants: {
          select: {
            userId: true,
            addedAt: true,
            user: {
              select: {
                id: true,
                handle: true,
                displayName: true,
                avatarUrl: true,
                avatarColor: true,
              },
            },
          },
        },
        // TODO: Add device relations after Prisma client restart
        // createdByDevice: {
        //   select: {
        //     id: true,
        //     deviceName: true,
        //   },
        // },
        // targetDevice: {
        //   select: {
        //     id: true,
        //     deviceName: true,
        //   },
        // },
      },
    });
  }

  async findById(conversationId: string): Promise<any | null> {
    return this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: {
          include: {
            user: true,
          },
        },
      },
    });
  }

  /**
   * Check if a user is a participant in a conversation
   * 
   * Used for authorization checks before allowing message sending/viewing.
   * 
   * @param conversationId - Conversation ID to check
   * @param userId - User ID to check
   * @returns True if user is a participant
   */
  async isParticipant(conversationId: string, userId: string): Promise<boolean> {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
    });
    return !!participant;
  }

  async getParticipantIds(conversationId: string): Promise<string[]> {
    const participants = await this.prisma.conversationParticipant.findMany({
      where: { conversationId },
    });
    return participants.map((p: any) => p.userId);
  }
}
