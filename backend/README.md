# GhostChannel Backend

Privacy-focused end-to-end encrypted chat application backend.

## 🔐 Security Architecture

### End-to-End Encryption
- **Key Exchange**: ECDH P-256 (Elliptic Curve Diffie-Hellman)
- **Encryption**: AES-256-GCM (Authenticated Encryption)
- **Key Storage**: Private keys stored client-side only (IndexedDB)
- **Server Role**: Zero-knowledge relay (cannot decrypt messages)

### Device-Specific Security
- Each device generates unique ECDH P-256 keypair
- Conversations are device-to-device (not user-to-user)
- Device revocation limits compromise exposure
- First device auto-set as default for offline messaging

### Authentication
- Password hashing: bcrypt (10 rounds)
- Session management: JWT tokens in httpOnly cookies
- Token expiration: 7 days
- Session tracking with device association

## 📁 Project Structure

```
src/
├── auth/              # Authentication (login, register, JWT)
├── users/             # User management and profiles
├── devices/           # Device key management
├── friends/           # Friend requests and relationships
├── conversations/     # Conversation creation and management
├── messages/          # Message storage (ciphertext only)
├── websocket/         # Real-time WebSocket gateway
├── redis/             # Redis pub/sub for multi-instance support
└── prisma/            # Database ORM and migrations
```

## 🛠️ Technology Stack

- **Framework**: NestJS 10.x
- **Database**: PostgreSQL (via Prisma ORM)
- **Cache/PubSub**: Redis
- **Real-time**: Socket.IO (WebSocket)
- **Authentication**: JWT (Passport.js)
- **API Docs**: Swagger/OpenAPI

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis 7+

### Installation

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your database credentials

# Run database migrations
npx prisma migrate dev

# Generate Prisma client
npx prisma generate

# Seed database (optional)
npx prisma db seed
```

### Development

```bash
# Start in development mode (with hot reload)
npm run start:dev

# View API documentation
# Navigate to http://localhost:3000/api/docs
```

### Production

```bash
# Build for production
npm run build

# Start production server
npm run start:prod
```

## 📚 API Documentation

API documentation is available via Swagger UI at `/api/docs` when the server is running.

### Key Endpoints

#### Authentication
- `POST /auth/register` - Create new user account
- `POST /auth/login` - Authenticate and create session
- `POST /auth/logout` - Clear session
- `POST /auth/check-device` - Check if device is new

#### Users
- `GET /users/me` - Get current user profile
- `PATCH /users/me` - Update profile
- `GET /users/search` - Search users by handle
- `POST /users/me/default-device` - Set default device

#### Devices
- `GET /devices` - List user's devices
- `POST /devices/:id/revoke` - Revoke device access
- `DELETE /devices/:id` - Delete device

#### Friends
- `POST /friends/invite-code` - Generate invite code
- `POST /friends/request` - Send friend request
- `POST /friends/request/:id/respond` - Accept/reject request
- `GET /friends` - List friends
- `GET /friends/requests` - List pending requests

#### Conversations
- `POST /conversations` - Create conversation
- `GET /conversations` - List user's conversations
- `GET /conversations/:id/messages` - Get conversation messages

#### Messages
- `POST /messages` - Send encrypted message
- `PATCH /messages/:id/read` - Mark message as read

### WebSocket Events

#### Client → Server
- `join_conversation` - Subscribe to conversation updates
- `leave_conversation` - Unsubscribe from conversation
- `send_message` - Send encrypted message
- `mark_read` - Mark message as read

#### Server → Client
- `message:new` - New message received
- `message:read` - Message marked as read
- `user:online` - Friend came online
- `user:offline` - Friend went offline
- `friend:request` - New friend request received
- `friend:accepted` - Friend request accepted
- `conversation:new` - New conversation created

## 🔒 Security Best Practices

### What the Server Stores
✅ User credentials (bcrypt hashed passwords)
✅ Device public keys (ECDH P-256)
✅ Encrypted message ciphertext
✅ Message metadata (timestamps, sender device)
✅ Friend relationships

### What the Server NEVER Sees
❌ Device private keys (stored client-side only)
❌ Plaintext messages
❌ Encryption keys derived from ECDH
❌ Message content (only ciphertext)

### Zero-Knowledge Architecture
The server acts as a relay for encrypted data. Even if the database is compromised, attackers cannot decrypt messages without access to client-side private keys.

### Device Isolation
Each device maintains its own cryptographic identity. Compromising one device does not expose conversations from other devices.

## 🧪 Testing

```bash
# Run unit tests
npm run test

# Run e2e tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## 📊 Database Schema

Key tables:
- `users` - User accounts and profiles
- `devices` - Device public keys and metadata
- `friendships` - Friend relationships
- `friend_requests` - Pending friend requests
- `conversations` - Conversation metadata
- `conversation_participants` - Conversation membership
- `messages` - Encrypted message storage
- `sessions` - Active user sessions

See `prisma/schema.prisma` for complete schema definition.

## 🔄 Redis Pub/Sub Channels

- `chat:messages` - New message events
- `chat:friends` - Friend request/acceptance events
- `chat:presence` - User online/offline events
- `chat:conversations` - Conversation creation events

Used for multi-instance scalability and real-time event distribution.

## 📝 Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/ghostchannel"

# Redis
REDIS_HOST="localhost"
REDIS_PORT=6379

# JWT
JWT_SECRET="your-secret-key-change-in-production"

# Server
PORT=3000
NODE_ENV="development"

# Frontend URL for CORS
FRONTEND_URL="http://localhost:5173"
```

## 🤝 Contributing

1. Follow NestJS coding conventions
2. Add JSDoc comments for public methods
3. Update API documentation for new endpoints
4. Write tests for new features
5. Run `npm run lint` before committing

## 📄 License

Private project - All rights reserved
