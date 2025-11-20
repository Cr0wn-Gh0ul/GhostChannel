import { useNavigate } from 'react-router-dom';
import { Button } from '../components/catalyst/button';

export default function HowItWorks() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-cyber-black grid-bg scanlines">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex justify-between items-center px-6 py-4 bg-cyber-darker/50 backdrop-blur-sm border-b border-cyber-gray">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <svg className="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span className="text-xl font-bold font-mono neon-text-cyan">GhostChannel</span>
        </div>
        <div className="flex gap-3">
          <button onClick={() => navigate('/')} className="px-4 py-2 text-gray-300 hover:text-cyan-400 font-mono text-sm transition-colors">
            Home
          </button>
          <Button onClick={() => navigate('/chat')} color="cyan" className="shadow-neon-cyan">
            Enter Channel
          </Button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 flex-1 px-6 py-12 max-w-5xl mx-auto w-full">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="glitch neon-text-cyan" data-text="Protocol Overview">Protocol Overview</span>
          </h1>
          <p className="text-gray-400 font-mono text-sm mb-6">
            &gt; CRYPTOGRAPHIC_SECURITY_SPECIFICATION_v2.1
          </p>
          <div className="inline-block bg-cyber-darker border border-cyan-500/30 rounded-lg px-6 py-3">
            <p className="text-xs font-mono text-gray-500">STANDARD COMPLIANCE</p>
            <p className="text-sm font-mono text-cyan-400">FIPS 186-4 (ECDH) • NIST SP 800-38D (GCM) • W3C Web Crypto API</p>
          </div>
        </div>

        {/* Cryptographic Flow Diagram */}
        <div className="cyber-card p-8 mb-16">
          <h2 className="text-2xl font-bold text-center mb-8">
            <span className="neon-text-cyan font-mono">ENCRYPTION FLOW DIAGRAM</span>
          </h2>
          <div className="space-y-6">
            {/* Alice's Device */}
            <div className="flex items-center gap-4">
              <div className="flex-1 cyber-card p-4 bg-cyan-500/5 border-cyan-500/50">
                <p className="text-cyan-400 font-mono font-bold mb-2">DEVICE_A (Alice)</p>
                <div className="text-xs font-mono text-gray-400 space-y-1">
                  <p>Private Key: <span className="text-cyan-300">d_A (256-bit)</span></p>
                  <p>Public Key: <span className="text-cyan-300">P_A = d_A × G</span></p>
                </div>
              </div>
              <div className="flex-shrink-0 text-gray-600 font-mono text-xs">
                <div className="text-center">
                  <p>Exchange</p>
                  <p className="text-2xl">⇄</p>
                  <p>Public Keys</p>
                </div>
              </div>
              <div className="flex-1 cyber-card p-4 bg-pink-500/5 border-pink-500/50">
                <p className="text-pink-400 font-mono font-bold mb-2">DEVICE_B (Bob)</p>
                <div className="text-xs font-mono text-gray-400 space-y-1">
                  <p>Private Key: <span className="text-pink-300">d_B (256-bit)</span></p>
                  <p>Public Key: <span className="text-pink-300">P_B = d_B × G</span></p>
                </div>
              </div>
            </div>

            {/* Key Derivation */}
            <div className="text-center">
              <div className="inline-block border-t-2 border-dashed border-gray-600 w-full mb-4"></div>
              <div className="cyber-card p-4 inline-block bg-purple-500/5 border-purple-500/50">
                <p className="text-purple-400 font-mono font-bold mb-2">ECDH KEY DERIVATION</p>
                <div className="text-xs font-mono text-gray-400 space-y-1">
                  <p>Alice computes: <span className="text-purple-300">S = d_A × P_B</span></p>
                  <p>Bob computes: <span className="text-purple-300">S = d_B × P_A</span></p>
                  <p className="text-green-400 mt-2">Result: S_Alice = S_Bob (shared secret)</p>
                  <p className="text-amber-400 mt-2">Derive: K = deriveKey(S, "AES-GCM", 256)</p>
                </div>
              </div>
              <div className="inline-block border-t-2 border-dashed border-gray-600 w-full mt-4"></div>
            </div>

            {/* Message Encryption */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="cyber-card p-4 bg-green-500/5 border-green-500/50">
                <p className="text-green-400 font-mono font-bold mb-2 text-sm">PLAINTEXT</p>
                <div className="text-xs font-mono text-gray-400">
                  <p>Message: <span className="text-gray-300">"Hello Bob"</span></p>
                  <p className="mt-2 text-green-300">+ Nonce (96-bit random)</p>
                </div>
              </div>
              <div className="flex items-center justify-center">
                <div className="text-center font-mono text-xs text-gray-500">
                  <p>AES-256-GCM</p>
                  <p className="text-2xl my-2">🔐</p>
                  <p>with key K</p>
                </div>
              </div>
              <div className="cyber-card p-4 bg-amber-500/5 border-amber-500/50">
                <p className="text-amber-400 font-mono font-bold mb-2 text-sm">CIPHERTEXT</p>
                <div className="text-xs font-mono text-gray-400">
                  <p className="text-amber-300 break-all">c8f9a2b3d4e5...</p>
                  <p className="mt-2">+ Nonce + Auth Tag</p>
                  <p className="text-green-400 text-[10px] mt-1">✓ Authenticated</p>
                </div>
              </div>
            </div>

            {/* Server Transport */}
            <div className="text-center">
              <div className="cyber-card p-3 inline-block bg-red-500/5 border-red-500/50">
                <p className="text-red-400 font-mono font-bold text-sm">SERVER RELAY (Zero Knowledge)</p>
                <p className="text-xs font-mono text-gray-500 mt-1">Stores and forwards ciphertext only • Cannot decrypt</p>
              </div>
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-6 mb-16">
          <div className="cyber-card cyber-card-hover p-6 flex gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-cyan-500/20 border border-cyan-500/50 rounded-lg flex items-center justify-center text-cyan-400 font-bold text-xl font-mono">
              1
            </div>
            <div>
              <h3 className="text-xl font-bold text-cyan-400 mb-2 font-mono">INITIALIZE_ACCOUNT</h3>
              <p className="text-gray-400 text-sm font-mono leading-relaxed">
                Register credentials. Each device generates unique ECDH P-256 keypair. Private key stored in IndexedDB, never transmitted.
              </p>
            </div>
          </div>

          <div className="cyber-card cyber-card-hover p-6 flex gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-pink-500/20 border border-pink-500/50 rounded-lg flex items-center justify-center text-pink-400 font-bold text-xl font-mono">
              2
            </div>
            <div>
              <h3 className="text-xl font-bold text-pink-400 mb-2 font-mono">ESTABLISH_PEER_CONNECTION</h3>
              <p className="text-gray-400 text-sm font-mono leading-relaxed">
                Search users. Send friend requests. Upon acceptance, public keys exchanged via secure channel.
              </p>
            </div>
          </div>

          <div className="cyber-card cyber-card-hover p-6 flex gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-purple-500/20 border border-purple-500/50 rounded-lg flex items-center justify-center text-purple-400 font-bold text-xl font-mono">
              3
            </div>
            <div>
              <h3 className="text-xl font-bold text-purple-400 mb-2 font-mono">DERIVE_SHARED_SECRET</h3>
              <p className="text-gray-400 text-sm font-mono leading-relaxed">
                Device-to-device ECDH key exchange. Shared secret derived locally. Perfect forward secrecy maintained.
              </p>
            </div>
          </div>

          <div className="cyber-card cyber-card-hover p-6 flex gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-green-500/20 border border-green-500/50 rounded-lg flex items-center justify-center text-green-400 font-bold text-xl font-mono">
              4
            </div>
            <div>
              <h3 className="text-xl font-bold text-green-400 mb-2 font-mono">ENCRYPT_TRANSMIT</h3>
              <p className="text-gray-400 text-sm font-mono leading-relaxed">
                Messages encrypted AES-GCM-256. Authenticated encryption prevents tampering. Server relays ciphertext only.
              </p>
            </div>
          </div>

          <div className="cyber-card cyber-card-hover p-6 flex gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-amber-500/20 border border-amber-500/50 rounded-lg flex items-center justify-center text-amber-400 font-bold text-xl font-mono">
              5
            </div>
            <div>
              <h3 className="text-xl font-bold text-amber-400 mb-2 font-mono">OFFLINE_ROUTING</h3>
              <p className="text-gray-400 text-sm font-mono leading-relaxed">
                Default device configured per user. Offline messages routed to default device. Encrypted queue persists until retrieval.
              </p>
            </div>
          </div>
        </div>

        {/* Cryptographic Primitives */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">
            <span className="neon-text-cyan font-mono">Cryptographic Primitives</span>
          </h2>
          <div className="grid grid-cols-1 gap-6">
            {/* ECDH P-256 */}
            <div className="cyber-card p-6">
              <div className="flex items-start gap-4">
                <div className="text-3xl">🔑</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-cyan-400 font-mono mb-3">ECDH P-256 (secp256r1)</h3>
                  <p className="text-gray-400 text-sm font-mono mb-4">
                    Elliptic Curve Diffie-Hellman key agreement using the NIST P-256 curve. Provides 128-bit security strength.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                    <div className="bg-cyber-black/50 p-3 rounded border border-cyan-500/20">
                      <p className="text-cyan-400 font-bold mb-1">Curve Equation:</p>
                      <p className="text-gray-400">y² = x³ - 3x + b (mod p)</p>
                    </div>
                    <div className="bg-cyber-black/50 p-3 rounded border border-cyan-500/20">
                      <p className="text-cyan-400 font-bold mb-1">Key Size:</p>
                      <p className="text-gray-400">256-bit private, 512-bit public</p>
                    </div>
                    <div className="bg-cyber-black/50 p-3 rounded border border-cyan-500/20">
                      <p className="text-cyan-400 font-bold mb-1">Security Level:</p>
                      <p className="text-gray-400">≈ 2¹²⁸ computational operations</p>
                    </div>
                    <div className="bg-cyber-black/50 p-3 rounded border border-cyan-500/20">
                      <p className="text-cyan-400 font-bold mb-1">Standard:</p>
                      <p className="text-gray-400">FIPS 186-4, SEC 2</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* AES-GCM-256 */}
            <div className="cyber-card p-6">
              <div className="flex items-start gap-4">
                <div className="text-3xl">🔒</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-pink-400 font-mono mb-3">AES-256-GCM (Galois/Counter Mode)</h3>
                  <p className="text-gray-400 text-sm font-mono mb-4">
                    Advanced Encryption Standard in Galois/Counter Mode. Provides authenticated encryption with associated data (AEAD).
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                    <div className="bg-cyber-black/50 p-3 rounded border border-pink-500/20">
                      <p className="text-pink-400 font-bold mb-1">Key Length:</p>
                      <p className="text-gray-400">256 bits (32 bytes)</p>
                    </div>
                    <div className="bg-cyber-black/50 p-3 rounded border border-pink-500/20">
                      <p className="text-pink-400 font-bold mb-1">Block Size:</p>
                      <p className="text-gray-400">128 bits (16 bytes)</p>
                    </div>
                    <div className="bg-cyber-black/50 p-3 rounded border border-pink-500/20">
                      <p className="text-pink-400 font-bold mb-1">Nonce:</p>
                      <p className="text-gray-400">96 bits (12 bytes) random</p>
                    </div>
                    <div className="bg-cyber-black/50 p-3 rounded border border-pink-500/20">
                      <p className="text-pink-400 font-bold mb-1">Auth Tag:</p>
                      <p className="text-gray-400">128 bits (16 bytes) GMAC</p>
                    </div>
                  </div>
                  <div className="mt-3 bg-cyber-black/50 p-3 rounded border border-pink-500/20">
                    <p className="text-pink-400 font-bold mb-1 text-xs">Properties:</p>
                    <p className="text-gray-400 text-xs">Confidentiality + Integrity + Authentication in single operation</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Web Crypto API */}
            <div className="cyber-card p-6">
              <div className="flex items-start gap-4">
                <div className="text-3xl">🌐</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-purple-400 font-mono mb-3">Web Crypto API Implementation</h3>
                  <p className="text-gray-400 text-sm font-mono mb-4">
                    Browser-native cryptographic operations using SubtleCrypto interface. All operations performed in secure context.
                  </p>
                  <div className="bg-cyber-black/50 p-4 rounded border border-purple-500/20 font-mono text-xs">
                    <div className="text-purple-400 mb-2">// Key Generation</div>
                    <div className="text-gray-400 mb-3"><span className="text-green-400">crypto.subtle.generateKey</span>({`{`}
                      name: <span className="text-amber-300">"ECDH"</span>,
                      namedCurve: <span className="text-amber-300">"P-256"</span>
                    {`}`}, true, [<span className="text-amber-300">"deriveKey"</span>])</div>
                    <div className="text-purple-400 mb-2">// Shared Key Derivation</div>
                    <div className="text-gray-400 mb-3"><span className="text-green-400">crypto.subtle.deriveKey</span>({`{`}
                      name: <span className="text-amber-300">"ECDH"</span>,
                      public: <span className="text-cyan-300">peerPublicKey</span>
                    {`}`}, myPrivateKey, {`{`}
                      name: <span className="text-amber-300">"AES-GCM"</span>,
                      length: <span className="text-cyan-300">256</span>
                    {`}`}, false, [<span className="text-amber-300">"encrypt"</span>, <span className="text-amber-300">"decrypt"</span>])</div>
                    <div className="text-purple-400 mb-2">// Encryption</div>
                    <div className="text-gray-400"><span className="text-green-400">crypto.subtle.encrypt</span>({`{`}
                      name: <span className="text-amber-300">"AES-GCM"</span>,
                      iv: <span className="text-cyan-300">nonce</span>
                    {`}`}, key, plaintext)</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Security Features */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">
            <span className="neon-text-cyan font-mono">Security Guarantees</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="cyber-card p-5">
              <div className="flex items-start gap-3">
                <div className="text-2xl">🔑</div>
                <div>
                  <h4 className="font-bold text-cyan-400 font-mono mb-1">ECDH P-256</h4>
                  <p className="text-gray-400 text-sm font-mono">Elliptic curve Diffie-Hellman key exchange. Perfect forward secrecy.</p>
                </div>
              </div>
            </div>
            <div className="cyber-card p-5">
              <div className="flex items-start gap-3">
                <div className="text-2xl">🔒</div>
                <div>
                  <h4 className="font-bold text-pink-400 font-mono mb-1">AES-GCM-256</h4>
                  <p className="text-gray-400 text-sm font-mono">Authenticated encryption. Prevents message tampering.</p>
                </div>
              </div>
            </div>
            <div className="cyber-card p-5">
              <div className="flex items-start gap-3">
                <div className="text-2xl">📱</div>
                <div>
                  <h4 className="font-bold text-purple-400 font-mono mb-1">Per-Device Keys</h4>
                  <p className="text-gray-400 text-sm font-mono">Unique identity per device. Limits compromise exposure.</p>
                </div>
              </div>
            </div>
            <div className="cyber-card p-5">
              <div className="flex items-start gap-3">
                <div className="text-2xl">🚫</div>
                <div>
                  <h4 className="font-bold text-green-400 font-mono mb-1">Zero-Knowledge</h4>
                  <p className="text-gray-400 text-sm font-mono">Server cannot decrypt messages. True end-to-end.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <p className="text-gray-400 font-mono mb-6">&gt; READY TO INITIALIZE?</p>
          <Button onClick={() => navigate('/chat')} color="cyan" className="shadow-neon-cyan text-lg px-8 py-3">
            Begin Secure Session
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-6 text-center bg-cyber-darker/50 backdrop-blur-sm border-t border-cyber-gray">
        <p className="text-gray-500 font-mono text-sm">&copy; 2025 Cr0wn_Gh0ul. Privacy by design.</p>
      </footer>

      {/* Status Indicator */}
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-cyber-darker/80 backdrop-blur-sm border border-cyber-gray rounded-full px-4 py-2">
        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-neon-green" />
        <span className="text-xs font-mono text-gray-400">PROTOCOL ACTIVE</span>
      </div>
    </div>
  );
}
