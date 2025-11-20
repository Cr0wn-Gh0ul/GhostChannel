import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, Max } from 'class-validator';

export class GenerateInviteCodeDto {
  @ApiProperty({
    description: 'Number of hours the invite code is valid for',
    example: 24,
    required: false,
    minimum: 1,
    maximum: 168,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(168)
  expiryHours?: number = 24;
}
