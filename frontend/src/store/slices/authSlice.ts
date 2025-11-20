/**
 * Authentication Slice
 * 
 * Manages user authentication state and device information.
 * 
 * State:
 * - user: Current authenticated user profile
 * - device: Current device information
 * - isAuthenticated: Whether user is logged in
 * 
 * Persistence:
 * - Automatically persisted to localStorage
 * - Hydrated on app load
 * - Cleared on logout
 * 
 * Security:
 * - No tokens stored (using httpOnly cookies)
 * - Only user profile and device metadata stored
 * 
 * @module AuthSlice
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface User {
  id: string;
  email: string;
  handle: string;
  displayName?: string;
  avatarColor?: string;
  bio?: string;
  avatarUrl?: string;
}

interface Device {
  id: string;
  deviceName?: string;
}

interface AuthState {
  user: User | null;
  device: Device | null;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  user: null,
  device: null,
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /**
     * Set authentication state after login
     * 
     * @param action.payload.user - User profile data
     * @param action.payload.device - Device information
     */
    setAuth: (state, action: PayloadAction<{ user: User; device: Device | null }>) => {
      state.user = action.payload.user;
      state.device = action.payload.device;
      state.isAuthenticated = true;
    },
    /**
     * Update user profile fields
     * 
     * @param action.payload - Partial user data to update
     */
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
    /**
     * Clear authentication state on logout
     */
    logout: (state) => {
      state.user = null;
      state.device = null;
      state.isAuthenticated = false;
    },
  },
});

export const { setAuth, updateUser, logout } = authSlice.actions;
export default authSlice.reducer;
