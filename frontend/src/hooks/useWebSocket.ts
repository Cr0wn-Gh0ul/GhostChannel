import { useEffect, useState } from 'react';
import { socketService } from '../services/socket.service';
import { Message } from '../store/slices/messageSlice';

interface UseWebSocketParams {
  onMessage: (message: Message) => void;
  onMessageRead: (data: { messageId: string; readAt: string }) => void;
  onMessagesDeleted: (data: { conversationId: string }) => void;
  onFriendRequest: () => void;
  onFriendAccepted: () => void;
}

export function useWebSocket({
  onMessage,
  onMessageRead,
  onMessagesDeleted,
  onFriendRequest,
  onFriendAccepted,
}: UseWebSocketParams) {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const wasConnected = socketService.isConnected();
    
    // Only connect if not already connected
    if (!wasConnected) {
      socketService.connect();
    }

    // If already connected, skip listener setup to prevent duplicates
    if (wasConnected) {
      return () => {};
    }

    // Update connection status
    const checkConnection = setInterval(() => {
      setIsConnected(socketService.isConnected());
    }, 1000);

    const unsubscribeMessage = socketService.onMessage(onMessage);
    const unsubscribeMessageRead = socketService.onMessageRead(onMessageRead);
    const unsubscribeMessagesDeleted = socketService.onMessagesDeleted(onMessagesDeleted);
    const unsubscribeFriendRequest = socketService.onFriendRequest(onFriendRequest);
    const unsubscribeFriendAccepted = socketService.onFriendAccepted(onFriendAccepted);

    return () => {
      clearInterval(checkConnection);
      unsubscribeMessage();
      unsubscribeMessageRead();
      unsubscribeMessagesDeleted();
      unsubscribeFriendRequest();
      unsubscribeFriendAccepted();
    };
  }, [onMessage, onMessageRead, onMessagesDeleted, onFriendRequest, onFriendAccepted]);

  return { isConnected };
}
