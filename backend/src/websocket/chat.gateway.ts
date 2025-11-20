import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Inject, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { MessagesService } from '../messages/messages.service';
import { ConversationsService } from '../conversations/conversations.service';
import { REDIS_CLIENT } from '../redis/redis.module';
import { RedisClientType } from 'redis';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSockets: Map<string, Set<string>> = new Map();

  constructor(
    private messagesService: MessagesService,
    private conversationsService: ConversationsService,
    private jwtService: JwtService,
    @Inject(REDIS_CLIENT) private redisClient: RedisClientType,
  ) {
    this.setupRedisSubscription();
  }

  async setupRedisSubscription() {
    const subscriber = this.redisClient.duplicate();
    await subscriber.connect();
    await subscriber.subscribe('chat:messages', (message) => {
      const data = JSON.parse(message);
      this.handleRedisMessage(data);
    });
    await subscriber.subscribe('chat:friends', (message) => {
      const data = JSON.parse(message);
      this.handleRedisFriendEvent(data);
    });
    await subscriber.subscribe('chat:presence', (message) => {
      const data = JSON.parse(message);
      this.handleRedisPresence(data);
    });
    await subscriber.subscribe('chat:conversations', (message) => {
      const data = JSON.parse(message);
      this.handleRedisConversation(data);
    });
  }

  handleRedisMessage(data: any) {
    if (data.type === 'new_message') {
      // Broadcast to all users in the conversation
      data.participantIds.forEach((userId: string) => {
        const sockets = this.userSockets.get(userId);
        if (sockets) {
          sockets.forEach((socketId) => {
            this.server.to(socketId).emit('message:new', data.message);
          });
        }
      });
    } else if (data.type === 'messages_deleted') {
      // Broadcast to all participants that messages were deleted
      data.participantIds.forEach((userId: string) => {
        const sockets = this.userSockets.get(userId);
        if (sockets) {
          sockets.forEach((socketId) => {
            this.server.to(socketId).emit('messages:deleted', { conversationId: data.conversationId });
          });
        }
      });
    }
  }

  handleRedisFriendEvent(data: any) {
    if (data.type === 'friend_request') {
      // Notify the recipient of new friend request
      const sockets = this.userSockets.get(data.toUserId);
      if (sockets) {
        sockets.forEach((socketId) => {
          this.server.to(socketId).emit('friend:request', data.request);
        });
      }
    } else if (data.type === 'friend_accepted') {
      // Notify both users of accepted friendship
      [data.fromUserId, data.toUserId].forEach((userId) => {
        const sockets = this.userSockets.get(userId);
        if (sockets) {
          sockets.forEach((socketId) => {
            this.server.to(socketId).emit('friend:accepted', data.friendship);
          });
        }
      });
    } else if (data.type === 'friend_request_response') {
      // Notify the requester that their request was responded to
      const sockets = this.userSockets.get(data.fromUserId);
      if (sockets) {
        sockets.forEach((socketId) => {
          this.server.to(socketId).emit('friend_request_response', {
            requestId: data.requestId,
            action: data.action,
          });
        });
      }
    }
  }

  handleRedisPresence(data: any) {
    // Broadcast presence events from Redis to local clients
    console.log('[Gateway] Redis presence event:', data);
    if (data.type === 'user_online') {
      console.log(`[Gateway] Redis: Broadcasting user:online for ${data.userId}`);
      this.server.emit('user:online', { userId: data.userId });
    } else if (data.type === 'user_offline') {
      console.log(`[Gateway] Redis: Broadcasting user:offline for ${data.userId}`);
      this.server.emit('user:offline', { userId: data.userId });
    }
  }

  handleRedisConversation(data: any) {
    console.log('[Gateway] Redis conversation event:', data);
    if (data.type === 'conversation_created') {
      // Notify all participants except the creator about the new conversation
      data.participantIds.forEach((participantId: string) => {
        if (participantId !== data.creatorId) { // Don't notify the creator
          const sockets = this.userSockets.get(participantId);
          if (sockets) {
            sockets.forEach((socketId) => {
              console.log(`[Gateway] Notifying ${participantId} about new conversation ${data.conversation.id}`);
              this.server.to(socketId).emit('conversation:new', data.conversation);
            });
          }
        }
      });
    }
  }

  async handleConnection(client: Socket) {
    try {
      // Extract token from cookie, auth object, or Authorization header
      const cookieHeader = client.handshake.headers.cookie;
      let tokenFromCookie: string | undefined;
      
      if (cookieHeader) {
        const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
          const [key, value] = cookie.trim().split('=');
          acc[key] = value;
          return acc;
        }, {} as Record<string, string>);
        tokenFromCookie = cookies.token;
      }
      
      const token = tokenFromCookie || 
                    client.handshake.auth.token || 
                    client.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        console.log('WebSocket connection rejected: No token provided');
        console.log('Cookie header:', cookieHeader);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const userId = payload.sub;
      console.log('WebSocket connection accepted for user:', userId);

      client.data.userId = userId;

      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);

      // Broadcast user online status
      await this.redisClient.publish(
        'chat:presence',
        JSON.stringify({
          type: 'user_online',
          userId,
        }),
      );

      // Emit to all connected clients
      console.log(`[Gateway] Broadcasting user:online for ${userId} to ALL clients`);
      this.server.emit('user:online', { userId });

      // Send current online users to the newly connected client
      const onlineUserIds = Array.from(this.userSockets.keys());
      console.log(`[Gateway] Sending users:online list to ${userId}:`, onlineUserIds);
      client.emit('users:online', { userIds: onlineUserIds });

      console.log(`[Gateway] User ${userId} connected via socket ${client.id}. Total online users: ${onlineUserIds.length}`);
    } catch (error) {
      console.error('WebSocket auth error:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      const sockets = this.userSockets.get(userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(userId);
          
          // Broadcast user offline status
          this.redisClient.publish(
            'chat:presence',
            JSON.stringify({
              type: 'user_offline',
              userId,
            }),
          );

          // Emit to all connected clients
          console.log(`[Gateway] Broadcasting user:offline for ${userId} to ALL clients`);
          this.server.emit('user:offline', { userId });
        }
      }
      console.log(`User ${userId} disconnected from socket ${client.id}`);
    }
  }

  @SubscribeMessage('request:online-users')
  handleRequestOnlineUsers(@ConnectedSocket() client: Socket) {
    const onlineUserIds = Array.from(this.userSockets.keys());
    console.log(`[Gateway] Sending online users to ${client.data.userId}:`, onlineUserIds);
    client.emit('users:online', { userIds: onlineUserIds });
  }

  @SubscribeMessage('message:send')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      conversationId: string;
      senderDeviceId: string;
      ciphertext: string;
      nonce?: string;
      messageIndex?: number;
    },
  ) {
    const userId = client.data.userId;
    console.log('Handling message from user:', userId, 'for conversation:', data.conversationId);

    // Verify user is participant
    const isParticipant = await this.conversationsService.isParticipant(
      data.conversationId,
      userId,
    );
    if (!isParticipant) {
      console.log('User', userId, 'is not a participant in conversation', data.conversationId);
      return { error: 'Not a participant' };
    }

    // Save message to database
    const message = await this.messagesService.createMessage(
      data.conversationId,
      userId,
      data.senderDeviceId,
      data.ciphertext,
      data.nonce,
      data.messageIndex,
    );

    // Get all participants
    const participantIds = await this.conversationsService.getParticipantIds(data.conversationId);

    const messageData = {
      id: message.id,
      conversationId: message.conversationId,
      senderUserId: message.senderUserId,
      senderDeviceId: message.senderDeviceId,
      ciphertext: message.ciphertext,
      nonce: message.nonce,
      messageIndex: message.messageIndex,
      createdAt: message.createdAt,
    };

    // Emit to all participants on this server instance
    participantIds.forEach((participantId: string) => {
      const sockets = this.userSockets.get(participantId);
      if (sockets) {
        sockets.forEach((socketId) => {
          this.server.to(socketId).emit('message:new', messageData);
        });
      }
    });

    // Publish to Redis for other instances
    await this.redisClient.publish(
      'chat:messages',
      JSON.stringify({
        type: 'new_message',
        participantIds,
        message: messageData,
      }),
    );

    return { success: true, messageId: messageData.id };
  }

  @SubscribeMessage('message:delivered')
  async handleDelivered(@MessageBody() data: { messageId: string }) {
    await this.messagesService.markDelivered(data.messageId);
    return { success: true };
  }

  @SubscribeMessage('message:read')
  async handleRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: string }
  ) {
    const message = await this.messagesService.markRead(data.messageId);
    
    // Get conversation participants to broadcast read receipt
    const participantIds = await this.conversationsService.getParticipantIds(message.conversationId);
    
    console.log(`[Gateway] Broadcasting message:read for ${data.messageId} to participants`);
    
    // Broadcast read receipt to all participants so sender sees it was read
    participantIds.forEach((participantId: string) => {
      const sockets = this.userSockets.get(participantId);
      if (sockets) {
        sockets.forEach((socketId) => {
          this.server.to(socketId).emit('message:read', { 
            messageId: data.messageId,
            readAt: message.readAt 
          });
        });
      }
    });
    
    return { success: true };
  }
}
