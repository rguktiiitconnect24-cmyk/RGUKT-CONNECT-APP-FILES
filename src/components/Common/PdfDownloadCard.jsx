import { Eye, RefreshCcw, Download, Check } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { checkPdfStatus, downloadPdf, openPdf, subscribeToDownload, unsubscribeFromDownload, getActiveDownload } from '../../services/pdfCacheService';
import { useToast } from '../../context/ToastContext';
import { Capacitor } from '@capacitor/core';
import './PdfDownloadCard.css'; // Import the new styles

const PdfDownloadCard = ({ label, url, idPrefix, hierarchy, backendUrl }) => {
    const { showToast } = useToast();
    const [status, setStatus] = useState('NOT_DOWNLOADED');
    const [downloadState, setDownloadState] = useState('IDLE'); // IDLE, DOWNLOADING, PAUSED_OFFLINE, RESUMING, FINISHED
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [displayProgress, setDisplayProgress] = useState(0);
    const displayProgressRef = useRef(0);
    const [showTick, setShowTick] = useState(false);
    
    // Unique ID for cache
    const pdfId = `${idPrefix}_${label.replace(/\s+/g, '_')}`;

    useEffect(() => {
        const checkStatus = async () => {
            if (url && pdfId) {
                const result = await checkPdfStatus(pdfId, url);
                setStatus(result.status);
            }
        };
        checkStatus();

        const handleSync = (e) => {
            if (e.detail && e.detail.pdfId === pdfId) {
                checkStatus();
            }
        };

        const handleDownloadUpdate = (state) => {
            setDownloadState(state.state);
            setDownloadProgress(state.progress);
            if (state.state === 'FINISHED') {
                setStatus('DOWNLOADED');
                setShowTick(true);
                setTimeout(() => setShowTick(false), 1200);
                setTimeout(() => setDownloadState('IDLE'), 3000);
            }
        };

        // Initialize from global state if active
        const activeDL = getActiveDownload(pdfId);
        if (activeDL) handleDownloadUpdate(activeDL);

        subscribeToDownload(pdfId, handleDownloadUpdate);
        window.addEventListener('pdf-cache-updated', handleSync);
        
        return () => {
            unsubscribeFromDownload(pdfId, handleDownloadUpdate);
            window.removeEventListener('pdf-cache-updated', handleSync);
        };
    }, [url, pdfId]);

    // Smooth progress interpolation
    useEffect(() => {
        let startTimestamp = null;
        let startValue = displayProgressRef.current;
        let animationFrameId;
        const duration = 600; // ms to reach the new target chunk

        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const t = Math.min((timestamp - startTimestamp) / duration, 1);
            const easeOut = 1 - Math.pow(1 - t, 3);
            const current = startValue + (downloadProgress - startValue) * easeOut;
            
            setDisplayProgress(current);
            displayProgressRef.current = current;

            if (t < 1) {
                animationFrameId = requestAnimationFrame(step);
            } else {
                setDisplayProgress(downloadProgress);
                displayProgressRef.current = downloadProgress;
            }
        };

        if (downloadProgress !== displayProgressRef.current) {
            animationFrameId = requestAnimationFrame(step);
        }

        return () => {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
        };
    }, [downloadProgress]);

    const handleAction = async () => {
        if (!url) return;

        if (status === 'DOWNLOADED') {
            const result = await checkPdfStatus(pdfId, url);
            if (result.localUri) openPdf(result.localUri, displayLabel);
        } else if (status === 'UPDATE_AVAILABLE') {
            const confirmUpdate = window.confirm("A newer version is available. Update now?");
            if (confirmUpdate) {
                await executeDownload();
            } else {
                const result = await checkPdfStatus(pdfId, url);
                if (result.localUri) openPdf(result.localUri, displayLabel);
            }
        } else {
            await executeDownload();
        }
    };

    const executeDownload = async () => {
        if (downloadState === 'DOWNLOADING' || downloadState === 'PAUSED_OFFLINE' || downloadState === 'RESUMING') return;

        let downloadLink = url;
        const extractDriveId = (link) => {
            if (!link) return null;
            const match = link.match(/\/d\/([a-zA-Z0-9_-]+)/);
            if (match) return match[1];
            const idMatch = link.match(/id=([a-zA-Z0-9_-]+)/);
            if (idMatch) return idMatch[1];
            if (/^[a-zA-Z0-9_-]{10,}$/.test(link)) return link;
            return null;
        };

        const driveId = extractDriveId(downloadLink);
        if (driveId) {
            downloadLink = `https://drive.google.com/uc?export=download&id=${driveId}`;
        }

        if (!downloadLink || (!downloadLink.startsWith('http://') && !downloadLink.startsWith('https://')) || downloadLink === '#' || downloadLink === 'N/A') {
            showToast("Invalid download URL.", "error");
            return;
        }

        if (!Capacitor.isNativePlatform()) {
            window.open(downloadLink, '_blank');
            return;
        }

        setDownloadState('DOWNLOADING');
        
        try {
            const fileName = `${hierarchy[hierarchy.length - 2] || 'Document'} - ${label}`;
            
            // Fire and forget - global manager takes over
            downloadPdf(pdfId, downloadLink, fileName, hierarchy).catch(e => {
                console.error(e);
                showToast(`Failed to download: ${e.message || 'Please check your connection.'}`, "error");
                setDownloadState('IDLE');
            });
            
        } catch (e) {
            console.error(e);
            showToast(`Failed to initialize download: ${e.message}`, "error");
        }
    };

    const getBtnClass = () => {
        if (!Capacitor.isNativePlatform()) return 'status-not-downloaded'; // Web always shows 'Download' or 'Open'
        if (status === 'DOWNLOADED') return 'status-downloaded';
        if (status === 'UPDATE_AVAILABLE') return 'status-update';
        return 'status-not-downloaded';
    };

    const getStatusText = () => {
        if (downloadState === 'PAUSED_OFFLINE') return `Connection interrupted — waiting to resume… ${Math.round(displayProgress)}%`;
        if (downloadState === 'RESUMING') return `Connection restored — resuming… ${Math.round(displayProgress)}%`;
        if (downloadState === 'DOWNLOADING') return `Downloading… ${Math.round(displayProgress)}%`;
        if (downloadState === 'FINISHED') return `Download complete — 100%`;
        return '';
    };

    if (!url) return null;

    const displayLabel = label ? label.replace(/_/g, ' ') : '';

    return (
        <div className="pdf-download-card" style={{ paddingBottom: '16px' }}>
            <div className="flex items-center gap-4 min-w-0 overflow-hidden">
                <i className="fa-solid fa-file-pdf" style={{ color: "rgb(255, 46, 17)", fontSize: "24px", flexShrink: 0 }}></i>
                <div className="flex-1 min-w-0 overflow-hidden">
                    <h3 className="pdf-title" title={label}>{displayLabel}</h3>
                    {downloadState !== 'IDLE' && (
                        <p className="pdf-subtitle" style={{ color: downloadState === 'PAUSED_OFFLINE' ? '#f59e0b' : '#6366f1', fontSize: '11px', marginTop: '2px' }}>
                            {getStatusText()}
                        </p>
                    )}
                </div>
            </div>
            
            <button 
                onClick={handleAction}
                disabled={downloadState !== 'IDLE'}
                className={`pdf-btn ${getBtnClass()}`}
                style={{ position: 'relative', overflow: 'hidden' }}
            >
                {/* Smooth Circular Progress Ring */}
                {(downloadState !== 'IDLE' && downloadState !== 'FINISHED') && (
                    <svg 
                        style={{ 
                            position: 'absolute', 
                            top: 0, 
                            left: 0, 
                            width: '100%', 
                            height: '100%', 
                            transform: 'rotate(-90deg)', 
                            zIndex: 0 
                        }}
                        viewBox="0 0 44 44"
                    >
                        <circle 
                            cx="22" cy="22" r="20" 
                            fill="transparent" 
                            stroke="rgba(255,255,255,0.2)" 
                            strokeWidth="4" 
                        />
                        <circle 
                            cx="22" cy="22" r="20" 
                            fill="transparent" 
                            stroke="#ffffff" 
                            strokeWidth="4" 
                            strokeDasharray="125.6" 
                            strokeDashoffset={125.6 - (displayProgress / 100) * 125.6} 
                            style={{ transition: 'none' }} 
                            strokeLinecap="round"
                        />
                    </svg>
                )}
                <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                    {(downloadState !== 'IDLE' && downloadState !== 'FINISHED') ? (
                        <span style={{ fontSize: '11px', fontWeight: '800' }}>{Math.round(displayProgress)}%</span>
                    ) : (status === 'DOWNLOADED' && Capacitor.isNativePlatform()) ? (
                        showTick ? (
                            <Check size={24} className="pdf-tick-anim" strokeWidth={3} />
                        ) : (
                            <Eye size={20} className="pdf-eye-anim" />
                        )
                    ) : (status === 'UPDATE_AVAILABLE' && Capacitor.isNativePlatform()) ? (
                        <RefreshCcw size={20} />
                    ) : (
                        <Download size={20} />
                    )}
                </div>
            </button>
        </div>
    );
};

export default PdfDownloadCard;
