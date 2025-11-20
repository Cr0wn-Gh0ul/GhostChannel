import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { FriendsService } from './friends.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GenerateInviteCodeDto } from './dto/generate-invite-code.dto';
import { SendFriendRequestDto } from './dto/send-friend-request.dto';
import { RespondFriendRequestDto } from './dto/respond-friend-request.dto';

interface AuthRequest extends Request {
  user: { userId: string; email: string };
}

@ApiTags('friends')
@ApiBearerAuth()
@Controller('friends')
@UseGuards(JwtAuthGuard)
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @Post('invite-code')
  @ApiOperation({ summary: 'Generate a new invite code for adding friends' })
  @ApiResponse({
    status: 201,
    description: 'Invite code generated successfully',
    schema: {
      example: {
        inviteCode: 'ABC123XYZ',
        expiresAt: '2025-11-19T14:22:55.000Z',
      },
    },
  })
  async generateInviteCode(@Request() req: AuthRequest, @Body() dto: GenerateInviteCodeDto) {
    return this.friendsService.generateInviteCode(req.user.userId, dto.expiryHours);
  }

  @Post('requests')
  @ApiOperation({ summary: 'Send a friend request using an invite code' })
  @ApiResponse({
    status: 201,
    description: 'Friend request sent successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Invalid invite code',
  })
  @ApiResponse({
    status: 409,
    description: 'Already friends or request pending',
  })
  async sendFriendRequest(@Request() req: AuthRequest, @Body() dto: SendFriendRequestDto) {
    return this.friendsService.sendFriendRequest(req.user.userId, dto.inviteCode);
  }

  @Get('requests')
  @ApiOperation({ summary: 'Get all pending friend requests (sent and received)' })
  @ApiResponse({
    status: 200,
    description: 'List of pending friend requests',
    schema: {
      example: {
        received: [
          {
            id: 'request-uuid',
            fromUserId: 'user-uuid',
            toUserId: 'current-user-uuid',
            status: 'pending',
            createdAt: '2025-11-18T14:22:55.000Z',
            fromUser: {
              id: 'user-uuid',
              handle: 'alice',
              displayName: 'Alice',
              avatarUrl: null,
            },
          },
        ],
        sent: [],
      },
    },
  })
  async getPendingRequests(@Request() req: AuthRequest) {
    return this.friendsService.getPendingRequests(req.user.userId);
  }

  @Patch('requests/:id')
  @ApiOperation({ summary: 'Accept or reject a friend request' })
  @ApiResponse({
    status: 200,
    description: 'Friend request responded to successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Friend request not found',
  })
  async respondToFriendRequest(
    @Request() req: AuthRequest,
    @Param('id') requestId: string,
    @Body() dto: RespondFriendRequestDto,
  ) {
    return this.friendsService.respondToFriendRequest(req.user.userId, requestId, dto.action);
  }

  @Get()
  @ApiOperation({ summary: 'Get list of all friends' })
  @ApiResponse({
    status: 200,
    description: 'List of friends',
    schema: {
      example: [
        {
          id: 'friendship-uuid',
          friend: {
            id: 'user-uuid',
            handle: 'bob',
            displayName: 'Bob',
            avatarUrl: null,
          },
          createdAt: '2025-11-18T14:22:55.000Z',
        },
      ],
    },
  })
  async getFriends(@Request() req: AuthRequest) {
    return this.friendsService.getFriends(req.user.userId);
  }

  @Delete(':friendId')
  @ApiOperation({ summary: 'Remove a friend' })
  @ApiResponse({
    status: 200,
    description: 'Friend removed successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Friendship not found',
  })
  async removeFriend(@Request() req: AuthRequest, @Param('friendId') friendId: string) {
    return this.friendsService.removeFriend(req.user.userId, friendId);
  }
}
