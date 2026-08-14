import { CheckCircle, Activity, Clock, MessageSquare, Trash2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { collection, query, where, onSnapshot, deleteDoc, doc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { complaintsDb as db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useNavigate } from 'react-router-dom';
import './ComplaintHistory.css';

const ComplaintHistory = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [complaints, setComplaints] = useState([]);
    const [complaintToDelete, setComplaintToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [loading, setLoading] = useState(true);
    const { showToast } = useToast();

    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, 'complaints'), where('uid', '==', user.uid));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const complaintsData = snapshot.docs.map(doc => {
                const data = { id: doc.id, ...doc.data() };
                if (data.messages) {
                    data.messages.sort((a, b) => {
                        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
                        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
                        return dateA - dateB;
                    });
                }
                return data;
            });
            complaintsData.sort((a, b) => {
                const getMillis = (item) => {
                    if (!item.createdAt) return 0;
                    if (item.createdAt.toDate) return item.createdAt.toDate().getTime();
                    return new Date(item.createdAt).getTime();
                };
                return getMillis(b) - getMillis(a);
            });
            setComplaints(complaintsData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const getStatusChip = (status) => {
        const s = status?.toLowerCase() || 'pending';
        if (s === 'resolved' || s === 'closed') return <span className="ch-status resolved"><CheckCircle size={14}/> Resolved</span>;
        if (s === 'in_progress' || s === 'assigned') return <span className="ch-status in_progress"><Activity size={14}/> In Progress</span>;
        return <span className="ch-status pending"><Clock size={14}/> Pending</span>;
    };

    const formatDate = (ts) => {
        if (!ts) return 'Just now';
        const d = ts.toDate ? ts.toDate() : new Date(ts);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const handleDeleteClick = (e, id) => {
        e.stopPropagation();
        setComplaintToDelete(id);
    };

    const confirmDelete = async () => {
        if (!complaintToDelete) return;
        setIsDeleting(true);
        try {
            await deleteDoc(doc(db, 'complaints', complaintToDelete));
            setComplaintToDelete(null);
            showToast("Complaint deleted successfully!", "success");
        } catch (error) {
            console.error("Error deleting complaint:", error);
            showToast("Failed to delete complaint.", "error");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSendReply = async () => {
        if (!selectedComplaint || !replyText.trim()) return;
        setIsReplying(true);
        try {
            const newMessage = {
                senderId: user.uid,
                senderRole: 'student',
                senderName: user.name || user.displayName || 'Student',
                text: replyText.trim(),
                createdAt: new Date().toISOString()
            };

            await updateDoc(doc(db, 'complaints', selectedComplaint.id), {
                messages: arrayUnion(newMessage),
                hasUnreadUserReply: true,
                updatedAt: serverTimestamp()
            });

            setSelectedComplaint(prev => ({
                ...prev,
                messages: [...(prev.messages || []), newMessage]
            }));
            setReplyText('');
        } catch (error) {
            console.error("Error sending reply:", error);
            alert("Failed to send message.");
        } finally {
            setIsReplying(false);
        }
    };

    return (
        <div className="ch-container">
            <div className="ch-content">
                <div className="cmp-top-bar complaint-history-header" style={{marginBottom: '1.5rem'}}>
                    <div className="cmp-title-section">
                        <div className="cmp-title-text">
                            <h2>Complaint History</h2>
                            <p>Track the status of your submitted issues.</p>
                        </div>
                        <div className="cmp-header-icon" style={{ width: '120px', height: '90px', marginLeft: '15px' }}>
                            <svg viewBox="0 0 400 300" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                              <g transform="scale(1.1) translate(-10, -10)">
                                {/* Base Shadow */}
                                <ellipse cx="200" cy="260" rx="150" ry="12" fill="#475569" />
                                
                                {/* Back Panel */}
                                <path d="M 105 100 L 210 100 L 225 75 L 325 75 C 330 75 333 79 333 85 L 333 220 C 333 225 330 230 325 230 L 105 230 C 100 230 97 225 97 220 Z" fill="#64748b" stroke="#1e3a8a" strokeWidth="4" strokeLinejoin="round" />
                                
                                {/* Front Panel */}
                                <path d="M 82 110 L 195 110 L 210 85 L 310 85 C 315 85 318 89 318 95 L 318 240 C 318 245 315 250 310 250 L 90 250 C 85 250 82 245 82 240 Z" fill="#ffffff" stroke="#2563eb" strokeWidth="4" strokeLinejoin="round" />
                                <line x1="82" y1="120" x2="318" y2="120" stroke="#2563eb" strokeWidth="4" />
                                <line x1="100" y1="100" x2="170" y2="100" stroke="#3b82f6" strokeWidth="4" strokeLinecap="round" />
                                
                                {/* Top List Item */}
                                <rect x="100" y="135" width="190" height="35" rx="8" fill="#eff6ff" />
                                <circle cx="120" cy="152.5" r="10" fill="#10b981" />
                                <path d="M 116 153 L 119 156 L 124 150" stroke="#ffffff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                <line x1="140" y1="148" x2="220" y2="148" stroke="#2563eb" strokeWidth="3.5" strokeLinecap="round" />
                                <line x1="140" y1="158" x2="190" y2="158" stroke="#93c5fd" strokeWidth="3" strokeLinecap="round" />
                                <rect x="245" y="145" width="30" height="15" rx="7.5" fill="#a7f3d0" />
                                
                                {/* Bottom List Item */}
                                <rect x="100" y="185" width="190" height="35" rx="8" fill="#f8fafc" />
                                <circle cx="120" cy="202.5" r="10" fill="#3b82f6" />
                                <line x1="120" y1="197" x2="120" y2="204" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
                                <circle cx="120" cy="207.5" r="1.5" fill="#ffffff" />
                                <line x1="140" y1="202.5" x2="230" y2="202.5" stroke="#2563eb" strokeWidth="3.5" strokeLinecap="round" />
                                
                                {/* Magnifying Glass */}
                                <line x1="315" y1="165" x2="340" y2="190" stroke="#2563eb" strokeWidth="6" strokeLinecap="round" />
                                <circle cx="305" cy="155" r="24" fill="#eff6ff" stroke="#2563eb" strokeWidth="4" />
                                <path d="M 290 145 A 15 15 0 0 1 315 140" fill="none" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />
                              </g>
                            </svg>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="ch-loading">Loading your history...</div>
                ) : complaints.length === 0 ? (
                    <div className="ch-empty">
                        <MessageSquare size={48} />
                        <h3>No Complaints Found</h3>
                        <p>You haven't submitted any complaints yet.</p>
                        <button onClick={() => navigate('/complaints')} className="ch-new-btn">Submit a Complaint</button>
                    </div>
                ) : (
                    <div className="ch-list">
                        {complaints.map((c, i) => (
                            <motion.div 
                                key={c.id} 
                                className="ch-card"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                onClick={() => navigate(`/complaint/${c.id}`)}
                            >
                                {c.hasUnreadReply && <span className="unread-pulse-badge"></span>}
                                <div className="ch-card-header">
                                    <span className="ch-id">{c.complaintId || `#CMP-${c.id.slice(-4).toUpperCase()}`}</span>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        {getStatusChip(c.status)}
                                        <button 
                                            onClick={(e) => handleDeleteClick(e, c.id)}
                                            className="ch-delete-btn"
                                            title="Delete Complaint"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                                <h3 className="ch-subject">{c.subject}</h3>
                                <div className="ch-card-footer">
                                    <span className="ch-date">{formatDate(c.createdAt)}</span>
                                    <span className="ch-priority" data-priority={c.priority?.toLowerCase()}>{c.priority || 'Medium'} Priority</span>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {createPortal(
                <AnimatePresence>
                    {complaintToDelete && (
                        <div className="ch-modal-overlay" onClick={() => setComplaintToDelete(null)}>
                            <motion.div 
                                className="ch-confirm-modal"
                                onClick={e => e.stopPropagation()}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                            >
                                <div className="ch-confirm-icon-wrapper">
                                    <Trash2 size={32} color="#ef4444" />
                                </div>
                                <h3>Delete Complaint?</h3>
                                <p>Are you sure you want to delete this complaint? This action cannot be undone.</p>
                                <div className="ch-confirm-actions">
                                    <button className="ch-btn-cancel" onClick={() => setComplaintToDelete(null)}>Cancel</button>
                                    <button 
                                        className="ch-btn-delete" 
                                        onClick={confirmDelete}
                                        disabled={isDeleting}
                                    >
                                        {isDeleting ? 'Deleting...' : 'Delete'}
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
};

export default ComplaintHistory;
