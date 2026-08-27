import { ArrowLeft, Info, GraduationCap, TrendingUp, Clock, Calendar, Users, MapPin, BookOpen } from 'lucide-react';
import { useState, useEffect } from 'react';
import { bulkUploadDb, db, attendanceDb } from '../config/firebase';
import { doc, getDoc, collection, query, where, getDocs, onSnapshot, collectionGroup } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import html2pdf from 'html2pdf.js';
import { formatAttendancePercent, normalizeAttendanceValue } from '../utils/formatUtils';
import './AttendanceDetail.css';

const AttendanceDetail = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [attendance, setAttendance] = useState(null);
    const [loading, setLoading] = useState(true);

    const handleShare = async () => {
        if (!attendance) return;
        const normalizedRate = normalizeAttendanceValue(attendance.consolidated);
        const text = `My Attendance Report\nName: ${attendance.name}\nAttendance: ${formatAttendancePercent(attendance.consolidated)}\nStatus: ${normalizedRate >= 75 ? 'Qualified' : 'Shortage'}`;
        
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Attendance Report',
                    text: text,
                    url: window.location.href
                });
            } catch (err) {
                console.log('Error sharing:', err);
            }
        } else {
            navigator.clipboard.writeText(text);
            alert('Report details copied to clipboard!');
        }
    };

    const handleDownload = () => {
        if (!attendance) return;
        
        const element = document.getElementById('pdf-report-template');
        if (!element) return;
        
        const opt = {
            margin: [0.5, 0.5],
            filename: `Attendance_Report_${attendance.studentId}.pdf`,
            image: { type: 'jpeg', quality: 1.0 },
            html2canvas: { 
                scale: 3,
                useCORS: true,
                letterRendering: true,
                windowWidth: 800,
                width: 794
            },
            jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
        };

        html2pdf().set(opt).from(element).outputPdf('blob').then(function(pdfBlob) {
            const blobUrl = URL.createObjectURL(pdfBlob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = `Attendance_Report_${attendance.studentId}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
        });
    };

    useEffect(() => {
        let unsubscribeLive = null;

        const fetchAttendance = async () => {
            if (!user?.studentId && !user?.uid) return;
            try {
                // 1. Fetch Subject-wise attendance from new system using onSnapshot for real-time
                const attendanceRef = collectionGroup(attendanceDb, 'records');
                
                // Query by student roll number (cleanId) since that's what faculty saves
                const cleanId = String(user.studentId || user.rollNo || user.uid).toUpperCase().replace(/\s+/g, '').replace(/^RGUKT-/i, '');
                const q = query(attendanceRef, where('studentId', '==', cleanId));
                
                unsubscribeLive = onSnapshot(q, async (snapshot) => {
                    if (!snapshot.empty) {
                        const records = snapshot.docs.map(d => d.data());
                        
                        const subjectMap = {};
                        records.forEach(r => {
                            if (!subjectMap[r.subjectId]) {
                                subjectMap[r.subjectId] = { present: 0, total: 0 };
                            }
                            subjectMap[r.subjectId].total += 1;
                            if (r.status === 'present') subjectMap[r.subjectId].present += 1;
                        });
                        
                        let totalP = 0;
                        let totalC = 0;
                        for (const sub in subjectMap) {
                            totalC += subjectMap[sub].total;
                            totalP += subjectMap[sub].present;
                        }
                        
                        setAttendance({
                            isSubjectWise: true,
                            subjectData: subjectMap,
                            consolidated: totalC > 0 ? (totalP / totalC) * 100 : 0,
                            totalConducted: totalC,
                            totalPresent: totalP,
                            className: `${records[0]?.year || ''} ${records[0]?.branch !== 'PUC' ? (records[0]?.branch || '') : ''} ${records[0]?.section ? 'Sec ' + records[0]?.section : ''}`.trim() || 'N/A',
                            campus: 'RGUKT',
                            group: records[0]?.branch || 'N/A',
                            gender: user.gender || 'N/A',
                            name: records[0]?.name || user.name || user.fullName || 'Student',
                            studentId: records[0]?.rollNo || user.studentId || user.uid,
                            updatedAt: new Date()
                        });
                        setLoading(false);
                    } else {
                        // 2. Fallback to legacy bulk upload system
                        if (user.studentId) {
                            const id = user.studentId.toUpperCase().replace(/^RGUKT-/i, '').trim();
                            const docSnap = await getDoc(doc(bulkUploadDb, 'attendance_rates', id));
                            if (docSnap.exists()) {
                                setAttendance(docSnap.data());
                            } else {
                                setAttendance(null);
                            }
                        } else {
                            setAttendance(null);
                        }
                        setLoading(false);
                    }
                });
            } catch (error) {
                console.error("Error fetching attendance details:", error);
                setLoading(false);
            }
        };

        fetchAttendance();
        
        return () => {
            if (unsubscribeLive) unsubscribeLive();
        };
    }, [user]);

    if (loading) {
        return (
            <div className="attendance-detail-loading">
                <div className="loader"></div>
                <p>Retrieving your attendance records...</p>
            </div>
        );
    }

    if (!attendance) {
        return (
            <div className="attendance-empty-state">
                <ArrowLeft className="back-btn" onClick={() => navigate(-1)} />
                <div className="empty-content">
                    <Info size={48} className="text-slate-300" />
                    <h2>No Records Found</h2>
                    <p>Your attendance data hasn't been uploaded yet by the administration.</p>
                    <button className="btn btn-primary" onClick={() => navigate(-1)}>Go Back</button>
                </div>
            </div>
        );
    }

    const { consolidated, totalConducted, totalPresent, className, campus, group, gender, name } = attendance;
    const normalizedConsolidated = normalizeAttendanceValue(consolidated);
    const absentCount = totalConducted - totalPresent;
    const attendanceColor = normalizedConsolidated >= 75 ? '#10b981' : normalizedConsolidated >= 65 ? '#f59e0b' : '#ef4444';

    return (
        <div className="attendance-detail-container animate-fade-in" id="attendance-report-content">
            <header className="detail-header-branded">
                <div className="branding-left">
                    <div className="logo-box">
                        <GraduationCap size={24} />
                    </div>
                    <div className="brand-info">
                        <h2 className="brand-name">RGUKT CONNECT</h2>
                        <p className="report-type">Attendance Report</p>
                    </div>
                </div>
                <div className="header-badge" style={{ backgroundColor: `${attendanceColor}20`, color: attendanceColor }}>
                    Official Record
                </div>
            </header>

            <div className="main-stats-grid">
                <div className="attendance-circle-card card">
                    <div className="progress-container">
                        <svg viewBox="0 0 100 100" className="progress-svg">
                            <circle className="progress-bg" cx="50" cy="50" r="45" />
                            <circle 
                                className="progress-bar" 
                                cx="50" cy="50" r="45" 
                                style={{ 
                                    strokeDasharray: '283',
                                    strokeDashoffset: 283 - (283 * normalizedConsolidated) / 100,
                                    stroke: attendanceColor
                                }} 
                            />
                        </svg>
                        <div className="progress-text">
                            <span className="percentage bungee-regular">{formatAttendancePercent(consolidated)}</span>
                            <span className="label">Consolidated</span>
                        </div>
                    </div>
                </div>

                <div className="info-cards-column">
                    <div className="mini-stat-card card">
                        <div className="icon-box bg-emerald-100 text-emerald-600">
                            <TrendingUp size={18} />
                        </div>
                        <div className="stat-content">
                            <span className="stat-value">{formatAttendancePercent(totalPresent)}</span>
                            <span className="stat-label">Classes Present</span>
                        </div>
                    </div>
                    <div className="mini-stat-card card">
                        <div className="icon-box bg-rose-100 text-rose-600">
                            <Clock size={18} />
                        </div>
                        <div className="stat-content">
                            <span className="stat-value">{formatAttendancePercent(absentCount)}</span>
                            <span className="stat-label">Classes Absent</span>
                        </div>
                    </div>
                    <div className="mini-stat-card card">
                        <div className="icon-box bg-blue-100 text-blue-600">
                            <Calendar size={18} />
                        </div>
                        <div className="stat-content">
                            <span className="stat-value">{formatAttendancePercent(totalConducted)}</span>
                            <span className="stat-label">Total Conducted</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="student-info-section card">
                <div className="section-title">
                    <Users size={18} />
                    <h2>Student Profile</h2>
                </div>
                <div className="info-grid">
                    <div className="info-item">
                        <span className="label">Full Name</span>
                        <span className="value">{name}</span>
                    </div>
                    <div className="info-item">
                        <span className="label">Student ID</span>
                        <span className="value">{attendance.studentId}</span>
                    </div>
                    <div className="info-item">
                        <span className="label">Gender</span>
                        <span className="value">{gender}</span>
                    </div>
                    <div className="info-item">
                        <span className="label">Group</span>
                        <span className="value">{group}</span>
                    </div>
                </div>
            </div>

            {/* Subject-Wise Attendance Breakdown */}
            {attendance.isSubjectWise && (
                <div className="subject-wise-section card" style={{ marginTop: '1.5rem' }}>
                    <div className="section-title">
                        <BookOpen size={18} />
                        <h2>Subject-wise Breakdown</h2>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {Object.entries(attendance.subjectData).map(([subject, stats]) => {
                            const percent = stats.total > 0 ? (stats.present / stats.total) * 100 : 0;
                            const color = percent >= 75 ? '#10b981' : percent >= 65 ? '#f59e0b' : '#ef4444';
                            
                            return (
                                <div key={subject} style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '12px', background: '#f8fafc' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <span style={{ fontWeight: '600', color: '#1e293b' }}>{subject}</span>
                                        <span style={{ fontWeight: '700', color: color }}>{percent.toFixed(1)}%</span>
                                    </div>
                                    <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden', marginBottom: '0.75rem' }}>
                                        <div style={{ height: '100%', width: `${percent}%`, background: color, transition: 'width 0.3s' }}></div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#64748b' }}>
                                        <span>Present: {stats.present}</span>
                                        <span>Total: {stats.total}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="academic-info-grid">
                <div className="info-box-styled card">
                    <div className="styled-icon">
                        <GraduationCap size={24} />
                    </div>
                    <div className="styled-content">
                        <span className="label">Class/Section</span>
                        <span className="value">{className}</span>
                    </div>
                </div>
                <div className="info-box-styled card">
                    <div className="styled-icon">
                        <MapPin size={24} />
                    </div>
                    <div className="styled-content">
                        <span className="label">Campus</span>
                        <span className="value">{campus}</span>
                    </div>
                </div>
            </div>

            <div className="attendance-footer-info">
                <div className="info-pill">
                    <Info size={14} />
                    <span>Minimum required attendance for exams is 75%</span>
                </div>
                <p className="update-ts">Last updated: {(attendance.updatedAt?.toDate ? attendance.updatedAt.toDate() : new Date(attendance.updatedAt)).toLocaleDateString()} at {(attendance.updatedAt?.toDate ? attendance.updatedAt.toDate() : new Date(attendance.updatedAt)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>

            {/* HIDDEN PDF TEMPLATE (Curvy Table Style) */}
            <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', width: '794px', zIndex: -1 }}>
                <div id="pdf-report-template" style={{ width: '794px', minHeight: '1123px', background: '#ffffff', padding: '25px 60px 50px 60px', color: '#0f172a', fontFamily: 'Arial, sans-serif', position: 'relative', boxSizing: 'border-box' }}>
                    
                    {/* HEADER */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: '40px', borderBottom: '2px solid #f1f5f9', paddingBottom: '20px' }}>
                        <h1 style={{ fontSize: '32px', fontWeight: '800', margin: '0 0 6px 0', color: '#1e3a8a', letterSpacing: '0.02em' }}>RGUKT CONNECT</h1>
                        <h2 style={{ fontSize: '15px', fontWeight: '600', margin: 0, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Student Attendance Report</h2>
                    </div>

                    {/* STUDENT DETAILS TABLE */}
                    <div style={{ marginBottom: '35px' }}>
                        <div style={{ fontSize: '14px', fontWeight: '800', marginBottom: '12px', color: '#1e3a8a', textTransform: 'uppercase', letterSpacing: '1px', borderLeft: '4px solid #3b82f6', paddingLeft: '10px', display: 'flex', alignItems: 'center', height: '18px' }}>Student Profile</div>
                        <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', backgroundColor: '#fff' }}>
                                <tbody>
                                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                        <th style={{ padding: '16px 20px', textAlign: 'left', width: '30%', backgroundColor: '#f8fafc', color: '#475569', fontWeight: '600', borderRight: '1px solid #e2e8f0' }}>Student ID</th>
                                        <td style={{ padding: '16px 20px', width: '70%', color: '#0f172a', fontWeight: '800', fontSize: '15px' }}>{attendance.studentId}</td>
                                    </tr>
                                    <tr>
                                        <th style={{ padding: '16px 20px', textAlign: 'left', backgroundColor: '#f8fafc', color: '#475569', fontWeight: '600', borderRight: '1px solid #e2e8f0' }}>Full Name</th>
                                        <td style={{ padding: '16px 20px', color: '#0f172a', fontWeight: '800', fontSize: '15px' }}>{name}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* OVERALL ATTENDANCE TABLE */}
                    <div style={{ marginBottom: '35px' }}>
                        <div style={{ fontSize: '14px', fontWeight: '800', marginBottom: '12px', color: '#1e3a8a', textTransform: 'uppercase', letterSpacing: '1px', borderLeft: '4px solid #3b82f6', paddingLeft: '10px', display: 'flex', alignItems: 'center', height: '18px' }}>Consolidated Overview</div>
                        <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', backgroundColor: '#fff' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#eff6ff', borderBottom: '1px solid #bfdbfe' }}>
                                        <th style={{ padding: '16px 20px', textAlign: 'center', color: '#1e40af', fontWeight: '700', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', borderRight: '1px solid #bfdbfe' }}>Conducted</th>
                                        <th style={{ padding: '16px 20px', textAlign: 'center', color: '#1e40af', fontWeight: '700', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', borderRight: '1px solid #bfdbfe' }}>Present</th>
                                        <th style={{ padding: '16px 20px', textAlign: 'center', color: '#1e40af', fontWeight: '700', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', borderRight: '1px solid #bfdbfe' }}>Absent</th>
                                        <th style={{ padding: '16px 20px', textAlign: 'center', color: '#1e3a8a', fontWeight: '800', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Overall %</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td style={{ padding: '18px 20px', textAlign: 'center', fontWeight: '600', color: '#334155', fontSize: '15px', borderRight: '1px solid #e2e8f0' }}>{totalConducted}</td>
                                        <td style={{ padding: '18px 20px', textAlign: 'center', color: '#059669', fontWeight: '800', fontSize: '15px', borderRight: '1px solid #e2e8f0' }}>{totalPresent}</td>
                                        <td style={{ padding: '18px 20px', textAlign: 'center', color: '#dc2626', fontWeight: '800', fontSize: '15px', borderRight: '1px solid #e2e8f0' }}>{absentCount}</td>
                                        <td style={{ padding: '18px 20px', textAlign: 'center', fontWeight: '800', fontSize: '18px', color: '#1e3a8a' }}>{formatAttendancePercent(consolidated)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* SUBJECT-WISE BREAKDOWN */}
                    {attendance.isSubjectWise && (
                        <div style={{ marginBottom: '40px' }}>
                            <div style={{ fontSize: '14px', fontWeight: '800', marginBottom: '12px', color: '#1e3a8a', textTransform: 'uppercase', letterSpacing: '1px', borderLeft: '4px solid #3b82f6', paddingLeft: '10px', display: 'flex', alignItems: 'center', height: '18px' }}>Subject-Wise Breakdown</div>
                            <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', backgroundColor: '#fff' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: '#eff6ff', borderBottom: '1px solid #bfdbfe' }}>
                                            <th style={{ padding: '14px 20px', textAlign: 'left', color: '#1e40af', fontWeight: '700', letterSpacing: '0.05em', borderRight: '1px solid #bfdbfe' }}>Subject Name</th>
                                            <th style={{ padding: '14px 20px', textAlign: 'center', color: '#1e40af', fontWeight: '700', letterSpacing: '0.05em', borderRight: '1px solid #bfdbfe' }}>Conducted</th>
                                            <th style={{ padding: '14px 20px', textAlign: 'center', color: '#1e40af', fontWeight: '700', letterSpacing: '0.05em', borderRight: '1px solid #bfdbfe' }}>Present</th>
                                            <th style={{ padding: '14px 20px', textAlign: 'center', color: '#1e40af', fontWeight: '700', letterSpacing: '0.05em', borderRight: '1px solid #bfdbfe' }}>Absent</th>
                                            <th style={{ padding: '14px 20px', textAlign: 'center', color: '#1e3a8a', fontWeight: '800', letterSpacing: '0.05em' }}>Percentage</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Object.entries(attendance.subjectData).map(([subject, stats], index, array) => {
                                            const percent = stats.total > 0 ? ((stats.present / stats.total) * 100).toFixed(1) : '0.0';
                                            const isLast = index === array.length - 1;
                                            return (
                                                <tr key={subject} style={{ borderBottom: isLast ? 'none' : '1px solid #f1f5f9' }}>
                                                    <td style={{ padding: '14px 20px', fontWeight: '600', color: '#334155', borderRight: '1px solid #e2e8f0' }}>{subject}</td>
                                                    <td style={{ padding: '14px 20px', textAlign: 'center', color: '#64748b', fontWeight: '500', borderRight: '1px solid #e2e8f0' }}>{stats.total}</td>
                                                    <td style={{ padding: '14px 20px', textAlign: 'center', color: '#059669', fontWeight: '700', borderRight: '1px solid #e2e8f0' }}>{stats.present}</td>
                                                    <td style={{ padding: '14px 20px', textAlign: 'center', color: '#dc2626', fontWeight: '700', borderRight: '1px solid #e2e8f0' }}>{stats.total - stats.present}</td>
                                                    <td style={{ padding: '14px 20px', textAlign: 'center', fontWeight: '800', color: '#0f172a' }}>{percent}%</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* FOOTER */}
                    <div style={{ position: 'absolute', bottom: '40px', left: '60px', right: '60px', borderTop: '2px solid #f1f5f9', paddingTop: '15px', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', fontWeight: '500' }}>
                        <span>Generated by RGUKT Connect</span>
                        <span>Date: {new Date().toLocaleDateString('en-GB')}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AttendanceDetail;
