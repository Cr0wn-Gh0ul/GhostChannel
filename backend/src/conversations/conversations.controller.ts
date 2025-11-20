import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Request, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiParam, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ConversationsService } from './conversations.service';
import { MessagesService } from '../messages/messages.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Server } from 'socket.io';
import { REDIS_CLIENT } from '../redis/redis.module';
import { RedisClientType } from 'redis';

interface AuthRequest extends Request {
  user: { userId: string; email: string; deviceId?: string };
}

@ApiTags('conversations')
@ApiBearerAuth('JWT-auth')
@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(
    private conversationsService: ConversationsService,
    private messagesService: MessagesService,
    private prisma: PrismaService,
    @Inject(REDIS_CLIENT) private redisClient: RedisClientType,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new conversation' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        participantUserIds: { type: 'array', items: { type: 'string' } },
        isGroup: { type: 'boolean', example: false },
        groupName: { type: 'string', example: 'My Group' },
        createdByDeviceId: { type: 'string', example: 'device-uuid' },
        targetDeviceId: { type: 'string', example: 'target-device-uuid' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Conversation created successfully' })
  async createConversation(
    @Request() req: AuthRequest,
    @Body() body: { participantUserIds: string[]; isGroup?: boolean; groupName?: string; createdByDeviceId?: string; targetDeviceId?: string },
  ) {
    const allParticipants = [req.user.userId, ...body.participantUserIds];
    console.log('[Conversations] Creating conversation - creator:', req.user.userId, 'participants:', allParticipants);
    
    // For device-to-device conversations, get the target user's current device
    let targetDeviceId = null;
    if (!body.isGroup && body.participantUserIds.length === 1) {
      const targetUserId = body.participantUserIds[0];
      const targetUser = await this.prisma.user.findUnique({
        where: { id: targetUserId },
        select: { currentDeviceId: true },
      });
      targetDeviceId = targetUser?.currentDeviceId;
      console.log('[Conversations] Target user device:', targetDeviceId);
    }
    
    const conversation: any = await this.conversationsService.createConversation(
      req.user.userId,
      allParticipants,
      body.isGroup,
      body.groupName,
      body.createdByDeviceId || req.user.deviceId,
      body.targetDeviceId || targetDeviceId || undefined,
    );

    // Notify other participants about the new conversation via Redis
    const conversationData = {
      id: conversation.id,
      isGroup: conversation.isGroup,
      groupName: conversation.groupName,
      createdByUserId: conversation.createdByUserId,
      createdByDeviceId: conversation.createdByDeviceId,
      targetDeviceId: conversation.targetDeviceId,
      createdAt: conversation.createdAt,
    };

    await this.redisClient.publish(
      'chat:conversations',
      JSON.stringify({
        type: 'conversation_created',
        conversation: conversationData,
        participantIds: allParticipants,
        creatorId: req.user.userId,
      })
    );

    return conversationData;
  }

  @Get()
  @ApiOperation({ summary: 'Get all conversations for current user' })
  @ApiResponse({ status: 200, description: 'Returns list of conversations' })
  async getMyConversations(@Request() req: AuthRequest) {
    const conversations = await this.conversationsService.findByUserId(req.user.userId);
    console.log('[Conversations] User', req.user.userId, 'has', conversations.length, 'conversations');
    
    // Manually fetch device information for each conversation
    const conversationsWithDevices = await Promise.all(conversations.map(async (c: any) => {
      let createdByDevice = null;
      let targetDevice = null;
      
      if (c.createdByDeviceId) {
        createdByDevice = await this.prisma.device.findUnique({
          where: { id: c.createdByDeviceId },
          select: { id: true, deviceName: true },
        });
      }
      
      if (c.targetDeviceId) {
        targetDevice = await this.prisma.device.findUnique({
          where: { id: c.targetDeviceId },
          select: { id: true, deviceName: true },
        });
      }
      
      return {
        id: c.id,
        isGroup: c.isGroup,
        groupName: c.groupName,
        createdByUserId: c.createdByUserId,
        createdByDeviceId: c.createdByDeviceId,
        targetDeviceId: c.targetDeviceId,
        createdByDevice,
        targetDevice,
        createdAt: c.createdAt,
        participants: c.participants?.map((p: any) => ({
          userId: p.userId,
          addedAt: p.addedAt,
          user: p.user,
        })),
      };
    }));
    
    return conversationsWithDevices;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get conversation by ID' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({ status: 200, description: 'Returns conversation details' })
  @ApiResponse({ status: 404, description: 'Conversation not found or access denied' })
  async getConversation(@Request() req: AuthRequest, @Param('id') id: string) {
    const conversation = await this.conversationsService.findById(id);
    if (!conversation) {
      return null;
    }

    // Check if user is participant
    const isParticipant = await this.conversationsService.isParticipant(id, req.user.userId);
    if (!isParticipant) {
      return null;
    }

    return {
      id: conversation.id,
      isGroup: conversation.isGroup,
      groupName: conversation.groupName,
      createdAt: conversation.createdAt,
      participants: conversation.participants?.map((p: any) => ({
        userId: p.userId,
        handle: p.user?.handle,
        displayName: p.user?.displayName,
        addedAt: p.addedAt,
      })),
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a conversation (removes it from your conversation list)' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({ status: 200, description: 'Conversation deleted successfully' })
  @ApiResponse({ status: 403, description: 'Not a participant in this conversation' })
  async deleteConversation(@Request() req: AuthRequest, @Param('id') id: string, @Query('deleteMessages') deleteMessages?: string) {
    // Check if user is participant
    const isParticipant = await this.conversationsService.isParticipant(id, req.user.userId);
    if (!isParticipant) {
      return { error: 'Not authorized to delete this conversation' };
    }

    const shouldDeleteMessages = deleteMessages === 'true';

    if (shouldDeleteMessages) {
      // Delete all messages first if requested
      await this.messagesService.deleteByConversationId(id);
    }

    // Remove the user from the conversation (soft delete for user)
    await this.prisma.conversationParticipant.delete({
      where: {
        conversationId_userId: {
          conversationId: id,
          userId: req.user.userId,
        },
      },
    });

    // If no participants left, delete the conversation entirely
    const remainingParticipants = await this.prisma.conversationParticipant.count({
      where: { conversationId: id },
    });

    if (remainingParticipants === 0) {
      // Delete all messages if not already deleted
      if (!shouldDeleteMessages) {
        await this.messagesService.deleteByConversationId(id);
      }
      // Delete the conversation
      await this.prisma.conversation.delete({
        where: { id },
      });
    }

    return {
      success: true,
      message: shouldDeleteMessages 
        ? 'Conversation and all messages deleted successfully'
        : 'Conversation removed from your list',
    };
  }

  @Delete(':id/messages')
  @ApiOperation({ summary: 'Delete all messages in a conversation (for both users)' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({ status: 200, description: 'Messages deleted successfully' })
  @ApiResponse({ status: 403, description: 'Not a participant in this conversation' })
  async deleteConversationMessages(@Request() req: AuthRequest, @Param('id') id: string) {
    // Check if user is participant
    const isParticipant = await this.conversationsService.isParticipant(id, req.user.userId);
    if (!isParticipant) {
      return { error: 'Not authorized to delete messages in this conversation' };
    }

    const deletedCount = await this.messagesService.deleteByConversationId(id);
    
    // Broadcast to all participants that messages were deleted
    const participantIds = await this.conversationsService.getParticipantIds(id);
    await this.redisClient.publish(
      'chat:messages',
      JSON.stringify({
        type: 'messages_deleted',
        conversationId: id,
        participantIds,
      }),
    );

    return {
      success: true,
      deletedCount,
      message: `Deleted ${deletedCount} message(s) from conversation`,
    };
  }
}
