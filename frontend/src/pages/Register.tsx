import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api/client';
import { Button } from '../components/catalyst/button';
import { Input } from '../components/catalyst/input';
import { Field, Label, Description } from '../components/catalyst/fieldset';
import { Heading } from '../components/catalyst/heading';

export default function Register() {
  const [email, setEmail] = useState('');
  const [handle, setHandle] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      await authApi.register(email, handle, password);
      navigate('/login');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed');
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

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
      </div>

      <div className="w-full max-w-md relative z-10 cyber-card p-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-pink-500/20 blur-xl rounded-full animate-pulse" />
              <svg className="w-16 h-16 relative z-10 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
          </div>
          <Heading className="text-3xl font-bold">
            <span className="glitch neon-text-magenta" data-text="Initialize Access">Initialize Access</span>
          </Heading>
          <p className="text-pink-400/80 font-mono text-xs mt-2">
            &gt; NEW_OPERATIVE_REGISTRATION_PROTOCOL
          </p>
          <p className="text-gray-400 text-sm mt-2">
            Create your secure GhostChannel identity
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
            <Label className="text-gray-300 font-medium">Handle (Username)</Label>
            <Input
              type="text"
              placeholder="ghost_operative"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              required
              disabled={loading}
              pattern="[a-zA-Z0-9_]+"
              autoComplete="username"
              className="font-mono"
            />
            <Description className="text-gray-500 text-xs mt-1">
              Letters, numbers, and underscores only
            </Description>
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
              minLength={8}
              autoComplete="new-password"
              className="font-mono"
            />
            <Description className="text-gray-500 text-xs mt-1">
              Minimum 8 characters
            </Description>
          </Field>

          <Field>
            <Label className="text-gray-300 font-medium">Confirm Password</Label>
            <Input
              type="password"
              placeholder="••••••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
              autoComplete="new-password"
              className="font-mono"
            />
          </Field>

          <Button
            type="submit"
            className="w-full shadow-neon-magenta"
            color="pink"
            disabled={loading}
          >
            {loading ? 'Initializing...' : 'Create Secure Access'}
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-cyber-gray text-center">
          <p className="text-gray-400 text-sm font-mono">
            Already registered?{' '}
            <Link to="/login" className="text-pink-400 hover:text-pink-300 transition-colors underline decoration-pink-400/50 hover:decoration-pink-300">
              Access System
            </Link>
          </p>
        </div>

        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-pink-500/50" />
        <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-pink-500/50" />
        <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-pink-500/50" />
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-pink-500/50" />
      </div>

      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-cyber-darker/80 backdrop-blur-sm border border-cyber-gray rounded-full px-4 py-2">
        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-neon-green" />
        <span className="text-xs font-mono text-gray-400">SYSTEM ONLINE</span>
      </div>
    </div>
  );
}
