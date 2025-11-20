/**
 * GhostChannel Backend Server
 * 
 * Privacy-focused end-to-end encrypted chat application.
 * 
 * Security Architecture:
 * - End-to-end encryption using ECDH P-256 + AES-256-GCM
 * - Device-specific cryptographic keys (stored client-side)
 * - Zero-knowledge server (cannot decrypt messages)
 * - JWT authentication with httpOnly cookies
 * - WebSocket real-time messaging over TLS
 * 
 * @module GhostChannel
 */

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';

/**
 * Bootstrap the NestJS application
 * 
 * Configures:
 * - CORS for frontend access
 * - Cookie parsing for JWT tokens
 * - Global validation pipes
 * - Swagger API documentation
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Enable cookie parsing
  app.use(cookieParser());

  // Enable CORS for frontend
  app.enableCors({
    origin: configService.get('FRONTEND_URL') || 'http://localhost:5173',
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('GhostChannel API')
    .setDescription('Privacy-focused end-to-end encrypted chat application API')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management')
    .addTag('devices', 'Device key management')
    .addTag('conversations', 'Conversation management')
    .addTag('messages', 'Message operations')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'GhostChannel API Documentation',
    customCss: '.swagger-ui .topbar { display: none }',
  });

  const port = configService.get('PORT') || 3000;
  await app.listen(port);
  console.log(`🚀 GhostChannel API running on port ${port}`);
  console.log(`📚 Swagger docs available at http://localhost:${port}/api/docs`);
  console.log(`❤️  Health check available at http://localhost:${port}/health`);
}

bootstrap();
