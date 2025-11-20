import { Controller, Get, Param, Query, UseGuards, Patch, Body, Request, Post, Delete, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiParam, ApiBody, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { DevicesService } from '../devices/devices.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { PrismaService } from '../prisma/prisma.service';

interface AuthRequest extends Request {
  user: { userId: string; email: string };
}

@ApiTags('users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private usersService: UsersService,
    private devicesService: DevicesService,
    private prisma: PrismaService,
  ) {}

  @Get('search')
  @ApiOperation({ summary: 'Search users by handle' })
  @ApiQuery({ name: 'q', description: 'Search query', example: 'john' })
  @ApiResponse({ status: 200, description: 'Returns matching users' })
  async search(@Query('q') query: string) {
    const users = await this.usersService.searchByHandle(query);
    return users.map((user: any) => ({
      id: user.id,
      handle: user.handle,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
    }));
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Returns current user details' })
  async getMe(@Request() req: AuthRequest) {
    const user = await this.usersService.findById(req.user.userId);
    if (!user) {
      return null;
    }
    return {
      id: user.id,
      handle: user.handle,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      avatarColor: user.avatarColor,
      bio: user.bio,
      currentDeviceId: user.currentDeviceId,
      defaultDeviceId: user.defaultDeviceId,
    };
  }

  @Get('me/devices')
  @ApiOperation({ summary: 'Get current user devices with public keys' })
  @ApiResponse({ status: 200, description: 'Returns user devices and public keys' })
  async getMyDevices(@Request() req: AuthRequest) {
    const devices = await this.prisma.device.findMany({
      where: { 
        userId: req.user.userId,
        revokedAt: null,
      },
      select: {
        id: true,
        publicKey: true,
        deviceName: true,
        createdAt: true,
        lastSeenAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return devices;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Returns user details' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUser(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    if (!user) {
      return null;
    }

    // Get current device info if available
    let currentDevicePublicKey = null;
    let currentDeviceId = null;
    let defaultDeviceId = user.defaultDeviceId || null;
    let defaultDevicePublicKey = null;
    
    if (user.currentDeviceId) {
      const device = await this.devicesService.findById(user.currentDeviceId);
      if (device && !device.revokedAt) {
        currentDevicePublicKey = device.publicKey;
        currentDeviceId = device.id;
      }
    }
    
    if (defaultDeviceId) {
      const defaultDevice = await this.devicesService.findById(defaultDeviceId);
      if (defaultDevice && !defaultDevice.revokedAt) {
        defaultDevicePublicKey = defaultDevice.publicKey;
      } else {
        defaultDeviceId = null; // Device was revoked
      }
    }

    return {
      id: user.id,
      handle: user.handle,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      avatarColor: user.avatarColor,
      bio: user.bio,
      currentDevicePublicKey,
      currentDeviceId,
      defaultDeviceId,
      defaultDevicePublicKey,
    };
  }

  @Patch('default-device/:deviceId')
  @ApiOperation({ summary: 'Set default device for offline messaging' })
  @ApiParam({ name: 'deviceId', description: 'Device ID to set as default' })
  @ApiResponse({ status: 200, description: 'Default device set successfully' })
  async setDefaultDevice(@Request() req: AuthRequest, @Param('deviceId') deviceId: string) {
    // Verify device belongs to user
    const device = await this.devicesService.findById(deviceId);
    if (!device || device.userId !== req.user.userId) {
      throw new Error('Device not found or does not belong to user');
    }

    await this.usersService.setDefaultDevice(req.user.userId, deviceId);
    return { success: true };
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update user profile' })
  @ApiBody({ type: UpdateProfileDto })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  async updateProfile(@Request() req: AuthRequest, @Body() updateProfileDto: UpdateProfileDto) {
    const user = await this.usersService.updateProfile(req.user.userId, updateProfileDto);
    return {
      id: user.id,
      handle: user.handle,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      avatarColor: user.avatarColor,
      bio: user.bio,
      currentDeviceId: user.currentDeviceId,
    };
  }

  @Post('password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Change password' })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 401, description: 'Current password is incorrect' })
  async changePassword(@Request() req: AuthRequest, @Body() changePasswordDto: ChangePasswordDto) {
    await this.usersService.changePassword(
      req.user.userId,
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword,
    );
    return { message: 'Password changed successfully' };
  }

  @Get('handle/:handle/availability')
  @ApiOperation({ summary: 'Check if handle is available' })
  @ApiParam({ name: 'handle', description: 'Handle to check' })
  @ApiResponse({ status: 200, description: 'Returns availability status' })
  async checkHandleAvailability(@Param('handle') handle: string, @Request() req: AuthRequest) {
    const available = await this.usersService.checkHandleAvailability(handle, req.user.userId);
    return { available };
  }

  @Delete('devices/:deviceId')
  @ApiOperation({ summary: 'Delete a device' })
  @ApiParam({ name: 'deviceId', description: 'Device ID to delete' })
  @ApiResponse({ status: 200, description: 'Device deleted successfully' })
  @ApiResponse({ status: 403, description: 'Cannot delete current device or device belongs to another user' })
  async deleteDevice(@Request() req: AuthRequest, @Param('deviceId') deviceId: string) {
    const user = await this.usersService.findById(req.user.userId);
    
    // Prevent deleting the current device
    if (user && user.currentDeviceId === deviceId) {
      return { error: 'Cannot delete the device you are currently using' };
    }

    try {
      await this.devicesService.deleteDevice(deviceId, req.user.userId);
      return { message: 'Device deleted successfully' };
    } catch (error) {
      return { error: 'Failed to delete device' };
    }
  }

  @Patch('devices/:deviceId')
  @ApiOperation({ summary: 'Update device name' })
  @ApiParam({ name: 'deviceId', description: 'Device ID to update' })
  @ApiResponse({ status: 200, description: 'Device name updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid device name' })
  @ApiResponse({ status: 403, description: 'Device belongs to another user' })
  async updateDeviceName(
    @Request() req: AuthRequest,
    @Param('deviceId') deviceId: string,
    @Body() body: { deviceName: string }
  ) {
    const { deviceName } = body;

    // Validate device name
    if (!deviceName || !deviceName.trim()) {
      return { error: 'Device name cannot be empty' };
    }

    if (deviceName.length > 50) {
      return { error: 'Device name must be 50 characters or less' };
    }

    try {
      const updatedDevice = await this.usersService.updateDeviceName(
        deviceId,
        req.user.userId,
        deviceName.trim()
      );
      return updatedDevice;
    } catch (error) {
      return { error: error.message || 'Failed to update device name' };
    }
  }

  @Delete('account')
  @ApiOperation({ summary: 'Delete user account and all associated data' })
  @ApiResponse({ status: 200, description: 'Account deleted successfully' })
  @ApiResponse({ status: 500, description: 'Failed to delete account' })
  async deleteAccount(@Request() req: AuthRequest) {
    try {
      await this.usersService.deleteUser(req.user.userId);
      return { message: 'Account deleted successfully' };
    } catch (error) {
      throw new Error('Failed to delete account');
    }
  }
}
