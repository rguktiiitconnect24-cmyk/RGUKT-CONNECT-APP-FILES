import { Plus, Search, Filter, ClipboardList, Clock, CheckCircle, Edit2, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../config/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import './FacultyFeature.css';

const FacultyAssignments = () => {
    const { user } = useAuth();
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (!user?.uid) return;

        const q = query(collection(db, 'assignments'), where('facultyId', '==', user.uid));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Add dummy data if empty to show the premium UI
            if (data.length === 0) {
                setAssignments([
                    { id: '1', title: 'ER Diagram Creation', subject: 'Database Systems', deadline: '2026-06-20', submissions: 45, pendingReview: 12, status: 'Active' },
                    { id: '2', title: 'Process Synchronization', subject: 'Operating Systems', deadline: '2026-06-18', submissions: 110, pendingReview: 45, status: 'Reviewing' },
                    { id: '3', title: 'Subnetting Exercise', subject: 'Computer Networks', deadline: '2026-06-10', submissions: 115, pendingReview: 0, status: 'Completed' },
                ]);
            } else {
                setAssignments(data);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const handleCreateAssignment = async () => {
        alert("Create Assignment Modal will open here.");
    };

    const filteredAssignments = assignments.filter(a => a.title.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="faculty-feature-container">
            <div className="faculty-feature-header">
                <div>
                    <h1>Assignment Management</h1>
                    <p>Create assignments, set deadlines, and grade student submissions.</p>
                </div>
                <button className="primary-action-btn" onClick={handleCreateAssignment}>
                    <Plus size={18} /> Create Assignment
                </button>
            </div>

            <div className="feature-stats-row">
                <div className="feature-stat-card border-blue">
                    <span className="stat-label">Active Assignments</span>
                    <span className="stat-value">{assignments.filter(a => a.status === 'Active').length}</span>
                </div>
                <div className="feature-stat-card border-orange">
                    <span className="stat-label">Pending Reviews</span>
                    <span className="stat-value">{assignments.reduce((sum, a) => sum + (a.pendingReview || 0), 0)}</span>
                </div>
                <div className="feature-stat-card border-green">
                    <span className="stat-label">Total Submissions</span>
                    <span className="stat-value">{assignments.reduce((sum, a) => sum + (a.submissions || 0), 0)}</span>
                </div>
                <div className="feature-stat-card border-purple">
                    <span className="stat-label">Late Submissions</span>
                    <span className="stat-value">8</span>
                </div>
            </div>

            {/* Assignments Table */}
            <div className="feature-table-wrapper">
                <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700/50">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Search assignments..." 
                            className="pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                        <Filter size={18} /> Filter
                    </button>
                </div>
                <table className="feature-table">
                    <thead>
                        <tr>
                            <th>Assignment Title</th>
                            <th>Subject</th>
                            <th>Deadline</th>
                            <th>Submissions (Pending)</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="6" className="text-center py-8">Loading assignments...</td></tr>
                        ) : filteredAssignments.map(assignment => (
                            <tr key={assignment.id}>
                                <td className="font-semibold text-slate-800 dark:text-slate-200">
                                    <div className="flex items-center gap-3">
                                        <div className="icon-wrapper bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                                            <ClipboardList size={18} />
                                        </div>
                                        {assignment.title}
                                    </div>
                                </td>
                                <td className="text-slate-600 dark:text-slate-400">{assignment.subject}</td>
                                <td className="text-slate-600 dark:text-slate-400 font-medium">
                                    <div className="flex items-center gap-2">
                                        <Clock size={14} className="text-orange-500" />
                                        {assignment.deadline}
                                    </div>
                                </td>
                                <td>
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">{assignment.submissions}</span>
                                    <span className="text-orange-500 text-sm ml-2">({assignment.pendingReview} pending)</span>
                                </td>
                                <td>
                                    <span className={`status-badge status-${(assignment.status || 'draft').toLowerCase()}`}>
                                        {assignment.status || 'Draft'}
                                    </span>
                                </td>
                                <td>
                                    <div className="table-actions">
                                        <button className="action-icon-btn analytics" title="Grade Submissions"><CheckCircle size={16} /></button>
                                        <button className="action-icon-btn edit" title="Edit Assignment"><Edit2 size={16} /></button>
                                        <button className="action-icon-btn delete" title="Delete"><Trash2 size={16} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredAssignments.length === 0 && !loading && (
                            <tr><td colSpan="6" className="text-center py-8 text-slate-500">No assignments found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default FacultyAssignments;
