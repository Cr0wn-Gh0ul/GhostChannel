/**
 * WebSocket Service
 * 
 * Manages real-time Socket.IO connection to backend.
 * 
 * Features:
 * - Automatic reconnection
 * - JWT authentication via Socket.IO auth
 * - Message sending and read receipts
 * - Event-based architecture
 * 
 * Events:
 * - Client → Server: message:send, message:delivered, message:read
 * - Server → Client: message:new, user:online, user:offline, etc.
 * 
 * @module WebSocketService
 */

import { io, Socket } from 'socket.io-client';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3000';

let socket: Socket | null = null;

/**
 * Initialize WebSocket connection with JWT authentication
 * 
 * @param token - JWT token for authentication
 * @returns Socket.IO socket instance
 */
export const initializeSocket = (token: string) => {
  if (socket?.connected) {
    return socket;
  }

  socket = io(WS_URL, {
    auth: {
      token,
    },
  });

  socket.on('connect', () => {
    // Connection established
  });

  socket.on('disconnect', () => {
    // Connection closed
  });

  return socket;
};

/**
 * Get current socket instance
 * @returns Socket instance or null if not connected
 */
export const getSocket = () => socket;

/**
 * Disconnect and cleanup socket connection
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

/**
 * Send encrypted message via WebSocket
 * 
 * Message must already be encrypted before calling this function.
 * Server will relay the ciphertext to recipients.
 * 
 * @param data - Message data with ciphertext and metadata
 */
export const sendMessage = (data: {
  conversationId: string;
  senderDeviceId: string;
  ciphertext: string;
  nonce?: string;
  messageIndex?: number;
}) => {
  if (socket) {
    socket.emit('message:send', data);
  }
};

export const markDelivered = (messageId: string) => {
  if (socket) {
    socket.emit('message:delivered', { messageId });
  }
};

export const markRead = (messageId: string) => {
  if (socket) {
    socket.emit('message:read', { messageId });
  }
};
