import React, { useState, useEffect } from 'react';
import { Search, Trash2, Download, Smartphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getAllCachedPdfs, deletePdf, openPdf } from '../services/pdfCacheService';
import LoadingTransition from '../components/Common/LoadingTransition';
import './DownloadedPdfs.css';

const DownloadedPdfs = () => {
    const navigate = useNavigate();
    const [pdfs, setPdfs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [deleteModal, setDeleteModal] = useState({ show: false, id: null });

    useEffect(() => {
        loadPdfs();
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
        if (deleteModal.id) {
            await deletePdf(deleteModal.id);
            await loadPdfs();
            setDeleteModal({ show: false, id: null });
        }
    };

    const cancelDelete = () => {
        setDeleteModal({ show: false, id: null });
    };

    const filteredPdfs = pdfs.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (p.hierarchy && p.hierarchy.join(' ').toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const formatDate = (dateString) => {
        const d = new Date(dateString);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
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

            {/* Search Bar */}
            {pdfs.length > 0 && (
                <div className="offline-library-search-wrapper">
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
                    filteredPdfs.map(pdf => (
                        <div 
                            key={pdf.id} 
                            className="offline-library-item" 
                            onClick={() => openPdf(pdf.localUri)}
                            style={{ cursor: 'pointer' }}
                        >
                            <div className="offline-library-item-icon">
                                <Download size={22} strokeWidth={2.5} />
                            </div>
                            <div className="offline-library-item-content">
                                <h3 className="offline-library-item-title">{pdf.name.replace('.pdf', '')}</h3>
                                <p className="offline-library-item-meta">
                                    {pdf.hierarchy ? pdf.hierarchy.join(' • ') : 'Downloaded'} • {formatDate(pdf.downloadedAt)}
                                </p>
                            </div>
                            <button 
                                className="offline-library-item-delete"
                                onClick={(e) => handleDeleteClick(e, pdf.id)}
                                aria-label="Delete PDF"
                            >
                                <Trash2 size={18} strokeWidth={2} />
                            </button>
                        </div>
                    ))
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
                                Remove Downloaded PDF
                            </h3>
                            <p 
                                className="text-sm text-slate-500 mb-6" 
                                style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1.5rem', lineHeight: '1.25rem' }}
                            >
                                Are you sure you want to remove this PDF from your device? You will need to download it again to view it offline.
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
        </div>
    );
};

export default DownloadedPdfs;
