import { IsOptional, IsString, MaxLength, Matches, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiProperty({
    required: false,
    example: 'John Doe',
    description: 'Display name for the user',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  displayName?: string;

  @ApiProperty({
    required: false,
    example: 'johndoe',
    description: 'Unique handle/username',
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Handle can only contain letters, numbers, and underscores',
  })
  handle?: string;

  @ApiProperty({
    required: false,
    example: '#06b6d4',
    description: 'Avatar color in hex format',
  })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'Avatar color must be a valid hex color (e.g., #06b6d4)',
  })
  avatarColor?: string;

  @ApiProperty({
    required: false,
    example: 'Software developer and privacy enthusiast',
    description: 'Short bio (max 500 characters)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;
}
