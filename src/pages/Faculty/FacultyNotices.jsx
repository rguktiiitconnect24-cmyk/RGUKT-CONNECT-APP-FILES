import { Plus, Search, Filter, Pin, Bell, Tag, Clock, Eye, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../config/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import './FacultyFeature.css';

const FacultyNotices = () => {
    const { user } = useAuth();
    const [notices, setNotices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (!user?.uid) return;

        const q = query(collection(db, 'notices'), where('facultyId', '==', user.uid));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Add dummy data for UI display if empty
            if (data.length === 0) {
                setNotices([
                    { id: '1', title: 'Mid-Sem Exam Schedule Updated', category: 'Exams', date: '2026-06-15', views: 342, isPinned: true, status: 'Active' },
                    { id: '2', title: 'Guest Lecture on AI', category: 'Events', date: '2026-06-14', views: 120, isPinned: false, status: 'Active' },
                    { id: '3', title: 'Assignment 2 Deadline Extended', category: 'Academic', date: '2026-06-10', views: 450, isPinned: false, status: 'Expired' },
                ]);
            } else {
                setNotices(data);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const handleCreateNotice = () => {
        alert("Create Notice Form will open here.");
    };

    const filteredNotices = notices.filter(n => n.title.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="faculty-feature-container">
            <div className="faculty-feature-header">
                <div>
                    <h1>Notice Board Management</h1>
                    <p>Publish, schedule, and track engagement for your announcements.</p>
                </div>
                <button className="primary-action-btn" onClick={handleCreateNotice}>
                    <Plus size={18} /> Publish Notice
                </button>
            </div>

            <div className="feature-stats-row">
                <div className="feature-stat-card border-blue">
                    <span className="stat-label">Total Notices</span>
                    <span className="stat-value">{notices.length}</span>
                </div>
                <div className="feature-stat-card border-green">
                    <span className="stat-label">Active Notices</span>
                    <span className="stat-value">{notices.filter(n => n.status === 'Active').length}</span>
                </div>
                <div className="feature-stat-card border-orange">
                    <span className="stat-label">Total Views</span>
                    <span className="stat-value">{notices.reduce((sum, n) => sum + (n.views || 0), 0)}</span>
                </div>
                <div className="feature-stat-card border-purple">
                    <span className="stat-label">Avg. Engagement</span>
                    <span className="stat-value">68%</span>
                </div>
            </div>

            {/* Notices Table */}
            <div className="feature-table-wrapper">
                <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700/50">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Search notices..." 
                            className="pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                        <Filter size={18} /> Category Filter
                    </button>
                </div>
                <table className="feature-table">
                    <thead>
                        <tr>
                            <th>Notice Title</th>
                            <th>Category</th>
                            <th>Date Published</th>
                            <th>Engagement</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="6" className="text-center py-8">Loading notices...</td></tr>
                        ) : filteredNotices.map(notice => (
                            <tr key={notice.id} className={notice.isPinned ? "bg-amber-50/50 dark:bg-amber-900/10" : ""}>
                                <td className="font-semibold text-slate-800 dark:text-slate-200">
                                    <div className="flex items-center gap-3">
                                        <div className="icon-wrapper bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                                            {notice.isPinned ? <Pin size={18} className="text-amber-500" /> : <Bell size={18} />}
                                        </div>
                                        {notice.title}
                                    </div>
                                </td>
                                <td>
                                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                                        <Tag size={14} /> {notice.category}
                                    </div>
                                </td>
                                <td className="text-slate-600 dark:text-slate-400 font-medium">
                                    <div className="flex items-center gap-2">
                                        <Clock size={14} /> {notice.date}
                                    </div>
                                </td>
                                <td>
                                    <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200">
                                        <Eye size={16} className="text-blue-500" /> {notice.views} views
                                    </div>
                                </td>
                                <td>
                                    <span className={`status-badge status-${(notice.status || 'draft').toLowerCase()}`}>
                                        {notice.status || 'Draft'}
                                    </span>
                                </td>
                                <td>
                                    <div className="table-actions">
                                        <button className="action-icon-btn analytics" title="Pin/Unpin"><Pin size={16} /></button>
                                        <button className="action-icon-btn delete" title="Delete Notice"><Trash2 size={16} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredNotices.length === 0 && !loading && (
                            <tr><td colSpan="6" className="text-center py-8 text-slate-500">No notices found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default FacultyNotices;
