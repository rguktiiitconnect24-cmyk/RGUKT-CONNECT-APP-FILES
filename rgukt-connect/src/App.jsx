import { Loader2, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ref, get } from 'firebase/database';
import { rtdb } from './firebase';
import emailjs from '@emailjs/browser';
import './index.css';

// ─── Gmail Sender Component ───────────────────────────────────────────────────
function AppContent() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [message, setMessage] = useState('');
  const [downloadLink, setDownloadLink] = useState('https://rgukt.in');

  // Fetch APK link from Firebase RTDB on mount
  useEffect(() => {
    const fetchDownloadLink = async () => {
      try {
        const snapshot = await get(ref(rtdb, 'app_update'));
        if (snapshot.exists()) {
          setDownloadLink(snapshot.val().apk_url || 'https://rgukt.in');
        }
      } catch (err) {
        console.error('Failed to fetch app link from Firebase:', err);
      }
    };
    fetchDownloadLink();
  }, []);

  // ─── Form Submit ────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setStatus('error');
      setMessage('Please enter a valid email address.');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      await emailjs.send(
        import.meta.env.VITE_EMAILJS_SERVICE_ID,
        import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
        { to_email: email, download_link: downloadLink },
        import.meta.env.VITE_EMAILJS_PUBLIC_KEY
      );
      setStatus('success');
      setMessage(`Download link sent to ${email}!`);
      setEmail('');
    } catch (err) {
      console.error('Send Error:', err);
      setStatus('error');
      setMessage(`Failed to send: ${err.message || 'Unknown error'}`);
    }
  };


  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <a href="/" className="logo-container">
          <div className="logo-text">
            RGUKT<span>CONNECT</span>
          </div>
        </a>

      </header>

      {/* Main Content */}
      <main className="hero">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>

        <div className="hero-content">
          <span className="hero-badge">Official Campus App</span>
          <h1 className="hero-title">Stay Connected to Your Campus</h1>
          <p className="hero-subtitle">
            Get instant access to campus news, student resources, and community forums.
            Enter your student email below to receive the exclusive download link for the RGUKT Connect mobile app.
          </p>

          <form className="email-form" onSubmit={handleSubmit}>
            <div className="input-group">
              <input
                type="email"
                placeholder="Enter your email address"
                className="email-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={status === 'loading'}
                required
              />
              <button
                type="submit"
                className="submit-btn"
                disabled={status === 'loading'}
              >
                {status === 'loading' ? (
                  <>
                    <span style={{ marginRight: '8px' }}>Sending Mail...</span>
                    <Loader2 className="animate-spin" size={20} />
                  </>
                ) : (
                  <>
                    <span style={{ marginRight: '8px' }}>Get App</span>
                    <Send size={18} />
                  </>
                )}
              </button>
            </div>


            {status === 'success' && (
              <div className="status-message status-success">
                <CheckCircle2 size={18} />
                {message}
              </div>
            )}

            {status === 'error' && (
              <div className="status-message status-error">
                <AlertCircle size={18} />
                {message}
              </div>
            )}
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="footer">
        <p>&copy; {new Date().getFullYear()} RGUKT CONNECT. All rights reserved.</p>
      </footer>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────
function App() {
  return <AppContent />;
}

export default App;
