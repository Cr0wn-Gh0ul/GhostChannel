import { useState, useCallback } from 'react';
import { messagesApi } from '../api/client';
import { socketService } from '../services/socket.service';
import { Message } from '../store/slices/messageSlice';

interface UseMessagesParams {
  userId: string | undefined;
  setMessages: (conversationId: string, messages: Message[]) => void;
  markRead: (messageId: string) => void;
  decryptMessage: (message: Message, friendIdHint?: string) => Promise<void>;
  recalculateUnreadCounts: () => void;
}

export function useMessages({
  userId,
  setMessages,
  markRead,
  decryptMessage,
  recalculateUnreadCounts,
}: UseMessagesParams) {
  const [loading, setLoading] = useState(false);

  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      setLoading(true);
      const response = await messagesApi.getByConversation(conversationId);
      setMessages(conversationId, response.data);
      
      // Mark all unread messages as read
      const unreadMessages = response.data.filter((msg: any) => 
        msg.senderUserId !== userId && !msg.readAt
      );
      
      for (const msg of unreadMessages) {
        socketService.markRead(msg.id);
        markRead(msg.id);
      }
      
      // Decrypt all messages
      for (const message of response.data) {
        await decryptMessage(message);
      }
      
      recalculateUnreadCounts();
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, setMessages, markRead, decryptMessage, recalculateUnreadCounts]);

  const sendMessage = useCallback(async (
    conversationId: string,
    deviceId: string,
    ciphertext: string,
    nonce: string
  ) => {
    return socketService.sendMessage({
      conversationId,
      senderDeviceId: deviceId,
      ciphertext,
      nonce,
    });
  }, []);

  return {
    loading,
    loadMessages,
    sendMessage,
  };
}
