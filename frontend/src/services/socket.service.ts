import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

class SocketService {
  private socket: Socket | null = null;
  private messageCallbacks: Array<(message: any) => void> = [];
  private messageReadCallbacks: Array<(data: { messageId: string; readAt: string }) => void> = [];
  private presenceCallbacks: Array<(data: { userId: string; online: boolean }) => void> = [];
  private friendRequestCallbacks: Array<(request: any) => void> = [];
  private friendAcceptedCallbacks: Array<(friendship: any) => void> = [];
  private messagesDeletedCallbacks: Array<(data: { conversationId: string }) => void> = [];
  private newConversationCallbacks: Array<(conversation: any) => void> = [];
  private listenersSetup = false;

  connect() {
    // If socket exists and is connected, ensure listeners are set up
    if (this.socket?.connected) {
      console.log('[SocketService] Already connected, ensuring listeners are set up');
      this.setupSocketListeners();
      return;
    }

    // If socket exists but is NOT connected, try to reconnect
    if (this.socket && !this.socket.connected) {
      console.log('[SocketService] Socket exists but disconnected, reconnecting...');
      this.socket.connect();
      return;
    }

    // Only create a new socket if one doesn't exist
    console.log('[SocketService] Creating new WebSocket connection');
    this.socket = io(SOCKET_URL, {
      transports: ['websocket'],
      withCredentials: true, // Send cookies with WebSocket connection (includes auth token)
    });

    // Set up socket event listeners
    this.setupSocketListeners();
  }

  private setupSocketListeners() {
    if (!this.socket) return;
    
    // Prevent setting up listeners multiple times
    if (this.listenersSetup) {
      console.log('[SocketService] Listeners already setup, skipping');
      return;
    }

    console.log('[SocketService] Setting up socket listeners - current callbacks count:', {
      messages: this.messageCallbacks.length,
      messageRead: this.messageReadCallbacks.length,
      presence: this.presenceCallbacks.length,
      friendRequest: this.friendRequestCallbacks.length,
      friendAccepted: this.friendAcceptedCallbacks.length,
      messagesDeleted: this.messagesDeletedCallbacks.length,
      newConversation: this.newConversationCallbacks.length
    });
    this.listenersSetup = true;

    this.socket.on('connect', () => {
      console.log('[SocketService] WebSocket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('[SocketService] WebSocket disconnected');
    });

    this.socket.on('message:new', (message: any) => {
      console.log('[SocketService] Received message:new event:', message.id, 'callbacks:', this.messageCallbacks.length);
      this.messageCallbacks.forEach((cb) => cb(message));
    });

    this.socket.on('message:read', (data: { messageId: string; readAt: string }) => {
      this.messageReadCallbacks.forEach((cb) => cb(data));
    });

    this.socket.on('user:online', (data: { userId: string }) => {
      console.log('[SocketService] user:online event:', data, 'callbacks:', this.presenceCallbacks.length);
      this.presenceCallbacks.forEach((cb) => cb({ userId: data.userId, online: true }));
    });

    this.socket.on('user:offline', (data: { userId: string }) => {
      console.log('[SocketService] user:offline event:', data, 'callbacks:', this.presenceCallbacks.length);
      this.presenceCallbacks.forEach((cb) => cb({ userId: data.userId, online: false }));
    });

    this.socket.on('users:online', (data: { userIds: string[] }) => {
      // Initial list of online users when connecting
      console.log('[SocketService] users:online event:', data, 'callbacks:', this.presenceCallbacks.length);
      data.userIds.forEach((userId) => {
        this.presenceCallbacks.forEach((cb) => cb({ userId, online: true }));
      });
    });

    this.socket.on('friend:request', (request: any) => {
      this.friendRequestCallbacks.forEach((cb) => cb(request));
    });

    this.socket.on('friend:accepted', (friendship: any) => {
      this.friendAcceptedCallbacks.forEach((cb) => cb(friendship));
    });

    this.socket.on('messages:deleted', (data: { conversationId: string }) => {
      this.messagesDeletedCallbacks.forEach((cb) => cb(data));
    });

    this.socket.on('conversation:new', (conversation: any) => {
      console.log('[SocketService] conversation:new event:', conversation.id, 'callbacks:', this.newConversationCallbacks.length);
      this.newConversationCallbacks.forEach((cb) => cb(conversation));
    });
  }

  disconnect() {
    console.log('[SocketService] Disconnecting WebSocket');
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this.listenersSetup = false;
    }
    // Clear all callbacks
    this.messageCallbacks = [];
    this.messageReadCallbacks = [];
    this.presenceCallbacks = [];
    this.friendRequestCallbacks = [];
    this.friendAcceptedCallbacks = [];
    this.messagesDeletedCallbacks = [];
  }

  sendMessage(data: {
    conversationId: string;
    senderDeviceId: string;
    ciphertext: string;
    nonce?: string;
    messageIndex?: number;
  }): Promise<{ success: boolean; messageId?: string }> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit('message:send', data, (response: any) => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  }

  markDelivered(messageId: string) {
    if (this.socket) {
      this.socket.emit('message:delivered', { messageId });
    }
  }

  markRead(messageId: string) {
    if (this.socket) {
      this.socket.emit('message:read', { messageId });
    }
  }

  onMessage(callback: (message: any) => void) {
    this.messageCallbacks.push(callback);
    return () => {
      this.messageCallbacks = this.messageCallbacks.filter((cb) => cb !== callback);
      this.checkAndResetListeners();
    };
  }

  onMessageRead(callback: (data: { messageId: string; readAt: string }) => void) {
    this.messageReadCallbacks.push(callback);
    return () => {
      this.messageReadCallbacks = this.messageReadCallbacks.filter((cb) => cb !== callback);
      this.checkAndResetListeners();
    };
  }

  onPresenceChange(callback: (data: { userId: string; online: boolean }) => void) {
    console.log('[SocketService] Registering presence callback, total will be:', this.presenceCallbacks.length + 1);
    this.presenceCallbacks.push(callback);
    
    // Request current online users list when registering callback
    this.requestOnlineUsers();
    
    return () => {
      console.log('[SocketService] Unregistering presence callback');
      this.presenceCallbacks = this.presenceCallbacks.filter((cb) => cb !== callback);
      this.checkAndResetListeners();
    };
  }

  requestOnlineUsers() {
    if (this.socket?.connected) {
      console.log('[SocketService] Requesting online users list');
      this.socket.emit('request:online-users');
    }
  }

  onFriendRequest(callback: (request: any) => void) {
    this.friendRequestCallbacks.push(callback);
    return () => {
      this.friendRequestCallbacks = this.friendRequestCallbacks.filter((cb) => cb !== callback);
      this.checkAndResetListeners();
    };
  }

  onFriendAccepted(callback: (friendship: any) => void) {
    this.friendAcceptedCallbacks.push(callback);
    return () => {
      this.friendAcceptedCallbacks = this.friendAcceptedCallbacks.filter((cb) => cb !== callback);
      this.checkAndResetListeners();
    };
  }

  onFriendRequestResponse(callback: (data: { requestId: string; action: 'accept' | 'reject' }) => void) {
    if (this.socket) {
      this.socket.on('friend_request_response', callback);
    }
    return () => {
      if (this.socket) {
        this.socket.off('friend_request_response', callback);
      }
    };
  }

  onMessagesDeleted(callback: (data: { conversationId: string }) => void) {
    this.messagesDeletedCallbacks.push(callback);
    return () => {
      this.messagesDeletedCallbacks = this.messagesDeletedCallbacks.filter((cb) => cb !== callback);
      this.checkAndResetListeners();
    };
  }

  onNewConversation(callback: (conversation: any) => void) {
    this.newConversationCallbacks.push(callback);
    return () => {
      this.newConversationCallbacks = this.newConversationCallbacks.filter((cb) => cb !== callback);
      this.checkAndResetListeners();
    };
  }

  isConnected() {
    return this.socket?.connected || false;
  }

  private checkAndResetListeners() {
    // If no callbacks are registered, reset the listeners setup flag
    // This allows re-registration of socket listeners if the component remounts
    const hasCallbacks = 
      this.messageCallbacks.length > 0 ||
      this.messageReadCallbacks.length > 0 ||
      this.presenceCallbacks.length > 0 ||
      this.friendRequestCallbacks.length > 0 ||
      this.friendAcceptedCallbacks.length > 0 ||
      this.messagesDeletedCallbacks.length > 0;
    
    if (!hasCallbacks && this.listenersSetup) {
      console.log('[SocketService] No callbacks remaining, resetting listeners setup flag');
      this.listenersSetup = false;
    }
  }
}

export const socketService = new SocketService();
