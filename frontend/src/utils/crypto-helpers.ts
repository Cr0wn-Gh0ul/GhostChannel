import { CryptoService } from '../services/crypto';
import { devicesApi } from '../api/client';
import { Message } from '../store/slices/messageSlice';

export interface Conversation {
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

/**
 * Get or derive a shared encryption key for a user
 */
export async function getOrDeriveSharedKey(
  otherUserId: string,
  sharedKeys: Record<string, CryptoKey>,
  setSharedKeys: (update: (prev: Record<string, CryptoKey>) => Record<string, CryptoKey>) => void
): Promise<CryptoKey | null> {
  if (sharedKeys[otherUserId]) {
    return sharedKeys[otherUserId];
  }

  try {
    const myKeypair = await CryptoService.loadDeviceKeypair();
    if (!myKeypair) return null;

    const response = await devicesApi.getUserKeys(otherUserId);
    const userDevices = response.data;
    if (userDevices.length === 0) return null;

    const otherPublicKey = await CryptoService.importPublicKey(userDevices[0].publicKey);
    const sharedKey = await CryptoService.deriveSharedSecret(myKeypair.privateKey, otherPublicKey);

    setSharedKeys(prev => ({ ...prev, [otherUserId]: sharedKey }));
    return sharedKey;
  } catch (error) {
    console.error('Failed to derive shared key:', error);
    return null;
  }
}

/**
 * Decrypt a message using the appropriate shared key
 */
export async function decryptMessageWithKey(
  message: Message,
  userId: string | undefined,
  conversationFriends: Record<string, string>,
  conversations: Conversation[],
  friendIdHint: string | undefined,
  getSharedKey: (userId: string) => Promise<CryptoKey | null>,
  updateDecryptedMessage: (messageId: string, decryptedText: string) => void
) {
  try {
    if (!message.nonce) {
      updateDecryptedMessage(message.id, atob(message.ciphertext));
      return;
    }

    // For own messages, derive key using the OTHER participant
    // For received messages, use the sender's ID
    let keyUserId: string | null = null;
    
    if (message.senderUserId === userId) {
      // This is our own message - use the friend from the hint, conversation mapping, or fallback
      keyUserId = friendIdHint || conversationFriends[message.conversationId];
      
      // Fallback: if mapping not available, find from conversations
      if (!keyUserId) {
        const conversation = conversations.find(c => c.id === message.conversationId);
        const otherParticipant = conversation?.participants?.find(
          (p: any) => p.userId !== userId
        );
        keyUserId = otherParticipant?.userId || null;
      }
    } else {
      // Received message - use sender's ID
      keyUserId = message.senderUserId;
    }

    if (!keyUserId) {
      updateDecryptedMessage(message.id, '[No recipient]');
      return;
    }

    const sharedKey = await getSharedKey(keyUserId);
    if (!sharedKey) return;

    const decrypted = await CryptoService.decryptMessage(message.ciphertext, message.nonce, sharedKey);
    updateDecryptedMessage(message.id, decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    updateDecryptedMessage(message.id, '[Decryption failed]');
  }
}

/**
 * Encrypt a message for sending
 */
export async function encryptMessage(
  messageText: string,
  recipientUserId: string,
  getSharedKey: (userId: string) => Promise<CryptoKey | null>
): Promise<{ ciphertext: string; nonce: string } | null> {
  const sharedKey = await getSharedKey(recipientUserId);
  if (!sharedKey) {
    throw new Error('Could not establish encryption');
  }

  return CryptoService.encryptMessage(messageText, sharedKey);
}
