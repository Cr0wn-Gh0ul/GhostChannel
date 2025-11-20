import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { ConversationsService } from '../conversations/conversations.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

interface AuthRequest extends Request {
  user: { userId: string; email: string };
}

@ApiTags('messages')
@ApiBearerAuth('JWT-auth')
@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(
    private messagesService: MessagesService,
    private conversationsService: ConversationsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Send an encrypted message' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        conversationId: { type: 'string', description: 'Conversation ID' },
        senderDeviceId: { type: 'string', description: 'Sender device ID' },
        ciphertext: { type: 'string', description: 'Encrypted message content' },
        nonce: { type: 'string', description: 'Encryption nonce/IV' },
        messageIndex: { type: 'number', description: 'Optional message index' },
      },
      required: ['conversationId', 'senderDeviceId', 'ciphertext'],
    },
  })
  @ApiResponse({ status: 201, description: 'Message sent successfully' })
  @ApiResponse({ status: 403, description: 'Not a participant in conversation' })
  async sendMessage(
    @Request() req: AuthRequest,
    @Body() body: {
      conversationId: string;
      senderDeviceId: string;
      ciphertext: string;
      nonce?: string;
      messageIndex?: number;
    },
  ) {
    // Verify user is participant
    const isParticipant = await this.conversationsService.isParticipant(
      body.conversationId,
      req.user.userId,
    );
    if (!isParticipant) {
      return { error: 'Not a participant in this conversation' };
    }

    const message = await this.messagesService.createMessage(
      body.conversationId,
      req.user.userId,
      body.senderDeviceId,
      body.ciphertext,
      body.nonce,
      body.messageIndex,
    );

    return {
      id: message.id,
      conversationId: message.conversationId,
      senderUserId: message.senderUserId,
      senderDeviceId: message.senderDeviceId,
      ciphertext: message.ciphertext,
      nonce: message.nonce,
      messageIndex: message.messageIndex,
      createdAt: message.createdAt,
    };
  }

  @Get('conversation/:conversationId')
  @ApiOperation({ summary: 'Get messages for a conversation' })
  @ApiParam({ name: 'conversationId', description: 'Conversation ID' })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  @ApiQuery({ name: 'offset', required: false, example: 0 })
  @ApiResponse({ status: 200, description: 'Returns encrypted messages' })
  async getMessages(
    @Request() req: AuthRequest,
    @Param('conversationId') conversationId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    // Verify user is participant
    const isParticipant = await this.conversationsService.isParticipant(
      conversationId,
      req.user.userId,
    );
    if (!isParticipant) {
      return [];
    }

    const messages = await this.messagesService.findByConversationId(
      conversationId,
      limit ? parseInt(limit) : 50,
      offset ? parseInt(offset) : 0,
    );

    return messages.map((m: any) => ({
      id: m.id,
      conversationId: m.conversationId,
      senderUserId: m.senderUserId,
      senderDeviceId: m.senderDeviceId,
      ciphertext: m.ciphertext,
      nonce: m.nonce,
      messageIndex: m.messageIndex,
      createdAt: m.createdAt,
      deliveredAt: m.deliveredAt,
      readAt: m.readAt,
    }));
  }

  @Patch(':messageId/read')
  @ApiOperation({ summary: 'Mark message as read' })
  @ApiParam({ name: 'messageId', description: 'Message ID' })
  @ApiResponse({ status: 200, description: 'Message marked as read' })
  async markRead(@Param('messageId') messageId: string) {
    await this.messagesService.markRead(messageId);
    return { success: true };
  }
}
