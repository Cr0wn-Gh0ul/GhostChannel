import { useState, useCallback, useEffect } from 'react';
import { conversationsApi, messagesApi } from '../api/client';
import { Conversation } from '../utils/crypto-helpers';

interface UseConversationsParams {
  userId: string | undefined;
  setMessages: (conversationId: string, messages: any[]) => void;
}

export function useConversations({ userId, setMessages }: UseConversationsParams) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationFriends, setConversationFriends] = useState<Record<string, string>>({});

  const loadConversations = useCallback(async () => {
    try {
      const response = await conversationsApi.getAll();
      setConversations(response.data);
      
      // Load messages for all conversations to calculate unread counts
      for (const conv of response.data) {
        try {
          const messagesResponse = await messagesApi.getByConversation(conv.id);
          setMessages(conv.id, messagesResponse.data);
        } catch (err) {
          console.error(`Failed to load messages for conversation ${conv.id}:`, err);
        }
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  }, [setMessages]);

  // Rebuild conversationFriends mapping when conversations change
  useEffect(() => {
    if (conversations.length > 0 && userId) {
      const mapping: Record<string, string> = {};
      conversations.forEach((conv: Conversation) => {
        if (!conv.isGroup && conv.participants) {
          const otherParticipant = conv.participants.find((p: any) => p.userId !== userId);
          if (otherParticipant) {
            mapping[conv.id] = otherParticipant.userId;
          }
        }
      });
      setConversationFriends(mapping);
    }
  }, [conversations, userId]);

  const createConversation = useCallback(async (friendId: string) => {
    const response = await conversationsApi.create([friendId], false);
    const newConv = response.data;
    setConversations(prev => [...prev, newConv]);
    setConversationFriends(prev => ({ ...prev, [newConv.id]: friendId }));
    return newConv;
  }, []);

  const deleteConversationMessages = useCallback(async (conversationId: string) => {
    await conversationsApi.deleteMessages(conversationId);
    setMessages(conversationId, []);
  }, [setMessages]);

  return {
    conversations,
    conversationFriends,
    setConversationFriends,
    loadConversations,
    createConversation,
    deleteConversationMessages,
  };
}
