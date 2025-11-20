import { useState } from 'react';
import { Button } from '../components/catalyst/button';

interface Friend {
  id: string;
  handle: string;
  displayName: string | null;
  avatarUrl: string | null;
  avatarColor?: string;
  bio?: string | null;
  currentDevicePublicKey?: string | null;
  currentDeviceId?: string | null;
}

interface UserProfileModalProps {
  friend: Friend;
  isOpen: boolean;
  onClose: () => void;
  onRemove: (friendId: string, friendName: string) => void;
  onlineUsers?: Set<string>;
}

export function UserProfileModal({ friend, isOpen, onClose, onRemove, onlineUsers = new Set() }: UserProfileModalProps) {
  const [showFullKey, setShowFullKey] = useState(false);
  
  if (!isOpen || !friend) return null;
  
  const isFriendOnline = onlineUsers.has(friend.id);

  const handleRemove = () => {
    onRemove(friend.id, friend.displayName || friend.handle);
    onClose();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-cyber-darker border border-cyber-gray rounded-lg shadow-2xl max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-6 border-b border-cyber-gray">
          <div className="flex items-center gap-4">
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-neon-cyan"
              style={{ 
                background: friend.avatarColor 
                  ? `linear-gradient(135deg, ${friend.avatarColor}, ${friend.avatarColor}dd)` 
                  : 'linear-gradient(135deg, #06b6d4, #0891b2)'
              }}
            >
              {friend.handle[0].toUpperCase()}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-100">
                {friend.displayName || friend.handle}
              </h2>
              <p className="text-sm text-cyan-400 font-mono">@{friend.handle}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-200 hover:bg-cyber-gray rounded transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* User ID */}
          <div>
            <label className="text-xs font-mono text-gray-500 mb-2 block">USER ID</label>
            <div className="flex items-center gap-2 bg-cyber-slate border border-cyber-gray rounded p-3">
              <code className="text-sm text-gray-300 font-mono flex-1 truncate">{friend.id}</code>
              <button
                onClick={() => copyToClipboard(friend.id)}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-mono"
              >
                COPY
              </button>
            </div>
          </div>

          {/* Friend's Current Device */}
          <div>
            <label className="text-xs font-mono text-gray-500 mb-2 block">
              CURRENT DEVICE
            </label>
            {isFriendOnline && friend.currentDeviceId && friend.currentDevicePublicKey ? (
              <div className="space-y-3">
                {/* Device ID */}
                <div className="bg-cyber-slate border border-cyber-gray rounded p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-400">DEVICE ID</span>
                    <button
                      onClick={() => copyToClipboard(friend.currentDeviceId!)}
                      className="text-xs text-cyan-400 hover:text-cyan-300 font-mono"
                    >
                      COPY
                    </button>
                  </div>
                  <code className="text-sm text-gray-300 font-mono break-all">
                    {friend.currentDeviceId}
                  </code>
                </div>
              </div>
            ) : (
              <div className="bg-cyber-slate/50 border border-gray-600/30 rounded p-3">
                <div className="flex items-center justify-center gap-3 text-gray-500">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                  </svg>
                  <span className="text-sm font-mono">No device information available</span>
                </div>
              </div>
            )}
          </div>

          {/* Bio */}
          {friend.bio && (
            <div>
              <label className="text-xs font-mono text-gray-500 mb-2 block">ABOUT</label>
              <div className="bg-cyber-slate border border-cyber-gray rounded p-3">
                <p className="text-sm text-gray-300 whitespace-pre-wrap">{friend.bio}</p>
              </div>
            </div>
          )}

          {/* Public Key Details */}
          {isFriendOnline && friend.currentDevicePublicKey && (
            <div>
              <label className="text-xs font-mono text-gray-500 mb-2 block">PUBLIC KEY (P-256)</label>
              <div className="bg-cyber-slate border border-cyber-gray rounded p-3">
                <div className="flex items-center justify-between mb-2">
                  <button
                    onClick={() => setShowFullKey(!showFullKey)}
                    className="text-xs text-cyan-400 hover:text-cyan-300 font-mono"
                  >
                    {showFullKey ? 'HIDE' : 'SHOW FULL'}
                  </button>
                  <button
                    onClick={() => copyToClipboard(friend.currentDevicePublicKey!)}
                    className="text-xs text-cyan-400 hover:text-cyan-300 font-mono"
                  >
                    COPY
                  </button>
                </div>
                <code className={`text-xs text-gray-400 font-mono ${showFullKey ? 'break-all' : 'truncate block'}`}>
                  {friend.currentDevicePublicKey}
                </code>
              </div>
            </div>
          )}

          {/* Encryption Info */}
          <div className="p-4 bg-cyber-slate/50 border border-cyan-500/30 rounded-lg">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <div className="text-xs text-gray-400 font-mono">
                <strong className="text-cyan-400">End-to-End Encrypted:</strong> All messages with this user are encrypted using ECDH key exchange (P-256) and AES-GCM-256.
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-cyber-gray flex gap-3">
          <Button onClick={onClose} color="zinc" className="flex-1">
            Close
          </Button>
          <Button onClick={handleRemove} color="red" className="flex-1">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Remove Contact
          </Button>
        </div>
      </div>
    </div>
  );
}
