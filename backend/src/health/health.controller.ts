/**
 * Health Check Controller
 * 
 * Provides endpoint for monitoring backend service health.
 * Used by frontend to display system status indicator.
 * 
 * @module Health
 */

import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  /**
   * Health check endpoint
   * 
   * Returns current status, timestamp, and uptime.
   * No authentication required.
   * 
   * @returns Health status object
   */
  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', example: '2025-11-20T12:00:00.000Z' },
        uptime: { type: 'number', example: 3600.5 },
      },
    },
  })
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
