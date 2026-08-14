import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { noticeService } from '../../services/noticeService';
import { File, User, Calendar, Paperclip, Eye, Download, Share2 } from 'lucide-react';
import { format } from 'date-fns';
import { useDownload } from '../../context/DownloadContext';
import html2pdf from 'html2pdf.js/dist/html2pdf.bundle.min.js';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share as CapacitorShare } from '@capacitor/share';
import './NoticeDetails.css';

const NoticeDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    
    const [notice, setNotice] = useState(null);
    const [interactions, setInteractions] = useState(null);
    const [loading, setLoading] = useState(true);
    const { startShare } = useDownload();

    useEffect(() => {
        const fetchNoticeDetails = async () => {
            if (!user) return;
            setLoading(true);
            try {
                const fetchedNotice = await noticeService.getNoticeById(id);
                if (fetchedNotice) {
                    setNotice(fetchedNotice);
                    
                    // Fetch interactions
                    const userInteractions = await noticeService.getUserInteractions(user.studentId || user.uid);
                    const currentInteraction = userInteractions[id];
                    setInteractions(currentInteraction);
                    setIsBookmarked(currentInteraction?.bookmarked || false);

                    // Mark as read and increment view count if not read
                    if (!currentInteraction?.isRead) {
                        await noticeService.markAsRead(id, user.studentId || user.uid);
                        // Increment view count only once per user ideally, markAsRead handles this conceptually.
                        // Or we can explicitly call incrementViewCount if we want raw views.
                    }
                }
            } catch (error) {
                console.error("Failed to fetch notice details:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchNoticeDetails();
    }, [id, user]);

    const handleShareNotice = async () => {
        if (!notice) return;
        
        const elementId = `notice-details-card`;
        const element = document.getElementById(elementId);
        if (!element) return;
        
        const safeTitle = notice.title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
        const filename = `Notice_${safeTitle}.pdf`;

        await startShare(filename, async () => {
            const opt = {
                margin: 0,
                filename: filename,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { 
                    scale: 3, 
                    useCORS: true, 
                    logging: false, 
                    backgroundColor: '#ffffff', 
                    windowWidth: 800
                },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            const worker = html2pdf().set(opt).from(element).toPdf();
            const pdfString = await worker.output('datauristring');
            const base64Data = pdfString.split('base64,')[1];

            if (Capacitor.isNativePlatform()) {
                const fileResult = await Filesystem.writeFile({
                    path: filename,
                    data: base64Data,
                    directory: Directory.Cache
                });

                await CapacitorShare.share({
                    title: 'RGUKT Connect - Notice',
                    text: notice.title,
                    url: fileResult.uri,
                    dialogTitle: 'Share Notice'
                });
            } else {
                // On web, just download the PDF or use navigator.share if file sharing is supported
                try {
                    if (navigator.canShare && navigator.canShare({ files: [new File([await (await fetch(pdfString)).blob()], filename, { type: 'application/pdf' })] })) {
                        const blob = await (await fetch(pdfString)).blob();
                        const file = new File([blob], filename, { type: 'application/pdf' });
                        await navigator.share({
                            title: notice.title,
                            files: [file]
                        });
                    } else {
                        await html2pdf().set(opt).from(element).save();
                    }
                } catch (shareErr) {
                    console.warn("Failed to share or download Notice PDF:", shareErr);
                    // Fallback to basic download if share fails
                    await html2pdf().set(opt).from(element).save();
                }
            }
        });
    };



    const formatDate = (timestamp) => {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return format(date, 'MMM dd, yyyy • hh:mm a');
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    if (loading) {
        return <div className="max-width-wrapper notice-details-page"><p>Loading Notice...</p></div>;
    }

    if (!notice) {
        return (
            <div className="max-width-wrapper notice-details-page">
                <div className="alert alert-danger">Notice not found or has been deleted.</div>
            </div>
        );
    }

    return (
        <div className="max-width-wrapper notice-details-page animate-fade-in">
            <div className="notice-details-card" id="notice-details-card">
                <div className="notice-details-header">
                    <span className="notice-details-category">{notice.category}</span>
                    <h1 className="notice-details-title">{notice.title}</h1>
                    
                    <div className="notice-details-meta-grid">
                        <div className="nd-meta-item">
                            <div className="nd-meta-icon"><User size={16} /></div>
                            <div className="nd-meta-text">
                                <span className="nd-meta-label">Posted By</span>
                                <span className="nd-meta-value">{notice.postedBy || 'Administrator'}</span>
                            </div>
                        </div>
                        <div className="nd-meta-item">
                            <div className="nd-meta-icon"><Calendar size={16} /></div>
                            <div className="nd-meta-text">
                                <span className="nd-meta-label">Published</span>
                                <span className="nd-meta-value">{formatDate(notice.publishedAt || notice.createdAt)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="notice-details-content">
                    {notice.content}
                </div>

                {notice.attachments && notice.attachments.length > 0 && (
                    <div className="notice-attachments-section">
                        <h3><Paperclip size={18} /> Attachments</h3>
                        <div className="attachments-grid">
                            {notice.attachments.map((file, index) => {
                                if (file.type === 'drive-link') {
                                    return (
                                        <div key={index} className="drive-attachment-container" style={{ marginTop: '1rem', width: '100%', gridColumn: '1 / -1' }}>
                                            <div className="attachment-actions" style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                                                <a href={file.previewUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'var(--color-brand)', color: 'white', borderRadius: '8px', textDecoration: 'none', fontWeight: 600 }}>
                                                    <Eye size={18} /> View Document
                                                </a>
                                                <a href={file.downloadUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'var(--color-surface-hover)', color: 'var(--color-text-main)', borderRadius: '8px', textDecoration: 'none', fontWeight: 600 }}>
                                                    <Download size={18} /> Download
                                                </a>
                                            </div>
                                            <div className="drive-embed-wrapper" style={{ position: 'relative', width: '100%', height: '70vh', minHeight: '500px', border: '1px solid var(--color-border)', borderRadius: '12px', overflow: 'hidden' }}>
                                                <iframe 
                                                    src={file.previewUrl} 
                                                    title="Google Drive Document"
                                                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                                                    allow="autoplay"
                                                ></iframe>
                                            </div>
                                        </div>
                                    );
                                }
                                
                                return (
                                    <div key={index} className="attachment-card">
                                        <div className="attachment-info">
                                            <div className="attachment-icon">
                                                <File size={20} />
                                            </div>
                                            <div>
                                                <div className="attachment-name" title={file.name}>{file.name}</div>
                                                <div className="attachment-size">{formatFileSize(file.size)}</div>
                                            </div>
                                        </div>
                                        <a 
                                            href={file.url} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="attachment-download-btn"
                                            title="Download"
                                            download
                                        >
                                            <Download size={20} />
                                        </a>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="notice-details-actions">
                    <button 
                        className="nd-action-btn nd-bookmark-btn"
                        onClick={handleShareNotice}
                    >
                        <Share2 size={18} />
                        Share with Friends
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NoticeDetails;
