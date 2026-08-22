import React from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';
import { createPortal } from 'react-dom';

const AppAlert = ({ isOpen, onClose, title, message, type = 'info', confirmText = 'OK' }) => {
    if (!isOpen) return null;

    const config = {
        success: {
            icon: CheckCircle2,
            color: '#10b981',
            bg: 'rgba(16, 185, 129, 0.1)',
            btnBg: '#10b981',
            btnHover: '#059669'
        },
        error: {
            icon: AlertCircle,
            color: '#ef4444',
            bg: 'rgba(239, 68, 68, 0.1)',
            btnBg: '#ef4444',
            btnHover: '#dc2626'
        },
        warning: {
            icon: AlertTriangle,
            color: '#f59e0b',
            bg: 'rgba(245, 158, 11, 0.1)',
            btnBg: '#f59e0b',
            btnHover: '#d97706'
        },
        info: {
            icon: Info,
            color: '#6366f1',
            bg: 'rgba(99, 102, 241, 0.1)',
            btnBg: '#6366f1',
            btnHover: '#4f46e5'
        }
    };

    const currentConfig = config[type] || config.info;
    const Icon = currentConfig.icon;

    return createPortal(
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            animation: 'fadeInAlert 0.2s ease-out'
        }}>
            <div 
                style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.75)',
                    backdropFilter: 'blur(8px)'
                }}
                onClick={onClose}
            />
            
            <div style={{
                position: 'relative',
                backgroundColor: 'var(--color-surface, #ffffff)',
                borderRadius: '24px',
                padding: '32px',
                width: '100%',
                maxWidth: '380px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                animation: 'slideUpAlert 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                border: '1px solid var(--color-border, rgba(255,255,255,0.1))'
            }}>
                <button 
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '16px',
                        right: '16px',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--color-text-muted, #94a3b8)',
                        cursor: 'pointer',
                        padding: '8px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--color-surface-hover, rgba(0,0,0,0.05))';
                        e.currentTarget.style.color = 'var(--color-text-main, #1e293b)';
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = 'var(--color-text-muted, #94a3b8)';
                    }}
                >
                    <X size={20} />
                </button>

                <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    backgroundColor: currentConfig.bg,
                    color: currentConfig.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '20px'
                }}>
                    <Icon size={32} strokeWidth={2.5} />
                </div>

                <h3 style={{
                    margin: '0 0 12px 0',
                    fontSize: '1.25rem',
                    fontWeight: '700',
                    color: 'var(--color-text-main, #1e293b)',
                    fontFamily: "'Plus Jakarta Sans', var(--font-sans), sans-serif",
                    letterSpacing: '-0.3px'
                }}>
                    {title}
                </h3>

                <p style={{
                    margin: '0 0 28px 0',
                    fontSize: '0.95rem',
                    color: 'var(--color-text-muted, #64748b)',
                    lineHeight: '1.5'
                }}>
                    {message}
                </p>

                <button
                    onClick={onClose}
                    style={{
                        width: '100%',
                        padding: '14px',
                        backgroundColor: currentConfig.btnBg,
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '1rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: `0 8px 16px -4px ${currentConfig.bg}`
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = currentConfig.btnHover}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = currentConfig.btnBg}
                    onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.97)'}
                    onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                    {confirmText}
                </button>
            </div>
            
            <style dangerouslySetInnerHTML={{__html: `
                @keyframes slideUpAlert {
                    from { opacity: 0; transform: translateY(20px) scale(0.95); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes fadeInAlert {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
            `}} />
        </div>,
        document.body
    );
};

export default AppAlert;
