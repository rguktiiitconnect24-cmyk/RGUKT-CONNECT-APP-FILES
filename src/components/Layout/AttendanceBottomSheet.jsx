import { X, User, GraduationCap, AlertCircle, Info, PieChart, Share2, Download, BookOpen } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { bulkUploadDb, db, attendanceDb } from '../../config/firebase';
import { doc, getDoc, collection, query, where, getDocs, collectionGroup } from 'firebase/firestore';
import { formatAttendancePercent, normalizeAttendanceValue } from '../../utils/formatUtils';
import './AttendanceBottomSheet.css';

const AttendanceBottomSheet = ({ isOpen, onClose, user }) => {
    const [attendance, setAttendance] = useState(null);
    const [loading, setLoading] = useState(false);
    const [shouldRender, setShouldRender] = useState(isOpen);
    const [isClosing, setIsClosing] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setShouldRender(true);
            setIsClosing(false);
            fetchAttendance();
        } else if (shouldRender) {
            setIsClosing(true);
            const timer = setTimeout(() => {
                setShouldRender(false);
                setIsClosing(false);
            }, 400);
            return () => clearTimeout(timer);
        }
    }, [isOpen, shouldRender]);

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
        
        const element = document.getElementById('pdf-report-template-sheet');
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

    const fetchAttendance = async () => {
        setLoading(true);
        if (!user?.studentId && !user?.uid) {
            setLoading(false);
            return;
        }
        try {
            // 1. New Live System
            const attendanceRef = collectionGroup(attendanceDb, 'records');
            const cleanId = String(user.studentId || user.rollNo || user.uid).toUpperCase().replace(/\s+/g, '').replace(/^RGUKT-/i, '');
            const q = query(attendanceRef, where('studentId', '==', cleanId));
            const snapshot = await getDocs(q);
            
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
                
                let totalP = 0, totalC = 0;
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
                return;
            }

            // 2. Legacy System Fallback
            if (user?.studentId) {
                const id = user.studentId.toUpperCase().replace(/^RGUKT-/i, '').trim();
                const docSnap = await getDoc(doc(bulkUploadDb, 'attendance_rates', id));
                if (docSnap.exists()) {
                    setAttendance(docSnap.data());
                } else {
                    setAttendance(null);
                }
            }
        } catch (error) {
            console.error("Error fetching attendance:", error);
        } finally {
            setLoading(false);
        }
    };

    if (!shouldRender) return null;

    const { consolidated = 0, totalConducted = 0, totalPresent = 0, className = 'N/A', campus = 'N/A', group = 'N/A', gender = 'N/A', name = 'N/A', studentId = 'N/A', updatedAt } = attendance || {};
    const normalizedConsolidated = normalizeAttendanceValue(consolidated);
    const absentCount = totalConducted - totalPresent;
    const attendanceColor = normalizedConsolidated >= 75 ? '#10b981' : normalizedConsolidated >= 65 ? '#f59e0b' : '#ef4444';

    const sheetContent = (
        <div className={`attendance-sheet-overlay ${isClosing ? 'is-closing' : ''}`} onClick={onClose}>
            <div 
                className={`attendance-sheet-content ${isClosing ? 'animate-slide-down' : 'animate-slide-up'}`} 
                onClick={e => e.stopPropagation()}
            >
                <div className="attendance-sheet-grabber"></div>
                
                <header className="attendance-sheet-header">
                    <div className="header-title-box">
                        <div className="icon-circle">
                            <PieChart size={20} />
                        </div>
                        <div className="text-box">
                            <h3>Full Attendance Report</h3>
                            <p>Official records from university portal</p>
                        </div>
                    </div>
                    <button className="close-circle-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </header>

                <div className="attendance-sheet-body">
                    {loading ? (
                        <div className="sheet-loading-state">
                            <div className="sheet-loader"></div>
                            <p>Fetching your records...</p>
                        </div>
                    ) : attendance ? (
                        <div className="sheet-data-container animate-fade-in">
                            {/* Main Progress Card */}
                            <div className="sheet-main-card" style={{ '--accent-color': attendanceColor }}>
                                <div className="circular-progress-box">
                                    <svg viewBox="0 0 100 100">
                                        <circle className="bg" cx="50" cy="50" r="45" />
                                        <circle 
                                            className="progress" 
                                            cx="50" cy="50" r="45" 
                                            style={{ 
                                                strokeDasharray: '283',
                                                strokeDashoffset: 283 - (283 * normalizedConsolidated) / 100,
                                                stroke: attendanceColor
                                            }} 
                                        />
                                    </svg>
                                    <div className="progress-value-box">
                                        <span className="value bungee-regular">{formatAttendancePercent(consolidated)}</span>
                                        <span className="label">Consolidated</span>
                                    </div>
                                </div>

                                <div className="quick-stats-grid">
                                    <div className="q-stat">
                                        <span className="q-val">{formatAttendancePercent(totalPresent)}</span>
                                        <span className="q-lab">Present</span>
                                    </div>
                                    <div className="q-divider"></div>
                                    <div className="q-stat">
                                        <span className="q-val">{formatAttendancePercent(absentCount)}</span>
                                        <span className="q-lab">Absent</span>
                                    </div>
                                    <div className="q-divider"></div>
                                    <div className="q-stat">
                                        <span className="q-val">{formatAttendancePercent(totalConducted)}</span>
                                        <span className="q-lab">Total</span>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Action Buttons */}
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', marginBottom: '0.5rem' }}>
                                <button onClick={handleDownload} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem', background: '#3b82f6', color: 'white', borderRadius: '12px', fontWeight: '600', fontSize: '0.85rem' }}>
                                    <Download size={16} /> Download Report
                                </button>
                                <button onClick={handleShare} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem', background: '#f1f5f9', color: '#475569', borderRadius: '12px', fontWeight: '600', fontSize: '0.85rem' }}>
                                    <Share2 size={16} /> Share
                                </button>
                            </div>
                            
                            {/* Subject-Wise Attendance Breakdown */}
                            {attendance.isSubjectWise && (
                                <div className="sheet-section subject-wise-section" style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
                                    <div className="section-title">
                                        <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6' }}></div>
                                        </div>
                                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Subject Breakdown</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        {Object.entries(attendance.subjectData).map(([subject, stats]) => {
                                            const percent = stats.total > 0 ? (stats.present / stats.total) * 100 : 0;
                                            const color = percent >= 75 ? '#10b981' : percent >= 65 ? '#f59e0b' : '#ef4444';
                                            
                                            return (
                                                <div key={subject} style={{ padding: '0.85rem', border: '1px solid #e2e8f0', borderRadius: '12px', background: '#f8fafc' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', alignItems: 'center' }}>
                                                        <span style={{ fontWeight: '600', color: '#1e293b', fontSize: '0.85rem' }}>{subject}</span>
                                                        <span style={{ fontWeight: '700', color: color, fontSize: '0.85rem' }}>{percent.toFixed(1)}%</span>
                                                    </div>
                                                    <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden', marginBottom: '0.5rem' }}>
                                                        <div style={{ height: '100%', width: `${percent}%`, background: color, transition: 'width 0.3s' }}></div>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b' }}>
                                                        <span>Present: {stats.present}</span>
                                                        <span>Total: {stats.total}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}


                            {/* Footer Status & Update Time */}
                            <div className="sheet-footer-box">
                                <div className="sheet-footer-notice" style={{ backgroundColor: `${attendanceColor}10`, color: attendanceColor }}>
                                    <AlertCircle size={14} />
                                    <span>{normalizedConsolidated >= 75 ? 'Qualified for semester examinations.' : 'Shortage of attendance detected.'}</span>
                                </div>
                                {updatedAt && (
                                    <p className="sheet-update-ts">
                                        Last updated: {(updatedAt.toDate ? updatedAt.toDate() : new Date(updatedAt)).toLocaleDateString()} at {(updatedAt.toDate ? updatedAt.toDate() : new Date(updatedAt)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="sheet-empty-state">
                            <Info size={40} opacity={0.3} />
                            <p>No attendance records found for your ID.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* HIDDEN PDF TEMPLATE (Curvy Table Style) */}
            {/* HIDDEN PDF TEMPLATE (Curvy Table Style) */}
            {attendance && (
                <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', width: '794px', zIndex: -1 }}>
                    <div id="pdf-report-template-sheet" style={{ width: '794px', minHeight: '1123px', background: '#ffffff', padding: '25px 60px 50px 60px', color: '#0f172a', fontFamily: 'Arial, sans-serif', position: 'relative', boxSizing: 'border-box' }}>
                        
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
                                            <td style={{ padding: '16px 20px', width: '70%', color: '#0f172a', fontWeight: '800', fontSize: '15px' }}>{studentId}</td>
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
            )}
        </div>
    );

    return createPortal(sheetContent, document.body);
};

export default AttendanceBottomSheet;
