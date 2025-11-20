import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export enum FriendRequestAction {
  ACCEPT = 'accept',
  REJECT = 'reject',
}

export class RespondFriendRequestDto {
  @ApiProperty({
    description: 'Action to take on the friend request',
    enum: FriendRequestAction,
    example: FriendRequestAction.ACCEPT,
  })
  @IsEnum(FriendRequestAction)
  action: FriendRequestAction;
}
