import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppDispatch } from '../store';
import { setAuth } from '../store/slices/authSlice';
import { authApi } from '../api/client';
import { CryptoService } from '../services/crypto';
import { Button } from '../components/catalyst/button';
import { Input } from '../components/catalyst/input';
import { Field, Label } from '../components/catalyst/fieldset';
import { Heading } from '../components/catalyst/heading';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [showDeviceNaming, setShowDeviceNaming] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Try to migrate old localStorage keys to IndexedDB if they exist
      await CryptoService.migrateFromLocalStorage();
      
      // Check if device keypair exists
      let deviceKeypair = await CryptoService.loadDeviceKeypair();
      let publicKeyBase64: string | undefined;

      // Generate new device keypair if this is first login on this device
      if (!deviceKeypair) {
        deviceKeypair = await CryptoService.generateDeviceKeypair();
        publicKeyBase64 = await CryptoService.exportPublicKey(deviceKeypair.publicKey);
        await CryptoService.storeDeviceKeypair(deviceKeypair);
      } else {
        publicKeyBase64 = await CryptoService.exportPublicKey(deviceKeypair.publicKey);
      }

      // Check if this device is new without logging in
      console.log('[Login] Checking if device is new...');
      const checkResponse = await authApi.checkDevice(email, password, publicKeyBase64);
      const isNewDevice = checkResponse.data.isNewDevice;
      console.log('[Login] Device check result - isNewDevice:', isNewDevice);

      // If this is a new device and no name was provided, show naming modal
      if (isNewDevice && !deviceName) {
        console.log('[Login] New device detected, showing naming modal');
        setShowDeviceNaming(true);
        setLoading(false);
        return;
      }

      // Perform actual login with proper device name
      console.log('[Login] Performing login with device name:', deviceName || 'Default Device');
      const loginResponse = await authApi.login(email, password, publicKeyBase64, deviceName || 'Default Device');
      const loginData = loginResponse.data;

      // Store auth in Redux (token is in httpOnly cookie)
      console.log('[Login] Setting auth in Redux - user:', loginData.user.email, 'device:', loginData.device.deviceName);
      dispatch(setAuth({ user: loginData.user, device: loginData.device }));
      
      // Add small delay to ensure auth state is fully set before navigation
      await new Promise(resolve => setTimeout(resolve, 100));
      console.log('[Login] Navigating to chat after auth state set');
      navigate('/chat');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDeviceNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceName.trim()) {
      setError('Please enter a device name');
      return;
    }
    
    setError('');
    setLoading(true);
    setShowDeviceNaming(false);

    try {
      // Use the same credentials and keypair from the original login attempt
      const deviceKeypair = await CryptoService.loadDeviceKeypair();
      const publicKeyBase64 = await CryptoService.exportPublicKey(deviceKeypair!.publicKey);
      
      console.log('[Login] Device naming: logging in with device name:', deviceName);
      const response = await authApi.login(email, password, publicKeyBase64, deviceName);
      const data = response.data;

      // Store auth in Redux (token is in httpOnly cookie)
      console.log('[Login] Device naming complete - user:', data.user.email, 'device:', data.device.deviceName);
      dispatch(setAuth({ user: data.user, device: data.device }));
      
      // Add small delay to ensure auth state is fully set
      await new Promise(resolve => setTimeout(resolve, 100));
      navigate('/chat');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
      setShowDeviceNaming(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cyber-black grid-bg scanlines px-4">
      {/* Home button */}
      <button
        onClick={() => navigate('/')}
        className="fixed top-4 left-4 z-20 px-4 py-2 text-cyan-400 hover:text-cyan-300 font-mono text-sm border border-cyan-500/30 hover:border-cyan-400/50 rounded-lg transition-all backdrop-blur-sm bg-cyber-darker/50"
      >
        ← Home
      </button>

      {/* Animated background grid */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
      </div>

      <div className="w-full max-w-md relative z-10 cyber-card p-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full animate-pulse" />
              <svg className="w-16 h-16 relative z-10 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>
          <Heading className="text-3xl font-bold">
            <span className="glitch neon-text-cyan" data-text="GhostChannel">GhostChannel</span>
          </Heading>
          <p className="text-cyan-400/80 font-mono text-xs mt-2">
            &gt; SECURE_AUTHENTICATION_PROTOCOL_v2.1
          </p>
          <p className="text-gray-400 text-sm mt-2">
            Privacy-first encrypted messaging platform
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/50 rounded-md">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-red-400 text-sm font-mono">{error}</p>
            </div>
          </div>
        )}

        {showDeviceNaming ? (
          <form onSubmit={handleDeviceNameSubmit} className="space-y-6">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-500/30 mb-4">
                <svg className="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-100 mb-2">Name This Device</h3>
              <p className="text-sm text-gray-400 font-mono">
                This helps you identify where conversations were created
              </p>
            </div>

            <Field>
              <Label className="text-gray-300 font-medium">Device Name</Label>
              <Input
                type="text"
                placeholder="e.g., Work Laptop, Home PC, Phone"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                required
                disabled={loading}
                autoComplete="off"
                className="font-mono"
                maxLength={50}
              />
              <p className="text-xs text-gray-500 font-mono mt-1">
                You can change this later in Settings
              </p>
            </Field>

            <Button
              type="submit"
              className="w-full shadow-neon-cyan"
              color="cyan"
              disabled={loading || !deviceName.trim()}
            >
              {loading ? 'Completing Login...' : 'Continue'}
            </Button>
          </form>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <Field>
            <Label className="text-gray-300 font-medium">Email Address</Label>
            <Input
              type="email"
              placeholder="user@ghostchannel.io"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              autoComplete="email"
              className="font-mono"
            />
          </Field>

          <Field>
            <Label className="text-gray-300 font-medium">Password</Label>
            <Input
              type="password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              autoComplete="current-password"
              className="font-mono"
            />
          </Field>

          <Button
            type="submit"
            className="w-full shadow-neon-cyan"
            color="cyan"
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Enter Secure Channel'}
          </Button>
        </form>
        )}

        {!showDeviceNaming && (
        <div className="mt-6 pt-6 border-t border-cyber-gray text-center">
          <p className="text-gray-400 text-sm font-mono">
            New operative?{' '}
            <Link to="/register" className="text-cyan-400 hover:text-cyan-300 transition-colors underline decoration-cyan-400/50 hover:decoration-cyan-300">
              Initialize Access
            </Link>
          </p>
        </div>
        )}

        {/* Corner accents */}
        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-cyan-500/50" />
        <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-cyan-500/50" />
        <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-cyan-500/50" />
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-cyan-500/50" />
      </div>

      {/* Status indicator */}
      <div className="fixed bottom-4 right-4 flex items-center gap-2 bg-cyber-darker/80 backdrop-blur-sm border border-cyber-gray rounded-full px-4 py-2">
        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-neon-green" />
        <span className="text-xs font-mono text-gray-400">SYSTEM ONLINE</span>
      </div>
    </div>
  );
}
