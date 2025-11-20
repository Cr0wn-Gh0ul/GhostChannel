import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiParam, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DevicesService } from './devices.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

interface AuthRequest extends Request {
  user: { userId: string; email: string };
}

@ApiTags('devices')
@ApiBearerAuth('JWT-auth')
@Controller('devices')
@UseGuards(JwtAuthGuard)
export class DevicesController {
  constructor(private devicesService: DevicesService) {}

  @Post()
  @ApiOperation({ summary: 'Register a new device for E2E encryption' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        publicKey: { type: 'string', description: 'Device public key' },
        deviceName: { type: 'string', example: 'My Phone' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Device registered successfully' })
  async registerDevice(@Request() req: AuthRequest, @Body() body: { publicKey: string; deviceName?: string }) {
    const device = await this.devicesService.registerDevice(
      req.user.userId,
      body.publicKey,
      body.deviceName,
    );
    return {
      id: device.id,
      publicKey: device.publicKey,
      deviceName: device.deviceName,
      createdAt: device.createdAt,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all devices for current user' })
  @ApiResponse({ status: 200, description: 'Returns list of devices' })
  async getMyDevices(@Request() req: AuthRequest) {
    const devices = await this.devicesService.findByUserId(req.user.userId);
    return devices.map((d) => ({
      id: d.id,
      deviceName: d.deviceName,
      lastSeenAt: d.lastSeenAt,
      createdAt: d.createdAt,
    }));
  }

  @Get('user/:userId/keys')
  @ApiOperation({ summary: 'Get device public keys for a user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Returns device public keys' })
  async getUserDeviceKeys(@Param('userId') userId: string) {
    return this.devicesService.getDevicePublicKeys(userId);
  }

  @Delete(':deviceId')
  @ApiOperation({ summary: 'Revoke a device' })
  @ApiParam({ name: 'deviceId', description: 'Device ID' })
  @ApiResponse({ status: 200, description: 'Device revoked successfully' })
  async revokeDevice(@Request() req: AuthRequest, @Param('deviceId') deviceId: string) {
    // TODO: Verify the device belongs to the user
    await this.devicesService.revokeDevice(deviceId);
    return { success: true };
  }
}
