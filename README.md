# 🔐 GhostChannel

<div align="center">

**Privacy-first end-to-end encrypted chat application**

*Device-to-device encryption • Zero-knowledge architecture • Real-time messaging*

![GhostChannel Screenshot](screenshot.png)

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=flat&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-DC382D?style=flat&logo=redis&logoColor=white)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)](https://www.docker.com/)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Technology Stack](#-technology-stack)
- [Architecture](#-architecture)
- [Cryptographic Design](#-cryptographic-design)
- [Quick Start](#-quick-start)
- [Project Structure](#-project-structure)
- [API Documentation](#-api-documentation)
- [Security Considerations](#-security-considerations)
- [Development](#-development)

---

## 🎯 Overview

GhostChannel is a modern, privacy-focused chat application demonstrating production-grade end-to-end encryption. Built as a portfolio project showcasing full-stack development skills, security best practices, and real-time communication architecture.

**Core Principles:**
- 🔒 **End-to-end encryption** - Server cannot decrypt messages
- 📱 **Device-specific keys** - Unique cryptographic identity per device
- 🚫 **Zero-knowledge server** - Minimal metadata storage
- ⚡ **Real-time sync** - WebSocket-based instant delivery
- 🎨 **Cyberpunk aesthetic** - Neon-themed terminal-inspired UI

### ⚠️ Important Notice

This application is built for **educational purposes only**. While following industry-standard cryptographic patterns, it has not undergone professional security auditing. Not recommended for production use without thorough security review.

**Threat Model:**
- ✅ Protects against passive database compromise
- ✅ Prevents server-side message decryption
- ✅ Resists basic man-in-the-middle attacks
- ⛔ Not audited for nation-state level threats
- ⛔ Does not implement perfect forward secrecy (yet)

---

## ✨ Key Features

### Implemented Features

- **🔐 End-to-End Encryption**
  - ECDH P-256 key exchange
  - AES-256-GCM authenticated encryption
  - Per-device cryptographic keys
  - Web Crypto API implementation

- **👥 User Management**
  - Email and username authentication
  - Device registration and management
  - Friend system with invite codes
  - Device revocation support

- **💬 Real-time Messaging**
  - WebSocket-based instant delivery
  - Message delivery and read receipts
  - Conversation management
  - Redis pub/sub for horizontal scaling

- **🎨 Modern UI/UX**
  - Cyberpunk-themed interface
  - Responsive design
  - Real-time system health monitoring
  - Scanline and glitch effects

### Architecture Highlights

- **Zero-knowledge server design** - Messages stored as ciphertext only
- **Device-to-device encryption** - Each device has unique keys
- **IndexedDB key storage** - Private keys encrypted and stored locally
- **JWT authentication** - Secure session management with httpOnly cookies
- **Swagger API documentation** - Complete OpenAPI specification

---

## 🛠 Technology Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| **React 18** | UI framework with hooks and concurrent features |
| **TypeScript** | Type safety and developer experience |
| **Redux Toolkit** | State management with persistence |
| **Tailwind CSS 4** | Utility-first styling with custom theme |
| **Vite** | Lightning-fast build tool and dev server |
| **Socket.IO Client** | WebSocket real-time communication |
| **Web Crypto API** | Browser-native cryptographic operations |

### Backend
| Technology | Purpose |
|------------|---------|
| **NestJS** | Enterprise-grade Node.js framework |
| **Prisma ORM** | Type-safe database client with migrations |
| **PostgreSQL** | Relational database for structured data |
| **Redis** | Pub/sub messaging and caching layer |
| **Socket.IO** | WebSocket server with fallback support |
| **Passport + JWT** | Authentication middleware |
| **Swagger/OpenAPI** | Automated API documentation |
| **Bcrypt** | Secure password hashing |

### DevOps
| Technology | Purpose |
|------------|---------|
| **Docker** | Containerization for consistent environments |
| **Docker Compose** | Multi-container orchestration |
| **GitHub Actions** | CI/CD pipeline (optional) |

---

## 🏗 Architecture

### System Overview

```mermaid
graph TB
    subgraph Client["Client Browser"]
        UI["React UI<br/>(Redux)"]
        Crypto["Web Crypto API"]
        Storage["IndexedDB<br/>(Private Keys)"]
    end
    
    subgraph Backend["Backend (NestJS)"]
        Auth["Auth Module<br/>(JWT/Bcrypt)"]
        WS["WebSocket Gateway"]
        Messages["Message Module<br/>(Ciphertext)"]
    end
    
    subgraph DB1["PostgreSQL"]
        Users[(Users)]
        Devices[(Devices)]
        MessagesDB[(Messages)]
        Keys[(Public Keys)]
    end
    
    subgraph DB2["Redis"]
        PubSub[(Pub/Sub)]
        Sessions[(Sessions)]
        Presence[(Presence)]
    end
    
    UI -->|REST API| Auth
    UI -->|WebSocket| WS
    UI -->|Encrypt/Decrypt| Crypto
    Crypto -->|Store Keys| Storage
    
    Auth --> DB1
    WS --> DB2
    Messages --> DB1
    WS --> DB1
    
    style Client fill:#1a1a24,stroke:#06b6d4,stroke-width:2px
    style Backend fill:#1a1a24,stroke:#ec4899,stroke-width:2px
    style DB1 fill:#0a0a0f,stroke:#06b6d4,stroke-width:2px
    style DB2 fill:#0a0a0f,stroke:#06b6d4,stroke-width:2px
```

### Data Flow

```mermaid
sequenceDiagram
    actor Alice
    participant UI as React UI
    participant Crypto as Web Crypto
    participant WS as WebSocket
    participant DB as PostgreSQL
    participant Cache as Redis
    participant Bob as Bob's Client
    
    Alice->>UI: Type message
    UI->>UI: Fetch Bob's public key
    UI->>Crypto: deriveKey(ECDH)
    Crypto->>Crypto: Generate nonce
    Crypto->>Crypto: AES-GCM encrypt
    Crypto-->>UI: {ciphertext, nonce}
    UI->>WS: emit('message:send')
    WS->>DB: INSERT ciphertext
    WS->>Cache: PUBLISH message
    Cache-->>Bob: message:new
    Bob->>Crypto: AES-GCM decrypt
    Crypto-->>Bob: plaintext message
```

**Message Send Flow:**
1. User types message in React UI
2. Frontend fetches recipient's device public keys
3. Message encrypted with AES-256-GCM for each recipient device
4. Shared secret derived via ECDH(sender_private, recipient_public)
5. Ciphertext + nonce sent to backend via WebSocket
6. Backend stores ciphertext in PostgreSQL
7. Backend publishes to Redis pub/sub
8. WebSocket gateway delivers to online recipients
9. Recipients decrypt locally using their private keys

---

## 🔐 Cryptographic Design

### Key Generation (Per Device)

When a device first registers:

```typescript
// 1. Generate ECDH P-256 keypair
const keypair = await crypto.subtle.generateKey(
  { name: 'ECDH', namedCurve: 'P-256' },
  true,
  ['deriveKey']
);

// 2. Export public key (sent to server)
const publicKeyJwk = await crypto.subtle.exportKey('jwk', keypair.publicKey);

// 3. Encrypt private key with device password (stored locally)
const encryptedPrivateKey = await encryptPrivateKey(keypair.privateKey, devicePassword);

// 4. Store in IndexedDB
await storeDeviceKeypair(encryptedPrivateKey, publicKeyJwk);
```

### Encryption Process

```typescript
// 1. Derive shared secret using ECDH
const sharedSecret = await crypto.subtle.deriveKey(
  { name: 'ECDH', public: recipientPublicKey },
  senderPrivateKey,
  { name: 'AES-GCM', length: 256 },
  false,
  ['encrypt']
);

// 2. Generate random 96-bit nonce
const nonce = crypto.getRandomValues(new Uint8Array(12));

// 3. Encrypt message with AES-256-GCM
const ciphertext = await crypto.subtle.encrypt(
  { name: 'AES-GCM', iv: nonce },
  sharedSecret,
  messageBytes
);

// 4. Send to server: { ciphertext, nonce, recipientDeviceId }
```

### Security Properties

| Property | Implementation |
|----------|----------------|
| **Confidentiality** | AES-256-GCM ensures only intended recipient can decrypt |
| **Authenticity** | GCM authentication tag prevents message tampering |
| **Key Isolation** | Each device has unique keypair, limiting compromise scope |
| **Server Blindness** | Server only stores ciphertext, cannot read content |
| **Nonce Uniqueness** | Cryptographically random 96-bit nonce per message |

### What Server Stores

```sql
-- messages table
{
  "id": "uuid",
  "conversation_id": "uuid",
  "sender_device_id": "uuid",
  "ciphertext": "base64_encrypted_data",  -- ✅ Only this
  "nonce": "base64_random_bytes",
  "created_at": "timestamp",
  "read_at": "timestamp"
}
```

**Server CANNOT access:**
- Message plaintext
- Shared secrets (derived client-side)
- Private keys (never leave client)

---

## 🚀 Quick Start

### Prerequisites

- **Docker** and **Docker Compose** installed
- **Node.js 20+** (for local development)
- **Git**

### One-Command Setup

```bash
# Clone and start
git clone https://github.com/yourusername/ghostChannel.git
cd ghostChannel
./setup.sh
```

The setup script will:
1. Copy environment templates
2. Start PostgreSQL and Redis containers
3. Run database migrations
4. Install dependencies
5. Start backend and frontend dev servers

**Access the application:**
- 🌐 Frontend: http://localhost:5173
- 🔌 Backend API: http://localhost:3000
- 📚 API Documentation: http://localhost:3000/api/docs

### Manual Setup

<details>
<summary><b>Click to expand manual installation steps</b></summary>

#### 1. Environment Configuration

```bash
# Backend environment
cp backend/.env.example backend/.env

# Frontend environment
cp frontend/.env.example frontend/.env
```

**Edit `backend/.env`:**
```env
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173

DATABASE_URL="postgresql://ghostchannel:changeme@localhost:5432/ghostchannel"
REDIS_URL=redis://localhost:6379

JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d
```

**Edit `frontend/.env`:**
```env
VITE_API_URL=http://localhost:3000
VITE_WS_URL=http://localhost:3000
```

#### 2. Start Infrastructure (PostgreSQL + Redis)

```bash
docker compose -f docker-compose.dev.yml up -d
```

#### 3. Backend Setup

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev
npm run start:dev
```

#### 4. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

</details>

### Docker Production Build

```bash
# Build and start all services
docker compose up --build

# Run in detached mode
docker compose up -d

# View logs
docker compose logs -f

# Stop all services
docker compose down
```

---

## 📁 Project Structure

```
ghostChannel/
├── 📂 backend/                    # NestJS Backend API
│   ├── 📂 src/
│   │   ├── 📂 auth/               # JWT authentication & session management
│   │   ├── 📂 users/              # User accounts & profiles
│   │   ├── 📂 devices/            # Device key registration & management
│   │   ├── 📂 conversations/      # Conversation logic & participants
│   │   ├── 📂 messages/           # Zero-knowledge message storage
│   │   ├── 📂 friends/            # Friend requests & invite codes
│   │   ├── 📂 websocket/          # Socket.IO gateway for real-time
│   │   ├── 📂 redis/              # Redis pub/sub client
│   │   ├── 📂 prisma/             # Prisma ORM service
│   │   └── 📂 health/             # Health check endpoint
│   ├── 📂 prisma/
│   │   ├── schema.prisma          # Database schema definition
│   │   └── 📂 migrations/         # Migration history
│   ├── Dockerfile
│   ├── README.md                  # Backend documentation
│   └── package.json
│
├── 📂 frontend/                   # React Frontend Application
│   ├── 📂 src/
│   │   ├── 📂 pages/              # React page components
│   │   │   ├── Home.tsx           # Landing page
│   │   │   ├── HowItWorks.tsx     # Technical documentation
│   │   │   ├── Login.tsx          # Authentication page
│   │   │   ├── Register.tsx       # User registration
│   │   │   ├── Chat.tsx           # Main chat interface
│   │   │   └── Settings.tsx       # User settings & device management
│   │   ├── 📂 components/         # Reusable UI components
│   │   ├── 📂 services/           # Client-side services
│   │   │   ├── crypto.ts          # Web Crypto API encryption
│   │   │   └── socket.service.ts  # WebSocket client
│   │   ├── 📂 api/                # API client libraries
│   │   │   ├── client.ts          # Axios HTTP client
│   │   │   └── websocket.ts       # Socket.IO connection
│   │   ├── 📂 store/              # Redux Toolkit state management
│   │   │   ├── index.ts           # Store configuration
│   │   │   └── 📂 slices/         # State slices
│   │   └── 📂 hooks/              # Custom React hooks
│   ├── Dockerfile
│   ├── README.md                  # Frontend documentation
│   └── package.json
│
├── docker-compose.yml             # Full production stack
├── docker-compose.dev.yml         # DB & Redis only (for local dev)
├── setup.sh                       # Automated setup script
└── README.md                      # This file
```

---

## 📡 API Documentation

### Interactive API Documentation

Full Swagger/OpenAPI documentation with interactive testing available at:

**🔗 http://localhost:3000/api/docs**

Features:
- Complete endpoint reference
- Request/response schemas
- Try-it-out functionality
- Authentication flow testing
- Data model definitions

### REST Endpoints

#### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/register` | Create new user account |
| `POST` | `/auth/login` | Login and register device |
| `POST` | `/auth/logout` | Clear session cookie |
| `GET` | `/auth/me` | Get current user info |

#### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/users/search?q=query` | Search users by handle/email |
| `GET` | `/users/:id` | Get user profile |
| `PATCH` | `/users/profile` | Update display name/avatar |
| `POST` | `/users/change-password` | Change account password |
| `DELETE` | `/users/account` | Delete user account |

#### Devices
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/devices` | Register device with public key |
| `GET` | `/devices` | List current user's devices |
| `GET` | `/devices/user/:userId/keys` | Get user's device public keys |
| `DELETE` | `/devices/:deviceId` | Revoke device access |

#### Friends
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/friends/invite-code` | Generate time-limited invite code |
| `POST` | `/friends/request` | Send friend request via code |
| `GET` | `/friends/requests` | List pending requests |
| `POST` | `/friends/requests/:id/respond` | Accept/reject request |
| `GET` | `/friends` | List all friends |

#### Conversations
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/conversations` | Create conversation with friend |
| `GET` | `/conversations` | List user's conversations |
| `GET` | `/conversations/:id` | Get conversation details |

#### Messages
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/messages/conversation/:id` | Fetch conversation messages |

### WebSocket Events

#### Client → Server
```typescript
// Send encrypted message
socket.emit('message:send', {
  conversationId: 'uuid',
  ciphertext: 'base64_encrypted_data',
  nonce: 'base64_nonce',
  recipientDeviceId: 'uuid'
});

// Mark message as read
socket.emit('message:read', {
  messageId: 'uuid'
});
```

#### Server → Client
```typescript
// New message received
socket.on('message:new', (message) => {
  // Decrypt and display message
});

// Message delivered confirmation
socket.on('message:delivered', ({ messageId, timestamp }) => {
  // Update UI
});

// Friend request notification
socket.on('friend:request', (request) => {
  // Show notification
});
```

---

## 🛡 Security Considerations

### Implemented Security Measures

✅ **Cryptography**
- ECDH P-256 key exchange (NIST standardized curve)
- AES-256-GCM authenticated encryption
- Web Crypto API (browser-native, constant-time operations)
- Cryptographically secure random nonce generation

✅ **Authentication**
- JWT tokens with httpOnly cookies (XSS protection)
- Bcrypt password hashing (10 rounds)
- Device-specific session management
- Automatic token expiration

✅ **Backend Security**
- Parameterized queries (SQL injection prevention)
- Input validation with class-validator
- CORS configuration
- Helmet.js security headers
- Rate limiting on auth endpoints

✅ **Data Protection**
- Private keys never transmitted to server
- Messages stored as ciphertext only
- IndexedDB encrypted key storage
- No message plaintext in server logs

### Known Limitations

⚠️ **Not Implemented (Yet)**
- Perfect Forward Secrecy (PFS)
- Key fingerprint verification UI
- Device verification out-of-band
- Professional security audit
- Penetration testing

⚠️ **Metadata Leakage**
- Server knows conversation participants
- Message timestamps visible
- Online/offline status tracked
- Message frequency observable

### Recommended Improvements

For production deployment:
1. Enable rate limiting on all endpoints
2. Implement CSRF tokens for state-changing operations
3. Add Content Security Policy headers
4. Set up audit logging for security events
5. Regular dependency vulnerability scanning
6. Professional cryptographic audit
7. Implement key rotation mechanisms

---

## 💻 Development

### Local Development Workflow

```bash
# One-command setup (starts infrastructure in dev mode)
./setup.sh

# This will automatically:
# 1. Start PostgreSQL + Redis containers
# 2. Run database migrations
# 3. Install dependencies
# 4. Start backend with hot reload
# 5. Start frontend with HMR

# Optional: Prisma Studio (database GUI)
cd backend
npm run prisma:studio
```

### Database Management

```bash
# Create new migration
cd backend
npx prisma migrate dev --name feature_name

# Reset database
npx prisma migrate reset

# View database in browser
npx prisma studio

# Generate Prisma client after schema changes
npx prisma generate
```

### Code Quality

```bash
# Backend linting
cd backend
npm run lint
npm run format

# Frontend linting
cd frontend
npm run lint
npm run format

# Type checking
npm run type-check
```

### Testing

```bash
# Backend unit tests
cd backend
npm run test

# Backend e2e tests
npm run test:e2e

# Frontend tests
cd frontend
npm run test
```

---

## 📊 Database Schema

### Core Tables

**users**
```sql
id                UUID PRIMARY KEY
email             VARCHAR UNIQUE
handle            VARCHAR UNIQUE
password_hash     VARCHAR
display_name      VARCHAR
avatar_color      VARCHAR
default_device_id UUID (nullable)
created_at        TIMESTAMP
```

**devices**
```sql
id                UUID PRIMARY KEY
user_id           UUID REFERENCES users(id)
public_key        TEXT (JWK format)
device_name       VARCHAR
last_seen_at      TIMESTAMP
revoked_at        TIMESTAMP (nullable)
created_at        TIMESTAMP
```

**conversations**
```sql
id                UUID PRIMARY KEY
device_a_id       UUID REFERENCES devices(id)
device_b_id       UUID REFERENCES devices(id)
last_message_at   TIMESTAMP
created_at        TIMESTAMP
```

**messages**
```sql
id                UUID PRIMARY KEY
conversation_id   UUID REFERENCES conversations(id)
sender_device_id  UUID REFERENCES devices(id)
ciphertext        TEXT              -- Encrypted message
nonce             VARCHAR           -- AES-GCM nonce
delivered_at      TIMESTAMP (nullable)
read_at           TIMESTAMP (nullable)
created_at        TIMESTAMP
```

**friends**
```sql
user_id           UUID REFERENCES users(id)
friend_id         UUID REFERENCES users(id)
created_at        TIMESTAMP
PRIMARY KEY (user_id, friend_id)
```

---

## 🎨 UI/UX Features

- **Cyberpunk Theme**: Neon cyan/pink color scheme with scanline effects
- **Responsive Design**: Mobile-friendly layouts
- **Real-time Health Check**: Live backend connectivity indicator
- **Glitch Effects**: Terminal-inspired animations
- **Accessibility**: Semantic HTML and ARIA labels

---

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details.

---

## 📬 Contact

**[troysalem.com](https://troysalem.com)**

---

<div align="center">

**⚠️ Educational Purposes Only - Not Audited for Production Use ⚠️**

</div>
