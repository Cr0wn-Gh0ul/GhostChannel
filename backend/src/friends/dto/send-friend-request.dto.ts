import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Length } from 'class-validator';

export class SendFriendRequestDto {
  @ApiProperty({
    description: 'The invite code received from the other user',
    example: 'ABC123XYZ',
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 20)
  inviteCode: string;
}
