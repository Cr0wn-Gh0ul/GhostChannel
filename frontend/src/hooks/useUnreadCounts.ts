import { useCallback, useEffect, useState } from 'react';
import { Message } from '../store/slices/messageSlice';

interface UseUnreadCountsParams {
  messagesByConversation: Record<string, Message[]>;
  conversationFriends: Record<string, string>;
  activeConversation: string | null;
  userId: string | undefined;
}

export function useUnreadCounts({
  messagesByConversation,
  conversationFriends,
  activeConversation,
  userId,
}: UseUnreadCountsParams) {
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  const calculateUnreadCounts = useCallback(() => {
    if (!userId) return;
    
    const counts: Record<string, number> = {};
    
    // Go through all conversations and count unread messages
    Object.entries(messagesByConversation).forEach(([conversationId, messages]) => {
      const friendId = conversationFriends[conversationId];
      
      if (!friendId || messages.length === 0 || conversationId === activeConversation) {
        return;
      }
      
      // Count messages that are from the friend (not from me) and not read
      const unreadCount = messages.filter(msg => 
        msg.senderUserId !== userId && !msg.readAt
      ).length;
      
      if (unreadCount > 0) {
        counts[friendId] = unreadCount;
      }
    });
    
    // Only update if actually different to prevent unnecessary re-renders
    const currentCountsStr = JSON.stringify(unreadCounts);
    const newCountsStr = JSON.stringify(counts);
    if (currentCountsStr !== newCountsStr) {
      setUnreadCounts(counts);
    }
  }, [userId, messagesByConversation, conversationFriends, activeConversation, unreadCounts]);

  useEffect(() => {
    calculateUnreadCounts();
  }, [calculateUnreadCounts]);

  return { unreadCounts, recalculate: calculateUnreadCounts };
}
