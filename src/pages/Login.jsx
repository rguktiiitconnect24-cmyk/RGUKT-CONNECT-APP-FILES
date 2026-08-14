import { AlertCircle, Lock, Sparkles, Sparkle } from 'lucide-react';
import AppFooter from '../components/Common/AppFooter';
import Branding from '../components/Branding';
import LoadingTransition from '../components/Common/LoadingTransition';
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useDownload } from '../context/DownloadContext';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import './Login.css';

const Login = () => {
    const { loginWithGoogle, user, logout, verifyPin } = useAuth();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState('');

    // PIN Verification State
    const [showPinModal, setShowPinModal] = useState(false);
    const [pin, setPin] = useState(['', '', '', '', '', '']);
    const [tempUserUid, setTempUserUid] = useState(null);
    const pinInputRefs = React.useRef([]);
    const [isAdminVerified, setIsAdminVerified] = useState(false);

    const { notify } = useDownload();

    // Force light theme on login page
    useEffect(() => {
        const root = window.document.documentElement;
        const originalTheme = root.getAttribute('data-theme');
        const hadDarkClass = root.classList.contains('dark');
        
        root.setAttribute('data-theme', 'light');
        root.classList.remove('dark');
        
        return () => {
            // Restore original theme on unmount
            if (originalTheme) {
                root.setAttribute('data-theme', originalTheme);
            }
            if (hadDarkClass) {
                root.classList.add('dark');
            }
        };
    }, []);

    // Google Identity Services (One Tap) initialization for Web
    useEffect(() => {
        if (Capacitor.isNativePlatform()) return;

        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => {
            if (window.google?.accounts?.id) {
                window.google.accounts.id.initialize({
                    client_id: '2907414387-datca8tad78d07d57edkhta34a3btgg8.apps.googleusercontent.com',
                    callback: (response) => {
                        handleGoogleCredential(response.credential);
                    },
                    context: 'use',
                    itp_support: true,
                });
                
                window.google.accounts.id.prompt();
            }
        };
        document.body.appendChild(script);

        return () => {
            if (document.body.contains(script)) {
                document.body.removeChild(script);
            }
        };
    }, []);

    const handleGoogleCredential = async (credential) => {
        setError('');
        setIsLoading(true);
        try {
            await loginWithGoogle(credential);
            setIsLoading(false);
            setIsSuccess(true);
            setTimeout(() => setIsSuccess(false), 1000);
        } catch (err) {
            console.error("Google One Tap error:", err);
            setError(`Google Sign-In failed: ${err.message || 'Unknown error'}`);
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (user && !isSuccess && !isLoading) {
            if (user.role === 'admin') {
                if (isAdminVerified) {
                    navigate('/admin', { replace: true });
                } else {
                    setTempUserUid(user.uid);
                    setShowPinModal(true);
                }
            } else if (user.role === 'faculty') {
                navigate('/faculty', { replace: true });
            } else {
                navigate('/dashboard', { replace: true });
            }
        } else if (!user) {
            setShowPinModal(false);
            setIsAdminVerified(false);
        }
    }, [user, navigate, isAdminVerified, isSuccess, isLoading]);

    const handleGoogleLogin = async () => {
        // When user explicitly clicks the button, trigger the standard popup immediately
        executeLegacyGoogleLogin();
    };

    const executeLegacyGoogleLogin = async () => {
        setError('');
        setIsLoading(true);
        try {
            await loginWithGoogle();
            setIsLoading(false);
            setIsSuccess(true);
            setTimeout(() => setIsSuccess(false), 1000);
        } catch (err) {
            console.error("Google login error:", err);
            setError(`Google Sign-In failed: ${err.message || 'Unknown error'}`);
            setIsLoading(false);
        }
    };

    const handlePinChange = (index, value) => {
        if (isNaN(value)) return;
        const newPin = [...pin];
        newPin[index] = value;
        setPin(newPin);

        if (value && index < 5) {
            pinInputRefs.current[index + 1].focus();
        }

        const filledPin = newPin.join('');
        if (filledPin.length === 6) {
            verifyAdminPin(filledPin);
        }
    };

    const handlePinKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !pin[index] && index > 0) {
            pinInputRefs.current[index - 1].focus();
        }
    };

    const verifyAdminPin = async (manualPin = null) => {
        const enteredPin = manualPin || pin.join('');
        if (enteredPin.length < 4) {
            setError('Please enter a valid PIN.');
            return;
        }

        setIsLoading(true);
        const isValid = await verifyPin(tempUserUid, enteredPin);

        if (isValid) {
            setIsLoading(false);
            setIsSuccess(true);
            setTimeout(() => {
                setIsAdminVerified(true);
                navigate('/admin', { replace: true });
            }, 1000);
        } else {
            setError('Incorrect PIN. Please try again.');
            setIsLoading(false);
            setPin(['', '', '', '', '', '']);
            pinInputRefs.current[0]?.focus();
        }
    };

    if (user && !isSuccess && !isLoading && (!showPinModal || isAdminVerified)) {
        return <LoadingTransition persistent />;
    }

    return (
        <div className="login-container login-modern-layout">
            <div className="animated-bg-container">
                <div className="bg-orb orb-1"></div>
                <div className="bg-orb orb-2"></div>
                <div className="bg-orb orb-3"></div>
            </div>

            <div className="login-glass-wrapper">
                <div className="login-glass-card">
                    <div className="login-card-inner">
                        <div className="login-header-v2">
                            <div className="branding-container">
                                <Branding size="lg" variant="auto" />
                            </div>
                            <h1 className="login-title">Welcome Back</h1>
                            <p className="login-subtitle">Sign in to your institutional account</p>
                        </div>

                        {error && (
                            <div className="animate-fade-in" style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                padding: '1rem',
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                borderRadius: '0.75rem',
                                color: '#ef4444',
                                fontSize: '0.85rem',
                                marginBottom: '1.5rem'
                            }}>
                                <AlertCircle size={18} />
                                <span>{error}</span>
                            </div>
                        )}

                        <form onSubmit={(e) => { e.preventDefault(); handleGoogleLogin(); }} className="space-y-4" noValidate>
                            <button
                                type="button"
                                className="google-login-btn"
                                onClick={handleGoogleLogin}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span className="animate-spin" style={{ border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', width: '1rem', height: '1rem' }}></span>
                                        Signing in...
                                    </span>
                                ) : (
                                    <>
                                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" />
                                        <span>Sign In with Google</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>

                <div className="footer-wrapper">
                    <AppFooter />
                </div>
            </div>

            {showPinModal && (
                <div className="auth-modal-overlay">
                    <div className="auth-modal-content">
                        {isSuccess ? (
                            <div className="success-animation-container">
                                <div className="success-wrapper-horizontal">
                                    <div className="checkmark-circle">
                                        <svg className="w-12 h-12 text-[var(--color-slate-900)]" viewBox="0 0 24 24">
                                            <path className="checkmark-svg" d="M20 6L9 17L4 12" style={{ stroke: 'currentColor' }} />
                                        </svg>
                                    </div>
                                    <div className="sparkles-side-container">
                                        <div className="sparkle-accent ss1"><Sparkle size={14} fill="currentColor" /></div>
                                        <div className="sparkle-accent ss2"><Sparkles size={22} fill="currentColor" /></div>
                                        <div className="sparkle-accent ss3"><Sparkle size={12} fill="currentColor" /></div>
                                    </div>
                                </div>
                                <h3 className="success-text">Verified!</h3>
                                <p className="success-subtext">Redirecting to dashboard...</p>
                            </div>
                        ) : (
                            <>
                                <div className="text-center mb-6">
                                    <div className="auth-modal-icon-wrapper">
                                        <Lock size={32} />
                                    </div>
                                    <h3 className="auth-modal-title">Admin Verification</h3>
                                    <p className="auth-modal-desc">
                                        Please enter your 6-digit PIN to continue.
                                    </p>
                                </div>

                                <div className="pin-input-container">
                                    {pin.map((digit, index) => (
                                        <input
                                            key={index}
                                            ref={el => pinInputRefs.current[index] = el}
                                            type="password"
                                            maxLength={1}
                                            className="pin-input-field"
                                            value={digit}
                                            onChange={(e) => handlePinChange(index, e.target.value)}
                                            onKeyDown={(e) => handlePinKeyDown(index, e)}
                                            autoFocus={index === 0}
                                        />
                                    ))}
                                </div>

                                {error && (
                                    <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm text-center flex items-center justify-center gap-2">
                                        <AlertCircle size={16} />
                                        {error}
                                    </div>
                                )}

                                <button
                                    onClick={verifyAdminPin}
                                    className="login-btn"
                                    style={{ marginBottom: '1rem' }}
                                    disabled={isLoading}
                                >
                                    {isLoading ? 'Verifying...' : 'Verify Access'}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Login;
