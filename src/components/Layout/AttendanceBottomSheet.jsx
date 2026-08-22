import { X, User, GraduationCap, AlertCircle, Info, PieChart, Share2, Download } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { bulkUploadDb, db } from '../../config/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
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
        
        // Temporarily show for capture, but keep it off-screen
        element.style.display = 'block';
        
        const opt = {
            margin: [0.5, 0.5],
            filename: `Attendance_Report_${attendance.studentId}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { 
                scale: 3,
                useCORS: true,
                letterRendering: true
            },
            jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
        };

        html2pdf().set(opt).from(element).save().then(() => {
            element.style.display = 'none';
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
            const attendanceRef = collection(db, 'attendance');
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
        </div>
    );

    return createPortal(sheetContent, document.body);
};

export default AttendanceBottomSheet;
