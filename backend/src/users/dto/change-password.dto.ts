import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({
    example: 'currentPassword123',
    description: 'Current password',
  })
  @IsString()
  @MinLength(6)
  currentPassword: string;

  @ApiProperty({
    example: 'newPassword123',
    description: 'New password (min 6 characters)',
  })
  @IsString()
  @MinLength(6)
  newPassword: string;
}
