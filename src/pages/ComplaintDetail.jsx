import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { complaintsDb as db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { Send, Eye, Search, Settings, Archive, ShieldCheck, CheckCircle, Activity, Clock, FileText, Calendar, Bookmark, MessageSquare, MessageSquarePlus, History, X, Paperclip } from 'lucide-react';
import { motion } from 'framer-motion';
import './ComplaintDetail.css';

const ComplaintDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    
    const [complaint, setComplaint] = useState(null);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('details');
    const [replyText, setReplyText] = useState('');
    const [isReplying, setIsReplying] = useState(false);
    const [showFollowUpModal, setShowFollowUpModal] = useState(false);
    const [followUpSubject, setFollowUpSubject] = useState('');
    const [followUpMessage, setFollowUpMessage] = useState('');
    const [isSubmittingFollowUp, setIsSubmittingFollowUp] = useState(false);
    const chatEndRef = useRef(null);

    useEffect(() => {
        if (!id) return;
        const unsubscribe = onSnapshot(doc(db, 'complaints', id), (docSnap) => {
            if (docSnap.exists()) {
                setComplaint({ id: docSnap.id, ...docSnap.data() });
            } else {
                setComplaint(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [id]);

    useEffect(() => {
        if (viewMode === 'chat') {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [complaint?.messages, viewMode]);

    useEffect(() => {
        // Automatically clear the unread badge if the student opens the complaint
        if (complaint?.hasUnreadReply && user?.role !== 'admin') {
            updateDoc(doc(db, 'complaints', id), {
                hasUnreadReply: false
            }).catch(err => console.error("Error clearing unread flag:", err));
        }
    }, [complaint?.hasUnreadReply, id, user]);

    const handleSendReply = async () => {
        if (!complaint || !replyText.trim()) return;
        setIsReplying(true);
        try {
            const newMessage = {
                id: Date.now().toString(),
                senderId: user.uid,
                senderRole: 'student',
                senderName: user.name || user.displayName || 'Student',
                text: replyText.trim(),
                createdAt: new Date().toISOString()
            };

            // If a follow-up exists and is active, send message to follow-up thread
            if (complaint.followUpEnquiry && complaint.followUpEnquiry.isActive) {
                const updatedMessages = [...(complaint.followUpEnquiry.messages || []), newMessage];
                await updateDoc(doc(db, 'complaints', id), {
                    'followUpEnquiry.messages': updatedMessages,
                    'followUpEnquiry.status': 'pending', // Reopen for admin review
                    updatedAt: serverTimestamp()
                });
            } else {
                // Regular chat
                await updateDoc(doc(db, 'complaints', id), {
                    messages: arrayUnion(newMessage),
                    hasUnreadUserReply: true,
                    updatedAt: serverTimestamp()
                });
            }

            setReplyText('');
        } catch (error) {
            console.error("Error sending reply:", error);
            alert("Failed to send message.");
        } finally {
            setIsReplying(false);
        }
    };

    const handleCreateFollowUp = async (e) => {
        e.preventDefault();
        if (!followUpSubject.trim() || !followUpMessage.trim()) return;
        setIsSubmittingFollowUp(true);
        try {
            const initialMessage = {
                id: Date.now().toString(),
                senderId: user.uid,
                senderRole: 'student',
                senderName: user.name || user.displayName || 'Student',
                text: followUpMessage.trim(),
                createdAt: new Date().toISOString()
            };

            await updateDoc(doc(db, 'complaints', id), {
                followUpEnquiry: {
                    isActive: true,
                    status: 'pending',
                    subject: followUpSubject.trim(),
                    createdAt: new Date().toISOString(),
                    messages: [initialMessage]
                },
                updatedAt: serverTimestamp()
            });
            setShowFollowUpModal(false);
            setFollowUpSubject('');
            setFollowUpMessage('');
            setViewMode('chat'); // Switch to chat to view it
        } catch (error) {
            console.error("Error creating follow-up:", error);
            alert("Failed to raise follow-up enquiry.");
        } finally {
            setIsSubmittingFollowUp(false);
        }
    };

    const formatDate = (dateValue) => {
        if (!dateValue) return '';
        const d = dateValue.toDate ? dateValue.toDate() : new Date(dateValue);
        return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const getStatusChip = (status) => {
        switch (status) {
            case 'resolved': return <span className="cd-status resolved"><CheckCircle size={12} /> Resolved</span>;
            case 'in_progress': return <span className="cd-status in_progress"><Activity size={12} /> In Progress</span>;
            default: return <span className="cd-status pending"><Clock size={12} /> Pending</span>;
        }
    };

    const steps = [
        { id: 'submitted', label: 'Submitted', icon: Send, color: '#3b82f6' }, // Blue
        { id: 'viewed', label: 'Viewed by Admin', icon: Eye, color: '#f97316' }, // Orange
        { id: 'under_review', label: 'Under Review', icon: Search, color: '#8b5cf6' }, // Purple
        { id: 'in_progress', label: 'In Progress', icon: Settings, color: '#06b6d4' }, // Cyan
        { id: 'resolved', label: 'Resolved', icon: ShieldCheck, color: '#10b981' }, // Emerald
        { id: 'closed', label: 'Closed', icon: Archive, color: '#f43f5e' } // Rose
    ];

    const getCurrentStepIndex = (status) => {
        switch (status) {
            case 'pending': return 0;
            case 'viewed': return 1;
            case 'assigned': return 1;
            case 'under_review': return 2;
            case 'in-progress': return 3;
            case 'resolved': return 4;
            case 'closed': return 5;
            default: return 0;
        }
    };

    if (loading) {
        return <div className="cd-container"><p>Loading...</p></div>;
    }

    if (!complaint) {
        return <div className="cd-container"><p>Complaint not found.</p></div>;
    }

    const currentStepIndex = getCurrentStepIndex(complaint.status);

    const getStatusMessage = (status) => {
        switch (status) {
            case 'pending': return "Your complaint has been submitted. We will assign an admin soon.";
            case 'viewed': case 'assigned': return "An admin has been assigned and is looking into your issue.";
            case 'under_review': return "Our team is currently reviewing your complaint. We will update you soon.";
            case 'in-progress': return "Work is currently in progress to resolve your issue.";
            case 'resolved': return "Your complaint has been resolved! Let us know if you need further help.";
            case 'closed': return "This ticket has been officially closed.";
            default: return "Our team is reviewing your complaint. We will update you soon.";
        }
    };

    return (
        <div className="cd-container">
            <div className="cmp-top-bar" style={{marginBottom: '1.5rem'}}>
                <div className="cmp-title-section">
                    <div className="cmp-title-text">
                        <h2>Complaint Details</h2>
                        <p>View the full details and status of this ticket.</p>
                    </div>
                    <div className="cmp-header-icon" style={{ width: '120px', height: '90px', marginLeft: '15px' }}>
                        <svg viewBox="0 0 400 300" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                          <g transform="scale(1.1) translate(-10, -10)">
                            {/* Base Shadow */}
                            <ellipse cx="200" cy="260" rx="120" ry="12" fill="#475569" opacity="0.6" />
                            
                            {/* Document Base */}
                            <rect x="130" y="70" width="140" height="180" rx="12" fill="#64748b" stroke="#1e3a8a" strokeWidth="4" />
                            
                            {/* Document Front */}
                            <rect x="100" y="90" width="160" height="170" rx="12" fill="#ffffff" stroke="#2563eb" strokeWidth="4" />
                            
                            {/* Lines on Document */}
                            <rect x="120" y="120" width="120" height="10" rx="5" fill="#dbeafe" />
                            <rect x="120" y="145" width="100" height="10" rx="5" fill="#dbeafe" />
                            <rect x="120" y="170" width="80" height="10" rx="5" fill="#dbeafe" />
                            
                            {/* Image Placeholder on Document */}
                            <rect x="120" y="195" width="80" height="45" rx="8" fill="#eff6ff" stroke="#93c5fd" strokeWidth="2" />
                            <path d="M 125 235 L 145 205 L 165 230 L 175 220 L 195 235 Z" fill="#93c5fd" />
                            
                            {/* Magnifying Glass overlapping */}
                            <circle cx="260" cy="150" r="40" fill="#fef3c7" stroke="#d97706" strokeWidth="6" opacity="0.9" />
                            <circle cx="260" cy="150" r="25" fill="#ffffff" opacity="0.5" />
                            <line x1="285" y1="175" x2="330" y2="220" stroke="#d97706" strokeWidth="12" strokeLinecap="round" />
                            <line x1="285" y1="175" x2="330" y2="220" stroke="#b45309" strokeWidth="6" strokeLinecap="round" />
                            
                            {/* Details Pin */}
                            <circle cx="200" cy="100" r="6" fill="#10b981" />
                          </g>
                        </svg>
                    </div>
                </div>
            </div>

            <div className="cd-content-area">
                {viewMode === 'details' ? (
                    <motion.div 
                        className="cd-details-view"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        {/* Summary Card */}
                        <div className="cd-compact-summary-card">
                            <div className="cd-compact-summary-icon-container">
                                <FileText size={20} className="text-white relative z-10" />
                            </div>
                            
                            <div className="cd-compact-summary-content">
                                <div className="cd-compact-summary-id">
                                    {(complaint.complaintId || 'CMP-1000').replace(/^#+/, '#')}
                                </div>
                                <h3 className="cd-compact-summary-subject line-clamp-1">{complaint.subject}</h3>
                                <div className="cd-compact-summary-meta">
                                    <div className="cd-meta-item">
                                        <Calendar size={12} /> 
                                        <span>{formatDate(complaint.createdAt)}</span>
                                    </div>
                                    <div className={`cd-priority-pill priority-${complaint.priority?.toLowerCase() || 'medium'}`}>
                                        <Bookmark size={10} />
                                        {complaint.priority || 'Medium'}
                                    </div>
                                </div>
                            </div>

                            <div className={`cd-compact-status-badge badge-${complaint.status}`}>
                                {complaint.status === 'pending' && <Clock size={12} className="relative z-10" />}
                                {complaint.status === 'resolved' && <CheckCircle size={12} className="relative z-10" />}
                                <span className="relative z-10">{steps[currentStepIndex].label}</span>
                            </div>
                        </div>

                        {/* Timeline Card */}
                        <div className="cd-timeline-card">
                            <h3 className="cd-card-title">Complaint Status</h3>
                            
                            <div className="cd-timeline-wrapper">
                                {steps.map((step, idx) => {
                                    const isCompleted = idx < currentStepIndex;
                                    const isCurrent = idx === currentStepIndex;
                                    const isPending = idx > currentStepIndex;

                                    return (
                                        <div key={step.id} className={`cd-timeline-step ${isCompleted ? 'completed' : isCurrent ? 'current' : 'pending'}`}>
                                            <div className="cd-timeline-node-wrapper">
                                                <div 
                                                    className={`cd-timeline-node ${isCurrent ? 'current' : ''}`}
                                                    style={{ 
                                                        borderColor: isCompleted || isCurrent ? step.color : '#94a3b840',
                                                        backgroundColor: isCompleted || isCurrent ? step.color : 'var(--color-surface, #ffffff)',
                                                        '--halo-color': isCompleted || isCurrent ? `${step.color}80` : 'transparent'
                                                    }}
                                                >
                                                    <step.icon size={18} color={isCompleted || isCurrent ? '#fff' : '#94a3b8'} strokeWidth={isCompleted || isCurrent ? 2 : 1.5} />
                                                </div>
                                            </div>
                                            
                                            <div className="cd-timeline-text flex flex-col justify-center">
                                                <div 
                                                    className="cd-timeline-label text-xs font-bold md:text-center text-left" 
                                                    style={{ color: isCurrent || isCompleted ? 'var(--color-text-main)' : '#94a3b8' }}
                                                >
                                                    <span className={isCompleted ? 'text-slate-700 dark:text-slate-300' : isCurrent ? '' : 'opacity-80'}>
                                                        {step.label}
                                                    </span>
                                                </div>
                                                {(() => {
                                                    let stepDate = null;
                                                    if (idx === 0) stepDate = complaint.createdAt;
                                                    else if (complaint.statusHistory && complaint.statusHistory[step.id]) {
                                                        stepDate = complaint.statusHistory[step.id];
                                                    } else if (isCurrent) {
                                                        stepDate = complaint.updatedAt;
                                                    }
                                                    
                                                    if (stepDate && (isCompleted || isCurrent)) {
                                                        return <div className="cd-timeline-date text-slate-500 dark:text-slate-400 mt-1 md:text-center text-left">{formatDate(stepDate)}</div>;
                                                    }
                                                    return null;
                                                })()}
                                            </div>
                                            {idx < steps.length - 1 && (
                                                <div 
                                                    className="cd-timeline-segment"
                                                    style={{ background: isCompleted ? step.color : undefined }}
                                                ></div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Current Status Banner */}
                        <div className="cd-premium-status-card">
                            <div className="cd-premium-header">
                                <div className="cd-premium-icon-container">
                                    <FileText size={20} className="text-white relative z-10" />
                                </div>
                                <div className="cd-premium-title-group">
                                    <h4 className="cd-premium-title">Current Status</h4>
                                    <span className="cd-premium-timestamp">Latest update: {formatDate(complaint.updatedAt || complaint.createdAt)}</span>
                                </div>
                                <div className={`cd-premium-badge badge-${complaint.status}`}>
                                    {steps[currentStepIndex].label}
                                </div>
                            </div>

                            <div className="cd-premium-body">
                                <p className="cd-premium-message">
                                    {getStatusMessage(complaint.status)}
                                </p>
                            </div>

                            <div className="cd-premium-footer">
                                <button 
                                    className="cd-premium-chat-btn"
                                    onClick={() => setViewMode('chat')}
                                >
                                    <span className="cd-btn-text">Open Chat Support</span>
                                    <MessageSquare size={18} className="cd-btn-icon" />
                                </button>
                            </div>
                        </div>

                        {/* Still Need Help Section */}
                        {complaint.status === 'closed' && (!complaint.followUpEnquiry || !complaint.followUpEnquiry.isActive) && (
                            <motion.div 
                                className="cd-followup-card"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                            >
                                <div className="cd-followup-header">
                                    <div className="cd-followup-icon">
                                        <MessageSquarePlus size={24} className="text-amber-500" />
                                    </div>
                                    <div className="cd-followup-title-group">
                                        <h4 className="text-amber-900 dark:text-amber-100 font-bold text-lg">Still Need Help?</h4>
                                        <p className="text-amber-700 dark:text-amber-300 text-sm">Have another question or additional information regarding this complaint? Raise a follow-up enquiry without creating a completely new complaint.</p>
                                    </div>
                                </div>
                                <div className="cd-followup-actions">
                                    <button 
                                        className="cd-btn-primary gradient-blue"
                                        onClick={() => setShowFollowUpModal(true)}
                                    >
                                        <MessageSquarePlus size={18} />
                                        <span>Raise Follow-up Enquiry</span>
                                    </button>
                                    <button 
                                        className="cd-btn-secondary outline-only"
                                        onClick={() => setViewMode('chat')}
                                    >
                                        <History size={18} />
                                        <span>View Previous Conversation</span>
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </motion.div>
                ) : (
                    <motion.div 
                        className="cd-chat-view"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        <div className="cd-chat-messages">
                            <div className="cd-chat-bubble student">
                                <div className="cd-chat-bubble-content">
                                    <div className="cd-chat-head">
                                        <strong>You</strong>
                                        <span>{formatDate(complaint.createdAt)}</span>
                                    </div>
                                    <p>{complaint.description}</p>
                                </div>
                            </div>
                            
                            {(complaint.messages || []).map((msg, idx) => {
                                const isStudent = msg.senderRole === 'student';
                                const isSystem = msg.senderRole === 'system';
                                return (
                                    <div key={`msg-${idx}`} className={`cd-chat-bubble ${isStudent ? 'student' : isSystem ? 'system' : 'admin'}`}>
                                        <div className="cd-chat-bubble-content">
                                            <div className="cd-chat-head">
                                                <strong>{isStudent ? 'You' : msg.senderName}</strong>
                                                <span>{formatDate(msg.createdAt)}</span>
                                            </div>
                                            <p>{msg.text}</p>
                                        </div>
                                    </div>
                                );
                            })}
                            
                            {/* Follow-up Enquiry Thread */}
                            {complaint.followUpEnquiry && complaint.followUpEnquiry.messages && (
                                <>
                                    <div className="cd-chat-divider">
                                        <span>Follow-up Enquiry: {complaint.followUpEnquiry.subject}</span>
                                    </div>
                                    {complaint.followUpEnquiry.messages.map((msg, idx) => {
                                        const isStudent = msg.senderRole === 'student';
                                        return (
                                            <div key={`fu-msg-${idx}`} className={`cd-chat-bubble ${isStudent ? 'student' : 'admin'}`}>
                                                <div className="cd-chat-bubble-content">
                                                    <div className="cd-chat-head">
                                                        <strong>{isStudent ? 'You' : msg.senderName}</strong>
                                                        <span>{formatDate(msg.createdAt)}</span>
                                                    </div>
                                                    <p>{msg.text}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {complaint.followUpEnquiry.status && (
                                        <div className="cd-chat-status-badge">
                                            Follow-up Status: <span className={`fu-badge fu-${complaint.followUpEnquiry.status}`}>{complaint.followUpEnquiry.status}</span>
                                        </div>
                                    )}
                                </>
                            )}
                            
                            <div ref={chatEndRef} />
                        </div>

                        {complaint.status !== 'resolved' && complaint.status !== 'closed' || (complaint.followUpEnquiry && complaint.followUpEnquiry.isActive && complaint.followUpEnquiry.status !== 'resolved') ? (
                            <div className="cd-reply-box">
                                <input 
                                    type="text" 
                                    placeholder="Type a message to admin..." 
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSendReply()}
                                    disabled={isReplying}
                                />
                                <button onClick={handleSendReply} disabled={isReplying || !replyText.trim()}>
                                    <Send size={18} />
                                </button>
                            </div>
                        ) : (
                            <motion.div 
                                className="cd-chat-resolved-notice flex flex-col items-center justify-center gap-2 p-6"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4 }}
                            >
                                <motion.div
                                    animate={{ 
                                        scale: [1, 1.1, 1],
                                        boxShadow: [
                                            "0px 0px 0px 0px rgba(16, 185, 129, 0.4)",
                                            "0px 0px 0px 15px rgba(16, 185, 129, 0)",
                                            "0px 0px 0px 0px rgba(16, 185, 129, 0)"
                                        ]
                                    }}
                                    transition={{ 
                                        duration: 2, 
                                        repeat: Infinity,
                                        ease: "easeInOut"
                                    }}
                                    className="bg-emerald-100 dark:bg-emerald-900/40 p-4 rounded-full mb-4 flex items-center justify-center"
                                >
                                    <CheckCircle size={40} className="text-emerald-500" />
                                </motion.div>
                                <span className="font-medium text-emerald-600 dark:text-emerald-400">This ticket has been marked as {complaint.status}.</span>
                            </motion.div>
                        )}
                    </motion.div>
                )}
            </div>

            {/* Follow-up Modal */}
            {showFollowUpModal && (
                <div className="cd-modal-overlay" onClick={() => setShowFollowUpModal(false)}>
                    <motion.div 
                        className="cd-modal-content"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="cd-modal-header">
                            <div>
                                <h3 className="text-xl font-bold m-0">Follow-up Enquiry</h3>
                                <p className="text-sm text-slate-500 mt-1">This enquiry will remain linked to Complaint #{(complaint.complaintId || 'CMP-1000').replace(/^#+/, '#')}.</p>
                            </div>
                            <button className="cd-modal-close" onClick={() => setShowFollowUpModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateFollowUp} className="cd-modal-body flex flex-col gap-4">
                            <div className="cd-form-group">
                                <label>Subject</label>
                                <input 
                                    type="text" 
                                    placeholder="Briefly describe the follow-up issue"
                                    value={followUpSubject}
                                    onChange={(e) => setFollowUpSubject(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="cd-form-group">
                                <label>Message</label>
                                <textarea 
                                    placeholder="Provide additional details..."
                                    value={followUpMessage}
                                    onChange={(e) => setFollowUpMessage(e.target.value)}
                                    rows={4}
                                    required
                                />
                            </div>
                            <div className="cd-form-group">
                                <label>Attachment (Optional)</label>
                                <div className="cd-file-upload-styled">
                                    <Paperclip size={18} />
                                    <span>Click to upload file</span>
                                    <input type="file" />
                                </div>
                            </div>
                            <div className="cd-modal-footer">
                                <button type="button" className="cd-btn-secondary" onClick={() => setShowFollowUpModal(false)}>Cancel</button>
                                <button type="submit" className="cd-btn-primary" disabled={isSubmittingFollowUp}>
                                    {isSubmittingFollowUp ? 'Submitting...' : 'Submit Enquiry'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default ComplaintDetail;
