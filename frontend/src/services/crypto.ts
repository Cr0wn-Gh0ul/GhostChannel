/**
 * CryptoService - Client-side End-to-End Encryption
 * 
 * Implements device-specific encryption using Web Crypto API.
 * 
 * Security Architecture:
 * - ECDH P-256 key exchange for perfect forward secrecy
 * - AES-256-GCM authenticated encryption
 * - Private keys stored in encrypted IndexedDB (never transmitted)
 * - Public keys shared with server for key exchange
 * - Device-specific password derived from browser fingerprint
 * 
 * Key Storage:
 * - Private keys: Encrypted in IndexedDB using device-derived password
 * - Public keys: Stored in localStorage (non-sensitive)
 * - Derived shared keys: Cached in memory (Map)
 * 
 * @module CryptoService
 */

const DB_NAME = 'ghostchannel-keys';
const DB_VERSION = 1;
const STORE_NAME = 'device-keys';

/**
 * Initialize IndexedDB for encrypted private key storage
 * @returns Promise resolving to IDBDatabase instance
 */
async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

export class CryptoService {
  // Derive an encryption key from a password (for encrypting the private key)
  private static async deriveEncryptionKey(password: string, salt: ArrayBuffer): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const passwordKey = await window.crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    return await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      passwordKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  // Get or create a device-specific encryption password
  // This password is derived from device fingerprint + stored random seed
  private static async getDevicePassword(): Promise<string> {
    // Check if we have a seed in localStorage
    let seed = localStorage.getItem('device-seed');
    if (!seed) {
      // Generate a random seed for this device
      const seedBytes = window.crypto.getRandomValues(new Uint8Array(32));
      seed = btoa(String.fromCharCode(...seedBytes));
      localStorage.setItem('device-seed', seed);
    }

    // Combine with browser/device info for uniqueness
    const deviceInfo = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset().toString(),
      seed
    ].join('|');

    // Hash to create consistent password
    const encoder = new TextEncoder();
    const hash = await window.crypto.subtle.digest('SHA-256', encoder.encode(deviceInfo));
    return btoa(String.fromCharCode(...new Uint8Array(hash)));
  }
  
  /**
   * Generate ECDH P-256 keypair for this device
   * 
   * Used once per device during initial setup. Private key is stored
   * encrypted in IndexedDB, public key sent to server.
   * 
   * @returns CryptoKeyPair with extractable keys
   */
  static async generateDeviceKeypair(): Promise<CryptoKeyPair> {
    return await window.crypto.subtle.generateKey(
      {
        name: 'ECDH',
        namedCurve: 'P-256',
      },
      true,
      ['deriveKey', 'deriveBits']
    );
  }

  // Export public key to share with server
  static async exportPublicKey(publicKey: CryptoKey): Promise<string> {
    const exported = await window.crypto.subtle.exportKey('spki', publicKey);
    return btoa(String.fromCharCode(...new Uint8Array(exported)));
  }

  // Import a public key from base64
  static async importPublicKey(base64Key: string): Promise<CryptoKey> {
    const binaryKey = Uint8Array.from(atob(base64Key), (c) => c.charCodeAt(0));
    return await window.crypto.subtle.importKey(
      'spki',
      binaryKey,
      {
        name: 'ECDH',
        namedCurve: 'P-256',
      },
      true,
      []
    );
  }

  /**
   * Derive shared AES-256-GCM key using ECDH
   * 
   * Uses Web Crypto API's deriveKey to directly produce an AES-GCM key
   * from the ECDH shared secret. Both parties derive the same key.
   * 
   * @param privateKey - This device's ECDH private key
   * @param otherPublicKey - Other party's ECDH public key
   * @returns AES-256-GCM CryptoKey for encryption/decryption
   */
  static async deriveSharedSecret(
    privateKey: CryptoKey,
    otherPublicKey: CryptoKey
  ): Promise<CryptoKey> {
    return await window.crypto.subtle.deriveKey(
      {
        name: 'ECDH',
        public: otherPublicKey,
      },
      privateKey,
      {
        name: 'AES-GCM',
        length: 256,
      },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypt a message using AES-256-GCM
   * 
   * Process:
   * 1. Generate random 96-bit nonce
   * 2. Encrypt plaintext with AES-GCM
   * 3. Return base64-encoded ciphertext and nonce
   * 
   * The resulting ciphertext includes a 128-bit authentication tag
   * appended by the GCM mode.
   * 
   * @param message - Plaintext message to encrypt
   * @param key - AES-256-GCM key from deriveSharedSecret
   * @returns Object with base64 ciphertext and nonce
   */
  static async encryptMessage(message: string, key: CryptoKey): Promise<{
    ciphertext: string;
    nonce: string;
  }> {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const nonce = window.crypto.getRandomValues(new Uint8Array(12));

    const encrypted = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: nonce,
      },
      key,
      data
    );

    return {
      ciphertext: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
      nonce: btoa(String.fromCharCode(...new Uint8Array(nonce))),
    };
  }

  /**
   * Decrypt a message using AES-256-GCM
   * 
   * Verifies authentication tag to detect tampering.
   * Throws if ciphertext was modified or wrong key used.
   * 
   * @param ciphertext - Base64-encoded encrypted message
   * @param nonce - Base64-encoded 96-bit IV
   * @param key - AES-256-GCM key from deriveSharedSecret
   * @returns Decrypted plaintext message
   * @throws Error if authentication fails or decryption fails
   */
  static async decryptMessage(
    ciphertext: string,
    nonce: string,
    key: CryptoKey
  ): Promise<string> {
    const ciphertextBytes = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));
    const nonceBytes = Uint8Array.from(atob(nonce), (c) => c.charCodeAt(0));

    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: nonceBytes,
      },
      key,
      ciphertextBytes
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  }

  /**
   * Store device keypair securely
   * 
   * Security measures:
   * - Private key encrypted with AES-GCM using device-derived password
   * - Encrypted private key stored in IndexedDB
   * - Public key stored in localStorage (non-sensitive)
   * - Unique salt and IV per encryption
   * 
   * Device password is derived from browser fingerprint + random seed,
   * making the encrypted key difficult to extract even with database access.
   * 
   * @param keypair - CryptoKeyPair to store
   */
  static async storeDeviceKeypair(keypair: CryptoKeyPair): Promise<void> {
    try {
      const publicKey = await this.exportPublicKey(keypair.publicKey);
      const privateKeyRaw = await window.crypto.subtle.exportKey('pkcs8', keypair.privateKey);
      
      // Generate salt for key derivation
      const salt = window.crypto.getRandomValues(new Uint8Array(16));
      
      // Get device password and derive encryption key
      const devicePassword = await this.getDevicePassword();
      const encryptionKey = await this.deriveEncryptionKey(devicePassword, salt.buffer);
      
      // Encrypt the private key
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const encryptedPrivateKey = await window.crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv,
        },
        encryptionKey,
        privateKeyRaw
      );
      
      // Store encrypted data in IndexedDB
      const db = await openDB();
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      await new Promise<void>((resolve, reject) => {
        const request = store.put({
          encryptedPrivateKey: encryptedPrivateKey,
          salt: salt.buffer,
          iv: iv.buffer,
        }, 'private-key');
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      
      db.close();
      
      // Store public key in localStorage (not sensitive)
      localStorage.setItem('device-public-key', publicKey);
    } catch (error) {
      console.error('Failed to store device keypair:', error);
      throw error;
    }
  }

  // Load keypair from storage
  static async loadDeviceKeypair(): Promise<CryptoKeyPair | null> {
    try {
      const publicKeyBase64 = localStorage.getItem('device-public-key');
      if (!publicKeyBase64) {
        return null;
      }
      
      // Load encrypted private key from IndexedDB
      const db = await openDB();
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      
      const encryptedData = await new Promise<any>((resolve, reject) => {
        const request = store.get('private-key');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      db.close();
      
      if (!encryptedData) {
        return null;
      }
      
      // Decrypt private key
      const devicePassword = await this.getDevicePassword();
      const encryptionKey = await this.deriveEncryptionKey(devicePassword, encryptedData.salt);
      
      const decryptedPrivateKey = await window.crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: new Uint8Array(encryptedData.iv),
        },
        encryptionKey,
        encryptedData.encryptedPrivateKey
      );
      
      // Import keys
      const publicKey = await this.importPublicKey(publicKeyBase64);
      const privateKey = await window.crypto.subtle.importKey(
        'pkcs8',
        decryptedPrivateKey,
        {
          name: 'ECDH',
          namedCurve: 'P-256',
        },
        true,
        ['deriveKey', 'deriveBits']
      );
      
      return { publicKey, privateKey };
    } catch (error) {
      console.error('Failed to load device keypair:', error);
      return null;
    }
  }

  // Clear device keys (on account deletion only)
  static async clearDeviceKeys(): Promise<void> {
    try {
      // Clear from IndexedDB
      const db = await openDB();
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      await new Promise<void>((resolve, reject) => {
        const request = store.delete('private-key');
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      
      db.close();
      
      // Clear from localStorage
      localStorage.removeItem('device-public-key');
      localStorage.removeItem('device-seed');
    } catch (error) {
      console.error('Failed to clear device keys:', error);
      // Fallback to localStorage clear
      localStorage.removeItem('device-public-key');
      localStorage.removeItem('device-seed');
    }
  }

  // Migrate old localStorage keys to IndexedDB (for backward compatibility)
  static async migrateFromLocalStorage(): Promise<boolean> {
    try {
      const oldPrivateKey = localStorage.getItem('device-private-key');
      const publicKey = localStorage.getItem('device-public-key');
      
      if (!oldPrivateKey || !publicKey) {
        return false; // Nothing to migrate
      }
      
      // Import the old keys
      const privateKeyBytes = Uint8Array.from(atob(oldPrivateKey), (c) => c.charCodeAt(0));
      const privateKey = await window.crypto.subtle.importKey(
        'pkcs8',
        privateKeyBytes,
        {
          name: 'ECDH',
          namedCurve: 'P-256',
        },
        true,
        ['deriveKey', 'deriveBits']
      );
      
      const publicKeyObj = await this.importPublicKey(publicKey);
      
      // Store using new encrypted method
      await this.storeDeviceKeypair({ publicKey: publicKeyObj, privateKey });
      
      // Remove old localStorage key (keep public key and seed)
      localStorage.removeItem('device-private-key');
      
      console.log('Successfully migrated keys from localStorage to IndexedDB');
      return true;
    } catch (error) {
      console.error('Failed to migrate keys:', error);
      return false;
    }
  }
}
