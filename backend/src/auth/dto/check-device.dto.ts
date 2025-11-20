import { IsEmail, IsString } from 'class-validator';

export class CheckDeviceDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsString()
  publicKey: string;
}