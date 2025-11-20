import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../store';
import { logout as logoutAction } from '../store/slices/authSlice';
import { Message } from '../store/slices/messageSlice';
import {
  addMessage as addMessageAction,
  setMessages as setMessagesAction,
  updateDecryptedMessage as updateDecryptedMessageAction,
  clearMessages as clearMessagesAction,
  markRead as markReadAction,
} from '../store/slices/messageSlice';
import { conversationsApi, messagesApi, devicesApi, friendsApi, usersApi } from '../api/client';
import { socketService } from '../services/socket.service';
import { CryptoService } from '../services/crypto';
import { FriendRequests } from '../components/FriendRequests';
import { FriendsList } from '../components/FriendsList';
import { ConversationsList } from '../components/ConversationsList';
import { Button } from '../components/catalyst/button';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';

interface Conversation {
  id: string;
  isGroup: boolean;
  groupName?: string;
  participants?: any[];
  createdByUserId?: string;
  createdByDeviceId?: string;
  targetDeviceId?: string;
  createdByDevice?: {
    id: string;
    deviceName: string;
  } | null;
  targetDevice?: {
    id: string;
    deviceName: string;
  } | null;
}

interface Friend {
  id: string;
  handle: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export default function Chat() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user, device } = useAppSelector((state) => state.auth);
  const { messagesByConversation } = useAppSelector((state) => state.messages);
  
  // Memoize action dispatchers to prevent unnecessary re-renders
  const logout = useCallback(() => dispatch(logoutAction()), [dispatch]);
  const addMessage = useCallback((message: Message) => dispatch(addMessageAction(message)), [dispatch]);
  const setMessages = useCallback((conversationId: string, messages: Message[]) => 
    dispatch(setMessagesAction({ conversationId, messages })), [dispatch]);
  const updateDecryptedMessage = useCallback((messageId: string, decryptedText: string) => 
    dispatch(updateDecryptedMessageAction({ messageId, decryptedText })), [dispatch]);
  const clearMessages = useCallback(() => dispatch(clearMessagesAction()), [dispatch]);
  const getMessages = useCallback((conversationId: string) => messagesByConversation[conversationId] || [], [messagesByConversation]);
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [conversationFriends, setConversationFriends] = useState<Record<string, string>>({});  // conversationId -> friendUserId
  const conversationFriendsRef = useRef<Record<string, string>>({});
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sharedKeys, setSharedKeys] = useState<Record<string, CryptoKey>>({});
  const [activeView, setActiveView] = useState<'friends' | 'conversations'>('friends');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedFriendRef = useRef<Friend | null>(null);
  const activeConversationRef = useRef<string | null>(null);
  const messagesByConversationRef = useRef<Record<string, Message[]>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [modalContent, setModalContent] = useState<{ title: string; message: string; type: 'info' | 'error' | 'success' | 'warning' }>({ title: '', message: '', type: 'info' });
  const [friendRequestCount, setFriendRequestCount] = useState(0);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [isConnected, setIsConnected] = useState(socketService.isConnected());
  const [friendCurrentDeviceId, setFriendCurrentDeviceId] = useState<string | null>(null);
  const [friendDevices, setFriendDevices] = useState<Record<string, string>>({}); // friendId -> currentDeviceId
  const [friendDefaultDevices, setFriendDefaultDevices] = useState<Record<string, string>>({}); // friendId -> defaultDeviceId
  
  // Load friend's current device when selected friend or online status changes
  useEffect(() => {
    const loadFriendDevice = async () => {
      if (selectedFriend) {
        try {
          const friendProfile = await usersApi.getUser(selectedFriend.id);
          
          // Load current device only if online
          if (onlineUsers.has(selectedFriend.id)) {
            const deviceId = friendProfile.data.currentDeviceId || null;
            setFriendCurrentDeviceId(deviceId);
            if (deviceId) {
              setFriendDevices(prev => ({ ...prev, [selectedFriend.id]: deviceId }));
            }
          } else {
            setFriendCurrentDeviceId(null);
          }
          
          // Load default device regardless of online status
          const defaultDeviceId = friendProfile.data.defaultDeviceId;
          if (defaultDeviceId) {
            setFriendDefaultDevices(prev => ({ ...prev, [selectedFriend.id]: defaultDeviceId }));
          }
        } catch (error) {
          console.warn('Failed to get friend device info:', error);
          setFriendCurrentDeviceId(null);
        }
      } else {
        setFriendCurrentDeviceId(null);
      }
    };
    loadFriendDevice();
  }, [selectedFriend, onlineUsers]);

  // Load device info for all online users in conversations
  useEffect(() => {
    const loadAllFriendDevices = async () => {
      const deviceUpdates: Record<string, string> = {};
      const defaultDeviceUpdates: Record<string, string> = {};
      
      for (const conv of conversations) {
        const participant = conv.participants?.find((p: any) => p.userId !== user?.id);
        const friendId = participant?.userId;
        
        if (friendId) {
          try {
            const friendProfile = await usersApi.getUser(friendId);
            // Load current device for online users
            if (onlineUsers.has(friendId)) {
              const deviceId = friendProfile.data.currentDeviceId;
              if (deviceId) {
                deviceUpdates[friendId] = deviceId;
              }
            }
            // Load default device for all users
            const defaultDeviceId = friendProfile.data.defaultDeviceId;
            if (defaultDeviceId) {
              defaultDeviceUpdates[friendId] = defaultDeviceId;
            }
          } catch (error) {
            console.warn('Failed to get friend device for', friendId, error);
          }
        }
      }
      
      // Replace (not merge) to remove offline users
      setFriendDevices(deviceUpdates);
      setFriendDefaultDevices(prev => ({ ...prev, ...defaultDeviceUpdates }));
    };
    
    loadAllFriendDevices();
  }, [conversations, onlineUsers, user?.id]);

  // Keep refs in sync with state
  useEffect(() => {
    selectedFriendRef.current = selectedFriend;
  }, [selectedFriend]);

  useEffect(() => {
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);

  // Retry failed decryptions when conversation is selected
  useEffect(() => {
    const retryFailedDecryptions = async () => {
      if (!activeConversation) return;
      
      const messages = messagesByConversation[activeConversation] || [];
      const failedMessages = messages.filter(
        msg => msg.decryptedText === '[Key not available]' || msg.decryptedText === '[Decryption failed]'
      );
      
      if (failedMessages.length > 0) {
        console.log(`[Chat] Retrying ${failedMessages.length} failed message(s) for conversation ${activeConversation}`);
        const friendId = conversationFriends[activeConversation];
        
        for (const message of failedMessages) {
          await decryptMessage(message, friendId);
        }
      }
    };
    
    retryFailedDecryptions();
  }, [activeConversation, messagesByConversation, conversationFriends]);

  useEffect(() => {
    conversationFriendsRef.current = conversationFriends;
  }, [conversationFriends]);

  useEffect(() => {
    messagesByConversationRef.current = messagesByConversation;
  }, [messagesByConversation]);

  useEffect(() => {
    console.log('[Chat] WebSocket useEffect triggered - auth state user:', user?.email, 'device:', device?.deviceName);
    
    // Don't connect until both user and device are available
    if (!user || !device) {
      console.log('[Chat] Auth incomplete, skipping WebSocket connection');
      return;
    }
    
    const wasConnected = socketService.isConnected();
    console.log('[Chat] WebSocket useEffect - wasConnected:', wasConnected);
    
    // Only connect if not already connected
    if (!wasConnected) {
      console.log('[Chat] Connecting to WebSocket');
      socketService.connect(); // Auth via httpOnly cookie
    } else {
      console.log('[Chat] Already connected, ensuring listeners are set up');
    }

    // ALWAYS register listeners - they get cleaned up when component unmounts
    // Update connection status
    const checkConnection = setInterval(() => {
      const connected = socketService.isConnected();
      if (connected !== isConnected) {
        console.log('[Chat] Connection status changed:', connected);
      }
      setIsConnected(connected);
    }, 1000);

    const unsubscribeMessage = socketService.onMessage(async (message: Message) => {
      console.log('[Chat] Received message via WebSocket:', message.id, 'for conversation:', message.conversationId);
      console.log('[Chat] Adding message to state via addMessage function');
      addMessage(message);
      
      // Only mark as read if message is in active conversation AND we can decrypt it (conversation is accessible)
      if (message.conversationId === activeConversationRef.current && message.senderUserId !== user?.id) {
        const conversation = conversations.find(c => c.id === message.conversationId);
        const hasAccess = conversation && device && (
          conversation.createdByDeviceId === device.id ||
          conversation.targetDeviceId === device.id ||
          (!conversation.createdByDeviceId && !conversation.targetDeviceId)
        );
        
        console.log('[Message Read] Checking if should mark as read:', {
          messageId: message.id,
          isActiveConversation: true,
          hasAccess,
          conversationDevices: conversation ? {
            creator: conversation.createdByDeviceId,
            target: conversation.targetDeviceId,
            myDevice: device?.id
          } : 'conversation not found'
        });
        
        if (hasAccess) {
          // Use WebSocket to mark as read (which will broadcast to sender)
          console.log('[Message Read] Marking message as read:', message.id);
          socketService.markRead(message.id);
          // Also mark in local state
          dispatch(markReadAction(message.id));
        }
      }
      
      // Determine friend ID for decryption
      let friendId = message.conversationId === activeConversationRef.current 
        ? selectedFriendRef.current?.id 
        : conversationFriendsRef.current[message.conversationId];
      
      // If no friend mapping exists, find it from conversation participants
      if (!friendId) {
        const conversation = conversations.find(c => c.id === message.conversationId);
        if (conversation && !conversation.isGroup) {
          // Find the other participant (not current user)
          const otherParticipant = conversation.participants?.find(p => p.userId !== user?.id);
          friendId = otherParticipant?.userId;
          
          // Update conversation mapping for future messages
          if (friendId) {
            console.log('[Chat] Auto-mapping conversation', message.conversationId, 'to friend', friendId);
            setConversationFriends(prev => ({ ...prev, [message.conversationId]: friendId! }));
            // Recalculate unread counts now that we have the mapping
            setTimeout(() => calculateUnreadCounts(), 50);
          }
        } else if (!conversation) {
          // Message is for a conversation we don't know about - reload conversations
          console.log('[Chat] Received message for unknown conversation, reloading conversations');
          loadConversations();
        }
      }
      
      console.log('[Chat] Decrypting message with friendId:', friendId);
      await decryptMessage(message, friendId);
      
      // Recalculate unread counts after adding message
      // Use setTimeout to ensure state is updated first
      setTimeout(() => calculateUnreadCounts(), 100);
    });

    const unsubscribeMessageRead = socketService.onMessageRead(({ messageId }) => {
      // Update the message in Redux to show it was read
      dispatch(markReadAction(messageId));
    });

    const unsubscribeMessagesDeleted = socketService.onMessagesDeleted((data) => {
      // Clear messages for this conversation
      setMessages(data.conversationId, []);
    });

    // Listen for friend requests to update badge count
    const unsubscribeFriendRequest = socketService.onFriendRequest(() => {
      // Reload friend request count
      loadFriendRequestCount();
    });

    const unsubscribeFriendAccepted = socketService.onFriendAccepted(() => {
      // Reload conversations when friend request is accepted
      loadConversations();
    });

    const unsubscribeNewConversation = socketService.onNewConversation((conversation) => {
      console.log('[Chat] New conversation created:', conversation);
      // Reload conversations to get the new one
      loadConversations();
    });

    // Listen for presence changes
    const unsubscribePresence = socketService.onPresenceChange(({ userId, online }) => {
      console.log('[Chat] Presence change received:', userId, online);
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        if (online) {
          next.add(userId);
        } else {
          next.delete(userId);
        }
        console.log('[Chat] Online users updated:', Array.from(next));
        return next;
      });
    });

    return () => {
      clearInterval(checkConnection);
      unsubscribeMessage();
      unsubscribeMessageRead();
      unsubscribeMessagesDeleted();
      unsubscribeFriendRequest();
      unsubscribeFriendAccepted();
      unsubscribeNewConversation();
      unsubscribePresence();
      // Don't disconnect - keep the socket alive for the app
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  useEffect(() => {
    loadConversations();
    loadFriendRequestCount();
  }, []);

  // Reload conversations when user or device changes (e.g., after new device login)
  useEffect(() => {
    if (user && device) {
      console.log('[Chat] User/device changed, reloading conversations');
      loadConversations();
    }
  }, [user?.id, device?.id]);

  // Rebuild conversationFriends mapping when conversations change
  useEffect(() => {
    if (conversations.length > 0 && user) {
      const mapping: Record<string, string> = {};
      conversations.forEach((conv: Conversation) => {
        if (!conv.isGroup && conv.participants) {
          const otherParticipant = conv.participants.find((p: any) => p.userId !== user?.id);
          if (otherParticipant) {
            mapping[conv.id] = otherParticipant.userId;
          }
        }
      });
      setConversationFriends(mapping);
      
      // Recalculate unread counts when conversations change
      calculateUnreadCounts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations, user]);

  // Recalculate unread counts when messages change
  useEffect(() => {
    calculateUnreadCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messagesByConversation, conversationFriends, activeConversation]);

  useEffect(() => {
    if (activeConversation) {
      loadMessages(activeConversation);
    }
  }, [activeConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesByConversation, activeConversation]);

  const loadConversations = async () => {
    try {
      const response = await conversationsApi.getAll();
      console.log('[Chat] Loaded conversations:', response.data.length, response.data);
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
  };

  const loadFriendRequestCount = async () => {
    try {
      const response = await friendsApi.getPendingRequests();
      setFriendRequestCount(response.data.received.length);
    } catch (error) {
      console.error('Failed to load friend request count:', error);
    }
  };

  const canAccessConversation = (conversationId: string): boolean => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (!conversation || !device) return false;
    
    // Check if current device is involved in this conversation
    const hasDeviceAccess = (
      conversation.createdByDeviceId === device.id ||
      conversation.targetDeviceId === device.id ||
      (!conversation.createdByDeviceId && !conversation.targetDeviceId) // Old conversations without device restrictions
    );
    
    return hasDeviceAccess;
  };

  const loadMessages = async (conversationId: string) => {
    try {
      setLoading(true);
      const response = await messagesApi.getByConversation(conversationId);
      setMessages(conversationId, response.data);
      
      // Only mark messages as read if we can actually decrypt them (conversation is accessible)
      const hasAccess = canAccessConversation(conversationId);
      if (hasAccess) {
        const unreadMessages = response.data.filter((msg: any) => 
          msg.senderUserId !== user?.id && !msg.readAt
        );
        
        for (const msg of unreadMessages) {
          // Mark as read via WebSocket (broadcasts to sender AND updates backend)
          socketService.markRead(msg.id);
          // Update local Redux state immediately
          dispatch(markReadAction(msg.id));
        }
      }
      
      // If conversation is REDACTED, don't decrypt - just show [REDACTED] immediately
      if (!hasAccess) {
        for (const message of response.data) {
          updateDecryptedMessage(message.id, '[REDACTED]');
        }
        // Don't call calculateUnreadCounts here - preserve unread badges for REDACTED conversations
        return;
      }
      
      for (const message of response.data) {
        await decryptMessage(message);
      }
      
      // Recalculate unread counts after marking messages as read
      calculateUnreadCounts();
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const getOrDeriveSharedKey = async (otherUserId: string, otherDeviceId?: string): Promise<CryptoKey | null> => {
    // Create a unique key for device-specific shared keys
    const keyId = otherDeviceId ? `${otherUserId}-${otherDeviceId}` : otherUserId;
    
    if (sharedKeys[keyId]) {
      return sharedKeys[keyId];
    }

    try {
      const myKeypair = await CryptoService.loadDeviceKeypair();
      if (!myKeypair) return null;

      let otherPublicKey: CryptoKey;
      
      if (otherDeviceId) {
        // Try to get specific device key first
        try {
          const response = await devicesApi.getUserKeys(otherUserId);
          const userDevices = response.data;
          const targetDevice = userDevices.find((d: any) => d.id === otherDeviceId);
          
          if (targetDevice) {
            otherPublicKey = await CryptoService.importPublicKey(targetDevice.publicKey);
          } else {
            // Device not found, might be revoked or we don't have access
            console.warn(`Device ${otherDeviceId} not found for user ${otherUserId}`);
            return null;
          }
        } catch (error) {
          console.warn(`Failed to get specific device ${otherDeviceId}:`, error);
          return null;
        }
      } else {
        // Fallback: use current device (for new messages)
        const response = await devicesApi.getUserKeys(otherUserId);
        const userDevices = response.data;
        if (userDevices.length === 0) return null;
        
        otherPublicKey = await CryptoService.importPublicKey(userDevices[0].publicKey);
      }

      const sharedKey = await CryptoService.deriveSharedSecret(myKeypair.privateKey, otherPublicKey);

      setSharedKeys(prev => ({ ...prev, [keyId]: sharedKey }));
      return sharedKey;
    } catch (error) {
      console.error('Failed to derive shared key:', error);
      return null;
    }
  };

  const decryptMessage = async (message: Message, friendIdHint?: string) => {
    try {
      if (!message.nonce) {
        updateDecryptedMessage(message.id, atob(message.ciphertext));
        return;
      }

      // Find conversation for context but don't restrict access based on device IDs
      // This allows Bob to decrypt Alice's old messages regardless of device changes
      const conversation = conversations.find(c => c.id === message.conversationId);
      
      // For device-to-device encryption, we need to determine which devices were involved
      let keyUserId: string | null = null;
      let otherDeviceId: string | undefined = undefined;
      
      if (message.senderUserId === user?.id) {
        // This is our own message - find the other participant
        keyUserId = friendIdHint || conversationFriends[message.conversationId];
        
        if (!keyUserId && conversation) {
          const otherParticipant = conversation.participants?.find(
            (p: any) => p.userId !== user?.id
          );
          keyUserId = otherParticipant?.userId || null;
        }
        
        // For our own messages, determine the other device from conversation if available
        if (conversation) {
          if (conversation.createdByDeviceId === device?.id) {
            otherDeviceId = conversation.targetDeviceId || undefined;
          } else {
            otherDeviceId = conversation.createdByDeviceId || undefined;
          }
        }
      } else {
        // Received message - use sender's ID and sender's device ID
        keyUserId = message.senderUserId;
        otherDeviceId = message.senderDeviceId;
        
        // CRITICAL FIX: For Bob reading Alice's old messages:
        // The message.senderDeviceId is Alice's OLD device ID (when she sent the message)
        // Bob should use Alice's OLD device ID to derive the key, not her current one
        console.log('[Decryption] Received message from device:', otherDeviceId, 'user:', keyUserId);
      }

      if (!keyUserId) {
        console.warn('No recipient found for message', {
          messageId: message.id,
          conversationId: message.conversationId,
          senderDeviceId: message.senderDeviceId,
          conversationDevices: conversation ? {
            creator: conversation.createdByDeviceId,
            target: conversation.targetDeviceId
          } : 'conversation not found'
        });
        updateDecryptedMessage(message.id, '[No recipient]');
        return;
      }

      console.log(`[Decryption] Trying to decrypt message ${message.id} for user ${keyUserId}, device: ${otherDeviceId}`);
      
      // First, try simple user key (for backwards compatibility with older messages)
      let sharedKey = await getOrDeriveSharedKey(keyUserId);
      
      if (sharedKey && message.nonce) {
        try {
          const decrypted = await CryptoService.decryptMessage(message.ciphertext, message.nonce, sharedKey);
          console.log(`✓ Successfully decrypted with simple user key for: ${keyUserId}`);
          updateDecryptedMessage(message.id, decrypted);
          return;
        } catch (error) {
          console.log(`✗ Simple user key failed for ${keyUserId}, trying device-specific keys...`);
        }
      }
      
      // If simple key fails and we have a device ID, try device-specific key
      if (otherDeviceId) {
        sharedKey = await getOrDeriveSharedKey(keyUserId, otherDeviceId);
        if (sharedKey && message.nonce) {
          try {
            const decrypted = await CryptoService.decryptMessage(message.ciphertext, message.nonce, sharedKey);
            console.log(`✓ Successfully decrypted with device key: ${otherDeviceId}`);
            updateDecryptedMessage(message.id, decrypted);
            return;
          } catch (error) {
            console.log(`✗ Device key ${otherDeviceId} failed, trying all available devices...`);
          }
        }
      }
      
      // Try all available device keys as final fallback
      try {
        const response = await devicesApi.getUserKeys(keyUserId);
        const userDevices = response.data;
        
        for (const device of userDevices) {
          try {
            const deviceKey = await getOrDeriveSharedKey(keyUserId, device.id);
            if (deviceKey && message.nonce) {
              const decrypted = await CryptoService.decryptMessage(message.ciphertext, message.nonce, deviceKey);
              console.log(`✓ Successfully decrypted with device key: ${device.id}`);
              updateDecryptedMessage(message.id, decrypted);
              return;
            }
          } catch (deviceError) {
            console.log(`✗ Failed with device ${device.id}:`, deviceError);
            continue;
          }
        }
      } catch (error) {
        console.warn('Failed to get user devices:', error);
      }
      
      console.error(`All decryption attempts failed for message ${message.id}`);
      updateDecryptedMessage(message.id, '[Key not available]');
      
      // Retry after 2 seconds, then again after 5 seconds if still failing
      const retryDecryption = async (attempt: number, delay: number) => {
        setTimeout(async () => {
          const currentMessages = messagesByConversationRef.current[message.conversationId] || [];
          const currentMsg = currentMessages.find((m: Message) => m.id === message.id);
          
          if (currentMsg?.decryptedText === '[Key not available]') {
            console.log(`[Retry ${attempt}] Attempting to decrypt message ${message.id} after ${delay}ms delay`);
            
            // Try device-specific key again
            if (otherDeviceId) {
              try {
                const retryKey = await getOrDeriveSharedKey(keyUserId, otherDeviceId);
                if (retryKey && message.nonce) {
                  const decrypted = await CryptoService.decryptMessage(message.ciphertext, message.nonce, retryKey);
                  console.log(`✓ [Retry ${attempt}] Successfully decrypted with device key: ${otherDeviceId}`);
                  updateDecryptedMessage(message.id, decrypted);
                  return;
                }
              } catch (retryError) {
                console.log(`✗ [Retry ${attempt}] Failed with device ${otherDeviceId}:`, retryError);
              }
            }
            
            // Try all devices again
            try {
              const response = await devicesApi.getUserKeys(keyUserId);
              const userDevices = response.data;
              
              for (const device of userDevices) {
                try {
                  const deviceKey = await getOrDeriveSharedKey(keyUserId, device.id);
                  if (deviceKey && message.nonce) {
                    const decrypted = await CryptoService.decryptMessage(message.ciphertext, message.nonce, deviceKey);
                    console.log(`✓ [Retry ${attempt}] Successfully decrypted with device key: ${device.id}`);
                    updateDecryptedMessage(message.id, decrypted);
                    // Mark as read if this was in active conversation
                    if (message.conversationId === activeConversationRef.current && message.senderUserId !== user?.id) {
                      socketService.markRead(message.id);
                      dispatch(markReadAction(message.id));
                    }
                    return;
                  }
                } catch (deviceError) {
                  console.log(`✗ [Retry ${attempt}] Failed with device ${device.id}:`, deviceError);
                  continue;
                }
              }
              
              // If this was the first retry and it still failed, schedule another retry
              if (attempt === 1) {
                retryDecryption(2, 3000);
              }
            } catch (error) {
              console.warn(`[Retry ${attempt}] Failed to get user devices:`, error);
            }
          }
        }, delay);
      };
      
      retryDecryption(1, 2000);
    } catch (error) {
      console.error('Decryption failed:', error);
      updateDecryptedMessage(message.id, '[Decryption failed]');
    }
  };

  const showModal = (title: string, message: string, type: 'info' | 'error' | 'success' | 'warning' = 'info') => {
    setModalContent({ title, message, type });
    setModalOpen(true);
  };

  const calculateUnreadCounts = useCallback(() => {
    if (!user) return;
    
    const friendCounts: Record<string, number> = {};
    const conversationCounts: Record<string, number> = {};
    
    // Go through all conversations and count unread messages
    Object.entries(messagesByConversation).forEach(([conversationId, messages]) => {
      const friendId = conversationFriends[conversationId];
      
      // Skip if no messages (deleted conversation)
      if (messages.length === 0) return;
      
      // Skip active conversation ONLY if it's accessible (not REDACTED)
      // Keep unread count for REDACTED conversations even when active
      if (conversationId === activeConversation) {
        const conversation = conversations.find(c => c.id === conversationId);
        const isAccessible = conversation && device && (
          conversation.createdByDeviceId === device.id ||
          conversation.targetDeviceId === device.id ||
          (!conversation.createdByDeviceId && !conversation.targetDeviceId)
        );
        // Only skip if accessible (messages were marked as read)
        if (isAccessible) return;
      }
      
      // Count messages that are from the friend (not from me) and not read
      const unreadCount = messages.filter(msg => 
        msg.senderUserId !== user.id && !msg.readAt
      ).length;
      
      if (unreadCount > 0) {
        // Store by conversation ID for conversations tab
        conversationCounts[conversationId] = unreadCount;
        
        // Also store by friend ID for contacts tab (aggregate multiple device conversations)
        if (friendId) {
          friendCounts[friendId] = (friendCounts[friendId] || 0) + unreadCount;
        }
      }
    });
    
    // Combine both for the unreadCounts state
    const allCounts = { ...friendCounts, ...conversationCounts };
    
    // Only update if actually different to prevent unnecessary re-renders
    const currentCountsStr = JSON.stringify(unreadCounts);
    const newCountsStr = JSON.stringify(allCounts);
    if (currentCountsStr !== newCountsStr) {
      setUnreadCounts(allCounts);
    }
  }, [user, messagesByConversation, conversationFriends, activeConversation, unreadCounts, conversations, device]);

  // Calculate total unread count for conversations tab
  const getConversationUnreadCount = (): number => {
    if (!user || !device) return 0;
    
    let totalCount = 0;
    
    // Filter device-to-device conversations that involve current device
    const deviceConversations = conversations.filter(conv => {
      if (conv.isGroup) return false;
      return conv.createdByDeviceId === device.id || conv.targetDeviceId === device.id;
    });
    
    deviceConversations.forEach(conversation => {
      const messages = messagesByConversation[conversation.id] || [];
      const unreadCount = messages.filter(msg => 
        msg.senderUserId !== user.id && !msg.readAt
      ).length;
      totalCount += unreadCount;
    });
    
    return totalCount;
  };

  const handleSelectFriend = async (friend: Friend) => {
    setSelectedFriend(friend);
    
    if (!device || !user) return;
    
    try {
      // Get friend's current device info if they're online
      let friendCurrentDeviceId: string | undefined = undefined;
      try {
        const friendProfile = await usersApi.getUser(friend.id);
        friendCurrentDeviceId = friendProfile.data.currentDeviceId || undefined;
      } catch (error) {
        console.warn('Could not get friend current device:', error);
      }
      
      // If friend is online, look for conversation with CURRENT devices
      if (friendCurrentDeviceId) {
        const currentDeviceConv = conversations.find(conv => {
          const isDeviceMatch = (
            (conv.createdByDeviceId === device.id && conv.targetDeviceId === friendCurrentDeviceId) ||
            (conv.createdByDeviceId === friendCurrentDeviceId && conv.targetDeviceId === device.id)
          );
          const isWithFriend = conv.participants?.some(p => p.userId === friend.id);
          return isDeviceMatch && isWithFriend;
        });
        
        if (currentDeviceConv) {
          // Use existing conversation with current devices
          setActiveConversation(currentDeviceConv.id);
          setConversationFriends(prev => ({ ...prev, [currentDeviceConv.id]: friend.id }));
          setActiveView('conversations');
          await loadMessages(currentDeviceConv.id);
          return;
        }
      }
      
      // If no current device conversation, create new one
      const response = await conversationsApi.create(
        [friend.id],
        false,
        undefined,
        device.id,
        friendCurrentDeviceId // Use friend's current device if online, undefined otherwise
      );
      const newConv = response.data;
      setConversations(prev => [...prev, newConv]);
      setActiveConversation(newConv.id);
      setConversationFriends(prev => ({ ...prev, [newConv.id]: friend.id }));
      setActiveView('conversations');
      await loadMessages(newConv.id);
      // Reload conversations to get updated device info
      setTimeout(() => loadConversations(), 100);
    } catch (error: any) {
      console.error('Failed to start conversation:', error);
      const errorMsg = error.response?.data?.message || 'Failed to start conversation';
      showModal('Error', errorMsg, 'error');
    }
  };

  const handleSelectConversation = async (conversationId: string, friendId?: string) => {
    setActiveConversation(conversationId);
    setActiveView('conversations');
    
    // Set the conversation-friend mapping
    if (friendId) {
      setConversationFriends(prev => ({ ...prev, [conversationId]: friendId }));
      
      // Also set selectedFriend if we have the friend info
      const conversation = conversations.find(c => c.id === conversationId);
      const participant = conversation?.participants?.find(p => p.userId === friendId);
      if (participant && participant.user) {
        setSelectedFriend(participant.user);
      }
    }
    
    await loadMessages(conversationId);
  };

  const handleDeleteConversation = async (conversationId: string, friendName: string, deleteMessages = false) => {
    try {
      // Delete conversation (backend handles message deletion if requested)
      await conversationsApi.delete(conversationId, deleteMessages);
      // Remove from local state
      setConversations(prev => prev.filter(c => c.id !== conversationId));
      // Clear active conversation if it was the deleted one
      if (activeConversation === conversationId) {
        setActiveConversation(null);
      }
      const message = deleteMessages 
        ? `Conversation with ${friendName} and all messages deleted successfully`
        : `Conversation with ${friendName} removed from your list`;
      showModal('Success', message, 'success');
    } catch (error: any) {
      console.error('Failed to delete conversation:', error);
      const errorMsg = error.response?.data?.message || 'Failed to delete conversation';
      showModal('Error', errorMsg, 'error');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !activeConversation || !device || !user || !selectedFriend) return;

    try {
      setLoading(true);
      
      // Ensure conversationFriends mapping is set before sending
      setConversationFriends(prev => ({ ...prev, [activeConversation]: selectedFriend.id }));
      
      // Get the conversation to determine which device to encrypt for
      const conversation = conversations.find(c => c.id === activeConversation);
      let targetDeviceId: string | undefined;
      
      if (conversation) {
        // Determine the friend's device in this conversation
        if (conversation.createdByUserId === user.id) {
          targetDeviceId = conversation.targetDeviceId || undefined;
        } else {
          targetDeviceId = conversation.createdByDeviceId || undefined;
        }
      }
      
      console.log('[Send] Deriving encryption key for:', {
        friendId: selectedFriend.id,
        targetDeviceId,
        conversationId: activeConversation
      });
      
      // Derive the appropriate key - device-specific if we have a device, otherwise user-level
      const sharedKey = targetDeviceId 
        ? await getOrDeriveSharedKey(selectedFriend.id, targetDeviceId)
        : await getOrDeriveSharedKey(selectedFriend.id);
        
      if (!sharedKey) {
        console.error('Could not establish encryption - key derivation failed');
        showModal('Error', 'Could not establish secure connection. Please try again.', 'error');
        return;
      }

      console.log('[Send] Key derived successfully, encrypting message...');
      const { ciphertext, nonce } = await CryptoService.encryptMessage(messageText, sharedKey);

      console.log('[Send] Sending encrypted message to conversation:', activeConversation);
      const result = await socketService.sendMessage({
        conversationId: activeConversation,
        senderDeviceId: device.id,
        ciphertext,
        nonce,
      });
      console.log('[Send] Message sent successfully:', result);

      setMessageText('');
    } catch (error) {
      console.error('Failed to send message:', error);
      showModal('Error', 'Failed to send message. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const switchToCurrentDeviceConversation = async () => {
    if (!selectedFriend || !device || !user) return;
    
    try {
      setLoading(true);
      
      // Get friend's current device info
      const friendProfile = await usersApi.getUser(selectedFriend.id);
      const friendCurrentDeviceId = friendProfile.data.currentDeviceId;
      
      if (!friendCurrentDeviceId) {
        showModal('Error', 'Friend is not currently online', 'error');
        return;
      }
      
      // Check if a conversation already exists between current devices
      const existingConversation = conversations.find(conv => {
        const isDeviceMatch = (
          (conv.createdByDeviceId === device.id && conv.targetDeviceId === friendCurrentDeviceId) ||
          (conv.createdByDeviceId === friendCurrentDeviceId && conv.targetDeviceId === device.id)
        );
        
        const isWithFriend = conv.participants?.some(p => p.userId === selectedFriend.id);
        
        return isDeviceMatch && isWithFriend;
      });
      
      if (existingConversation) {
        // Jump to existing conversation
        setActiveConversation(existingConversation.id);
        setConversationFriends(prev => ({ ...prev, [existingConversation.id]: selectedFriend.id }));
        await loadMessages(existingConversation.id);
      } else {
        // Create new conversation with current devices
        const response = await conversationsApi.create(
          [selectedFriend.id],
          false,
          undefined,
          device.id,
          friendCurrentDeviceId
        );
        
        const newConversation = response.data;
        setActiveConversation(newConversation.id);
        setConversationFriends(prev => ({ ...prev, [newConversation.id]: selectedFriend.id }));
        // Reload conversations to get fully populated data
        await loadConversations();
        await loadMessages(newConversation.id);
      }
    } catch (error) {
      console.error('Failed to switch to current device conversation:', error);
      showModal('Error', 'Failed to start conversation with current device', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearMessages();
    socketService.disconnect();
    logout();
    navigate('/');
  };

  const handleDeleteMessages = async () => {
    if (!activeConversation || !selectedFriend) return;
    setConfirmDelete(true);
  };

  const confirmDeleteMessages = async () => {
    if (!activeConversation) return;

    try {
      setLoading(true);
      await conversationsApi.deleteMessages(activeConversation);
      
      // Clear messages from local store
      setMessages(activeConversation, []);
      
      // Recalculate unread counts since messages are deleted
      calculateUnreadCounts();
      
      showModal('Success', 'Chat history deleted successfully', 'success');
    } catch (error) {
      console.error('Failed to delete messages:', error);
      showModal('Error', 'Failed to delete chat history', 'error');
    } finally {
      setLoading(false);
    }
  };

  const activeMessages = activeConversation ? getMessages(activeConversation) : [];

  return (
    <div className="flex h-screen bg-cyber-black">
      {/* Sidebar with three sections */}
      <div className="w-96 bg-cyber-darker border-r border-cyber-gray flex flex-col">
        {/* User header */}
        <div className="p-4 bg-cyber-slate border-b border-cyber-gray">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-neon-cyan"
                style={{ 
                  background: user?.avatarColor 
                    ? `linear-gradient(135deg, ${user.avatarColor}, ${user.avatarColor}dd)` 
                    : 'linear-gradient(135deg, #06b6d4, #0891b2)'
                }}
              >
                {user?.handle?.[0]?.toUpperCase()}
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-100">{user?.displayName || user?.handle}</div>
                <div className="text-xs text-cyan-400 font-mono">@{user?.handle}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/settings')}
                className="p-2 text-gray-400 hover:text-cyan-400 hover:bg-cyber-gray rounded transition-colors"
                title="Settings"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-red-400 hover:bg-cyber-gray rounded transition-colors"
                title="Logout"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse shadow-neon-green' : 'bg-red-400'}`} />
            <span className="text-xs font-mono text-gray-400">
              {isConnected ? 'CONNECTED' : 'DISCONNECTED'}
            </span>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-cyber-gray bg-cyber-slate">
          <button
            onClick={() => setActiveView('friends')}
            className={`flex-1 py-3 text-xs font-mono font-semibold transition-all relative ${
              activeView === 'friends'
                ? 'text-cyan-400 border-b-2 border-cyan-500 bg-cyan-500/10'
                : 'text-gray-500 hover:text-gray-300 hover:bg-cyber-gray/50'
            }`}
          >
            CONTACTS
            {friendRequestCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-pink-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse shadow-neon-pink">
                {friendRequestCount > 9 ? '9+' : friendRequestCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveView('conversations')}
            className={`flex-1 py-3 text-xs font-mono font-semibold transition-all relative ${
              activeView === 'conversations'
                ? 'text-purple-400 border-b-2 border-purple-500 bg-purple-500/10'
                : 'text-gray-500 hover:text-gray-300 hover:bg-cyber-gray/50'
            }`}
          >
            CONVERSATIONS
            {(() => {
              const conversationUnreadCount = getConversationUnreadCount();
              return conversationUnreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-purple-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse shadow-neon-purple">
                  {conversationUnreadCount > 99 ? '99+' : conversationUnreadCount}
                </span>
              );
            })()}
          </button>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
          {activeView === 'friends' && (
            <div className="space-y-6">
              {/* Friend Requests Section */}
              <div>
                {friendRequestCount > 0 && (
                  <h3 className="text-xs font-mono font-semibold text-pink-400 mb-3 uppercase tracking-wider">
                    Pending Requests ({friendRequestCount})
                  </h3>
                )}
                <FriendRequests 
                  onFriendAdded={loadConversations}
                  onRequestCountChange={setFriendRequestCount}
                />
              </div>
              
              {/* Friends List Section */}
              <div>
                <h3 className="text-xs font-mono font-semibold text-cyan-400 mb-3 uppercase tracking-wider">
                  Contacts
                </h3>
                <FriendsList
                  onSelectFriend={handleSelectFriend}
                  selectedFriendId={selectedFriend?.id}
                  onlineUsers={onlineUsers}
                />
              </div>
            </div>
          )}
          {activeView === 'conversations' && (
            <div className="scrollbar-hide">
              <ConversationsList
                onSelectConversation={handleSelectConversation}
                selectedConversationId={activeConversation}
                unreadCounts={unreadCounts}
                conversations={conversations}
                currentUserId={user?.id}
                currentDeviceId={device?.id}
                onlineUsers={onlineUsers}
                friendDevices={friendDevices}
                onDeleteConversation={handleDeleteConversation}
              />
            </div>
          )}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {selectedFriend && activeConversation ? (
          (() => {
            // Check if conversation is locked (not accessible from current device)
            const currentConversation = conversations.find(c => c.id === activeConversation);
            
            const isLocked = Boolean(currentConversation && (() => {
              // A conversation is locked if current device is not involved in it
              // BUT allow conversations without device info (old conversations)
              if (!currentConversation.createdByDeviceId && !currentConversation.targetDeviceId) {
                return false; // Old conversations without device tracking are not locked
              }
              
              // If current device created the conversation, it's never locked
              if (currentConversation.createdByDeviceId === device?.id) {
                return false;
              }
              
              // If current device is the target, it's not locked
              if (currentConversation.targetDeviceId === device?.id) {
                return false;
              }
              
              // If no target device specified, allow access (new conversation style)
              if (currentConversation.createdByDeviceId && !currentConversation.targetDeviceId) {
                return false;
              }
              
              return true; // All other cases are locked
            })());
            
            // Don't show full lock screen - instead show conversation with redacted messages
            // The locking will be handled in message display and input components
            
            return (
          <>
            {/* Chat header */}
            <div className="h-16 bg-cyber-darker border-b border-cyber-gray px-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-pink-500 flex items-center justify-center">
                  <span className="text-white font-bold">
                    {selectedFriend.handle[0].toUpperCase()}
                  </span>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-100">
                    {selectedFriend.displayName || selectedFriend.handle}
                  </h2>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-xs font-mono text-cyan-400/80">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                      <span>END-TO-END ENCRYPTED</span>
                    </div>

                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleDeleteMessages}
                  className="px-3 py-1.5 text-xs font-mono text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/30 rounded transition-colors"
                  title="Delete chat history for both users"
                >
                  DELETE HISTORY
                </button>
                <div className="text-xs font-mono text-gray-500">
                  ECDH-P256 + AES-GCM-256
                </div>
              </div>
            </div>

            {/* Messages container */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-cyber-black/50 grid-bg scrollbar-hide">
              {loading && activeMessages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500 mb-3"></div>
                    <p className="text-gray-500 font-mono text-sm">Decrypting messages...</p>
                  </div>
                </div>
              ) : activeMessages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <svg className="w-16 h-16 mx-auto mb-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <p className="text-gray-500 font-mono text-sm">No messages yet</p>
                    <p className="text-gray-600 font-mono text-xs mt-1">Start the encrypted conversation</p>
                  </div>
                </div>
              ) : (
                activeMessages.map((msg) => {
                  const isOwn = msg.senderUserId === user?.id;
                  return (
                    <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] ${isOwn ? 'order-2' : 'order-1'}`}>
                        <div
                          className={`rounded-lg p-3 ${
                            isOwn
                              ? 'bg-gradient-to-r from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 shadow-sm shadow-cyan-500/20'
                              : 'bg-cyber-darker border border-cyber-gray'
                          }`}
                        >
                          <p className="text-sm text-gray-100 break-words font-mono">
                            {isLocked ? (
                              <span className="text-red-400 italic flex items-center gap-1">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 616 0z" clipRule="evenodd" />
                                </svg>
                                [REDACTED]
                              </span>
                            ) : (
                              msg.decryptedText ? (
                                msg.decryptedText === '[REDACTED]' ? (
                                  <span className="text-red-400 italic flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 616 0z" clipRule="evenodd" />
                                    </svg>
                                    [REDACTED]
                                  </span>
                                ) : msg.decryptedText.startsWith('[') && msg.decryptedText.endsWith(']') ? (
                                  <span className="text-red-400 italic">
                                    {msg.decryptedText}
                                  </span>
                                ) : (
                                  msg.decryptedText
                                )
                              ) : (
                                <span className="text-gray-500 italic">
                                  {msg.decryptionError || 'Decrypting...'}
                                </span>
                              )
                            )}
                          </p>
                          <div className="flex items-center gap-2 mt-2 text-xs font-mono text-gray-500">
                            <span>{new Date(msg.createdAt).toLocaleTimeString()}</span>
                            {msg.readAt && <span className="text-green-400">✓✓ Read</span>}
                            {!msg.readAt && msg.deliveredAt && <span className="text-cyan-400">✓ Delivered</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Friend online on different device warning */}
            {!isLocked && selectedFriend && friendCurrentDeviceId && currentConversation && (() => {
              // Check which device the friend is using in this conversation
              const friendDeviceInConv = currentConversation.createdByUserId === user?.id
                ? currentConversation.targetDeviceId
                : currentConversation.createdByDeviceId;
              
              // Show warning if friend's current device is different from the one in this conversation
              return friendDeviceInConv && friendCurrentDeviceId !== friendDeviceInConv;
            })() && (
              <div className="px-4 py-3 bg-blue-900/20 border-t border-blue-700/30 border-b border-blue-700/30">
                <div className="flex items-center justify-between gap-3 text-blue-300">
                  <div className="flex items-center gap-3">
                    <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div className="text-sm font-mono">
                      <div className="font-semibold">This user is currently logged in on another device</div>
                      <div className="text-xs text-blue-400 mt-1">
                        They may not be able to read messages sent to this device.
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={switchToCurrentDeviceConversation}
                    className="px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 text-cyan-400 hover:text-cyan-300 text-xs font-mono font-semibold rounded transition-all whitespace-nowrap shadow-sm hover:shadow-cyan-500/20"
                  >
                    Message Current Device
                  </button>
                </div>
              </div>
            )}

            {/* Friend offline with default device banner */}
            {!isLocked && selectedFriend && !onlineUsers.has(selectedFriend.id) && currentConversation && (() => {
              const friendDefaultDeviceId = friendDefaultDevices[selectedFriend.id];
              
              if (!friendDefaultDeviceId) {
                return false;
              }
              
              // Check which device the friend is using in this conversation
              const friendDeviceInConv = currentConversation.createdByUserId === user?.id
                ? currentConversation.targetDeviceId
                : currentConversation.createdByDeviceId;
              
              // Show banner if friend has a default device and this conversation is NOT with their default device
              // OR if conversation has no device tracking (old conversation)
              if (!friendDeviceInConv) {
                return true; // Old conversation without device tracking - suggest messaging default device
              }
              
              return friendDefaultDeviceId !== friendDeviceInConv;
            })() && (
              <div className="px-4 py-3 bg-gray-800/30 border-t border-gray-600/30 border-b border-gray-600/30">
                <div className="flex items-center justify-between gap-3 text-gray-300">
                  <div className="flex items-center gap-3">
                    <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div className="text-sm font-mono">
                      <div className="font-semibold">This user is offline</div>
                      <div className="text-xs text-gray-400 mt-1">
                        Message their default device instead to ensure they receive your messages.
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      const friendDefaultDeviceId = friendDefaultDevices[selectedFriend.id];
                      if (!friendDefaultDeviceId || !device?.id) return;
                      
                      try {
                        // Check if a conversation with the default device already exists
                        const existingConv = conversations.find(conv => {
                          return (
                            (conv.createdByDeviceId === device.id && conv.targetDeviceId === friendDefaultDeviceId) ||
                            (conv.createdByDeviceId === friendDefaultDeviceId && conv.targetDeviceId === device.id)
                          );
                        });
                        
                        if (existingConv) {
                          // Switch to existing conversation
                          setActiveConversation(existingConv.id);
                        } else {
                          // Create a new conversation with the friend's default device
                          const response = await conversationsApi.create(
                            [selectedFriend.id],
                            false,
                            undefined,
                            device.id,
                            friendDefaultDeviceId
                          );
                          const newConv = response.data;
                          setConversations(prev => [...prev, newConv]);
                          setActiveConversation(newConv.id);
                        }
                      } catch (error) {
                        console.error('Failed to create conversation with default device:', error);
                      }
                    }}
                    className="px-3 py-1.5 bg-gray-600/20 hover:bg-gray-600/30 border border-gray-500/50 text-gray-300 hover:text-gray-200 text-xs font-mono font-semibold rounded transition-all whitespace-nowrap shadow-sm hover:shadow-gray-500/20"
                  >
                    Message Default Device
                  </button>
                </div>
              </div>
            )}

            {/* Locked conversation banner */}
            {isLocked && (
              <div className="px-4 py-3 bg-red-900/20 border-t border-red-700/30 border-b border-red-700/30">
                <div className="flex items-center gap-3 text-red-300">
                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  <div className="flex-1 text-sm font-mono">
                    <div className="font-semibold">This conversation cannot be accessed on this device</div>
                    <div className="text-xs text-red-400 mt-1">
                      Use device: {(() => {
                        // Determine which device to show
                        if (currentConversation?.createdByUserId === user?.id) {
                          // User created on different device
                          const deviceName = currentConversation?.createdByDevice?.deviceName || 'Unknown Device';
                          const deviceId = currentConversation?.createdByDeviceId?.slice(-8) || 'Unknown';
                          return `${deviceName} (${deviceId})`;
                        } else {
                          // User is target of different device
                          const deviceName = currentConversation?.targetDevice?.deviceName || 'Unknown Device';  
                          const deviceId = currentConversation?.targetDeviceId?.slice(-8) || 'Unknown';
                          return `${deviceName} (${deviceId})`;
                        }
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Message composer */}
            <form onSubmit={handleSendMessage} className="p-4 bg-cyber-darker border-t border-cyber-gray">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder={isLocked ? "Conversation locked - switch devices to access" : "Type an encrypted message..."}
                    disabled={loading || isLocked}
                    className={`w-full px-4 py-3 rounded-md text-gray-100 font-mono text-sm transition-all ${
                      isLocked 
                        ? 'bg-gray-800 border border-gray-600 placeholder-gray-600 cursor-not-allowed opacity-60'
                        : 'bg-cyber-slate border border-cyber-gray placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent'
                    }`}
                  />
                </div>
                <Button
                  type="submit"
                  color="cyan"
                  disabled={loading || !messageText.trim() || isLocked}
                  className="shadow-neon-cyan"
                >
                  {loading ? (
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                </Button>
              </div>
            </form>
          </>
            );
          })()
        ) : (
          <div className="flex-1 flex items-center justify-center bg-cyber-black/50 grid-bg">
            <div className="text-center">
              <div className="relative inline-block mb-6">
                <div className="absolute inset-0 bg-cyan-500/20 blur-2xl rounded-full animate-pulse" />
                <svg className="w-24 h-24 relative z-10 text-cyan-500/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <p className="text-gray-500 font-mono text-sm">&gt; SELECT_CONTACT</p>
              <p className="text-gray-600 font-mono text-xs mt-2">Choose a friend to start secure messaging</p>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalContent.title}
        type={modalContent.type}
      >
        {modalContent.message}
      </Modal>

      {/* Confirm Delete Modal */}
      {selectedFriend && (
        <ConfirmModal
          isOpen={confirmDelete}
          onClose={() => setConfirmDelete(false)}
          onConfirm={confirmDeleteMessages}
          title="Delete Chat History"
          message={`Delete all chat history with ${selectedFriend.displayName || selectedFriend.handle}? This will delete messages for both users and cannot be undone.`}
          confirmText="Delete"
          type="danger"
        />
      )}
    </div>
  );
}
