import { useNavigate } from 'react-router-dom';
import { Button } from '../components/catalyst/button';
import { useHealthCheck } from '../hooks/useHealthCheck';

export default function Home() {
  const navigate = useNavigate();
  const { online } = useHealthCheck();

  return (
    <div className="min-h-screen flex flex-col bg-cyber-black grid-bg scanlines">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex justify-between items-center px-6 py-4 bg-cyber-darker/50 backdrop-blur-sm border-b border-cyber-gray">
        <div className="flex items-center gap-3">
          <svg className="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span className="text-xl font-bold font-mono neon-text-cyan glitch" data-text="GhostChannel">GhostChannel</span>
        </div>
        <div className="flex gap-3">
          <button onClick={() => navigate('/how-it-works')} className="px-4 py-2 text-gray-300 hover:text-cyan-400 font-mono text-sm transition-colors">
            How It Works
          </button>
          <Button onClick={() => navigate('/chat')} color="cyan" className="shadow-neon-cyan">
            Enter Channel
          </Button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center px-6 py-16">
        {/* Hero Section */}
        <div className="max-w-4xl text-center mb-20">
          <div className="mb-6">
            <div className="inline-block relative">
              <div className="absolute inset-0 bg-cyan-500/20 blur-2xl animate-pulse" />
              <svg className="w-20 h-20 relative z-10 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="glitch neon-text-cyan" data-text="Secure Device-to-Device">Secure Device-to-Device</span>
            <br />
            <span className="text-gray-100">Encrypted Messaging</span>
          </h1>
          <p className="text-lg text-gray-400 font-mono mb-2">
            &gt; END_TO_END_ENCRYPTION_PROTOCOL_ACTIVE
          </p>
          <p className="text-gray-300 mb-10 max-w-2xl mx-auto">
            Military-grade encryption meets seamless communication. Every message protected by device-specific cryptographic keys. Zero-knowledge architecture ensures your privacy.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => navigate('/chat')} 
              className="group relative px-8 py-4 bg-gradient-to-r from-cyan-500 to-cyan-600 text-black font-bold font-mono rounded-lg overflow-hidden transition-all duration-300 hover:scale-105 shadow-neon-cyan hover:shadow-[0_0_30px_rgba(6,182,212,0.6)]"
            >
              <span className="relative z-10">INITIALIZE SECURE CHANNEL</span>
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
            <button 
              onClick={() => navigate('/how-it-works')} 
              className="px-8 py-4 border-2 border-cyan-500/50 text-cyan-400 hover:border-cyan-400 hover:bg-cyan-500/10 rounded-lg font-mono font-bold transition-all duration-300 hover:scale-105"
            >
              VIEW PROTOCOL SPEC
            </button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full mb-16">
          <div className="cyber-card cyber-card-hover p-6">
            <div className="text-4xl mb-4 text-cyan-400">🔐</div>
            <h3 className="text-xl font-bold mb-2 text-cyan-400 font-mono">AES-GCM-256</h3>
            <p className="text-gray-400 text-sm font-mono leading-relaxed">
              Military-grade authenticated encryption with ECDH P-256 key exchange
            </p>
          </div>
          <div className="cyber-card cyber-card-hover p-6">
            <div className="text-4xl mb-4 text-pink-400">📱</div>
            <h3 className="text-xl font-bold mb-2 text-pink-400 font-mono">Per-Device Keys</h3>
            <p className="text-gray-400 text-sm font-mono leading-relaxed">
              Unique cryptographic identity for each device. Maximum security isolation.
            </p>
          </div>
          <div className="cyber-card cyber-card-hover p-6">
            <div className="text-4xl mb-4 text-green-400">⚡</div>
            <h3 className="text-xl font-bold mb-2 text-green-400 font-mono">Real-Time Sync</h3>
            <p className="text-gray-400 text-sm font-mono leading-relaxed">
              WebSocket-based instant delivery with end-to-end verification
            </p>
          </div>
        </div>

        {/* Technical Deep Dive */}
        <div className="max-w-5xl w-full space-y-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2">
              <span className="neon-text-cyan font-mono">TECHNICAL ARCHITECTURE</span>
            </h2>
            <p className="text-gray-500 font-mono text-sm">&gt; CRYPTOGRAPHIC_IMPLEMENTATION_DETAILS</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Encryption Stack */}
            <div className="cyber-card p-6">
              <h3 className="text-lg font-bold text-cyan-400 font-mono mb-4 flex items-center gap-2">
                <span className="text-2xl">🔒</span> ENCRYPTION STACK
              </h3>
              <div className="space-y-3 text-sm font-mono">
                <div className="flex justify-between items-center pb-2 border-b border-gray-700">
                  <span className="text-gray-400">Key Exchange:</span>
                  <span className="text-cyan-400">ECDH P-256</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-gray-700">
                  <span className="text-gray-400">Cipher:</span>
                  <span className="text-cyan-400">AES-256-GCM</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-gray-700">
                  <span className="text-gray-400">Key Derivation:</span>
                  <span className="text-cyan-400">ECDH→AES</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-gray-700">
                  <span className="text-gray-400">Auth Tag:</span>
                  <span className="text-cyan-400">128-bit GCM</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Nonce:</span>
                  <span className="text-cyan-400">96-bit random</span>
                </div>
              </div>
            </div>

            {/* Storage & Transport */}
            <div className="cyber-card p-6">
              <h3 className="text-lg font-bold text-pink-400 font-mono mb-4 flex items-center gap-2">
                <span className="text-2xl">💾</span> STORAGE & TRANSPORT
              </h3>
              <div className="space-y-3 text-sm font-mono">
                <div className="flex justify-between items-center pb-2 border-b border-gray-700">
                  <span className="text-gray-400">Private Keys:</span>
                  <span className="text-pink-400">IndexedDB (local)</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-gray-700">
                  <span className="text-gray-400">Public Keys:</span>
                  <span className="text-pink-400">PostgreSQL</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-gray-700">
                  <span className="text-gray-400">Messages:</span>
                  <span className="text-pink-400">Ciphertext only</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-gray-700">
                  <span className="text-gray-400">Real-time:</span>
                  <span className="text-pink-400">WebSocket/TLS</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Presence:</span>
                  <span className="text-pink-400">Redis Pub/Sub</span>
                </div>
              </div>
            </div>

            {/* Security Guarantees */}
            <div className="cyber-card p-6">
              <h3 className="text-lg font-bold text-purple-400 font-mono mb-4 flex items-center gap-2">
                <span className="text-2xl">🛡️</span> SECURITY GUARANTEES
              </h3>
              <div className="space-y-2 text-sm font-mono text-gray-400">
                <div className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">✓</span>
                  <span>Perfect Forward Secrecy (PFS)</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">✓</span>
                  <span>Zero-knowledge server architecture</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">✓</span>
                  <span>Authenticated encryption (AEAD)</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">✓</span>
                  <span>Device isolation prevents key compromise</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">✓</span>
                  <span>Cryptographically secure random nonces</span>
                </div>
              </div>
            </div>

            {/* Attack Resistance */}
            <div className="cyber-card p-6">
              <h3 className="text-lg font-bold text-green-400 font-mono mb-4 flex items-center gap-2">
                <span className="text-2xl">⚔️</span> ATTACK RESISTANCE
              </h3>
              <div className="space-y-2 text-sm font-mono text-gray-400">
                <div className="flex items-start gap-2">
                  <span className="text-red-400 mt-1">✗</span>
                  <span>Man-in-the-middle (MITM) attacks</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-red-400 mt-1">✗</span>
                  <span>Server-side message decryption</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-red-400 mt-1">✗</span>
                  <span>Replay attacks (nonce validation)</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-red-400 mt-1">✗</span>
                  <span>Message tampering (auth tags)</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-red-400 mt-1">✗</span>
                  <span>Cross-device key leakage</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-6 text-center bg-cyber-darker/50 backdrop-blur-sm border-t border-cyber-gray">
        <p className="text-gray-500 font-mono text-sm">&copy; 2025 Cr0wn_Gh0ul. Privacy by design.</p>
      </footer>

      {/* Status Indicator */}
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-cyber-darker/80 backdrop-blur-sm border border-cyber-gray rounded-full px-4 py-2">
        <div className={`w-2 h-2 rounded-full ${online ? 'bg-green-400 animate-pulse shadow-neon-green' : 'bg-red-400'}`} />
        <span className="text-xs font-mono text-gray-400">{online ? 'SYSTEM ONLINE' : 'SYSTEM OFFLINE'}</span>
      </div>
    </div>
  );
}
