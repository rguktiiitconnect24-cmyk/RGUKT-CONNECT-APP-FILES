import { Users, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { bulkUploadDb } from '../config/firebase';
import { collection, query, getDocs, orderBy, limit, startAfter, where } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { formatAttendancePercent, normalizeAttendanceValue } from '../utils/formatUtils';
import './AttendanceList.css';

const AttendanceList = () => {
    const navigate = useNavigate();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [lastDoc, setLastDoc] = useState(null);
    const [firstDoc, setFirstDoc] = useState(null);
    const [totalCount, setTotalCount] = useState(0);
    const PAGE_SIZE = 50;

    const fetchStudents = async (direction = 'next') => {
        setLoading(true);
        try {
            const attendanceRef = collection(bulkUploadDb, 'attendance_rates');
            let q;

            if (direction === 'next' && lastDoc) {
                q = query(attendanceRef, orderBy('studentId'), startAfter(lastDoc), limit(PAGE_SIZE));
            } else {
                q = query(attendanceRef, orderBy('studentId'), limit(PAGE_SIZE));
            }

            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            setStudents(data);
            setFirstDoc(snapshot.docs[0]);
            setLastDoc(snapshot.docs[snapshot.docs.length - 1]);

            // Simple count estimation (one-time or cached)
            if (page === 1) {
                const totalSnap = await getDocs(query(attendanceRef, limit(1000))); // Rough estimate for UI
                setTotalCount(totalSnap.size);
            }
        } catch (error) {
            console.error("Error fetching attendance list:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStudents();
    }, []);

    const handleSearch = async () => {
        if (!searchTerm) {
            setPage(1);
            fetchStudents();
            return;
        }

        setLoading(true);
        try {
            const attendanceRef = collection(bulkUploadDb, 'attendance_rates');
            // Search by student ID (exact or prefix)
            const q = query(
                attendanceRef, 
                where('studentId', '>=', searchTerm.toUpperCase()), 
                where('studentId', '<=', searchTerm.toUpperCase() + '\uf8ff'),
                limit(PAGE_SIZE)
            );
            const snapshot = await getDocs(q);
            setStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) {
            console.error("Search error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleNextPage = () => {
        setPage(prev => prev + 1);
        fetchStudents('next');
    };

    const handlePrevPage = () => {
        if (page === 1) return;
        setPage(1); // Simplification: back to start for now as Firestore pagination is tricky backwards
        fetchStudents();
    };

    const getStatusColor = (rawRate) => {
        const rate = normalizeAttendanceValue(rawRate);
        if (rate >= 75) return 'status-good';
        if (rate >= 65) return 'status-warning';
        return 'status-danger';
    };

    return (
        <div className="attendance-list-container animate-fade-in">
            <header className="list-header">
                <div className="header-info">
                    <h1>Consolidated Attendance</h1>
                    <p>Live attendance records for all students</p>
                </div>
                <div className="stats-mini">
                    <div className="stat-pill">
                        <Users size={14} />
                        <span>{totalCount > 999 ? '1000+' : totalCount} Students</span>
                    </div>
                </div>
            </header>

            <div className="controls-bar card">
                <div className="search-box">
                    <Search size={18} className="search-icon" />
                    <input 
                        type="text" 
                        placeholder="Search Student ID (e.g. R240356)" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <button className="btn-search" onClick={handleSearch}>Search</button>
                </div>
            </div>

            <div className="table-wrapper card">
                <div className="table-responsive">
                    <table className="attendance-table">
                        <thead>
                            <tr>
                                <th>Student ID</th>
                                <th>Name</th>
                                <th>Class</th>
                                <th>Group</th>
                                <th className="text-center">Cnd</th>
                                <th className="text-center">Prs</th>
                                <th className="text-center">% Rate</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="skeleton-row">
                                        <td colSpan="7"><div className="skeleton-line"></div></td>
                                    </tr>
                                ))
                            ) : students.length > 0 ? (
                                students.map((s) => (
                                    <tr key={s.id} onClick={() => navigate(`/attendance?id=${s.studentId}`)}>
                                        <td className="font-bold text-primary-600">{s.studentId}</td>
                                        <td>
                                            <div className="student-name-cell">
                                                <span>{s.name}</span>
                                                <span className="gender-tag">{s.gender}</span>
                                            </div>
                                        </td>
                                        <td>{s.className}</td>
                                        <td>{s.group}</td>
                                        <td className="text-center font-semibold">{formatAttendancePercent(s.totalConducted)}</td>
                                        <td className="text-center font-semibold">{formatAttendancePercent(s.totalPresent)}</td>
                                        <td className="text-center">
                                            <span className={`rate-badge ${getStatusColor(s.consolidated)}`}>
                                                {formatAttendancePercent(s.consolidated)}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7" className="empty-row">No students found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="pagination-footer">
                    <div className="pagination-info">
                        Showing {students.length} students (Page {page})
                    </div>
                    <div className="pagination-btns">
                        <button 
                            className="btn-icon" 
                            disabled={page === 1 || loading} 
                            onClick={handlePrevPage}
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <button 
                            className="btn-icon" 
                            disabled={students.length < PAGE_SIZE || loading} 
                            onClick={handleNextPage}
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AttendanceList;
