import { Eye, RefreshCcw, Download } from 'lucide-react';
import { useState, useEffect } from 'react';
import { checkPdfStatus, downloadPdf, openPdf } from '../../services/pdfCacheService';
import { useToast } from '../../context/ToastContext';
import { Capacitor } from '@capacitor/core';
import './PdfDownloadCard.css'; // Import the new styles

const PdfDownloadCard = ({ label, url, idPrefix, hierarchy, backendUrl }) => {
    const { showToast } = useToast();
    const [status, setStatus] = useState('NOT_DOWNLOADED');
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);
    
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

        window.addEventListener('pdf-cache-updated', handleSync);
        return () => window.removeEventListener('pdf-cache-updated', handleSync);
    }, [url, pdfId]);

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
        let downloadLink = url;

        // Helper to extract Google Drive ID or check if it's a raw ID
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
            showToast("Invalid download URL. The file might be missing or incorrectly linked.", "error");
            return;
        }

        if (!Capacitor.isNativePlatform()) {
            // On web, we cannot use XHR to cache Google Drive PDFs due to CORS.
            // Just open the download URL in a new tab to let the browser handle the download.
            window.open(downloadLink, '_blank');
            return;
        }

        setIsDownloading(true);
        setDownloadProgress(0);
        try {
            const fileName = `${hierarchy[hierarchy.length - 2] || 'Document'} - ${label}`;
            await downloadPdf(pdfId, downloadLink, fileName, hierarchy, (progress) => {
                setDownloadProgress(progress);
            }, backendUrl);
            
            // Explicitly ensure the UI shows 100% for the completion phase
            setDownloadProgress(100);
            
            // Wait for progress bar CSS transition to finish and give user time to see 100%
            await new Promise(resolve => setTimeout(resolve, 600));
            
            setStatus('DOWNLOADED');
            showToast("PDF downloaded and saved for offline viewing!", "success");
        } catch (e) {
            console.error(e);
            showToast(`Failed to download: ${e.message || 'Please check your connection.'}`, "error");
        } finally {
            setIsDownloading(false);
            setDownloadProgress(0);
        }
    };

    const getBtnClass = () => {
        if (!Capacitor.isNativePlatform()) return 'status-not-downloaded'; // Web always shows 'Download' or 'Open'
        if (status === 'DOWNLOADED') return 'status-downloaded';
        if (status === 'UPDATE_AVAILABLE') return 'status-update';
        return 'status-not-downloaded';
    };

    if (!url) return null;

    const displayLabel = label ? label.replace(/_/g, ' ') : '';

    return (
        <div className="pdf-download-card" style={{ paddingBottom: isDownloading ? '20px' : '16px' }}>
            <div className="flex items-center gap-4 min-w-0 overflow-hidden">
                <i className="fa-solid fa-file-pdf" style={{ color: "rgb(255, 46, 17)", fontSize: "24px", flexShrink: 0 }}></i>
                <div className="flex-1 min-w-0 overflow-hidden">
                    <h3 className="pdf-title" title={label}>{displayLabel}</h3>
                </div>
            </div>
            
            <button 
                onClick={handleAction}
                disabled={isDownloading}
                className={`pdf-btn ${getBtnClass()}`}
                style={{ position: 'relative', overflow: 'hidden' }}
            >
                <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {isDownloading ? (
                        <div className="spinner-icon" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></div>
                    ) : (status === 'DOWNLOADED' && Capacitor.isNativePlatform()) ? (
                        <Eye size={20} />
                    ) : (status === 'UPDATE_AVAILABLE' && Capacitor.isNativePlatform()) ? (
                        <RefreshCcw size={20} />
                    ) : (
                        <Download size={20} />
                    )}
                </div>
            </button>

            {/* Global card progress bar */}
            {isDownloading && (
                <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    height: '4px',
                    width: `${downloadProgress}%`,
                    background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                    transition: 'width 0.2s ease-out',
                    zIndex: 10
                }} />
            )}
        </div>
    );
};

export default PdfDownloadCard;
