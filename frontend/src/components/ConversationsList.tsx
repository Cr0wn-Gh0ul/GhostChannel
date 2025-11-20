
import { useState } from 'react';
import { Modal } from './Modal';

interface Device {
  id: string;
  deviceName: string;
}

interface Conversation {
  id: string;
  createdByUserId?: string;
  createdByDeviceId?: string;
  targetDeviceId?: string;
  createdByDevice?: Device | null;
  targetDevice?: Device | null;
  participants?: any[];
  isGroup?: boolean;
}

interface ConversationsListProps {
  onSelectConversation: (conversationId: string, friendId?: string) => void;
  selectedConversationId?: string | null;
  unreadCounts?: Record<string, number>;
  conversations?: Conversation[];
  currentUserId?: string;
  currentDeviceId?: string;
  onlineUsers?: Set<string>;
  friendDevices?: Record<string, string>; // friendId -> currentDeviceId
  onDeleteConversation?: (conversationId: string, friendName: string, deleteMessages?: boolean) => void;
}

export function ConversationsList({ 
  onSelectConversation,
  selectedConversationId,
  unreadCounts = {},
  conversations = [],
  currentUserId,
  currentDeviceId,
  onlineUsers = new Set(),
  friendDevices = {},
  onDeleteConversation
}: ConversationsListProps) {
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    conversationId: string;
    friendName: string;
    deleteMessages: boolean;
  }>({ isOpen: false, conversationId: '', friendName: '', deleteMessages: false });
  // Filter device-to-device conversations that involve current user
  const deviceConversations = conversations.filter(conv => {
    // Must be device-to-device (not group)
    if (conv.isGroup) return false;
    
    // Must involve current user as a participant
    const isParticipant = conv.participants?.some(p => p.userId === currentUserId);
    if (!isParticipant) return false;
    
    // Show all conversations for current user, but highlight which are accessible on current device
    return true;
  });

  const getConversationKeyLabel = (conversation: Conversation): string => {
    const myDevice = conversation.createdByDeviceId === currentDeviceId 
      ? conversation.createdByDevice 
      : conversation.targetDevice;
      
    const theirDevice = conversation.createdByDeviceId === currentDeviceId 
      ? conversation.targetDevice 
      : conversation.createdByDevice;

    // Format device IDs as first 6 ... last 6 characters
    const formatDeviceId = (deviceId: string) => {
      if (deviceId.length <= 12) return deviceId;
      return `${deviceId.slice(0, 6)}...${deviceId.slice(-6)}`;
    };

    // Always use device ID format, not device names
    const myKeyLabel = myDevice?.id ? formatDeviceId(myDevice.id) : 'MY_DEVICE';
    const theirKeyLabel = theirDevice?.id ? formatDeviceId(theirDevice.id) : 'THEIR_DEVICE';
    
    return `${myKeyLabel} ↔ ${theirKeyLabel}`;
  };

  const isConversationLocked = (conversation: Conversation): boolean => {
    // A conversation is locked if current device is not involved in it
    // BUT allow conversations without device info (old conversations)
    if (!conversation.createdByDeviceId && !conversation.targetDeviceId) {
      return false; // Old conversations without device tracking are not locked
    }
    
    // If current device created the conversation, it's never locked
    if (conversation.createdByDeviceId === currentDeviceId) {
      return false;
    }
    
    // If current device is the target, it's not locked
    if (conversation.targetDeviceId === currentDeviceId) {
      return false;
    }
    
    // If no target device specified, allow access (new conversation style)
    if (conversation.createdByDeviceId && !conversation.targetDeviceId) {
      return false;
    }
    
    return true; // All other cases are locked
  };

  const handleDeleteConversation = (e: React.MouseEvent, conversationId: string, friendName: string) => {
    e.stopPropagation();
    setDeleteModal({ isOpen: true, conversationId, friendName, deleteMessages: false });
  };

  const confirmDeleteConversation = () => {
    if (onDeleteConversation) {
      onDeleteConversation(deleteModal.conversationId, deleteModal.friendName, deleteModal.deleteMessages);
    }
    setDeleteModal({ isOpen: false, conversationId: '', friendName: '', deleteMessages: false });
  };

  const getFriendName = (conversation: Conversation): string => {
    // Find the friend's name from participants
    const participant = conversation.participants?.find(p => p.userId !== currentUserId);
    return participant?.user?.displayName || participant?.user?.handle || 'Unknown User';
  };



  const getFriendId = (conversation: Conversation): string | undefined => {
    // Find the friend's user ID from participants
    const participant = conversation.participants?.find(p => p.userId !== currentUserId);
    return participant?.userId;
  };

  if (deviceConversations.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500 mb-2">No device conversations yet</div>
        <div className="text-xs text-gray-600">
          Device conversations are created automatically when you message someone
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {deviceConversations.map((conversation) => {
        const unreadCount = unreadCounts[conversation.id] || 0;
        const isSelected = selectedConversationId === conversation.id;
        const friendId = getFriendId(conversation);
        const isLocked = isConversationLocked(conversation);

        const friendName = getFriendName(conversation);
        const participant = conversation.participants?.find(p => p.userId !== currentUserId);
        const friendHandle = participant?.user?.handle;

        return (
          <div
            key={conversation.id}
            onClick={() => onSelectConversation(conversation.id, friendId)}
            className={`p-3 rounded-lg cursor-pointer transition-all border relative group ${
              isSelected
                ? 'bg-cyan-500/20 border-cyan-500/50 shadow-neon-cyan'
                : (() => {
                    if (isLocked) {
                      return 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20 hover:border-amber-500/50';
                    }
                    
                    // Check if friend is on different device
                    const participant = conversation.participants?.find(p => p.userId !== currentUserId);
                    const friendId = participant?.userId;
                    if (friendId && friendDevices[friendId]) {
                      const friendCurrentDevice = friendDevices[friendId];
                      const friendDeviceInConv = conversation.createdByUserId === currentUserId
                        ? conversation.targetDeviceId
                        : conversation.createdByDeviceId;
                      
                      if (friendDeviceInConv && friendCurrentDevice !== friendDeviceInConv) {
                        return 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20 hover:border-amber-500/50';
                      }
                    }
                    
                    return 'bg-cyber-gray/30 border-cyber-gray hover:bg-cyber-gray/50 hover:border-gray-600';
                  })()
            }`}
          >
            {/* Header with name and actions */}
            <div className="flex items-start justify-between mb-1">
              <div className="flex-1">
                <div className="text-base font-medium text-white">
                  {friendName}
                </div>
                {friendHandle && (
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="text-xs text-gray-500 font-mono">
                      @{friendHandle}
                    </div>
                    <div className="flex items-center gap-1">
                      <div className={`w-1 h-1 rounded-full ${
                        (() => {
                          const participant = conversation.participants?.find(p => p.userId !== currentUserId);
                          const otherUserId = participant?.userId;
                          const isUserOnline = otherUserId ? onlineUsers.has(otherUserId) : false;
                          return isUserOnline ? 'bg-green-400 shadow-neon-green' : 'bg-gray-500';
                        })()
                      }`} />
                      <span style={{fontSize: '10px'}} className="text-gray-500">
                        {(() => {
                          const participant = conversation.participants?.find(p => p.userId !== currentUserId);
                          const otherUserId = participant?.userId;
                          const isUserOnline = otherUserId ? onlineUsers.has(otherUserId) : false;
                          return isUserOnline ? 'ONLINE' : 'OFFLINE';
                        })()}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <div className={`text-xs px-2 py-1 rounded font-mono ${
                  (() => {
                    // Check device access first
                    const canAccessFromCurrentDevice = (
                      conversation.createdByDeviceId === currentDeviceId ||
                      conversation.targetDeviceId === currentDeviceId ||
                      (!conversation.createdByDeviceId && !conversation.targetDeviceId) ||
                      (conversation.createdByDeviceId && !conversation.targetDeviceId)
                    );
                    
                    if (!canAccessFromCurrentDevice) {
                      return 'bg-red-500/20 text-red-400 border border-red-500/30'; // REDACTED - wrong device
                    }
                    
                    // Always show green SECURE if accessible, even if friend is on different device
                    return 'bg-green-500/20 text-green-400 border border-green-500/30'; // SECURE
                  })()
                }`}>
                  {(() => {
                    // Check device access first
                    const canAccessFromCurrentDevice = (
                      conversation.createdByDeviceId === currentDeviceId ||
                      conversation.targetDeviceId === currentDeviceId ||
                      (!conversation.createdByDeviceId && !conversation.targetDeviceId) ||
                      (conversation.createdByDeviceId && !conversation.targetDeviceId)
                    );
                    
                    if (!canAccessFromCurrentDevice) {
                      return 'REDACTED'; // Wrong device
                    }
                    
                    return 'SECURE';
                  })()}
                </div>
                {unreadCount > 0 && (
                  <div className="bg-cyan-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-neon-cyan">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </div>
                )}
                {onDeleteConversation && (
                  <button
                    onClick={(e) => handleDeleteConversation(e, conversation.id, getFriendName(conversation))}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300"
                    title="Delete conversation"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            {/* Conversation Information */}
            <div className={`text-xs flex items-center gap-1 mt-1 ${
              (() => {
                if (isLocked) return 'text-amber-400';
                
                // Check if friend is on different device
                const participant = conversation.participants?.find(p => p.userId !== currentUserId);
                const friendId = participant?.userId;
                if (friendId && friendDevices[friendId]) {
                  const friendCurrentDevice = friendDevices[friendId];
                  const friendDeviceInConv = conversation.createdByUserId === currentUserId
                    ? conversation.targetDeviceId
                    : conversation.createdByDeviceId;
                  
                  if (friendDeviceInConv && friendCurrentDevice !== friendDeviceInConv) {
                    return 'text-yellow-400'; // Warning - friend on different device
                  }
                }
                
                return 'text-cyan-400'; // Normal
              })()
            }`}>
              {isLocked && (
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 616 0z" clipRule="evenodd" />
                </svg>
              )}
              <span className="font-mono">Conv: {getConversationKeyLabel(conversation)}</span>
            </div>
          </div>
        );
      })}
      
      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, conversationId: '', friendName: '', deleteMessages: false })}
        title="Delete Conversation"
        type="warning"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-300">
            Are you sure you want to remove the conversation with <strong>{deleteModal.friendName}</strong> from your conversation list?
          </p>
          
          <div className="flex items-center gap-2 p-3 bg-cyber-darker rounded border border-cyber-gray">
            <input
              type="checkbox"
              id="deleteMessages"
              checked={deleteModal.deleteMessages}
              onChange={(e) => setDeleteModal(prev => ({ ...prev, deleteMessages: e.target.checked }))}
              className="w-4 h-4 text-red-500 bg-cyber-gray border-gray-600 rounded focus:ring-red-500 focus:ring-2"
            />
            <label htmlFor="deleteMessages" className="text-sm text-gray-300 cursor-pointer">
              Also delete all message history (cannot be undone)
            </label>
          </div>
          
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setDeleteModal({ isOpen: false, conversationId: '', friendName: '', deleteMessages: false })}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-300 bg-cyber-gray hover:bg-cyber-gray/80 border border-gray-600 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirmDeleteConversation}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              {deleteModal.deleteMessages ? 'Delete Conversation & Messages' : 'Remove from List'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}