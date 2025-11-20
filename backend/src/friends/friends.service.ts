/**
 * Friends Service
 * 
 * Manages friend relationships, invitations, and friend requests.
 * 
 * Features:
 * - Invite code system (time-limited codes)
 * - Friend request workflow (send, accept, reject)
 * - Friendship management
 * - Redis pub/sub for real-time friend events
 * 
 * Security:
 * - Invite codes expire after 24 hours (configurable)
 * - Prevents self-friending
 * - Validates friendship before conversation creation
 * - Prevents duplicate friend requests
 * 
 * @class FriendsService
 */

import { Injectable, BadRequestException, NotFoundException, ConflictException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';
import { REDIS_CLIENT } from '../redis/redis.module';
import { RedisClientType } from 'redis';

@Injectable()
export class FriendsService {
  constructor(
    private prisma: PrismaService,
    @Inject(REDIS_CLIENT) private redisClient: RedisClientType,
  ) {}

  /**
   * Generate a time-limited invite code for a user
   * 
   * Invite codes allow others to send friend requests without knowing
   * the user's handle. Codes are 9-character alphanumeric strings.
   * 
   * @param userId - User ID to generate code for
   * @param expiryHours - Hours until code expires (default: 24)
   * @returns Invite code and expiration timestamp
   */
  async generateInviteCode(userId: string, expiryHours: number = 24) {
    // Generate a random 9-character alphanumeric code
    const code = randomBytes(6).toString('base64').replace(/[+/=]/g, '').substring(0, 9).toUpperCase();
    
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiryHours);

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        inviteCode: code,
        inviteCodeExpiresAt: expiresAt,
      },
      select: {
        id: true,
        handle: true,
        displayName: true,
        inviteCode: true,
        inviteCodeExpiresAt: true,
      },
    });

    return {
      inviteCode: user.inviteCode,
      expiresAt: user.inviteCodeExpiresAt,
    };
  }

  /**
   * Send a friend request using an invite code
   * 
   * Process:
   * 1. Validate invite code and check expiration
   * 2. Verify not already friends or request pending
   * 3. Create or update friend request
   * 4. Publish event to Redis for real-time notification
   * 
   * @param fromUserId - User sending the request
   * @param inviteCode - Target user's invite code
   * @returns Created friend request
   * @throws NotFoundException if code invalid
   * @throws BadRequestException if code expired or self-request
   * @throws ConflictException if already friends or request exists
   */
  async sendFriendRequest(fromUserId: string, inviteCode: string) {
    // Find user by invite code
    const toUser = await this.prisma.user.findUnique({
      where: { inviteCode },
      select: {
        id: true,
        handle: true,
        displayName: true,
        inviteCodeExpiresAt: true,
      },
    });

    if (!toUser) {
      throw new NotFoundException('Invalid invite code');
    }

    if (toUser.id === fromUserId) {
      throw new BadRequestException('Cannot send friend request to yourself');
    }

    // Check if invite code is expired
    if (toUser.inviteCodeExpiresAt && toUser.inviteCodeExpiresAt < new Date()) {
      throw new BadRequestException('Invite code has expired');
    }

    // Check if already friends
    const existingFriendship = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { user1Id: fromUserId, user2Id: toUser.id },
          { user1Id: toUser.id, user2Id: fromUserId },
        ],
      },
    });

    if (existingFriendship) {
      throw new ConflictException('Already friends with this user');
    }

    // Check for existing pending request
    const existingPendingRequest = await this.prisma.friendRequest.findFirst({
      where: {
        OR: [
          { fromUserId, toUserId: toUser.id, status: 'pending' },
          { fromUserId: toUser.id, toUserId: fromUserId, status: 'pending' },
        ],
      },
    });

    if (existingPendingRequest) {
      throw new ConflictException('Friend request already pending');
    }

    // Check if there's any existing request from this user to the target user
    const existingAnyRequest = await this.prisma.friendRequest.findFirst({
      where: {
        fromUserId,
        toUserId: toUser.id,
      },
    });

    // Create friend request with unique code for this request
    const requestCode = randomBytes(6).toString('base64').replace(/[+/=]/g, '').substring(0, 12).toUpperCase();
    
    let friendRequest;
    
    if (existingAnyRequest) {
      // Update existing request to pending with new invite code
      friendRequest = await this.prisma.friendRequest.update({
        where: { id: existingAnyRequest.id },
        data: {
          inviteCode: requestCode,
          status: 'pending',
          createdAt: new Date(),
          respondedAt: null,
        },
        include: {
          fromUser: {
            select: {
              id: true,
              handle: true,
              displayName: true,
              avatarUrl: true,
            },
          },
          toUser: {
            select: {
              id: true,
              handle: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      });
    } else {
      // Create new friend request
      friendRequest = await this.prisma.friendRequest.create({
        data: {
          fromUserId,
          toUserId: toUser.id,
          inviteCode: requestCode,
          status: 'pending',
        },
        include: {
          fromUser: {
            select: {
              id: true,
              handle: true,
              displayName: true,
              avatarUrl: true,
            },
          },
          toUser: {
            select: {
              id: true,
              handle: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      });
    }

    // Publish friend request event to Redis
    await this.redisClient.publish(
      'chat:friends',
      JSON.stringify({
        type: 'friend_request',
        toUserId: toUser.id,
        request: friendRequest,
      }),
    );

    return friendRequest;
  }

  /**
   * Accept or reject a friend request
   * 
   * If accepted:
   * - Creates Friendship record
   * - Publishes friend_accepted event to Redis
   * - Notifies both users via WebSocket
   * 
   * If rejected:
   * - Updates request status
   * - Notifies requester
   * 
   * @param userId - User responding to the request (must be recipient)
   * @param requestId - Friend request ID
   * @param action - 'accept' or 'reject'
   * @returns Updated friend request
   * @throws NotFoundException if request not found
   * @throws BadRequestException if not authorized or already responded
   */
  async respondToFriendRequest(userId: string, requestId: string, action: 'accept' | 'reject') {
    const friendRequest = await this.prisma.friendRequest.findUnique({
      where: { id: requestId },
      include: {
        fromUser: {
          select: {
            id: true,
            handle: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        toUser: {
          select: {
            id: true,
            handle: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!friendRequest) {
      throw new NotFoundException('Friend request not found');
    }

    if (friendRequest.toUserId !== userId) {
      throw new BadRequestException('Not authorized to respond to this request');
    }

    if (friendRequest.status !== 'pending') {
      throw new BadRequestException('Friend request already responded to');
    }

    // Update the friend request
    const updatedRequest = await this.prisma.friendRequest.update({
      where: { id: requestId },
      data: {
        status: action === 'accept' ? 'accepted' : 'rejected',
        respondedAt: new Date(),
      },
    });

    // If accepted, create friendship
    if (action === 'accept') {
      // Ensure user1Id < user2Id for consistency
      const [user1Id, user2Id] = [friendRequest.fromUserId, friendRequest.toUserId].sort();
      
      const friendship = await this.prisma.friendship.create({
        data: {
          user1Id,
          user2Id,
        },
      });

      // Publish friend accepted event to Redis
      await this.redisClient.publish(
        'chat:friends',
        JSON.stringify({
          type: 'friend_accepted',
          fromUserId: friendRequest.fromUserId,
          toUserId: friendRequest.toUserId,
          friendship,
        }),
      );
    }

    // Publish friend request response event to notify the requester
    await this.redisClient.publish(
      'chat:friends',
      JSON.stringify({
        type: 'friend_request_response',
        requestId,
        action,
        fromUserId: friendRequest.fromUserId,
        toUserId: friendRequest.toUserId,
      }),
    );

    return {
      ...updatedRequest,
      fromUser: friendRequest.fromUser,
      toUser: friendRequest.toUser,
    };
  }

  async getPendingRequests(userId: string) {
    const received = await this.prisma.friendRequest.findMany({
      where: {
        toUserId: userId,
        status: 'pending',
      },
      include: {
        fromUser: {
          select: {
            id: true,
            handle: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const sent = await this.prisma.friendRequest.findMany({
      where: {
        fromUserId: userId,
        status: 'pending',
      },
      include: {
        toUser: {
          select: {
            id: true,
            handle: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      received,
      sent,
    };
  }

  async getFriends(userId: string) {
    const friendships = await this.prisma.friendship.findMany({
      where: {
        OR: [
          { user1Id: userId },
          { user2Id: userId },
        ],
      },
      include: {
        user1: {
          select: {
            id: true,
            handle: true,
            displayName: true,
            avatarUrl: true,
            avatarColor: true,
          },
        },
        user2: {
          select: {
            id: true,
            handle: true,
            displayName: true,
            avatarUrl: true,
            avatarColor: true,
          },
        },
      },
    });

    // Map to return the other user in each friendship
    return friendships.map((friendship: any) => ({
      id: friendship.id,
      friend: friendship.user1Id === userId ? friendship.user2 : friendship.user1,
      createdAt: friendship.createdAt,
    }));
  }

  async removeFriend(userId: string, friendId: string) {
    const friendship = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { user1Id: userId, user2Id: friendId },
          { user1Id: friendId, user2Id: userId },
        ],
      },
    });

    if (!friendship) {
      throw new NotFoundException('Friendship not found');
    }

    await this.prisma.friendship.delete({
      where: { id: friendship.id },
    });

    return { message: 'Friend removed successfully' };
  }

  /**
   * Check if two users are friends
   * 
   * Used for authorization checks before allowing direct conversations.
   * 
   * @param userId1 - First user ID
   * @param userId2 - Second user ID
   * @returns True if users are friends
   */
  async areFriends(userId1: string, userId2: string): Promise<boolean> {
    const friendship = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { user1Id: userId1, user2Id: userId2 },
          { user1Id: userId2, user2Id: userId1 },
        ],
      },
    });

    return !!friendship;
  }
}
