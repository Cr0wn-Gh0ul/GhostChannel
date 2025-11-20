/**
 * API Client
 * 
 * Axios-based HTTP client for backend API communication.
 * 
 * Features:
 * - Automatic cookie handling (httpOnly JWT tokens)
 * - CORS with credentials
 * - Type-safe API methods organized by domain
 * 
 * Security:
 * - JWT tokens stored in httpOnly cookies (secure, not accessible to JS)
 * - CSRF protection via SameSite cookie policy
 * - All requests include credentials for authentication
 * 
 * API Modules:
 * - authApi: Authentication and session management
 * - usersApi: User profiles and settings
 * - devicesApi: Device key management
 * - conversationsApi: Conversation CRUD
 * - messagesApi: Message storage and retrieval (ciphertext only)
 * - friendsApi: Friend requests and relationships
 * 
 * @module APIClient
 */

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Axios instance configured for GhostChannel backend
 * 
 * Configured with:
 * - Base URL from environment or localhost:3000
 * - Automatic cookie handling (withCredentials: true)
 * - JSON content type
 */
export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Send cookies with requests
});

// Token is now handled via httpOnly cookies, no need for interceptor

export const authApi = {
  login: (email: string, password: string, devicePublicKey?: string, deviceName?: string) =>
    apiClient.post('/auth/login', { email, password, devicePublicKey, deviceName }),
  
  register: (email: string, handle: string, password: string) =>
    apiClient.post('/auth/register', { email, handle, password }),
  
  checkDevice: (email: string, password: string, publicKey: string) =>
    apiClient.post('/auth/check-device', { email, password, publicKey }),
  
  logout: () => apiClient.post('/auth/logout'),
};

export const usersApi = {
  getMe: () => apiClient.get('/users/me'),
  getMyDevices: () => apiClient.get('/users/me/devices'),
  search: (query: string) => apiClient.get(`/users/search?q=${query}`),
  getUser: (id: string) => apiClient.get(`/users/${id}`),
  updateProfile: (data: { displayName?: string; handle?: string; avatarUrl?: string; avatarColor?: string; bio?: string }) =>
    apiClient.patch('/users/profile', data),
  changePassword: (currentPassword: string, newPassword: string) =>
    apiClient.post('/users/password', { currentPassword, newPassword }),
  updateDeviceName: (deviceId: string, deviceName: string) =>
    apiClient.patch(`/users/devices/${deviceId}`, { deviceName }),
  setDefaultDevice: (deviceId: string) =>
    apiClient.patch(`/users/default-device/${deviceId}`),
  revokeDevice: (deviceId: string) => apiClient.delete(`/users/devices/${deviceId}`),
  deleteAccount: () => apiClient.delete('/users/me'),
  checkHandleAvailability: (handle: string) => apiClient.get(`/users/check-handle/${handle}`),
};

export const devicesApi = {
  register: (publicKey: string, deviceName?: string) =>
    apiClient.post('/devices', { publicKey, deviceName }),
  getMyDevices: () => apiClient.get('/devices'),
  getUserKeys: (userId: string) => apiClient.get(`/devices/user/${userId}/keys`),
  revoke: (deviceId: string) => apiClient.delete(`/devices/${deviceId}`),
};

export const conversationsApi = {
  create: (participantUserIds: string[], isGroup?: boolean, groupName?: string, createdByDeviceId?: string, targetDeviceId?: string) =>
    apiClient.post('/conversations', { participantUserIds, isGroup, groupName, createdByDeviceId, targetDeviceId }),
  getAll: () => apiClient.get('/conversations'),
  getById: (id: string) => apiClient.get(`/conversations/${id}`),
  delete: (conversationId: string, deleteMessages?: boolean) => 
    apiClient.delete(`/conversations/${conversationId}${deleteMessages ? '?deleteMessages=true' : ''}`),
  deleteMessages: (conversationId: string) =>
    apiClient.delete(`/conversations/${conversationId}/messages`),
};

export const messagesApi = {
  getByConversation: (conversationId: string, limit = 50, offset = 0) =>
    apiClient.get(`/messages/conversation/${conversationId}?limit=${limit}&offset=${offset}`),
  
  send: (data: {
    conversationId: string;
    senderDeviceId: string;
    ciphertext: string;
    nonce?: string;
    messageIndex?: number;
  }) => apiClient.post('/messages', data),
  
  markRead: (messageId: string) => apiClient.patch(`/messages/${messageId}/read`),
};

export const friendsApi = {
  generateInviteCode: (expiryHours = 24) =>
    apiClient.post('/friends/invite-code', { expiryHours }),
  
  sendFriendRequest: (inviteCode: string) =>
    apiClient.post('/friends/requests', { inviteCode }),
  
  getPendingRequests: () =>
    apiClient.get('/friends/requests'),
  
  respondToRequest: (requestId: string, action: 'accept' | 'reject') =>
    apiClient.patch(`/friends/requests/${requestId}`, { action }),
  
  getFriends: () =>
    apiClient.get('/friends'),
  
  removeFriend: (friendId: string) =>
    apiClient.delete(`/friends/${friendId}`),
};
