import React, { useState, useEffect, useRef } from 'react';
import { Search, Trash2, Download, Smartphone, Share2, Eye, CheckSquare, Square, CheckCircle2 } from 'lucide-react';
import { Share } from '@capacitor/share';
import { useNavigate } from 'react-router-dom';
import { getAllCachedPdfs, deletePdf, openPdf, subscribeToAllDownloads, unsubscribeFromAllDownloads } from '../services/pdfCacheService';
import LoadingTransition from '../components/Common/LoadingTransition';
import './DownloadedPdfs.css';

const DownloadedPdfs = () => {
    const navigate = useNavigate();
    const [pdfs, setPdfs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [deleteModal, setDeleteModal] = useState({ show: false, id: null, bulk: false });
    const [activeDownloadsMap, setActiveDownloadsMap] = useState({});
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const longPressTimer = useRef(null);

    useEffect(() => {
        loadPdfs();
        subscribeToAllDownloads(setActiveDownloadsMap);
        
        const handlePdfDownloaded = () => {
            loadPdfs();
        };
        window.addEventListener('pdfDownloaded', handlePdfDownloaded);

        return () => {
            unsubscribeFromAllDownloads(setActiveDownloadsMap);
            window.removeEventListener('pdfDownloaded', handlePdfDownloaded);
        };
    }, []);

    const loadPdfs = async () => {
        setLoading(true);
        try {
            const cache = await getAllCachedPdfs();
            // Convert to array and sort by downloaded date (newest first)
            const pdfList = Object.values(cache).sort((a, b) => new Date(b.downloadedAt) - new Date(a.downloadedAt));
            setPdfs(pdfList);
        } catch (e) {
            console.error("Error loading PDFs:", e);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteClick = (e, pdfId) => {
        e.stopPropagation();
        setDeleteModal({ show: true, id: pdfId });
    };

    const confirmDelete = async () => {
        if (deleteModal.bulk) {
            for (const id of selectedIds) {
                await deletePdf(id);
            }
            setSelectedIds(new Set());
            setSelectionMode(false);
        } else if (deleteModal.id) {
            await deletePdf(deleteModal.id);
        }
        await loadPdfs();
        setDeleteModal({ show: false, id: null, bulk: false });
    };

    const cancelDelete = () => {
        setDeleteModal({ show: false, id: null, bulk: false });
    };

    const filteredPdfs = pdfs.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (p.hierarchy && p.hierarchy.join(' ').toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const formatDate = (dateString) => {
        const d = new Date(dateString);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    // Long Press Handlers
    const handleTouchStart = (pdf) => {
        if (selectionMode) return;
        longPressTimer.current = setTimeout(() => {
            setSelectionMode(true);
            setSelectedIds(new Set([pdf.id]));
            longPressTimer.current = 'fired';
            setTimeout(() => { if (longPressTimer.current === 'fired') longPressTimer.current = null; }, 500);
            if (navigator.vibrate) navigator.vibrate(40);
        }, 500);
    };

    const cancelLongPress = () => {
        if (longPressTimer.current && longPressTimer.current !== 'fired') {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    };

    const handleItemClick = (pdf) => {
        if (longPressTimer.current === 'fired') {
            longPressTimer.current = null;
            return;
        }
        if (selectionMode) {
            const newSet = new Set(selectedIds);
            if (newSet.has(pdf.id)) {
                newSet.delete(pdf.id);
                if (newSet.size === 0) setSelectionMode(false);
            } else {
                newSet.add(pdf.id);
            }
            setSelectedIds(newSet);
            return;
        }
        openPdf(pdf.localUri);
    };

    // Bulk Actions
    const handleBulkShare = async () => {
        if (selectedIds.size === 0) return;
        const selectedPdfs = pdfs.filter(p => selectedIds.has(p.id));
        try {
            await Share.share({
                title: `Share ${selectedIds.size} PDFs`,
                files: selectedPdfs.map(p => p.localUri),
                dialogTitle: 'Share PDFs'
            });
            setSelectionMode(false);
            setSelectedIds(new Set());
        } catch (e) {
            console.error("Error sharing multiple files:", e);
        }
    };

    const handleSelectAll = () => {
        if (selectedIds.size === filteredPdfs.length) {
            setSelectedIds(new Set()); // Deselect all
        } else {
            setSelectedIds(new Set(filteredPdfs.map(p => p.id))); // Select all filtered
        }
    };

    if (loading) return <LoadingTransition message="Loading offline library..." persistent variant="book" />;

    return (
        <div className="offline-library-container">
            {/* Header Card */}
            <div className="offline-library-header-card">
                <div className="offline-library-header-text">
                    <h1>Offline Library</h1>
                    <p>Your downloaded PDFs for offline access.</p>
                </div>
                <div className="offline-library-illustration">
                    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <ellipse cx="50" cy="82" rx="25" ry="3" fill="#e2e8f0"/>
                        <rect x="32" y="22" width="36" height="52" rx="2" fill="white" stroke="#3b82f6" strokeWidth="1.5"/>
                        <path d="M68 36H54V22L68 36Z" fill="#eff6ff" stroke="#3b82f6" strokeWidth="1.5" strokeLinejoin="round"/>
                        <rect x="40" y="42" width="20" height="2" rx="1" fill="#93c5fd"/>
                        <rect x="40" y="48" width="20" height="2" rx="1" fill="#93c5fd"/>
                        <rect x="40" y="54" width="14" height="2" rx="1" fill="#93c5fd"/>
                        <rect x="32" y="62" width="16" height="12" rx="1" fill="#3b82f6"/>
                        <text x="40" y="70" fill="white" fontSize="5" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">PDF</text>
                        <circle cx="68" cy="64" r="7" fill="#10b981"/>
                        <path d="M68 61V66M68 66L66 64M68 66L70 64" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx="24" cy="30" r="1.5" fill="#10b981"/>
                        <circle cx="82" cy="28" r="1" fill="#93c5fd"/>
                        <circle cx="26" cy="60" r="1" fill="#6366f1"/>
                    </svg>
                </div>
            </div>

            {(() => {
                const downloadingItems = Object.values(activeDownloadsMap).filter(d => d.state === 'DOWNLOADING' || d.state === 'RESUMING');
                if (downloadingItems.length === 0) return null;
                const totalBytes = downloadingItems.reduce((acc, curr) => acc + (curr.totalBytes || 0), 0);
                const downloadedBytes = downloadingItems.reduce((acc, curr) => acc + (curr.downloadedBytes || 0), 0);
                const overallProgress = totalBytes > 0 ? (downloadedBytes / totalBytes) * 100 : 0;

                return (
                    <div style={{ background: 'var(--color-blue-50, #eff6ff)', padding: '16px 20px', borderRadius: '16px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid var(--color-blue-200, #bfdbfe)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: 'var(--color-blue-800, #1e40af)' }}>
                                <span>Downloading {downloadingItems.length} PDF{downloadingItems.length > 1 ? 's' : ''}...</span>
                                <span>{Math.round(overallProgress)}%</span>
                            </div>
                            <div style={{ height: '6px', background: '#e0e7ff', borderRadius: '6px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${overallProgress}%`, backgroundColor: '#4f46e5', transition: 'width 0.3s ease' }}></div>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Search Bar */}
            {pdfs.length > 0 && (
                <div className="offline-library-search-wrapper" style={{ margin: '0 24px 24px 24px' }}>
                    <Search className="offline-library-search-icon" size={18} />
                    <input 
                        type="text" 
                        className="offline-library-search-input"
                        placeholder="Search PDFs..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            )}
            
            {selectionMode && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 24px 16px 24px', padding: '0 4px' }}>
                    <button onClick={handleSelectAll} style={{ background: 'none', border: 'none', color: '#3b82f6', fontWeight: '600' }}>
                        {selectedIds.size === filteredPdfs.length ? 'Deselect All' : 'Select All'}
                    </button>
                    <button onClick={() => { setSelectionMode(false); setSelectedIds(new Set()); }} style={{ background: 'none', border: 'none', color: '#64748b', fontWeight: '600' }}>
                        Done
                    </button>
                </div>
            )}

            {/* PDF List */}
            <div className="offline-library-list">
                {pdfs.length === 0 ? (
                    <div className="empty-state">
                        <div style={{ color: '#d1d5db', marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
                            <Smartphone size={64} />
                        </div>
                        <h3>No Saved PDFs</h3>
                        <p>When you view notes in a subject, click the "Download" button to save them here for offline reading.</p>
                        <button 
                            onClick={() => navigate('/courses')}
                            style={{ marginTop: '24px', padding: '12px 24px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                            Browse Courses
                        </button>
                    </div>
                ) : filteredPdfs.length > 0 ? (
                    filteredPdfs.map(pdf => {
                        const isSelected = selectedIds.has(pdf.id);
                        return (
                            <div 
                                key={pdf.id} 
                                className="offline-library-item" 
                                onTouchStart={() => handleTouchStart(pdf)}
                                onTouchEnd={cancelLongPress}
                                onTouchMove={cancelLongPress}
                                onMouseDown={() => handleTouchStart(pdf)}
                                onMouseUp={cancelLongPress}
                                onMouseLeave={cancelLongPress}
                                onClick={() => handleItemClick(pdf)}
                                style={{ 
                                    cursor: 'pointer', WebkitUserSelect: 'none', userSelect: 'none',
                                    border: isSelected ? '2px solid #3b82f6' : '2px solid transparent',
                                    backgroundColor: isSelected ? '#eff6ff' : 'white',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                {selectionMode ? (
                                    <div style={{ width: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {isSelected ? <CheckCircle2 size={20} color="#3b82f6" fill="#bfdbfe" /> : <Square size={20} color="#cbd5e1" />}
                                    </div>
                                ) : (
                                    <div className="offline-library-item-icon">
                                        <Download size={18} strokeWidth={2.5} />
                                    </div>
                                )}
                                <div className="offline-library-item-content">
                                    <h3 className="offline-library-item-title">{pdf.name.replace('.pdf', '')}</h3>
                                    <p className="offline-library-item-meta">
                                        {pdf.hierarchy ? pdf.hierarchy.join(' • ') : 'Downloaded'} • {formatDate(pdf.downloadedAt)}
                                    </p>
                                </div>
                                {!selectionMode && (
                                    <button 
                                        className="offline-library-item-delete"
                                        onClick={(e) => handleDeleteClick(e, pdf.id)}
                                        aria-label="Delete PDF"
                                    >
                                        <Trash2 size={16} strokeWidth={2} />
                                    </button>
                                )}
                            </div>
                        );
                    })
                ) : (
                    <div className="empty-state">
                        <div style={{ color: '#d1d5db', marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
                            <Search size={48} />
                        </div>
                        <h3>No matching files</h3>
                        <p>Try adjusting your search query.</p>
                    </div>
                )}
            </div>

            {/* Custom Delete Modal */}
            {deleteModal.show && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" 
                    onClick={cancelDelete} 
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)', padding: '1rem' }}
                >
                    <div 
                        className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden" 
                        onClick={e => e.stopPropagation()} 
                        style={{ backgroundColor: 'white', borderRadius: '1rem', width: '100%', maxWidth: '24rem', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}
                    >
                        <div className="p-6 text-center" style={{ padding: '1.5rem', textAlign: 'center' }}>
                            <div 
                                className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4" 
                                style={{ margin: '0 auto 1rem auto', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '3rem', width: '3rem', borderRadius: '9999px', backgroundColor: '#fee2e2' }}
                            >
                                <Trash2 size={24} className="text-red-600" style={{ color: '#dc2626' }} />
                            </div>
                            <h3 
                                className="text-lg font-bold text-slate-900 mb-2" 
                                style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '0.5rem' }}
                            >
                                {deleteModal.bulk ? `Remove ${selectedIds.size} PDFs` : 'Remove Downloaded PDF'}
                            </h3>
                            <p 
                                className="text-sm text-slate-500 mb-6" 
                                style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1.5rem', lineHeight: '1.25rem' }}
                            >
                                {deleteModal.bulk ? 'Are you sure you want to remove these PDFs from your device?' : 'Are you sure you want to remove this PDF from your device? You will need to download it again to view it offline.'}
                            </p>
                            <div className="flex space-x-3" style={{ display: 'flex', gap: '0.75rem' }}>
                                <button 
                                    onClick={cancelDelete}
                                    style={{ flex: 1, padding: '0.625rem 1rem', backgroundColor: '#f1f5f9', color: '#334155', fontWeight: 600, borderRadius: '0.75rem', border: 'none', cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={confirmDelete}
                                    style={{ flex: 1, padding: '0.625rem 1rem', backgroundColor: '#fee2e2', color: '#ef4444', fontWeight: 600, borderRadius: '0.75rem', border: 'none', cursor: 'pointer' }}
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Unified Action Bottom Sheet */}
            {selectionMode && (
                <>
                    <div 
                        className="bottom-sheet-container"
                        style={{ 
                            position: 'fixed', bottom: 0, left: 0, right: 0, 
                            backgroundColor: 'white', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', 
                            padding: '24px 20px 100px 20px', zIndex: 2147483647, 
                            boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
                            animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                        }}
                    >
                        <div style={{ width: '40px', height: '4px', backgroundColor: '#e2e8f0', borderRadius: '4px', margin: '0 auto 20px auto' }} />
                        
                        <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px', color: '#0f172a', textAlign: 'center' }}>
                            {selectedIds.size} Selected
                        </h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '24px' }}>
                            {selectedIds.size === 1 && (
                                <button 
                                    onClick={() => {
                                        const pdfId = Array.from(selectedIds)[0];
                                        const pdf = pdfs.find(p => p.id === pdfId);
                                        if (pdf) openPdf(pdf.localUri);
                                        setSelectionMode(false);
                                        setSelectedIds(new Set());
                                    }} 
                                    style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', border: 'none', backgroundColor: '#f8fafc', borderRadius: '12px', fontSize: '15px', fontWeight: '600', color: '#334155' }}
                                >
                                    <Eye size={20} color="#3b82f6" /> View PDF
                                </button>
                            )}
                            <button 
                                onClick={handleBulkShare} 
                                disabled={selectedIds.size === 0}
                                style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', border: 'none', backgroundColor: selectedIds.size > 0 ? '#f8fafc' : '#f1f5f9', borderRadius: '12px', fontSize: '15px', fontWeight: '600', color: selectedIds.size > 0 ? '#334155' : '#94a3b8' }}
                            >
                                <Share2 size={20} color={selectedIds.size > 0 ? "#10b981" : "#94a3b8"} /> Share
                            </button>
                            <button 
                                onClick={() => setDeleteModal({ show: true, bulk: true })} 
                                disabled={selectedIds.size === 0}
                                style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', border: 'none', backgroundColor: selectedIds.size > 0 ? '#fee2e2' : '#f1f5f9', borderRadius: '12px', fontSize: '15px', fontWeight: '600', color: selectedIds.size > 0 ? '#ef4444' : '#94a3b8' }}
                            >
                                <Trash2 size={20} color={selectedIds.size > 0 ? "#ef4444" : "#94a3b8"} /> Delete
                            </button>
                        </div>
                    </div>
                    <style>{`
                        @keyframes slideUp {
                            from { transform: translateY(100%); }
                            to { transform: translateY(0); }
                        }
                    `}</style>
                </>
            )}
        </div>
    );
};

export default DownloadedPdfs;
