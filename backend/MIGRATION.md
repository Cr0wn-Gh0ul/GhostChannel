# Migration to Prisma and Swagger

## Overview

The GhostChannel backend has been migrated from TypeORM to Prisma ORM and includes comprehensive Swagger API documentation.

## What Changed

### 1. Database ORM: TypeORM → Prisma

#### Why Prisma?
- Better TypeScript support with auto-generated types
- Simpler query syntax and more intuitive API
- Better migration management
- Improved performance with query optimization
- Type-safe database access

#### Migration Steps Taken

1. **Installed Prisma**
   ```bash
   npm install @prisma/client
   npm install --save-dev prisma
   ```

2. **Created Prisma Schema** (`prisma/schema.prisma`)
   - Defined all 6 models: User, Device, Conversation, ConversationParticipant, Message, Session
   - Configured PostgreSQL as datasource
   - Set up proper relations and cascading deletes

3. **Generated Prisma Client**
   ```bash
   npx prisma generate
   ```

4. **Created Initial Migration**
   ```bash
   npx prisma migrate dev --name init
   ```

5. **Created Prisma Service**
   - `src/prisma/prisma.service.ts` - Injectable Prisma client
   - `src/prisma/prisma.module.ts` - Global module for dependency injection

6. **Updated All Services**
   - Users: Migrated from TypeORM Repository to Prisma Client
   - Devices: Replaced find/create/update patterns with Prisma syntax
   - Conversations: Simplified nested queries with Prisma's include
   - Messages: Updated to use Prisma's intuitive query API
   - Auth: Replaced Session repository with Prisma

7. **Removed TypeORM Dependencies**
   - Removed `TypeOrmModule.forRoot()` from `app.module.ts`
   - Removed `TypeOrmModule.forFeature()` from all feature modules
   - Removed `@InjectRepository()` decorators
   - Kept entity files for reference (can be deleted later)

### 2. API Documentation: Swagger/OpenAPI

#### Why Swagger?
- Automatic API documentation
- Interactive API testing interface
- Type-safe request/response schemas
- Better developer experience for frontend integration

#### Implementation

1. **Installed Swagger**
   ```bash
   npm install --save-dev @nestjs/swagger --legacy-peer-deps
   ```

2. **Configured Swagger in main.ts**
   - Added DocumentBuilder configuration
   - Set up JWT Bearer authentication
   - Tagged all API endpoints
   - Exposed docs at `/api/docs`

3. **Added Decorators to Controllers**
   - `@ApiTags()` - Grouped endpoints by resource
   - `@ApiOperation()` - Described each endpoint
   - `@ApiBody()` - Documented request bodies
   - `@ApiParam()` - Documented path parameters
   - `@ApiQuery()` - Documented query parameters
   - `@ApiResponse()` - Documented possible responses
   - `@ApiBearerAuth()` - Marked protected endpoints

## Database Schema

All 6 tables from TypeORM have been migrated to Prisma:

1. **users** - User accounts with email, handle, password
2. **devices** - Device public keys for E2E encryption
3. **conversations** - Chat conversations (1:1 and groups)
4. **conversation_participants** - Many-to-many join table
5. **messages** - Encrypted message storage
6. **sessions** - JWT session management

## New npm Scripts

```json
{
  "prisma:generate": "prisma generate",
  "prisma:migrate": "prisma migrate dev",
  "prisma:studio": "prisma studio",
  "prisma:seed": "ts-node prisma/seed.ts"
}
```

## Usage

### Development Workflow

1. **Start Database**
   ```bash
   docker compose -f docker-compose.dev.yml up -d
   ```

2. **Run Migrations**
   ```bash
   cd backend
   npm run prisma:migrate
   ```

3. **Generate Prisma Client** (after schema changes)
   ```bash
   npm run prisma:generate
   ```

4. **Start Backend**
   ```bash
   npm run start:dev
   ```

5. **View API Documentation**
   Open browser to: http://localhost:3000/api/docs

### Prisma Studio (Database GUI)

```bash
npm run prisma:studio
```

Opens a web interface at http://localhost:5555 to view/edit data.

## API Documentation Access

**Swagger UI**: http://localhost:3000/api/docs

Features:
- Browse all endpoints by tag (auth, users, devices, conversations, messages)
- Try out API calls directly from the browser
- View request/response schemas
- Test JWT authentication
- See example payloads

## Breaking Changes

### For Frontend Developers

1. **No Changes Required** - All API endpoints remain the same
2. **Better Documentation** - Use Swagger UI to explore API
3. **Type Safety** - Response types are now documented in Swagger

### For Backend Developers

1. **Import Changes**
   ```typescript
   // Old (TypeORM)
   import { InjectRepository } from '@nestjs/typeorm';
   import { Repository } from 'typeorm';
   import { User } from './user.entity';
   
   // New (Prisma)
   import { PrismaService } from '../prisma/prisma.service';
   import type { User } from '@prisma/client';
   ```

2. **Query Syntax Changes**
   ```typescript
   // Old (TypeORM)
   const user = await this.usersRepository.findOne({ where: { email } });
   
   // New (Prisma)
   const user = await this.prisma.user.findUnique({ where: { email } });
   ```

3. **No More Repository Pattern**
   - Inject `PrismaService` instead of repositories
   - Use `prisma.user`, `prisma.device`, etc. directly

## Environment Variables

Added to `.env`:
```
DATABASE_URL="postgresql://ghostchannel:changeme@localhost:5432/ghostchannel?schema=public"
```

## Next Steps

1. **Optional**: Delete old TypeORM entity files (*.entity.ts) after confirming everything works
2. **Optional**: Remove TypeORM packages from package.json
3. **Testing**: Write integration tests using Prisma's testing utilities
4. **Seeding**: Create seed data in `prisma/seed.ts` for development

## Troubleshooting

### Prisma Client Not Found
```bash
npx prisma generate
```

### Database Out of Sync
```bash
npx prisma migrate reset  # WARNING: Deletes all data
npx prisma migrate dev
```

### TypeScript Errors
Restart TypeScript server in VS Code:
- Cmd/Ctrl + Shift + P
- "TypeScript: Restart TS Server"

## Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [NestJS Prisma Integration](https://docs.nestjs.com/recipes/prisma)
- [Swagger/OpenAPI in NestJS](https://docs.nestjs.com/openapi/introduction)
