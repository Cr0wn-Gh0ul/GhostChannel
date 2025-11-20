# GhostChannel Frontend

Privacy-focused end-to-end encrypted chat application frontend built with React and TypeScript.

## 🔐 Security Architecture

### Client-Side Encryption
- **Key Generation**: ECDH P-256 keypairs generated per device
- **Key Storage**: Private keys encrypted in IndexedDB, never transmitted
- **Message Encryption**: AES-256-GCM with random nonces
- **Key Exchange**: Automatic ECDH shared key derivation
- **Zero-Knowledge**: Server never sees plaintext or private keys

### Encryption Flow
```
1. Device Registration
   └─> Generate ECDH P-256 keypair
   └─> Store private key (encrypted in IndexedDB)
   └─> Send public key to server

2. Message Sending
   └─> Derive shared key (ECDH with friend's public key)
   └─> Encrypt message (AES-256-GCM)
   └─> Send ciphertext + nonce to server

3. Message Receiving
   └─> Receive ciphertext + nonce from server
   └─> Derive shared key (ECDH with sender's public key)
   └─> Decrypt message (AES-256-GCM)
```

## 🛠️ Technology Stack

- **Framework**: React 18.2 with TypeScript
- **State Management**: Redux Toolkit
- **Routing**: React Router 6
- **Styling**: Tailwind CSS 4 (cyberpunk theme)
- **Real-time**: Socket.IO client
- **HTTP Client**: Axios
- **Encryption**: Web Crypto API
- **Build Tool**: Vite

## 📁 Project Structure

```
src/
├── api/
│   ├── client.ts           # Axios API client with domain-specific methods
│   └── websocket.ts        # Socket.IO WebSocket management
├── components/
│   ├── catalyst/           # UI component library (buttons, inputs, etc.)
│   ├── ui/                 # Custom UI components
│   ├── Modal.tsx           # Modal dialogs
│   ├── ConfirmModal.tsx    # Confirmation dialogs
│   └── FriendsList.tsx     # Friends list component
├── hooks/
│   ├── useWebSocket.ts     # WebSocket connection hook
│   ├── useMessages.ts      # Message management hook
│   ├── useConversations.ts # Conversation management hook
│   └── useUnreadCounts.ts  # Unread message tracking
├── pages/
│   ├── Home.tsx            # Landing page
│   ├── HowItWorks.tsx      # Protocol documentation page
│   ├── Login.tsx           # Authentication
│   ├── Register.tsx        # User registration
│   ├── Chat.tsx            # Main chat interface
│   └── Settings.tsx        # User settings and device management
├── services/
│   ├── crypto.ts           # End-to-end encryption service
│   └── socket.ts           # WebSocket service wrapper
├── store/
│   ├── index.ts            # Redux store configuration
│   └── slices/
│       ├── authSlice.ts    # Authentication state
│       └── messagesSlice.ts # Message state
├── App.tsx                 # App component with routing
├── main.tsx                # Entry point
└── index.css               # Tailwind + custom cyberpunk styles
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Backend server running (see backend README)

### Installation

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with backend URLs
```

### Environment Variables

```env
# Backend API URL
VITE_API_URL=http://localhost:3000

# WebSocket URL
VITE_WS_URL=http://localhost:3000
```

### Development

```bash
# Start dev server with hot reload
npm run dev

# App will be available at http://localhost:5173
```

### Production

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## 🔒 Cryptography Details

### Key Management

#### Device Keypair Generation
```typescript
// ECDH P-256 keypair (generated once per device)
const keypair = await crypto.subtle.generateKey(
  { name: 'ECDH', namedCurve: 'P-256' },
  true,
  ['deriveKey', 'deriveBits']
);
```

#### Shared Key Derivation
```typescript
// Derive AES-256-GCM key from ECDH
const sharedKey = await crypto.subtle.deriveKey(
  { name: 'ECDH', public: friendPublicKey },
  myPrivateKey,
  { name: 'AES-GCM', length: 256 },
  false,
  ['encrypt', 'decrypt']
);
```

#### Message Encryption
```typescript
// AES-256-GCM with random 96-bit nonce
const nonce = crypto.getRandomValues(new Uint8Array(12));
const ciphertext = await crypto.subtle.encrypt(
  { name: 'AES-GCM', iv: nonce },
  sharedKey,
  messageBytes
);
```

### Security Features

✅ **Perfect Forward Secrecy**: Each device pair has unique shared keys
✅ **Authenticated Encryption**: GCM mode prevents tampering
✅ **Device Isolation**: Compromising one device doesn't affect others
✅ **Zero-Knowledge Server**: Backend never sees plaintext
✅ **Secure Storage**: Private keys encrypted in IndexedDB
✅ **Random Nonces**: Cryptographically secure randomness

### What's Stored Where

| Data | Storage Location | Encrypted? | Transmitted? |
|------|-----------------|------------|--------------|
| Private Keys | IndexedDB | ✅ Yes (AES-256-GCM) | ❌ Never |
| Public Keys | localStorage | ❌ No (non-sensitive) | ✅ To server |
| Shared Keys | Memory (Map) | N/A (derived) | ❌ Never |
| Message Ciphertext | Server DB | N/A (already encrypted) | ✅ Yes |
| Message Plaintext | Memory only | N/A | ❌ Never stored |
| JWT Tokens | httpOnly cookies | ❌ No | ✅ Yes |

## 📱 Features

### Authentication
- Email + password login
- Device naming for multi-device support
- Automatic device registration
- Session management with JWT

### Messaging
- End-to-end encrypted messages
- Real-time delivery via WebSocket
- Read receipts
- Message history
- Offline message queueing

### Friends
- Invite code system (time-limited)
- Friend request workflow
- Online/offline presence
- Friend list management

### Conversations
- Device-to-device conversations
- Multiple conversations per friend (one per device pair)
- Conversation locking based on device compatibility
- Conversation deletion

### Devices
- Multi-device support
- Device management interface
- Default device for offline messaging
- Device revocation
- Device renaming

### Security Settings
- Password change
- Device list and management
- Default device selection
- Account deletion

## 🎨 UI/UX

### Cyberpunk Theme
- Dark color scheme with neon accents
- Cyan/pink gradient highlights
- Glitch effects on headers
- Scanline overlays
- Grid backgrounds
- Terminal-style monospace fonts

### Responsive Design
- Mobile-first approach
- Adaptive layouts
- Touch-friendly controls
- Optimized for phones, tablets, desktops

## 🔄 State Management

### Redux Store Structure
```typescript
{
  auth: {
    user: User | null,
    device: Device | null,
    isAuthenticated: boolean
  },
  messages: {
    byConversation: {
      [conversationId]: Message[]
    },
    loading: boolean,
    error: string | null
  }
}
```

### WebSocket Events

#### Subscribed Events
- `message:new` - New message received
- `message:read` - Message marked as read
- `user:online` - Friend came online
- `user:offline` - Friend went offline
- `friend:request` - New friend request
- `friend:accepted` - Friend request accepted
- `conversation:new` - New conversation created

#### Emitted Events
- `message:send` - Send encrypted message
- `message:read` - Mark message as read
- `join_conversation` - Subscribe to conversation updates
- `leave_conversation` - Unsubscribe from conversation

## 🧪 Testing

```bash
# Run tests
npm run test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## 🔧 Development Guidelines

### Code Style
- Use TypeScript for type safety
- Follow React hooks best practices
- Use functional components only
- Implement proper error boundaries
- Add JSDoc comments for complex functions

### Security Best Practices
1. Never log sensitive data (private keys, plaintext messages)
2. Always derive fresh nonces for encryption
3. Validate all user inputs
4. Handle decryption failures gracefully
5. Clear sensitive data from memory when done

### Component Guidelines
- Keep components small and focused
- Use custom hooks for complex logic
- Memoize expensive computations
- Handle loading and error states
- Make components accessible (a11y)

## 📊 Performance Optimization

- **Code Splitting**: Lazy load routes
- **Memoization**: React.memo for expensive components
- **Virtualization**: Virtual scrolling for long message lists
- **Debouncing**: Search and input handling
- **Caching**: Derived shared keys cached in memory
- **Batching**: Redux state updates batched

## 🐛 Debugging

### Enable Debug Logging
```typescript
// In browser console
localStorage.setItem('debug', 'ghostchannel:*');
```

### Common Issues

**"[Key not available]" in messages**
- Key derivation hasn't completed yet
- Retry mechanism will attempt decryption automatically
- Check if friend's device public key is available

**WebSocket disconnections**
- Check backend server status
- Verify CORS configuration
- Check browser console for connection errors

**Decryption failures**
- Verify shared key derivation is working
- Check if correct device keys are being used
- Ensure message wasn't tampered with

## 📄 License

Private project - All rights reserved

## 🤝 Contributing

1. Follow TypeScript and React best practices
2. Add JSDoc comments for public functions
3. Write tests for new features
4. Update this README for significant changes
5. Run `npm run lint` before committing

## 🔗 Related Documentation

- [Backend README](../backend/README.md) - Server architecture and API
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) - Browser cryptography
- [Socket.IO Client](https://socket.io/docs/v4/client-api/) - WebSocket library
- [Redux Toolkit](https://redux-toolkit.js.org/) - State management
