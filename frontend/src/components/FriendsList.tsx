import { useState, useEffect } from 'react';
import { friendsApi, usersApi } from '../api/client';
import { socketService } from '../services/socket.service';
import { UserProfileModal } from './UserProfileModal';
import { ConfirmModal } from './ConfirmModal';
import { Modal } from './Modal';

interface Friend {
  id: string;
  friend: {
    id: string;
    handle: string;
    displayName: string | null;
    avatarUrl: string | null;
    avatarColor?: string;
    bio?: string | null;
    currentDevicePublicKey?: string | null;
    currentDeviceId?: string | null;
  };
  createdAt: string;
}

interface FriendsListProps {
  onSelectFriend: (friend: Friend['friend']) => void;
  selectedFriendId?: string | null;
  onlineUsers?: Set<string>;
}

export function FriendsList({ 
  onSelectFriend, 
  selectedFriendId,
  onlineUsers = new Set()
}: FriendsListProps) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfileFriend, setSelectedProfileFriend] = useState<Friend['friend'] | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<{ isOpen: boolean; friendId: string; friendName: string } | null>(null);
  const [errorModal, setErrorModal] = useState<{ isOpen: boolean; message: string }>({ isOpen: false, message: '' });

  useEffect(() => {
    loadFriends();

    console.log('[FriendsList] Registering presence listener');

    // Always register listeners - each component needs to handle events
    // Listen for friend accepted events
    const unsubscribeFriendAccepted = socketService.onFriendAccepted(() => {
      loadFriends();
    });

    return () => {
      console.log('[FriendsList] Cleaning up listeners');
      unsubscribeFriendAccepted();
    };
  }, []);

  const loadFriends = async () => {
    try {
      const response = await friendsApi.getFriends();
      setFriends(response.data);
    } catch (error) {
      console.error('Failed to load friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewProfile = async (friendId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Load full profile with bio and current device public key
    try {
      const response = await usersApi.getUser(friendId);
      setSelectedProfileFriend(response.data);
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  };

  const handleRemoveFriendFromModal = (friendId: string, friendName: string) => {
    setConfirmRemove({ isOpen: true, friendId, friendName });
  };

  const confirmRemoveFriend = async () => {
    if (!confirmRemove) return;

    try {
      await friendsApi.removeFriend(confirmRemove.friendId);
      setFriends(prev => prev.filter(f => f.friend.id !== confirmRemove.friendId));
      setSelectedProfileFriend(null);
    } catch (error) {
      console.error('Failed to remove friend:', error);
      setErrorModal({ isOpen: true, message: 'Failed to remove friend' });
    } finally {
      setConfirmRemove(null);
    }
  };

  if (loading) {
    return (
      <div className="cyber-card p-4">
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (friends.length === 0) {
    return (
      <div className="cyber-card p-4">
        <div className="text-center py-8">
          <svg className="w-12 h-12 text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <p className="text-gray-400 text-sm font-mono">No contacts yet</p>
          <p className="text-gray-600 text-xs mt-1">Add friends to start chatting</p>
        </div>
      </div>
    );
  }

  // Sort friends: online first, then by display name/handle
  const sortedFriends = [...friends].sort((a, b) => {
    const aOnline = onlineUsers.has(a.friend.id);
    const bOnline = onlineUsers.has(b.friend.id);
    
    if (aOnline !== bOnline) {
      return aOnline ? -1 : 1;
    }
    
    const aName = a.friend.displayName || a.friend.handle;
    const bName = b.friend.displayName || b.friend.handle;
    return aName.localeCompare(bName);
  });

  return (
    <div className="space-y-1">
      {sortedFriends.map((friendship) => {
        const isOnline = onlineUsers.has(friendship.friend.id);
        const isSelected = selectedFriendId === friendship.friend.id;

        return (
          <div
            key={friendship.id}
            className={`w-full p-3 rounded-lg transition-all duration-200 group cursor-pointer ${
              isSelected
                ? 'bg-cyan-500/20 border border-cyan-500/50 shadow-neon-cyan'
                : 'bg-cyber-darker border border-cyber-gray hover:border-cyan-500/30 hover:bg-cyber-gray/30'
            }`}
            onClick={() => onSelectFriend(friendship.friend)}
          >
            <div className="flex items-center gap-3">
              <div className="relative flex-shrink-0">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{
                    background: friendship.friend.avatarColor 
                      ? `linear-gradient(135deg, ${friendship.friend.avatarColor}, ${friendship.friend.avatarColor}dd)`
                      : isOnline
                      ? 'linear-gradient(to bottom right, #06b6d4, #ec4899)'
                      : 'linear-gradient(to bottom right, #4b5563, #374151)'
                  }}
                >
                  <span className="text-white font-bold">
                    {friendship.friend.handle[0].toUpperCase()}
                  </span>
                </div>
                <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-cyber-dark ${
                  isOnline ? 'bg-green-400 animate-pulse' : 'bg-gray-600'
                }`} />
              </div>
              
                            <div className="flex-1 min-w-0 text-left">
                <p className={`font-medium text-sm truncate ${
                  isSelected ? 'text-cyan-300' : 'text-white'
                }`}>
                  {friendship.friend.displayName || friendship.friend.handle}
                </p>
                <div className="flex items-center gap-2">
                  <p className="text-gray-500 text-xs font-mono truncate">
                    @{friendship.friend.handle}
                  </p>
                  {isOnline && (
                    <span className="text-green-400 text-xs font-mono">● online</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectFriend(friendship.friend);
                  }}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs px-3 py-1 rounded font-mono transition-colors"
                >
                  CHAT
                </button>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">

                {isSelected && (
                  <svg className="w-5 h-5 text-cyan-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                )}
                <button
                  onClick={(e) => handleViewProfile(friendship.friend.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 rounded transition-all"
                  title="View profile"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        );
      })}

      <UserProfileModal
        friend={selectedProfileFriend!}
        isOpen={selectedProfileFriend !== null}
        onClose={() => setSelectedProfileFriend(null)}
        onRemove={handleRemoveFriendFromModal}
        onlineUsers={onlineUsers}
      />

      {confirmRemove && (
        <ConfirmModal
          isOpen={confirmRemove.isOpen}
          onClose={() => setConfirmRemove(null)}
          onConfirm={confirmRemoveFriend}
          title="Remove Contact"
          message={`Remove ${confirmRemove.friendName} from your contacts? This will delete your conversation history.`}
          confirmText="Remove"
          type="danger"
        />
      )}

      <Modal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ isOpen: false, message: '' })}
        title="Error"
        type="error"
      >
        {errorModal.message}
      </Modal>
    </div>
  );
}
