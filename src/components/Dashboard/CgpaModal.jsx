import { X, GraduationCap, ChevronRight, Loader2, Share2, Download } from 'lucide-react';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { pdfService } from '../../services/pdfService';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share as CapacitorShare } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import './CgpaModal.css';

const LOGO_DATA_URI = `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgdmlld0JveD0iMCAwIDUxMiA1MTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPHJlY3Qgd2lkdGg9IjUxMiIgaGVpZ2h0PSI1MTIiIHJ4PSIxMjgiIGZpbGw9InVybCgjcGFpbnQwX2xpbmVhcikiLz4KICA8cGF0aCBkPSJNMjU2IDEyMEw2NCAyMTBMMjU2IDMwMEw0NDggMjEwTDI1NiAxMjBaIiBmaWxsPSJ3aGl0ZSIvPgogIDxwYXRoIGQ9Ik0xMjggMjQwVjMyMEMxMjggMzIwIDE4MCAzNzAgMjU2IDM3MEMzMzIgMzcwIDM4NCAzMjAgMzg0IDMyMFYyNDBMMjU2IDMwMEwxMjggMjQwWiIgZmlsbD0id2hpdGUiLz4KICA8cGF0aCBkPSJNNDE2IDIxMFYzNDAiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMjAiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgogIDxjaXJjbGUgY3g9IjQxNiIgY3k9IjM1MCIgcj0iMTUiIGZpbGw9IndoaGl0ZSIvPgogIDxkZWZzPgog   PGxpbmVhckdyYWRpZW50IGlkPSJwYWludDBfbGluZWFyIiB4MT0iMCIgeTE9IjAiIHgyPSI1MTIiIHkyPSI1MTIiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIj4KICAgICAgPHN0b3Agc3RvcC1jb2xvcj0iIzRmNDZlNSIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiMzNzMwYTMiLz4KICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgPC9kZWZzPgo8L3N2Zz4=`;

const svgToPng = (svgDataUri) => {
    return new Promise((resolve) => {
        const img = new Image();
        const timeout = setTimeout(() => resolve(null), 3000);
        img.onload = () => {
            clearTimeout(timeout);
            try {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            } catch (e) {
                resolve(null);
            }
        };
        img.onerror = () => {
            clearTimeout(timeout);
            resolve(null);
        };
        img.src = svgDataUri;
    });
};

const createInitialsAvatar = async (name) => {
    const initials = name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'ST';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#3b82f6" /><text x="100" y="100" font-family="Arial, sans-serif" font-size="80" fill="white" font-weight="bold" text-anchor="middle" dominant-baseline="central">${initials}</text></svg>`;
    return await svgToPng(`data:image/svg+xml;base64,${btoa(svg)}`);
};

const urlToBase64 = async (url, fallbackName) => {
    if (!url) {
        if (fallbackName) return await createInitialsAvatar(fallbackName);
        return null;
    }
    if (url.startsWith('data:')) return url;
    
    const convertBlobToJpegBase64 = (blob) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => {
                const img = new Image();
                img.onload = () => {
                    try {
                        const canvas = document.createElement('canvas');
                        const maxDim = 400;
                        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
                        canvas.width = img.width * scale;
                        canvas.height = img.height * scale;
                        const ctx = canvas.getContext('2d');
                        ctx.fillStyle = '#ffffff';
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                        resolve(canvas.toDataURL('image/jpeg', 0.8));
                    } catch (e) {
                        resolve(reader.result); 
                    }
                };
                img.onerror = () => resolve(null);
                img.src = reader.result;
            };
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
        });
    };

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Fetch failed');
        const blob = await response.blob();
        const base64 = await convertBlobToJpegBase64(blob);
        if (base64) return base64;
        throw new Error('Conversion failed');
    } catch (e) {
        try {
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
            const response = await fetch(proxyUrl);
            if (!response.ok) throw new Error('Proxy failed');
            const blob = await response.blob();
            const base64 = await convertBlobToJpegBase64(blob);
            if (base64) return base64;
            throw new Error('Proxy conversion failed');
        } catch (err) {
            if (fallbackName) return await createInitialsAvatar(fallbackName);
            return null;
        }
    }
};


const CgpaModal = ({ isOpen, onClose, cgpaValue = '0.00', cgpaRecord = null, studentId = '', user = null }) => {
    const [isRendered, setIsRendered] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [animatedCgpa, setAnimatedCgpa] = useState(0);

    const cgpaNum = parseFloat(cgpaValue) || 0;
    const maxCgpa = 10.0;
    const progressPercentage = (cgpaNum / maxCgpa) * 100;

    let performanceBadge = { label: 'Average', className: 'badge-average' };
    if (cgpaNum >= 8.5) performanceBadge = { label: 'Excellent', className: 'badge-excellent' };
    else if (cgpaNum >= 7.0) performanceBadge = { label: 'Good', className: 'badge-good' };

    const totalCredits = cgpaRecord?.subjects?.reduce((acc, curr) => acc + (parseInt(curr.credits) || 0), 0) || 0;
    const sgpaValue = cgpaRecord?.sgpa || '0.00';

    const [actionLoading, setActionLoading] = useState(null);

    useEffect(() => {
        if (isOpen) {
            setIsRendered(true);
            setTimeout(() => {
                setIsVisible(true);
                document.body.style.overflow = 'hidden';
                document.body.classList.add('hide-bottom-nav');
                
                // Animate CGPA Number
                let start = 0;
                const duration = 1500; // ms
                const increment = cgpaNum / (duration / 16);
                const timer = setInterval(() => {
                    start += increment;
                    if (start >= cgpaNum) {
                        setAnimatedCgpa(cgpaNum);
                        clearInterval(timer);
                    } else {
                        setAnimatedCgpa(start);
                    }
                }, 16);
                
                return () => clearInterval(timer);
            }, 10);
            
            const handleKeyDown = (e) => {
                if (e.key === 'Escape') {
                    handleClose();
                }
            };
            window.addEventListener('keydown', handleKeyDown);
            
            return () => {
                window.removeEventListener('keydown', handleKeyDown);
            };
        } else {
            setIsVisible(false);
            document.body.style.overflow = '';
            document.body.classList.remove('hide-bottom-nav');
            setTimeout(() => setIsRendered(false), 300); // match transition duration
        }
    }, [isOpen, cgpaNum]);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(() => onClose(), 300);
    };

    const handleAction = async (actionType) => {
        if (!cgpaRecord) return;
        setActionLoading(actionType);
        try {
            const pngLogo = await svgToPng(LOGO_DATA_URI);
            const userMock = user || { studentId: studentId }; 
            
            // Get base64 avatar
            let base64Avatar = await urlToBase64(user?.avatar, userMock.fullName);
            
            const doc = await pdfService.generateAcademicReportPdf(cgpaRecord, userMock, pngLogo, base64Avatar);
            
            const filename = `${studentId || 'Student'}_Academic_Report.pdf`;

            if (Capacitor.isNativePlatform()) {
                const pdfBase64 = doc.output('datauristring').split(',')[1];
                
                if (actionType === 'share') {
                    const fileResult = await Filesystem.writeFile({
                        path: filename,
                        data: pdfBase64,
                        directory: Directory.Cache
                    });
                    await CapacitorShare.share({
                        title: 'Academic Performance Report',
                        text: `Sharing Academic Report for ${studentId || 'Student'}`,
                        url: fileResult.uri,
                    });
                } else {
                    await Filesystem.writeFile({
                        path: filename,
                        data: pdfBase64,
                        directory: Directory.Documents
                    });
                    alert(`Report saved to Documents folder!`);
                }
            } else {
                if (actionType === 'share' && navigator.share) {
                    const blob = doc.output('blob');
                    const file = new File([blob], filename, { type: 'application/pdf' });
                    try {
                        await navigator.share({
                            files: [file],
                            title: 'Academic Report',
                        });
                    } catch(err) {
                        doc.save(filename);
                    }
                } else {
                    doc.save(filename);
                }
            }
        } catch (e) {
            console.error('Failed to process PDF', e);
            alert('Failed to process PDF. Please try again.');
        } finally {
            setActionLoading(null);
        }
    };

    if (!isRendered) return null;

    return createPortal(
        <div className={`cgpa-modal-overlay ${isVisible ? 'visible' : ''}`} onClick={handleClose}>
            <div className={`cgpa-modal-content ${isVisible ? 'visible' : ''}`} onClick={e => e.stopPropagation()}>
                
                <button className="cgpa-close-btn" onClick={handleClose}>
                    <X size={20} />
                </button>
                
                <div className="cgpa-modal-inner">
                    {/* Decorative Background Layer */}
                    <div className="cgpa-decorative-bg-bottom"></div>
                    <div className="cgpa-decorative-bg-top"></div>

                    <div className="cgpa-icon-section relative z-10">
                        <div className="cgpa-icon-wrapper floating-icon">
                            <GraduationCap size={32} className="cgpa-icon" />
                        </div>
                    </div>

                    <div className="cgpa-modal-header relative z-10">
                        <h2>Current CGPA</h2>
                        <p>Academic Performance Dashboard</p>
                    </div>

                    <div className="cgpa-horizontal-progress-section relative z-10">
                        <div className="cgpa-progress-header">
                            <div className="cgpa-score-wrap">
                                <span className="cgpa-score-number glow-text">{animatedCgpa.toFixed(2)}</span>
                                <span className="cgpa-score-max">/ 10.0</span>
                            </div>
                        </div>
                        
                        <div className="cgpa-horizontal-bar">
                            <div className="cgpa-bar-track"></div>
                            <div 
                                className="cgpa-bar-fill shadow-inner" 
                                style={{ width: `${isVisible ? progressPercentage : 0}%` }}
                            >
                                <div className="cgpa-thumb progress-glow">
                                    <div className="cgpa-thumb-inner"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="cgpa-badge-container relative z-10">
                        <span className={`cgpa-badge ${performanceBadge.className}`}>
                            {performanceBadge.label}
                        </span>
                    </div>

                    <div className="w-full relative z-10">
                    {cgpaRecord?.subjects?.length > 0 ? (
                        (() => {
                            let currentGroup = 'PUC-1 (Sem-1)';
                            const groupedSubjects = { 
                                'PUC-1 (Sem-1)': [], 
                                'PUC-1 (Sem-2)': [], 
                                'PUC-2 (Sem-1)': [], 
                                'PUC-2 (Sem-2)': [] 
                            };
                            
                            cgpaRecord.subjects.forEach(s => {
                                if (s.semester) {
                                    if (s.semester === 'P1S1') currentGroup = 'PUC-1 (Sem-1)';
                                    else if (s.semester === 'P1S2') currentGroup = 'PUC-1 (Sem-2)';
                                    else if (s.semester === 'P2S1') currentGroup = 'PUC-2 (Sem-1)';
                                    else if (s.semester === 'P2S2') currentGroup = 'PUC-2 (Sem-2)';
                                } else {
                                    const name = (s.subject || '').toUpperCase().trim();
                                    const match = name.match(/-(I|II|III|IV)$/);
                                    if (match) {
                                        const numeral = match[1];
                                        if (numeral === 'I') currentGroup = 'PUC-1 (Sem-1)';
                                        else if (numeral === 'II') currentGroup = 'PUC-1 (Sem-2)';
                                        else if (numeral === 'III') currentGroup = 'PUC-2 (Sem-1)';
                                        else if (numeral === 'IV') currentGroup = 'PUC-2 (Sem-2)';
                                    }
                                }
                                groupedSubjects[currentGroup].push(s);
                            });

                            return ['PUC-1 (Sem-1)', 'PUC-1 (Sem-2)', 'PUC-2 (Sem-1)', 'PUC-2 (Sem-2)'].map(groupName => (
                                groupedSubjects[groupName].length > 0 && (
                                    <div key={groupName} className="cgpa-semesters-section">
                                        <h3 className="cgpa-sem-title">{groupName} Subjects</h3>
                                        <div className="cgpa-sem-list">
                                            {groupedSubjects[groupName].map((s, i) => (
                                                <div key={i} className="cgpa-sem-item">
                                                    <div className="cgpa-sem-header">
                                                        <span className="cgpa-sem-name">{s.subject}</span>
                                                        <span className="cgpa-sem-grade">{s.grade}</span>
                                                    </div>
                                                    <div className="cgpa-sem-details">
                                                        <span>Credits: {s.credits} | CGPA: {s.grp}</span>
                                                        <span>Internal: {s.internal} | {s.status}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="cgpa-sem-summary">
                                            <div className="cgpa-summary-item">
                                                <span className="cgpa-summary-label">Credits:</span>
                                                <span className="cgpa-summary-value">{groupedSubjects[groupName].reduce((sum, s) => sum + (parseInt(s.credits) || 0), 0)}</span>
                                            </div>
                                            <div className="cgpa-summary-group">
                                                <div className="cgpa-summary-item">
                                                    <span className="cgpa-summary-label">SGPA:</span>
                                                    <span className="cgpa-summary-value-sgpa">{groupedSubjects[groupName][0]?.sgpa || '0.00'}</span>
                                                </div>
                                                <div className="cgpa-summary-item">
                                                    <span className="cgpa-summary-label">CGPA:</span>
                                                    <span className="cgpa-summary-value-cgpa">{groupedSubjects[groupName][0]?.cgpa || '0.00'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            ));
                        })()
                    ) : (
                        <div className="text-center text-sm text-gray-500 py-4">
                            No detailed subject records found for student ID: {studentId || 'Unknown'}
                        </div>
                    )}
                </div>

                <div className="cgpa-actions">
                    <button className="cgpa-btn-primary ripple" onClick={handleClose}>
                        <span>Done</span>
                        <ChevronRight size={18} />
                    </button>
                    
                    <div className="cgpa-actions-row">
                        <button 
                            className="cgpa-btn-secondary ripple" 
                            onClick={() => handleAction('share')}
                            disabled={actionLoading !== null}
                        >
                            {actionLoading === 'share' ? <Loader2 size={18} className="animate-spin" /> : <Share2 size={18} />}
                            <span>{actionLoading === 'share' ? 'Sharing...' : 'Share'}</span>
                        </button>
                        <button 
                            className="cgpa-btn-secondary ripple" 
                            onClick={() => handleAction('download')}
                            disabled={actionLoading !== null}
                        >
                            {actionLoading === 'download' ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                            <span>{actionLoading === 'download' ? 'Downloading...' : 'Download'}</span>
                        </button>
                    </div>
                </div>
                <div className="cgpa-footer">
                    Last updated: {new Date().toLocaleDateString()}
                </div>
                
                </div> {/* Closing the p-8 pb-10 wrapper */}
            </div>
        </div>,
        document.body
    );
};

export default CgpaModal;
