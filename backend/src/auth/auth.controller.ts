import { Controller, Post, Body, UseGuards, Request, Response } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './local-auth.guard';
import { CheckDeviceDto } from './dto/check-device.dto';
import { Response as ExpressResponse } from 'express';

interface AuthRequest extends Request {
  user: any;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'user@example.com' },
        handle: { type: 'string', example: 'username' },
        password: { type: 'string', example: 'securePassword123' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async register(
    @Body() body: { email: string; handle: string; password: string },
  ) {
    return this.authService.register(body.email, body.handle, body.password);
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'user@example.com' },
        password: { type: 'string', example: 'securePassword123' },
        devicePublicKey: { type: 'string', description: 'Device public key for E2E encryption' },
        deviceName: { type: 'string', example: 'My Phone' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Successfully logged in' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async login(
    @Request() req: AuthRequest,
    @Body() body: { devicePublicKey?: string; deviceName?: string },
    @Response() res: ExpressResponse,
  ) {
    const result = await this.authService.login(req.user, body.devicePublicKey, body.deviceName);
    
    // Set httpOnly cookie with the token
    res.cookie('token', result.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    
    // Don't send token in response body
    const { access_token, ...resultWithoutToken } = result;
    return res.json(resultWithoutToken);
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout and clear auth cookie' })
  @ApiResponse({ status: 200, description: 'Successfully logged out' })
  async logout(@Response() res: ExpressResponse) {
    res.clearCookie('token');
    return res.json({ message: 'Logged out successfully' });
  }

  @Post('check-device')
  @ApiOperation({ summary: 'Check if device is new without logging in' })
  @ApiResponse({ status: 200, description: 'Returns device status' })
  async checkDevice(@Body() checkDeviceDto: CheckDeviceDto) {
    return this.authService.checkDevice(checkDeviceDto.email, checkDeviceDto.password, checkDeviceDto.publicKey);
  }
}

