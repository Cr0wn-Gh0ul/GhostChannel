import { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { logout as logoutAction, updateUser as updateUserAction } from '../store/slices/authSlice';
import { authApi, usersApi, devicesApi } from '../api/client';
import { Button } from '../components/catalyst/button';
import { Field, Label } from '../components/catalyst/fieldset';
import { Input } from '../components/catalyst/input';
import { Textarea } from '../components/catalyst/textarea';
import { ConfirmModal } from '../components/ConfirmModal';

interface UserProfile {
  id: string;
  handle: string;
  displayName: string | null;
  avatarUrl: string | null;
  avatarColor: string;
  bio: string | null;
  currentDeviceId: string | null;
  defaultDeviceId: string | null;
}

interface Device {
  id: string;
  publicKey: string;
  deviceName: string | null;
  createdAt: string;
  lastSeenAt: string | null;
}

const PRESET_COLORS = [
  '#06b6d4', // cyan
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#f59e0b', // amber
  '#10b981', // emerald
  '#3b82f6', // blue
  '#f43f5e', // rose
  '#a855f7', // purple
  '#14b8a6', // teal
  '#6366f1', // indigo
];

export default function Settings() {
  const dispatch = useAppDispatch();
  const { device: currentDevice } = useAppSelector((state) => state.auth);
  const logout = () => dispatch(logoutAction());
  const updateUser = (userData: any) => dispatch(updateUserAction(userData));
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  // Profile fields
  const [displayName, setDisplayName] = useState('');
  const [handle, setHandle] = useState('');
  const [bio, setBio] = useState('');
  const [avatarColor, setAvatarColor] = useState('#06b6d4');
  const [customColor, setCustomColor] = useState('');
  
  // Password change
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [handleAvailable, setHandleAvailable] = useState<boolean | null>(null);
  const [checkingHandle, setCheckingHandle] = useState(false);
  
  // Device editing
  const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null);
  const [editingDeviceName, setEditingDeviceName] = useState('');
  
  // Confirm modals
  const [confirmDeleteDevice, setConfirmDeleteDevice] = useState<string | null>(null);
  const [confirmRegenerateKeys, setConfirmRegenerateKeys] = useState(false);
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false);

  useEffect(() => {
    loadProfile();
    loadDevices();
  }, []);

  useEffect(() => {
    if (handle && handle !== profile?.handle) {
      const timer = setTimeout(() => checkHandleAvailability(handle), 500);
      return () => clearTimeout(timer);
    } else {
      setHandleAvailable(null);
    }
  }, [handle, profile?.handle]);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const response = await usersApi.getMe();
      const data = response.data;
      setProfile(data);
      setDisplayName(data.displayName || '');
      setHandle(data.handle || '');
      setBio(data.bio || '');
      setAvatarColor(data.avatarColor || '#06b6d4');
    } catch (error) {
      console.error('Failed to load profile:', error);
      setLoadError('Failed to load profile. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadDevices = async () => {
    try {
      const response = await usersApi.getMyDevices();
      setDevices(response.data);
    } catch (error) {
      console.error('Failed to load devices:', error);
    }
  };

  const checkHandleAvailability = async (handleToCheck: string) => {
    if (!handleToCheck || handleToCheck.length < 3) {
      setHandleAvailable(null);
      return;
    }

    setCheckingHandle(true);
    try {
      const response = await usersApi.checkHandleAvailability(handleToCheck);
      setHandleAvailable(response.data.available);
    } catch (error) {
      console.error('Failed to check handle:', error);
    } finally {
      setCheckingHandle(false);
    }
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    setMessage('');
    setError('');

    // Validate handle
    if (handle !== profile?.handle && handleAvailable === false) {
      setError('Handle is already taken');
      setLoading(false);
      return;
    }

    try {
      const response = await usersApi.updateProfile({
        displayName: displayName.trim() || undefined,
        handle: handle.trim() || undefined,
        bio: bio.trim() || undefined,
        avatarColor: customColor || avatarColor,
      });

      const data = response.data;
      setProfile(data);
      setDisplayName(data.displayName || '');
      setHandle(data.handle || '');
      setBio(data.bio || '');
      setAvatarColor(data.avatarColor || '#06b6d4');
      
      // Update auth store so changes reflect immediately in Chat
      updateUser({
        handle: data.handle,
        displayName: data.displayName,
        avatarColor: data.avatarColor,
        bio: data.bio,
        avatarUrl: data.avatarUrl,
      });
      
      setMessage('Profile updated successfully');
      setCustomColor('');
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      setError(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setMessage('');
    setError('');

    try {
      await usersApi.changePassword(currentPassword, newPassword);
      setMessage('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordChange(false);
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      console.error('Failed to change password:', error);
      setError(error.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDevice = async (deviceId: string) => {
    setConfirmDeleteDevice(deviceId);
  };

  const confirmDeleteDeviceAction = async () => {
    if (!confirmDeleteDevice) return;

    try {
      await usersApi.revokeDevice(confirmDeleteDevice);
      setMessage('Device deleted successfully');
      loadDevices();
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      console.error('Failed to delete device:', error);
      setError(error.response?.data?.error || 'Failed to delete device');
    } finally {
      setConfirmDeleteDevice(null);
    }
  };

  const handleEditDevice = (deviceId: string, currentName: string) => {
    setEditingDeviceId(deviceId);
    setEditingDeviceName(currentName || '');
  };

  const handleCancelEditDevice = () => {
    setEditingDeviceId(null);
    setEditingDeviceName('');
  };

  const handleSaveDeviceName = async (deviceId: string) => {
    const trimmedName = editingDeviceName.trim();
    
    if (!trimmedName) {
      setError('Device name cannot be empty');
      return;
    }

    if (trimmedName.length > 50) {
      setError('Device name must be 50 characters or less');
      return;
    }

    try {
      await usersApi.updateDeviceName(deviceId, trimmedName);
      setMessage('Device name updated successfully');
      setEditingDeviceId(null);
      setEditingDeviceName('');
      loadDevices();
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      console.error('Failed to update device name:', error);
      setError(error.response?.data?.message || 'Failed to update device name');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setMessage('Copied to clipboard');
    setTimeout(() => setMessage(''), 2000);
  };

  const handleLogout = async () => {
    try {
      // Call logout endpoint to clear cookie
      await authApi.logout();
    } catch (err) {
      console.error('Logout API call failed:', err);
    }
    // Don't clear device keys - user should be able to decrypt messages when logging back in
    logout();
    window.location.href = '/';
  };

  const handleRegenerateKeys = async () => {
    setConfirmRegenerateKeys(true);
  };

  const confirmRegenerateKeysAction = async () => {
    try {
      setLoading(true);
      
      // Get current device info to keep the same name
      const deviceToReplace = devices.find(d => d.id === currentDevice?.id);
      const deviceName = deviceToReplace?.deviceName || 'My Device';
      
      // Import CryptoService to regenerate keys
      const { CryptoService } = await import('../services/crypto');
      
      // Generate new keys
      const keyPair = await CryptoService.generateDeviceKeypair();
      const publicKeyBase64 = await CryptoService.exportPublicKey(keyPair.publicKey);
      
      // Store new keys locally
      await CryptoService.storeDeviceKeypair(keyPair);
      
      // Register new device with backend (keep same device name)
      await devicesApi.register(publicKeyBase64, deviceName);
      
      // Delete the old device if it exists
      if (currentDevice?.id) {
        try {
          await devicesApi.revoke(currentDevice.id);
        } catch (deleteError) {
          console.warn('Could not revoke old device:', deleteError);
          // Continue anyway - the new device is registered
        }
      }

      setMessage('Encryption keys regenerated successfully. Previous conversations will start fresh with new encryption.');
      
      // Reload profile to get new current device
      await loadProfile();
      await loadDevices();
    } catch (error) {
      console.error('Failed to regenerate keys:', error);
      setError('Failed to regenerate encryption keys');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setConfirmDeleteAccount(true);
  };

  const confirmDeleteAccountAction = async () => {
    try {
      setLoading(true);
      await usersApi.deleteAccount();

      // Only clear keys when deleting account (permanent action)
      const { CryptoService } = await import('../services/crypto');
      await CryptoService.clearDeviceKeys();
      logout();
      window.location.href = '/';
    } catch (error) {
      console.error('Failed to delete account:', error);
      setError('Failed to delete account. Please try again.');
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-cyber-black">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  if (loadError || !profile) {
    return (
      <div className="flex items-center justify-center h-screen bg-cyber-black">
        <div className="text-center">
          <div className="text-red-400 mb-4">
            <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xl font-semibold mb-2">Failed to Load Settings</p>
            <p className="text-gray-400 text-sm mb-6">{loadError || 'Unknown error'}</p>
          </div>
          <div className="space-x-4">
            <Button onClick={loadProfile} color="cyan">
              Retry
            </Button>
            <Button onClick={() => window.history.back()} color="zinc">
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const selectedColor = customColor || avatarColor;

  return (
    <div className="min-h-screen bg-cyber-black grid-bg">
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-100 mb-2">Settings</h1>
              <p className="text-gray-500 font-mono text-sm">&gt; CONFIGURE_PROFILE</p>
            </div>
            <Button onClick={() => window.history.back()} color="zinc">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Chat
            </Button>
          </div>
        </div>

        {/* Messages */}
        {message && (
          <div className="mb-6 p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
            <p className="text-cyan-400 font-mono text-sm">{message}</p>
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-red-400 font-mono text-sm">{error}</p>
          </div>
        )}

        {/* Profile Section */}
        <div className="bg-cyber-darker border border-cyber-gray rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-100 mb-6 flex items-center gap-2">
            <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Profile
          </h2>

          <div className="space-y-6">
            {/* User Info */}
            <div className="flex items-center gap-4 mb-6">
              <div 
                className="w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-neon-cyan"
                style={{ 
                  background: `linear-gradient(135deg, ${selectedColor}, ${selectedColor}dd)`,
                }}
              >
                {handle[0]?.toUpperCase() || 'U'}
              </div>
              <div>
                <div className="text-lg font-semibold text-gray-100">{displayName || handle}</div>
                <div className="text-sm text-cyan-400 font-mono">@{handle}</div>
                <div className="text-xs text-gray-500 font-mono mt-1 flex items-center gap-2">
                  ID: {profile.id.slice(0, 8)}...
                  <button
                    onClick={() => copyToClipboard(profile.id)}
                    className="text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Current Device Info */}
            {currentDevice && (
              <div className="bg-cyber-slate border border-cyan-500/20 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm font-semibold text-cyan-400">Current Device</span>
                </div>
                <div className="text-sm text-gray-300 font-mono mb-1">
                  {currentDevice.deviceName || 'Unnamed Device'}
                </div>
                <div className="text-xs text-gray-500 font-mono break-all">
                  ID: {currentDevice.id}
                </div>
              </div>
            )}

            {/* Display Name */}
            <Field>
              <Label className="text-gray-300 font-mono text-sm">Display Name</Label>
              <Input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter display name"
                className="mt-1"
                maxLength={50}
              />
            </Field>

            {/* Handle */}
            <Field>
              <Label className="text-gray-300 font-mono text-sm">Handle (Username)</Label>
              <div className="relative">
                <Input
                  type="text"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="username"
                  className="mt-1"
                  maxLength={30}
                />
                {checkingHandle && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-500"></div>
                  </div>
                )}
                {!checkingHandle && handleAvailable === true && handle !== profile.handle && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                {!checkingHandle && handleAvailable === false && handle !== profile.handle && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 font-mono mt-1">3-30 characters, letters, numbers, and underscores only</p>
            </Field>

            {/* Bio */}
            <Field>
              <Label className="text-gray-300 font-mono text-sm">About Me</Label>
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell others about yourself..."
                className="mt-1"
                maxLength={500}
                rows={3}
              />
              <p className="text-xs text-gray-500 font-mono mt-1 text-right">{bio.length}/500</p>
            </Field>

            {/* Avatar Color Picker */}
            <div>
              <label className="text-gray-300 font-mono text-sm mb-3 block">Avatar Color</label>
              <div className="grid grid-cols-5 gap-3 mb-4">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => {
                      setAvatarColor(color);
                      setCustomColor('');
                    }}
                    className={`w-full aspect-square rounded-lg transition-all ${
                      selectedColor === color
                        ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-cyber-darker scale-110'
                        : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
              <Field>
                <Label className="text-gray-400 font-mono text-xs">Custom Color (Hex)</Label>
                <Input
                  type="text"
                  value={customColor}
                  onChange={(e) => setCustomColor(e.target.value)}
                  placeholder="#06b6d4"
                  className="mt-1 font-mono"
                  pattern="^#[0-9A-Fa-f]{6}$"
                />
              </Field>
            </div>

            <Button onClick={handleSaveProfile} disabled={loading} color="cyan" className="shadow-neon-cyan">
              {loading ? 'Saving...' : 'Save Profile'}
            </Button>
          </div>
        </div>

        {/* Security Section */}
        <div className="bg-cyber-darker border border-cyber-gray rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-100 mb-6 flex items-center gap-2">
            <svg className="w-6 h-6 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Security
          </h2>

          {/* Change Password */}
          <div className="mb-6">
            <Button onClick={() => setShowPasswordChange(!showPasswordChange)} color="zinc" className="mb-4">
              {showPasswordChange ? 'Cancel Password Change' : 'Change Password'}
            </Button>

            {showPasswordChange && (
              <div className="space-y-4 bg-cyber-slate border border-cyber-gray rounded-lg p-4">
                <Field>
                  <Label className="text-gray-300 font-mono text-sm">Current Password</Label>
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="mt-1"
                  />
                </Field>
                <Field>
                  <Label className="text-gray-300 font-mono text-sm">New Password</Label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="mt-1"
                    minLength={6}
                  />
                </Field>
                <Field>
                  <Label className="text-gray-300 font-mono text-sm">Confirm New Password</Label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="mt-1"
                  />
                </Field>
                <Button onClick={handleChangePassword} disabled={loading} color="pink">
                  {loading ? 'Changing...' : 'Update Password'}
                </Button>
              </div>
            )}
          </div>

          {/* Devices */}
          <h3 className="text-lg font-semibold text-gray-100 mb-4">Encryption Devices</h3>
          <div className="space-y-4">
            {devices.map((device) => (
              <div key={device.id} className="bg-cyber-slate border border-cyber-gray rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    {editingDeviceId === device.id ? (
                      <div className="flex items-center gap-2 mb-2">
                        <Input
                          value={editingDeviceName}
                          onChange={(e) => setEditingDeviceName(e.target.value)}
                          placeholder="Device name"
                          className="flex-1 bg-cyber-black border-cyber-gray text-sm"
                          maxLength={50}
                        />
                        <button
                          onClick={() => handleSaveDeviceName(device.id)}
                          className="p-1.5 text-green-400 hover:text-green-300 hover:bg-green-500/10 rounded transition-colors"
                          title="Save"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                        <button
                          onClick={handleCancelEditDevice}
                          className="p-1.5 text-gray-400 hover:text-gray-300 hover:bg-gray-500/10 rounded transition-colors"
                          title="Cancel"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mb-1">
                        <div className="text-sm font-semibold text-gray-100">
                          {device.deviceName || 'Unnamed Device'}
                        </div>
                        <button
                          onClick={() => handleEditDevice(device.id, device.deviceName || '')}
                          className="p-1 text-gray-400 hover:text-cyan-400 transition-colors"
                          title="Edit device name"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      </div>
                    )}
                    <div className="text-xs text-gray-500 font-mono break-all">
                      ID: {device.id}
                    </div>
                    <div className="text-xs text-gray-500 font-mono">
                      Created: {new Date(device.createdAt).toLocaleDateString()}
                    </div>
                    {device.lastSeenAt && (
                      <div className="text-xs text-gray-500 font-mono">
                        Last seen: {new Date(device.lastSeenAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {profile.currentDeviceId === device.id && (
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-mono rounded border border-green-500/30">
                        CURRENT
                      </span>
                    )}
                    {profile.defaultDeviceId === device.id && (
                      <span className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs font-mono rounded border border-purple-500/40 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        DEFAULT
                      </span>
                    )}
                    {profile.defaultDeviceId !== device.id && (
                      <button
                        onClick={async () => {
                          try {
                            await usersApi.setDefaultDevice(device.id);
                            setMessage('Default device updated successfully');
                            await loadProfile();
                            setTimeout(() => setMessage(''), 3000);
                          } catch (error) {
                            console.error('Failed to set default device:', error);
                            setError('Failed to set default device');
                          }
                        }}
                        className="px-2 py-1 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 hover:border-purple-500/50 text-purple-300 hover:text-purple-200 text-xs font-mono rounded transition-all"
                        title="Set as default device for offline messaging"
                      >
                        Set as Default
                      </button>
                    )}
                    {profile.currentDeviceId !== device.id && (
                      <button
                        onClick={() => handleDeleteDevice(device.id)}
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                        title="Delete device"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="bg-cyber-black rounded p-3 border border-cyber-gray">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono text-cyan-400">PUBLIC KEY (P-256)</span>
                    <button
                      onClick={() => copyToClipboard(device.publicKey)}
                      className="text-xs text-gray-400 hover:text-cyan-400 transition-colors font-mono"
                    >
                      COPY
                    </button>
                  </div>
                  <div className="text-xs font-mono text-gray-500 break-all leading-relaxed">
                    {device.publicKey}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 space-y-4">
            <div className="p-4 bg-purple-900/10 border border-purple-500/30 rounded-lg">
              <div className="flex gap-3">
                <svg className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                <div className="text-xs text-gray-400 font-mono">
                  <strong className="text-purple-300">Default Device:</strong> Friends can message your default device when you're offline to ensure you receive their messages. Your first device is automatically set as default.
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-cyber-slate/50 border border-cyan-500/30 rounded-lg">
              <div className="flex gap-3">
                <svg className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div className="text-xs text-gray-400 font-mono">
                  <strong className="text-cyan-400">End-to-End Encryption:</strong> All messages are encrypted using ECDH key exchange (P-256) and AES-GCM-256. Your private key never leaves your device. If you delete a device, you won't be able to decrypt messages sent to that device.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-cyber-darker border border-red-500/30 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-red-400 mb-6 flex items-center gap-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Danger Zone
          </h2>

          <div className="space-y-6">
            {/* Regenerate Keys */}
            <div className="pb-6 border-b border-red-500/20">
              <h3 className="text-sm font-semibold text-gray-200 mb-2">Regenerate Encryption Keys</h3>
              <p className="text-sm text-gray-400 mb-4 font-mono">
                Generate new encryption keys for this device. ⚠️ WARNING: You will not be able to decrypt any previous messages after regenerating keys.
              </p>
              <Button onClick={handleRegenerateKeys} color="amber">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                Regenerate Keys
              </Button>
            </div>

            {/* Logout */}
            <div className="pb-6 border-b border-red-500/20">
              <h3 className="text-sm font-semibold text-gray-200 mb-2">Logout</h3>
              <p className="text-sm text-gray-400 mb-4 font-mono">
                Sign out of your account. Your encryption keys will remain on this device so you can decrypt messages when you log back in.
              </p>
              <Button onClick={handleLogout} color="zinc">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </Button>
            </div>

            {/* Delete Account */}
            <div>
              <h3 className="text-sm font-semibold text-gray-200 mb-2">Delete Account</h3>
              <p className="text-sm text-gray-400 mb-4 font-mono">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
              <Button onClick={handleDeleteAccount} color="red">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete Account
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Delete Device Modal */}
      <ConfirmModal
        isOpen={confirmDeleteDevice !== null}
        onClose={() => setConfirmDeleteDevice(null)}
        onConfirm={confirmDeleteDeviceAction}
        title="Delete Device"
        message="Are you sure you want to delete this device? You will need to re-authenticate on that device."
        confirmText="Delete"
        type="danger"
      />

      {/* Confirm Regenerate Keys Modal */}
      <ConfirmModal
        isOpen={confirmRegenerateKeys}
        onClose={() => setConfirmRegenerateKeys(false)}
        onConfirm={confirmRegenerateKeysAction}
        title="Regenerate Encryption Keys"
        message="This will generate new encryption keys for this device. WARNING: You will NOT be able to decrypt any previous messages after regenerating keys. New messages will use the new keys. Are you sure you want to continue?"
        confirmText="Regenerate Keys"
        type="warning"
      />

      {/* Confirm Delete Account Modal */}
      <ConfirmModal
        isOpen={confirmDeleteAccount}
        onClose={() => setConfirmDeleteAccount(false)}
        onConfirm={confirmDeleteAccountAction}
        title="Delete Account"
        message="This will permanently delete your account and ALL associated data including: your profile and settings, all conversations and messages, all devices and encryption keys, and friend connections. THIS ACTION CANNOT BE UNDONE!"
        confirmText="Delete Account"
        type="danger"
      />
    </div>
  );
}
