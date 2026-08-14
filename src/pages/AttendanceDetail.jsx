import { ArrowLeft, Info, GraduationCap, TrendingUp, Clock, Calendar, Users, MapPin } from 'lucide-react';
import { useState, useEffect } from 'react';
import { bulkUploadDb } from '../config/firebase';
import { doc, getDoc } from 'firebase/firestore';
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
        // Temporarily show for capture, but keep it off-screen
        element.style.display = 'block';
        
        const opt = {
            margin: [0.5, 0.5],
            filename: `Attendance_Report_${attendance.studentId}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { 
                scale: 3, // Higher scale for premium look
                useCORS: true,
                letterRendering: true
            },
            jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
        };

        html2pdf().set(opt).from(element).save().then(() => {
            element.style.display = 'none';
        });
    };

    useEffect(() => {
        const fetchAttendance = async () => {
            if (!user?.studentId) return;
            try {
                const id = user.studentId.toUpperCase().replace(/^RGUKT-/i, '').trim();
                const docSnap = await getDoc(doc(bulkUploadDb, 'attendance_rates', id));
                if (docSnap.exists()) {
                    setAttendance(docSnap.data());
                }
            } catch (error) {
                console.error("Error fetching attendance details:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchAttendance();
    }, [user?.studentId]);

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
                <p className="update-ts">Last updated: {attendance.updatedAt?.toDate().toLocaleDateString()} at {attendance.updatedAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>

            {/* HIDDEN PDF TEMPLATE (University Transcript Style) */}
            <div id="pdf-report-template" style={{ display: 'none', width: '794px', minHeight: '1123px', background: 'white', padding: '50px 60px', color: '#1f2a44', fontFamily: 'Helvetica, Arial, sans-serif' }}>
                {/* 1. HEADER */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingBottom: '10px' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '32px', height: '32px', backgroundColor: '#1f2a44', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                                <GraduationCap size={20} />
                            </div>
                            <h2 style={{ fontSize: '15px', fontWeight: '800', margin: 0, letterSpacing: '0.05em' }}>RGUKT CONNECT</h2>
                        </div>
                        <p style={{ fontSize: '10px', color: '#6b7280', margin: '4px 0 0 0', fontWeight: '500' }}>LEARN.CONNECT.ACHIEVE</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '8px', fontWeight: '800', padding: '2px 8px', border: '1.5px solid #1f2a44', display: 'inline-block', marginBottom: '8px', borderRadius: '2px' }}>
                            OFFICIAL RECORD
                        </div>
                        <p style={{ fontSize: '9px', color: '#6b7280', margin: 0 }}>Generated on: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                        <p style={{ fontSize: '9px', color: '#6b7280', margin: 0 }}>Time: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                </div>
                <div style={{ height: '1.5px', backgroundColor: '#1f2a44', width: '100%', marginBottom: '40px' }}></div>

                {/* 2. TITLE SECTION */}
                <div style={{ marginBottom: '50px' }}>
                    <h1 style={{ fontSize: '20px', fontWeight: '800', margin: '0 0 5px 0', letterSpacing: '0.1em' }}>ATTENDANCE REPORT</h1>
                    <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>Student Attendance Summary</p>
                </div>

                {/* 3. MAIN ATTENDANCE HIGHLIGHT */}
                <div style={{ textAlign: 'center', marginBottom: '60px' }}>
                    <h2 style={{ fontSize: '80px', fontWeight: '800', margin: 0, lineHeight: 1 }}>{formatAttendancePercent(consolidated)}</h2>
                    <p style={{ fontSize: '11px', fontWeight: '600', color: '#6b7280', marginTop: '15px', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Overall Attendance</p>
                    <div style={{ width: '120px', height: '1px', backgroundColor: '#f59e0b', margin: '20px auto 0' }}></div>
                </div>

                {/* 4. STATISTICS TABLE */}
                <div style={{ marginBottom: '60px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead>
                            <tr style={{ borderBottom: '1.5px solid #1f2a44' }}>
                                <th style={{ textAlign: 'left', padding: '12px 0', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Metric</th>
                                <th style={{ textAlign: 'right', padding: '12px 0', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                                <td style={{ padding: '12px 0', color: '#4b5563' }}>Classes Present</td>
                                <td style={{ textAlign: 'right', padding: '12px 0', fontWeight: '700' }}>{formatAttendancePercent(totalPresent)}</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                                <td style={{ padding: '12px 0', color: '#4b5563' }}>Classes Absent</td>
                                <td style={{ textAlign: 'right', padding: '12px 0', fontWeight: '700' }}>{formatAttendancePercent(absentCount)}</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                                <td style={{ padding: '12px 0', color: '#4b5563' }}>Total Classes Conducted</td>
                                <td style={{ textAlign: 'right', padding: '12px 0', fontWeight: '700' }}>{formatAttendancePercent(totalConducted)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* 5. STUDENT INFORMATION */}
                <div style={{ marginBottom: '60px' }}>
                    <h3 style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '20px', color: '#1f2a44' }}>Student Information</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '50px' }}>
                        <table style={{ borderCollapse: 'collapse', fontSize: '12px' }}>
                            <tbody>
                                <tr>
                                    <td style={{ color: '#6b7280', padding: '6px 0', width: '100px' }}>Full Name</td>
                                    <td style={{ color: '#6b7280', width: '20px' }}>:</td>
                                    <td style={{ fontWeight: '700', padding: '6px 0' }}>{name}</td>
                                </tr>
                                <tr>
                                    <td style={{ color: '#6b7280', padding: '6px 0' }}>Gender</td>
                                    <td style={{ color: '#6b7280' }}>:</td>
                                    <td style={{ fontWeight: '700', padding: '6px 0' }}>{gender || 'N/A'}</td>
                                </tr>
                                <tr>
                                    <td style={{ color: '#6b7280', padding: '6px 0' }}>Class / Section</td>
                                    <td style={{ color: '#6b7280' }}>:</td>
                                    <td style={{ fontWeight: '700', padding: '6px 0' }}>{className}</td>
                                </tr>
                            </tbody>
                        </table>
                        <table style={{ borderCollapse: 'collapse', fontSize: '12px' }}>
                            <tbody>
                                <tr>
                                    <td style={{ color: '#6b7280', padding: '6px 0', width: '100px' }}>Student ID</td>
                                    <td style={{ color: '#6b7280', width: '20px' }}>:</td>
                                    <td style={{ fontWeight: '700', padding: '6px 0' }}>{attendance.studentId}</td>
                                </tr>
                                <tr>
                                    <td style={{ color: '#6b7280', padding: '6px 0' }}>Group</td>
                                    <td style={{ color: '#6b7280' }}>:</td>
                                    <td style={{ fontWeight: '700', padding: '6px 0' }}>{group}</td>
                                </tr>
                                <tr>
                                    <td style={{ color: '#6b7280', padding: '6px 0' }}>Campus</td>
                                    <td style={{ color: '#6b7280' }}>:</td>
                                    <td style={{ fontWeight: '700', padding: '6px 0' }}>{campus}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 6. STATUS */}
                <div style={{ marginBottom: '100px' }}>
                    <p style={{ fontSize: '12px', fontWeight: '800', margin: '0 0 4px 0' }}>
                        Status: <span style={{ color: normalizedConsolidated >= 75 ? '#059669' : '#dc2626' }}>{normalizedConsolidated >= 75 ? 'GOOD STANDING' : 'LOW ATTENDANCE'}</span>
                    </p>
                    <p style={{ fontSize: '10px', color: '#6b7280' }}>Minimum required attendance is 75%</p>
                </div>

                {/* 7. FOOTER */}
                <div style={{ marginTop: 'auto' }}>
                    <div style={{ height: '1px', backgroundColor: '#e5e7eb', width: '100%', marginBottom: '15px' }}></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#6b7280', fontWeight: '500' }}>
                        <span>RGUKT Connect – Official Student Record</span>
                        <span>support@rguktconnect.com</span>
                        <span>Page 1 of 1</span>
                    </div>
                    <p style={{ fontSize: '9px', color: '#9ca3af', textAlign: 'center', marginTop: '15px' }}>This is a system-generated document and does not require a physical signature.</p>
                </div>
            </div>
        </div>
    );
};

export default AttendanceDetail;
