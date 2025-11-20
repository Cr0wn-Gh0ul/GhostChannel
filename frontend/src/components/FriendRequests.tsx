import { useState, useEffect } from 'react';
import { friendsApi } from '../api/client';
import { Button } from '../components/catalyst/button';
import { Input } from '../components/catalyst/input';
import { Field } from '../components/catalyst/fieldset';
import { socketService } from '../services/socket.service';
import { Modal } from './Modal';

interface FriendRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: string;
  createdAt: string;
  fromUser?: {
    id: string;
    handle: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  toUser?: {
    id: string;
    handle: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

interface FriendRequestsProps {
  onFriendAdded?: () => void;
  onRequestCountChange?: (count: number) => void;
}

export function FriendRequests({ onFriendAdded, onRequestCountChange }: FriendRequestsProps) {
  const [inviteCode, setInviteCode] = useState('');
  const [myInviteCode, setMyInviteCode] = useState('');
  const [codeExpiry, setCodeExpiry] = useState<Date | null>(null);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [receivedRequests, setReceivedRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [showInviteCode, setShowInviteCode] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [errorModal, setErrorModal] = useState<{ isOpen: boolean; message: string }>({ isOpen: false, message: '' });

  useEffect(() => {
    loadPendingRequests();

    // Listen for new friend requests via WebSocket
    const unsubscribeRequests = socketService.onFriendRequest((request: FriendRequest) => {
      setReceivedRequests((prev) => {
        const newRequests = [request, ...prev];
        if (onRequestCountChange) {
          onRequestCountChange(newRequests.length);
        }
        return newRequests;
      });
    });

    // Listen for friend request responses (accepted/rejected)
    const unsubscribeResponses = socketService.onFriendRequestResponse((data: { requestId: string, action: 'accept' | 'reject' }) => {
      // Remove the request from sent requests when it's responded to
      setSentRequests(prev => prev.filter(req => req.id !== data.requestId));
    });

    return () => {
      unsubscribeRequests();
      unsubscribeResponses();
    };
  }, []);

  const loadPendingRequests = async () => {
    try {
      const response = await friendsApi.getPendingRequests();
      setReceivedRequests(response.data.received);
      setSentRequests(response.data.sent);
      if (onRequestCountChange) {
        onRequestCountChange(response.data.received.length);
      }
    } catch (error) {
      console.error('Failed to load pending requests:', error);
    }
  };

  const generateInviteCode = async () => {
    try {
      const response = await friendsApi.generateInviteCode(24);
      setMyInviteCode(response.data.inviteCode);
      setCodeExpiry(new Date(response.data.expiresAt));
      setShowInviteCode(true);
    } catch (error) {
      console.error('Failed to generate invite code:', error);
      setErrorModal({ isOpen: true, message: 'Failed to generate invite code' });
    }
  };

  const sendFriendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    setSendingRequest(true);
    try {
      const response = await friendsApi.sendFriendRequest(inviteCode);
      setSentRequests((prev) => [response.data, ...prev]);
      setInviteCode('');
      setShowAddContactModal(false);
    } catch (error: any) {
      setErrorModal({ isOpen: true, message: error.response?.data?.message || 'Failed to send friend request' });
    } finally {
      setSendingRequest(false);
    }
  };

  const respondToRequest = async (requestId: string, action: 'accept' | 'reject') => {
    try {
      await friendsApi.respondToRequest(requestId, action);
      setReceivedRequests((prev) => {
        const newRequests = prev.filter((req) => req.id !== requestId);
        if (onRequestCountChange) {
          onRequestCountChange(newRequests.length);
        }
        return newRequests;
      });
      
      if (action === 'accept' && onFriendAdded) {
        onFriendAdded();
      }
    } catch (error) {
      console.error('Failed to respond to request:', error);
    }
  };

  const copyInviteCode = () => {
    navigator.clipboard.writeText(myInviteCode);
  };

  return (
    <>
      {/* Compact Icons Row */}
      <div className="flex gap-2 mb-4">
        {/* Generate Invite Code Button */}
        <button
          onClick={() => setShowGenerateModal(true)}
          className="flex-1 flex items-center justify-center gap-2 p-4 rounded-lg bg-cyber-darker border border-cyan-500/30 hover:border-cyan-500/60 hover:bg-cyan-500/10 transition-all group"
          title="Generate Invite Code"
        >
          <svg className="w-5 h-5 text-cyan-400 group-hover:text-cyan-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="text-sm font-mono text-cyan-400 group-hover:text-cyan-300 font-semibold">INVITE</span>
        </button>

        {/* Add Contact Button */}
        <button
          onClick={() => setShowAddContactModal(true)}
          className="flex-1 flex items-center justify-center gap-2 p-4 rounded-lg bg-cyber-darker border border-pink-500/30 hover:border-pink-500/60 hover:bg-pink-500/10 transition-all group"
          title="Add Contact"
        >
          <svg className="w-5 h-5 text-pink-400 group-hover:text-pink-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          <span className="text-sm font-mono text-pink-400 group-hover:text-pink-300 font-semibold">ADD</span>
        </button>
      </div>

      {/* Generate Invite Code Modal */}
      <Modal
        isOpen={showGenerateModal}
        onClose={() => {
          setShowGenerateModal(false);
          setShowInviteCode(false);
        }}
        title="Generate Invite Code"
        type="info"
      >
        <div className="space-y-4">
          {!showInviteCode ? (
            <Button
              onClick={generateInviteCode}
              color="cyan"
              className="w-full text-xs"
            >
              Generate New Code
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Input
                  value={myInviteCode}
                  readOnly
                  className="font-mono text-lg font-bold text-center tracking-widest"
                />
                <Button onClick={copyInviteCode} color="cyan" className="flex-shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </Button>
              </div>
              {codeExpiry && (
                <p className="text-xs text-gray-500 text-center font-mono">
                  Expires: {codeExpiry.toLocaleString()}
                </p>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* Add Contact Modal */}
      <Modal
        isOpen={showAddContactModal}
        onClose={() => {
          setShowAddContactModal(false);
          setInviteCode('');
        }}
        title="Add Contact"
        type="info"
      >
        <form onSubmit={sendFriendRequest} className="space-y-4">
          <Field>
            <Input
              type="text"
              placeholder="Enter invite code"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              disabled={sendingRequest}
              className="font-mono text-center tracking-wider"
            />
          </Field>
          <Button
            type="submit"
            color="pink"
            className="w-full text-xs"
            disabled={sendingRequest || !inviteCode.trim()}
          >
            {sendingRequest ? 'Sending...' : 'Send Request'}
          </Button>
        </form>
      </Modal>

      {/* Generate Invite Code Modal */}
      <Modal
        isOpen={showGenerateModal}
        onClose={() => {
          setShowGenerateModal(false);
          setShowInviteCode(false);
        }}
        title="Generate Invite Code"
        type="info"
      >
        <div className="space-y-4">
          {!showInviteCode ? (
            <Button
              onClick={generateInviteCode}
              color="cyan"
              className="w-full text-xs"
            >
              Generate New Code
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Input
                  value={myInviteCode}
                  readOnly
                  className="font-mono text-lg font-bold text-center tracking-widest"
                />
                <Button onClick={copyInviteCode} color="cyan" className="flex-shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </Button>
              </div>
              {codeExpiry && (
                <p className="text-xs text-gray-500 text-center font-mono">
                  Expires: {codeExpiry.toLocaleString()}
                </p>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* Add Contact Modal */}
      <Modal
        isOpen={showAddContactModal}
        onClose={() => {
          setShowAddContactModal(false);
          setInviteCode('');
        }}
        title="Add Contact"
        type="info"
      >
        <form onSubmit={sendFriendRequest} className="space-y-4">
          <Field>
            <Input
              type="text"
              placeholder="Enter invite code"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              disabled={sendingRequest}
              className="font-mono text-center tracking-wider"
            />
          </Field>
          <Button
            type="submit"
            color="pink"
            className="w-full text-xs"
            disabled={sendingRequest || !inviteCode.trim()}
          >
            {sendingRequest ? 'Sending...' : 'Send Request'}
          </Button>
        </form>
      </Modal>

      {/* Received Requests */}
      {receivedRequests.length > 0 && (
        <div className="cyber-card p-4">
          <h3 className="text-sm font-semibold text-cyan-400 font-mono mb-3">
            INCOMING ({receivedRequests.length})
          </h3>
          <div className="space-y-2">
            {receivedRequests.map((request) => (
              <div
                key={request.id}
                className="bg-cyber-darker border border-cyber-gray rounded p-3 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-pink-500 flex items-center justify-center">
                    <span className="text-white font-bold text-sm">
                      {request.fromUser?.handle[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm truncate">
                      {request.fromUser?.displayName || request.fromUser?.handle}
                    </p>
                    <p className="text-gray-500 text-xs font-mono">@{request.fromUser?.handle}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => respondToRequest(request.id, 'accept')}
                    color="cyan"
                    className="flex-1 text-xs"
                  >
                    Accept
                  </Button>
                  <Button
                    onClick={() => respondToRequest(request.id, 'reject')}
                    color="red"
                    className="flex-1 text-xs"
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sent Requests */}
      {sentRequests.length > 0 && (
        <div className="cyber-card p-4">
          <h3 className="text-sm font-semibold text-gray-400 font-mono mb-3">
            OUTGOING ({sentRequests.length})
          </h3>
          <div className="space-y-2">
            {sentRequests.map((request) => (
              <div
                key={request.id}
                className="bg-cyber-darker border border-cyber-gray rounded p-3"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center">
                    <span className="text-white font-bold text-sm">
                      {request.toUser?.handle[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm truncate">
                      {request.toUser?.displayName || request.toUser?.handle}
                    </p>
                    <p className="text-gray-500 text-xs font-mono">Pending...</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ isOpen: false, message: '' })}
        title="Error"
        type="error"
      >
        {errorModal.message}
      </Modal>
    </>
  );
}
