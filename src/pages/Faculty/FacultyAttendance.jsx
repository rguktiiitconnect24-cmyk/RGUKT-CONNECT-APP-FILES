import { UserCheck, Search, Filter, Download } from 'lucide-react';
import { Bar } from 'recharts';
import { Tooltip } from 'recharts';
import { YAxis } from 'recharts';
import { XAxis } from 'recharts';
import { CartesianGrid } from 'recharts';
import { BarChart } from 'recharts';
import { ResponsiveContainer } from 'recharts';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../config/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import './FacultyFeature.css';

const FacultyAttendance = () => {
    const { user } = useAuth();
    const [attendanceLogs, setAttendanceLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Dummy Chart Data
    const chartData = [
        { name: 'Mon', present: 110, absent: 10 },
        { name: 'Tue', present: 115, absent: 5 },
        { name: 'Wed', present: 105, absent: 15 },
        { name: 'Thu', present: 118, absent: 2 },
        { name: 'Fri', present: 112, absent: 8 },
    ];

    // Dummy Roster for UI Demonstration
    const [roster, setRoster] = useState([
        { id: '1', name: 'John Doe', rollNo: 'CSE2023001', status: 'present' },
        { id: '2', name: 'Jane Smith', rollNo: 'CSE2023002', status: 'absent' },
        { id: '3', name: 'Alice Johnson', rollNo: 'CSE2023003', status: 'present' },
        { id: '4', name: 'Bob Williams', rollNo: 'CSE2023004', status: 'present' },
    ]);

    useEffect(() => {
        if (!user?.uid) return;

        const q = query(collection(db, 'attendance'), where('facultyId', '==', user.uid));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setAttendanceLogs(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const handleMarkAttendance = () => {
        alert("Mark Attendance Modal will open here.");
    };

    const toggleStudentStatus = (id) => {
        setRoster(prev => prev.map(student => 
            student.id === id ? { ...student, status: student.status === 'present' ? 'absent' : 'present' } : student
        ));
    };

    const filteredRoster = roster.filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase()) || r.rollNo.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="faculty-feature-container">
            <div className="faculty-feature-header">
                <div>
                    <h1>Attendance Management</h1>
                    <p>Mark attendance, view trends, and generate reports.</p>
                </div>
                <button className="primary-action-btn" onClick={handleMarkAttendance}>
                    <UserCheck size={18} /> Mark Today's Attendance
                </button>
            </div>

            <div className="feature-stats-row">
                <div className="feature-stat-card border-green">
                    <span className="stat-label">Present Today</span>
                    <span className="stat-value text-green-600">110</span>
                </div>
                <div className="feature-stat-card border-orange">
                    <span className="stat-label">Absent Today</span>
                    <span className="stat-value text-orange-500">10</span>
                </div>
                <div className="feature-stat-card border-blue">
                    <span className="stat-label">Total Students</span>
                    <span className="stat-value">120</span>
                </div>
                <div className="feature-stat-card border-purple">
                    <span className="stat-label">Monthly Average</span>
                    <span className="stat-value">92%</span>
                </div>
            </div>

            {/* Analytics Chart */}
            <div className="glass-card mb-8">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">Weekly Attendance Trends</h3>
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: 'rgba(30, 41, 59, 0.9)', border: 'none', borderRadius: '8px', color: '#fff' }}
                                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                            />
                            <Bar dataKey="present" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
                            <Bar dataKey="absent" stackId="a" fill="#f97316" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Interactive Attendance Roster */}
            <div className="feature-table-wrapper">
                <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700/50 flex-wrap gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Search student..." 
                            className="pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-green-500 w-64"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2">
                        <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                            <Filter size={18} /> Subject
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                            <Download size={18} /> Export
                        </button>
                    </div>
                </div>
                <table className="feature-table">
                    <thead>
                        <tr>
                            <th>Student ID</th>
                            <th>Name</th>
                            <th>Today's Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredRoster.map(student => (
                            <tr key={student.id}>
                                <td className="text-slate-600 dark:text-slate-400 font-mono text-sm">{student.rollNo}</td>
                                <td className="font-semibold text-slate-800 dark:text-slate-200">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">
                                            {student.name.charAt(0)}
                                        </div>
                                        {student.name}
                                    </div>
                                </td>
                                <td>
                                    <span className={`status-badge status-${student.status === 'present' ? 'active' : 'pending'}`}>
                                        {student.status === 'present' ? 'Present' : 'Absent'}
                                    </span>
                                </td>
                                <td>
                                    <button 
                                        onClick={() => toggleStudentStatus(student.id)}
                                        className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                                            student.status === 'present' 
                                            ? 'bg-orange-100 text-orange-600 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400' 
                                            : 'bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
                                        }`}
                                    >
                                        Mark {student.status === 'present' ? 'Absent' : 'Present'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default FacultyAttendance;
