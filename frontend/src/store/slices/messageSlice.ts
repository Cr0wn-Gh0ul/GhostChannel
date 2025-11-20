/**
 * Message Slice
 * 
 * Manages encrypted messages and their decryption state.
 * 
 * State Structure:
 * - messagesByConversation: Messages grouped by conversation ID
 * - loading: Loading state per conversation
 * 
 * Message Lifecycle:
 * 1. Receive ciphertext from server
 * 2. Store in Redux with encrypted data
 * 3. Decrypt asynchronously
 * 4. Update with decryptedText field
 * 
 * Security:
 * - Messages never persisted (memory only)
 * - Decryption happens in Chat component
 * - Decryption errors tracked per message
 * 
 * @module MessageSlice
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Message {
  id: string;
  conversationId: string;
  senderUserId: string;
  senderDeviceId: string;
  ciphertext: string;
  nonce?: string;
  messageIndex?: number;
  createdAt: string;
  deliveredAt?: string;
  readAt?: string;
  // Decrypted content (client-side only)
  decryptedText?: string;
  decryptionError?: string;
}

interface MessageState {
  // Messages grouped by conversation ID
  messagesByConversation: Record<string, Message[]>;
  // Loading states
  loading: Record<string, boolean>;
}

const initialState: MessageState = {
  messagesByConversation: {},
  loading: {},
};

const messageSlice = createSlice({
  name: 'messages',
  initialState,
  reducers: {
    /**
     * Add a new message to conversation
     * 
     * Prevents duplicates and maintains chronological sort.
     * 
     * @param action.payload - Message to add (with ciphertext)
     */
    addMessage: (state, action: PayloadAction<Message>) => {
      const message = action.payload;
      const existing = state.messagesByConversation[message.conversationId] || [];
      
      // Check if message already exists
      if (existing.some((m) => m.id === message.id)) {
        return;
      }
      
      state.messagesByConversation[message.conversationId] = [...existing, message].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    },
    
    /**
     * Set all messages for a conversation
     * 
     * Replaces existing messages with new set.
     * Used when loading conversation history.
     * 
     * @param action.payload.conversationId - Target conversation
     * @param action.payload.messages - Messages to set
     */
    setMessages: (state, action: PayloadAction<{ conversationId: string; messages: Message[] }>) => {
      const { conversationId, messages } = action.payload;
      state.messagesByConversation[conversationId] = messages.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    },
    
    /**
     * Update message with decrypted plaintext
     * 
     * Called after successful decryption.
     * Allows UI to show plaintext instead of "Decrypting...".
     * 
     * @param action.payload.messageId - Message ID to update
     * @param action.payload.decryptedText - Decrypted plaintext
     */
    updateDecryptedMessage: (state, action: PayloadAction<{ messageId: string; decryptedText: string }>) => {
      const { messageId, decryptedText } = action.payload;
      
      // Find and update the message
      Object.keys(state.messagesByConversation).forEach((conversationId) => {
        const messages = state.messagesByConversation[conversationId];
        const index = messages.findIndex((m) => m.id === messageId);
        if (index !== -1) {
          messages[index] = { ...messages[index], decryptedText };
        }
      });
    },
    
    markDelivered: (state, action: PayloadAction<string>) => {
      const messageId = action.payload;
      
      Object.keys(state.messagesByConversation).forEach((conversationId) => {
        const messages = state.messagesByConversation[conversationId];
        const index = messages.findIndex((m) => m.id === messageId);
        if (index !== -1) {
          messages[index] = { ...messages[index], deliveredAt: new Date().toISOString() };
        }
      });
    },
    
    markRead: (state, action: PayloadAction<string>) => {
      const messageId = action.payload;
      
      Object.keys(state.messagesByConversation).forEach((conversationId) => {
        const messages = state.messagesByConversation[conversationId];
        const index = messages.findIndex((m) => m.id === messageId);
        if (index !== -1) {
          messages[index] = { ...messages[index], readAt: new Date().toISOString() };
        }
      });
    },
    
    setLoading: (state, action: PayloadAction<{ conversationId: string; loading: boolean }>) => {
      const { conversationId, loading } = action.payload;
      state.loading[conversationId] = loading;
    },
    
    clearMessages: (state) => {
      state.messagesByConversation = {};
      state.loading = {};
    },
  },
});

export const {
  addMessage,
  setMessages,
  updateDecryptedMessage,
  markDelivered,
  markRead,
  setLoading,
  clearMessages,
} = messageSlice.actions;

export default messageSlice.reducer;
