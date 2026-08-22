import { BookOpen, Home, Coffee, Truck, Wifi, PenTool, FileText, MoreHorizontal, History, X, User, Shield, Send } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { complaintsDb as db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useNavigate } from 'react-router-dom';
import './Complaints.css';

const CATEGORIES = [
    { id: 'academic', label: 'Academic', icon: <BookOpen size={18} />, colorClass: 'purple' },
    { id: 'hostel', label: 'Hostel', icon: <Home size={18} />, colorClass: 'green' },
    { id: 'exams', label: 'Examination', icon: <FileText size={18} />, colorClass: 'red' },
    { id: 'other', label: 'Other', icon: <MoreHorizontal size={18} />, colorClass: 'blue' }
];

const Complaints = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    
    const [formData, setFormData] = useState({
        category: '',
        subject: '',
        description: '',
        priority: '',
        isAnonymous: false,
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.category) {
            showToast("Please select a category.", "error");
            return;
        }

        if (!formData.priority) {
            showToast("Please select a priority level.", "error");
            return;
        }
        
        if (!formData.subject || !formData.description) {
            showToast("Please fill in all required fields.", "error");
            return;
        }

        setIsSubmitting(true);
        try {
            let customId = `#CMP-${new Date().getTime().toString().slice(-4)}`;
            try {
                const snapshot = await getDocs(collection(db, 'complaints'));
                customId = `#CMP-${1000 + snapshot.size + 1}`;
            } catch (err) {
                console.warn("Failed to fetch complaints collection for ID generation:", err);
            }

            const complaintData = {
                ...formData,
                complaintId: customId,
                uid: user?.uid || 'unknown_uid',
                studentId: formData.isAnonymous ? 'Anonymous' : (user?.studentId || user?.uid || 'Unknown'),
                studentName: formData.isAnonymous ? 'Anonymous User' : (user?.fullName || 'Unknown User'),
                studentEmail: formData.isAnonymous ? 'hidden@rgukt.ac.in' : (user?.email || 'unknown@example.com'),
                status: 'pending',
                createdAt: serverTimestamp(),
                timeline: [
                    { status: 'pending', label: 'Submitted', desc: 'Complaint logged into system.', time: new Date().toISOString() }
                ],
                messages: [{
                    senderId: formData.isAnonymous ? 'anonymous' : (user?.uid || 'unknown_uid'),
                    senderRole: 'student',
                    senderName: formData.isAnonymous ? 'Anonymous' : (user?.fullName || 'Unknown'),
                    text: formData.description,
                    createdAt: new Date().toISOString()
                }]
            };

            await addDoc(collection(db, 'complaints'), complaintData);
            setSubmitted(true);
            showToast('Complaint submitted successfully.', 'success');
            
            // Reset after a delay and navigate to history
            setTimeout(() => {
                setSubmitted(false);
                setFormData({ category: '', subject: '', description: '', priority: '', isAnonymous: false });
                navigate('/complaints/history');
            }, 3000);
            
        } catch (error) {
            console.error("Submit error", error);
            showToast("Failed to create complaint.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="simple-cmp-container">
            <div className="cmp-layout-wrapper">
                <div className="cmp-top-bar complaints-page-header">
                    <div className="cmp-title-section">
                        <div className="cmp-title-text">
                            <h2>Submit a Complaint</h2>
                            <p>We're here to help. Tell us about your issue.</p>
                        </div>
                        <div className="cmp-header-icon" style={{ width: '120px', height: '90px', marginLeft: '15px' }}>
                            <svg viewBox="0 0 400 300" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                              <rect x="110" y="55" width="180" height="200" rx="20" fill="#ffffff" stroke="#1e3a8a" strokeWidth="3.5" />
                              <rect x="135" y="115" width="130" height="8" rx="4" fill="#dbeafe" />
                              <rect x="135" y="135" width="100" height="8" rx="4" fill="#dbeafe" />
                              
                              <path d="M155,55 L245,55 L235,40 L165,40 Z" fill="#3b82f6" stroke="#1e3a8a" strokeWidth="3" strokeLinejoin="round" />
                              <circle cx="280" cy="205" r="36" fill="#10b981" stroke="#1e3a8a" strokeWidth="3.5" />
                              <path d="M280,188 L280,207" fill="none" stroke="#ffffff" strokeWidth="5.5" strokeLinecap="round" />
                              
                              <g transform="translate(130, 200) rotate(-35)">
                                <rect x="0" y="0" width="12" height="75" rx="4" fill="#3b82f6" stroke="#1e3a8a" strokeWidth="2.5" />
                                <path d="M0,0 L6,-15 L12,0 Z" fill="#dbeafe" stroke="#1e3a8a" strokeWidth="2.5" strokeLinejoin="round" />
                              </g>
                            </svg>
                        </div>
                    </div>
                </div>

                <motion.div 
                    className="simple-cmp-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="simple-cmp-header-actions">
                        <button 
                            type="button" 
                            onClick={() => navigate('/complaints/history')} 
                            className="simple-history-btn"
                        >
                            <History size={16} /> View My Complaints
                        </button>
                    </div>

                <AnimatePresence mode="wait">
                    {submitted ? (
                        <motion.div 
                            key="success"
                            className="simple-cmp-success"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                        >
                            <div className="success-icon-wrapper">
                                <motion.svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <motion.path 
                                        initial={{ pathLength: 0 }} 
                                        animate={{ pathLength: 1 }} 
                                        transition={{ duration: 0.5 }} 
                                        d="M20 6L9 17l-5-5" 
                                    />
                                </motion.svg>
                            </div>
                            <h3>Complaint Submitted!</h3>
                            <p>Our team will look into this shortly.</p>
                        </motion.div>
                    ) : (
                        <motion.form 
                            key="form"
                            onSubmit={handleSubmit}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <div className="simple-form-group">
                                <label>Category</label>
                                <AnimatePresence mode="wait">
                                    {!formData.category ? (
                                        <motion.div 
                                            key="category-grid"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            transition={{ duration: 0.2 }}
                                            className="simple-cat-grid"
                                        >
                                            {CATEGORIES.map(cat => (
                                                <div 
                                                    key={cat.id} 
                                                    className={`simple-cat-card ${formData.category === cat.id ? 'active' : ''}`}
                                                    onClick={() => setFormData({...formData, category: cat.id})}
                                                >
                                                    <div className={`simple-cat-icon ${cat.colorClass}`}>
                                                        {cat.icon}
                                                    </div>
                                                    <span>{cat.label}</span>
                                                </div>
                                            ))}
                                        </motion.div>
                                    ) : (
                                        <motion.div 
                                            key="category-selected"
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            transition={{ duration: 0.2 }}
                                            className="simple-selected-cat"
                                        >
                                            <div className={`simple-cat-icon ${CATEGORIES.find(c => c.id === formData.category)?.colorClass}`}>
                                                {CATEGORIES.find(c => c.id === formData.category)?.icon}
                                            </div>
                                            <span>{CATEGORIES.find(c => c.id === formData.category)?.label}</span>
                                            <button 
                                                type="button" 
                                                onClick={() => setFormData({...formData, category: ''})} 
                                                className="simple-cat-remove"
                                            >
                                                <X size={14} />
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <div className="simple-form-group">
                                <label>Subject</label>
                                <input 
                                    type="text" 
                                    className="simple-input"
                                    placeholder="Brief summary of the issue"
                                    value={formData.subject}
                                    onChange={e => setFormData({...formData, subject: e.target.value})}
                                    required
                                />
                            </div>

                            <div className="simple-form-group">
                                <label>Description</label>
                                <textarea 
                                    className="simple-input"
                                    placeholder="Detailed description of your problem..."
                                    rows={4}
                                    value={formData.description}
                                    onChange={e => setFormData({...formData, description: e.target.value})}
                                    required
                                />
                            </div>

                            <div className="simple-form-group">
                                <label>Priority</label>
                                <div className="simple-priority-selector">
                                    {['Low', 'Medium', 'High'].map(p => (
                                        <button 
                                            type="button"
                                            key={p}
                                            className={`simple-priority-btn ${p.toLowerCase()} ${formData.priority === p ? 'active' : ''}`}
                                            onClick={() => setFormData({...formData, priority: p})}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="simple-form-group checkbox-group-container">
                                <label className="checkbox-group-card" htmlFor="anon">
                                    <div className={`checkbox-icon-container ${formData.isAnonymous ? 'active' : ''}`}>
                                        <User size={18} className="icon-user" />
                                        <div className="shield-wrapper">
                                            <Shield size={12} className="icon-shield" />
                                        </div>
                                    </div>
                                    <div className="checkbox-text flex-1">
                                        <div className="checkbox-title">Submit Anonymously</div>
                                        <div className="checkbox-subtitle">Your identity will be hidden</div>
                                    </div>
                                    <div className="checkbox-wrapper">
                                        <input 
                                            type="checkbox" 
                                            id="anon"
                                            checked={formData.isAnonymous}
                                            onChange={e => setFormData({...formData, isAnonymous: e.target.checked})}
                                        />
                                    </div>
                                </label>
                            </div>

                            <button type="submit" className="simple-submit-btn" disabled={isSubmitting}>
                                {isSubmitting ? 'Submitting...' : 'Submit Complaint'}
                                {!isSubmitting && <Send size={18} />}
                            </button>
                        </motion.form>
                    )}
                </AnimatePresence>
            </motion.div>
            </div>
        </div>
    );
};

export default Complaints;
