import { Plus, Search, Filter, FileText, Edit2, BarChart2, Settings, Trash2 } from 'lucide-react';
import { Area } from 'recharts';
import { Tooltip } from 'recharts';
import { YAxis } from 'recharts';
import { XAxis } from 'recharts';
import { CartesianGrid } from 'recharts';
import { AreaChart } from 'recharts';
import { ResponsiveContainer } from 'recharts';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../config/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import './FacultyFeature.css';

const FacultyQuizzes = () => {
    const { user } = useAuth();
    const [quizzes, setQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Dummy Chart Data
    const chartData = [
        { name: 'Mon', attempts: 40 },
        { name: 'Tue', attempts: 30 },
        { name: 'Wed', attempts: 60 },
        { name: 'Thu', attempts: 80 },
        { name: 'Fri', attempts: 50 },
        { name: 'Sat', attempts: 90 },
        { name: 'Sun', attempts: 120 },
    ];

    useEffect(() => {
        if (!user?.uid) return;

        const q = query(collection(db, 'quizzes'), where('facultyId', '==', user.uid));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Add some dummy data if empty to show the premium UI
            if (data.length === 0) {
                setQuizzes([
                    { id: '1', title: 'Database Normalization', subject: 'Database Systems', questions: 15, duration: 30, status: 'Active' },
                    { id: '2', title: 'OS Process Scheduling', subject: 'Operating Systems', questions: 20, duration: 45, status: 'Draft' },
                    { id: '3', title: 'Network Layers', subject: 'Computer Networks', questions: 10, duration: 15, status: 'Completed' },
                ]);
            } else {
                setQuizzes(data);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const handleCreateQuiz = async () => {
        // Placeholder for creating a quiz in Firebase
        alert("Create Quiz Modal will open here.");
    };

    const filteredQuizzes = quizzes.filter(q => q.title.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="faculty-feature-container">
            <div className="faculty-feature-header">
                <div>
                    <h1>Quiz Management</h1>
                    <p>Create and manage quizzes, questions, and view student analytics.</p>
                </div>
                <button className="primary-action-btn" onClick={handleCreateQuiz}>
                    <Plus size={18} /> Create New Quiz
                </button>
            </div>

            <div className="feature-stats-row">
                <div className="feature-stat-card border-purple">
                    <span className="stat-label">Total Quizzes</span>
                    <span className="stat-value">{quizzes.length}</span>
                </div>
                <div className="feature-stat-card border-green">
                    <span className="stat-label">Active Quizzes</span>
                    <span className="stat-value">{quizzes.filter(q => q.status === 'Active').length}</span>
                </div>
                <div className="feature-stat-card border-blue">
                    <span className="stat-label">Total Attempts</span>
                    <span className="stat-value">450</span>
                </div>
                <div className="feature-stat-card border-orange">
                    <span className="stat-label">Avg. Pass Rate</span>
                    <span className="stat-value">72%</span>
                </div>
            </div>

            {/* Analytics Chart */}
            <div className="glass-card mb-8">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">Quiz Attempts (Last 7 Days)</h3>
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorAttempts" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: 'rgba(30, 41, 59, 0.9)', border: 'none', borderRadius: '8px', color: '#fff' }}
                            />
                            <Area type="monotone" dataKey="attempts" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorAttempts)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Quizzes Table */}
            <div className="feature-table-wrapper">
                <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700/50">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Search quizzes..." 
                            className="pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 w-64"
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
                            <th>Quiz Title</th>
                            <th>Subject</th>
                            <th>Details</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="5" className="text-center py-8">Loading quizzes...</td></tr>
                        ) : filteredQuizzes.map(quiz => (
                            <tr key={quiz.id}>
                                <td className="font-semibold text-slate-800 dark:text-slate-200">
                                    <div className="flex items-center gap-3">
                                        <div className="icon-wrapper bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                                            <FileText size={18} />
                                        </div>
                                        {quiz.title}
                                    </div>
                                </td>
                                <td className="text-slate-600 dark:text-slate-400">{quiz.subject}</td>
                                <td className="text-slate-600 dark:text-slate-400">{quiz.questions || 0} Qs • {quiz.duration || 0} mins</td>
                                <td>
                                    <span className={`status-badge status-${(quiz.status || 'draft').toLowerCase()}`}>
                                        {quiz.status || 'Draft'}
                                    </span>
                                </td>
                                <td>
                                    <div className="table-actions">
                                        <button className="action-icon-btn edit" title="Edit Quiz"><Edit2 size={16} /></button>
                                        <button className="action-icon-btn analytics" title="View Analytics"><BarChart2 size={16} /></button>
                                        <button className="action-icon-btn settings" title="Quiz Settings"><Settings size={16} /></button>
                                        <button className="action-icon-btn delete" title="Delete Quiz"><Trash2 size={16} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredQuizzes.length === 0 && !loading && (
                            <tr><td colSpan="5" className="text-center py-8 text-slate-500">No quizzes found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default FacultyQuizzes;
