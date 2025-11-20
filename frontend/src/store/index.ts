/**
 * Redux Store Configuration
 * 
 * Manages application state with Redux Toolkit.
 * 
 * Features:
 * - Auth state persistence in localStorage
 * - Type-safe hooks (useAppDispatch, useAppSelector)
 * - Automatic state hydration on app load
 * - Token migration (removes old token field)
 * 
 * Slices:
 * - auth: User and device authentication state
 * - messages: Encrypted message storage and decryption state
 * 
 * Persistence:
 * - Auth state saved to localStorage on every change
 * - Messages kept in memory only (never persisted)
 * 
 * @module Store
 */

import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import authReducer from './slices/authSlice';
import messageReducer from './slices/messageSlice';

/**
 * Load persisted authentication state from localStorage
 * 
 * Handles migration from old token-based auth to httpOnly cookies.
 * Removes token field if present for security.
 * 
 * @returns Persisted auth state or undefined
 */
const loadAuthState = () => {
  try {
    const serializedState = localStorage.getItem('auth-storage');
    console.log('[Store] Loading auth state from localStorage:', serializedState);
    if (serializedState === null) {
      return undefined;
    }
    const parsed = JSON.parse(serializedState);
    // Handle both old Zustand format and new Redux format
    const state = parsed.state || parsed;
    
    // Remove token field if it exists (migration from old format)
    if (state.token !== undefined) {
      console.log('[Store] Removing token field from auth state (now using httpOnly cookies)');
      delete state.token;
    }
    
    console.log('[Store] Loaded auth state:', state);
    return state;
  } catch (err) {
    console.error('[Store] Failed to load auth state:', err);
    return undefined;
  }
};

/**
 * Save authentication state to localStorage
 * 
 * Called automatically on every state change via store.subscribe().
 * Stores user and device info for session persistence.
 * 
 * @param state - Auth state to persist
 */
const saveAuthState = (state: any) => {
  try {
    console.log('[Store] Saving auth state to localStorage:', state);
    const serializedState = JSON.stringify({
      state,
      version: 0,
    });
    localStorage.setItem('auth-storage', serializedState);
  } catch (err) {
    console.error('[Store] Failed to save auth state:', err);
  }
};

const preloadedState = {
  auth: loadAuthState(),
};

export const store = configureStore({
  reducer: {
    auth: authReducer,
    messages: messageReducer,
  },
  preloadedState,
});

/**
 * Subscribe to store changes to persist auth state
 * 
 * Automatically saves auth slice to localStorage on every update.
 * Messages are never persisted (security: plaintext after decryption).
 */
store.subscribe(() => {
  saveAuthState(store.getState().auth);
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Custom hooks with types
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
