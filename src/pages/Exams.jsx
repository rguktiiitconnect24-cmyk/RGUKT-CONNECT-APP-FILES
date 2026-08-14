import LoadingTransition from '../components/Common/LoadingTransition';
import React from 'react';
import { FileText, GraduationCap, ClipboardList, Zap, Search, Loader2, MapPin, UserIcon, Share2, Download, Bookmark, Calendar, AlertCircle } from 'lucide-react';
import html2pdf from 'html2pdf.js/dist/html2pdf.bundle.min.js';
import { Capacitor } from '@capacitor/core';
import { FileDownload } from '../services/nativeFileService';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share as CapacitorShare } from '@capacitor/share';
import { useDownload } from '../context/DownloadContext';
import { useAuth } from '../context/AuthContext';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, bulkUploadDb } from '../config/firebase';
import './Exams.css';
import { syncSeatingToWidget } from '../services/widgetService';

const EXAM_TYPE_META = {
    semester: { badge: 'SEM', label: 'Semester Exam',  color: '#a855f7', bg: 'rgba(168,85,247,0.12)', border: '#a855f7', icon: GraduationCap },
    mid:      { badge: 'MID', label: 'Mid-term Exam',  color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  border: '#3b82f6', icon: FileText },
    supply:   { badge: 'SUP', label: 'Supply / Re-exam', color: '#f97316', bg: 'rgba(249,115,22,0.12)', border: '#f97316', icon: Zap },
    others:   { badge: 'REG', label: 'Regular',        color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: '#10b981', icon: ClipboardList },
};

const LOGO_DATA_URI = `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgdmlld0JveD0iMCAwIDUxMiA1MTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPHJlY3Qgd2lkdGg9IjUxMiIgaGVpZ2h0PSI1MTIiIHJ4PSIxMjgiIGZpbGw9InVybCgjcGFpbnQwX2xpbmVhcikiLz4KICA8cGF0aCBkPSJNMjU2IDEyMEw2NCAyMTBMMjU2IDMwMEw0NDggMjEwTDI1NiAxMjBaIiBmaWxsPSJ3aGl0ZSIvPgogIDxwYXRoIGQ9Ik0xMjggMjQwVjMyMEMxMjggMzIwIDE4MCAzNzAgMjU2IDM3MEMzMzIgMzcwIDM4NCAzMjAgMzg0IDMyMFYyNDBMMjU2IDMwMEwxMjggMjQwWiIgZmlsbD0id2hpdGUiLz4KICA8cGF0aCBkPSJNNDE2IDIxMFYzNDAiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMjAiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgogIDxjaXJjbGUgY3g9IjQxNiIgY3k9IjM1MCIgcj0iMTUiIGZpbGw9IndoaGl0ZSIvPgogIDxkZWZzPgogICAgPGxpbmVhckdyYWRpZW50IGlkPSJwYWludDBfbGluZWFyIiB4MT0iMCIgeTE9IjAiIHgyPSI1MTIiIHkyPSI1MTIiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIj4KICAgICAgPHN0b3Agc3RvcC1jb2xvcj0iIzRmNDZlNSIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiMzNzMwYTMiLz4KICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgPC9kZWZzPgo8L3N2Zz4=`;

const Exams = () => {
    const { user } = useAuth();
    const [examSchedules, setExamSchedules] = React.useState([]);
    const [seatingData, setSeatingData] = React.useState([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [sharingId, setSharingId] = React.useState(null);
    const [examDownloadStatuses, setExamDownloadStatuses] = React.useState({});
    
    // Seating Search State - Initialized from localStorage for persistence
    const [seatingSearchId, setSeatingSearchId] = React.useState('');
    const [seatingResults, setSeatingResults] = React.useState([]);
    const [hasSearched, setHasSearched] = React.useState(false);

    React.useEffect(() => {
        // Load heavy cache data asynchronously after initial paint
        setTimeout(() => {
            try {
                const cachedExams = localStorage.getItem('exam_schedules_cache');
                if (cachedExams) setExamSchedules(JSON.parse(cachedExams));
                
                const cachedSeating = localStorage.getItem('seating_data_cache');
                if (cachedSeating) setSeatingData(JSON.parse(cachedSeating));

                const lastSearch = localStorage.getItem('last_seating_search_id');
                if (lastSearch) setSeatingSearchId(lastSearch);

                const lastResults = localStorage.getItem('last_seating_results');
                if (lastResults) setSeatingResults(JSON.parse(lastResults));

                const hasSearchedStr = localStorage.getItem('last_seating_has_searched');
                if (hasSearchedStr === 'true') setHasSearched(true);
                
                if (cachedExams) setIsLoading(false);
            } catch(e) {
                console.error("Cache parsing error", e);
            }
        }, 50);
    }, []);
    const { startDownload, startShare, notify } = useDownload();
    const [isAutoDetect, setIsAutoDetect] = React.useState(localStorage.getItem('seatingAutoDetect') !== 'false');
    const [autoSearchState, setAutoSearchState] = React.useState({ active: false, step: 0 }); // 0: Idle, 1: ID, 2: Position
    const [isManualSearching, setIsManualSearching] = React.useState(false);
    const [isSeatingVisible, setIsSeatingVisible] = React.useState(true);

    React.useEffect(() => {
        // Initial load happens in useState. Just setup listeners.

        // Real-time listener for Exam Schedules
        const unsubSchedules = onSnapshot(doc(db, 'settings', 'exam_schedule'), (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                let schedules = [];
                if (data.schedules && Array.isArray(data.schedules)) {
                    const userDept = user?.department || user?.branch || 'all';
                    schedules = data.schedules.filter(s => {
                        if (!s.isVisible || !s.exams?.length) return false;
                        if (s.department && s.department !== 'all') {
                            if (userDept && userDept.toUpperCase() !== s.department.toUpperCase()) {
                                return false;
                            }
                        }
                        return true;
                    });
                } else if (data.exams && data.isVisible) {
                    schedules = [{ type: 'semester', title: data.title || 'Examinations Schedule', subtitle: data.subtitle || '', exams: data.exams }];
                }
                setExamSchedules(schedules);
                localStorage.setItem('exam_schedules_cache', JSON.stringify(schedules));
            } else {
                setExamSchedules([]);
                localStorage.removeItem('exam_schedules_cache');
            }
            setIsLoading(false);
        }, (err) => {
            console.error('Schedules listener error:', err);
            setIsLoading(false);
        });

        // Real-time listener for Seating Data
        const unsubSeating = onSnapshot(doc(bulkUploadDb, 'settings', 'seating_data'), (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                setSeatingData(data.data || []);
                setIsSeatingVisible(data.isVisible === true);
                localStorage.setItem('seating_data_cache', JSON.stringify(data.data || []));
            } else {
                setSeatingData([]);
                setIsSeatingVisible(false);
                localStorage.removeItem('seating_data_cache');
            }
        }, (err) => {
            console.error('Seating listener error:', err);
        });

        return () => {
            unsubSchedules();
            unsubSeating();
        };
    }, [user]);

    const handleSearchSeating = async (searchId, isAuto = false) => {
        if (!searchId || searchId.trim() === '') {
            setSeatingResults([]);
            setHasSearched(!isAuto);
            return;
        }

        if (isAuto) {
            setAutoSearchState({ active: true, step: 1 });
            await new Promise(r => setTimeout(r, 500)); // Simulating ID identification
            setAutoSearchState({ active: true, step: 2 });
            await new Promise(r => setTimeout(r, 1000)); // Simulating Positioning
            setAutoSearchState({ active: false, step: 0 });
        } else {
            setIsManualSearching(true);
            setHasSearched(false);
            await new Promise(r => setTimeout(r, 1000)); // 1s Manual search simulation
            setIsManualSearching(false);
            setHasSearched(true);
        }

        const query = searchId.trim().toUpperCase();
        
        // Exact match or contains for ID
        const results = seatingData.filter(item => 
            item['ID No.'] && 
            (item['ID No.'].toUpperCase() === query || item['ID No.'].toUpperCase().includes(query))
        );
        
        setSeatingResults(results);
        const didSearchWork = results.length > 0 || !isAuto;
        setHasSearched(didSearchWork);

        // PERSIST SEARCH STATE
        localStorage.setItem('last_seating_search_id', searchId);
        localStorage.setItem('last_seating_results', JSON.stringify(results));
        localStorage.setItem('last_seating_has_searched', didSearchWork.toString());


        // Sync the first result to Android Widget if on native platform and visible
        if (results.length > 0 && isSeatingVisible && Capacitor.isNativePlatform()) {
            syncSeatingToWidget(results[0]);
        }
    };

    // Effect for Auto-Detection - only runs if we don't already have results and it's visible
    React.useEffect(() => {
        // Only auto-detect on mount if results are empty, enabled, and visible
        if (isSeatingVisible && isAutoDetect && user && seatingData.length > 0 && seatingResults.length === 0 && !hasSearched) {
            const studentId = user.studentId || user.email?.split('@')[0]?.toUpperCase();
            if (studentId) {
                handleSearchSeating(studentId, true);
            }
        }
    }, [isAutoDetect, user, seatingData, isSeatingVisible]); // seatingResults and hasSearched are purposefully omitted to prevent loops, but logic inside handles it

    const handleToggleAutoDetect = () => {
        const newValue = !isAutoDetect;
        setIsAutoDetect(newValue);
        localStorage.setItem('seatingAutoDetect', newValue.toString());
        if (newValue && isSeatingVisible) {
            // Explicitly trigger search when turned ON
            const studentId = user.studentId || user.email?.split('@')[0]?.toUpperCase();
            if (studentId && seatingData.length > 0) {
                handleSearchSeating(studentId, true);
            }
        } else {
            setSeatingResults([]);
            setHasSearched(false);
            setSeatingSearchId('');
            localStorage.removeItem('last_seating_search_id');
            localStorage.removeItem('last_seating_results');
            localStorage.removeItem('last_seating_has_searched');
        }
    };

    const handleDownloadSeatingPDF = async (seatData, index) => {
        const elementId = `seating-pdf-redesign-${index}`;
        const element = document.getElementById(elementId);
        if (!element) return;

        const safeId = (seatData['ID No.'] || 'Student').replace(/[^a-zA-Z0-9]/g, '_');
        const filename = `Seating_${safeId}.pdf`;

        await startDownload(filename, async () => {
            const opt = {
                margin: 0,
                filename: filename,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { 
                    scale: 3, 
                    useCORS: true, 
                    logging: false, 
                    backgroundColor: '#ffffff',
                    windowWidth: 800
                },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            if (Capacitor.isNativePlatform()) {
                const worker = html2pdf().set(opt).from(element).toPdf();
                const pdfString = await worker.output('datauristring');
                const base64Data = pdfString.split('base64,')[1];
                try {
                    await FileDownload.savePdf({ base64: base64Data, filename: filename });
                } catch (e) {
                    await Filesystem.writeFile({ path: filename, data: base64Data, directory: Directory.Data });
                }
            } else {
                await html2pdf().set(opt).from(element).save();
            }
        });
    };

    const handleShareSeatingPDF = async (seatData, index) => {
        if (!Capacitor.isNativePlatform()) {
            return handleDownloadSeatingPDF(seatData, index);
        }

        const elementId = `seating-pdf-redesign-${index}`;
        const element = document.getElementById(elementId);
        const safeId = (seatData['ID No.'] || 'Student').replace(/[^a-zA-Z0-9]/g, '_');
        const filename = `Seating_${safeId}.pdf`;

        if (!element) return;

        await startShare(filename, async () => {
            const opt = {
                margin: 0,
                filename: filename,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { 
                    scale: 3, 
                    useCORS: true, 
                    logging: false, 
                    backgroundColor: '#ffffff', 
                    windowWidth: 800
                },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            const worker = html2pdf().set(opt).from(element).toPdf();
            const pdfString = await worker.output('datauristring');
            const base64Data = pdfString.split('base64,')[1];

            const fileResult = await Filesystem.writeFile({
                path: filename,
                data: base64Data,
                directory: Directory.Cache
            });

            await CapacitorShare.share({
                title: 'RGUKT Connect - Seating Info',
                text: `Exam Seating for ${seatData['NAME OF THE STUDENT'] || 'Student'}`,
                url: fileResult.uri,
                dialogTitle: 'Share Seating'
            });
        });
    };



    const handleDownloadExamPDF = async (scheduleData, index) => {
        const elementId = `exam-pdf-redesign-${index}`;
        const element = document.getElementById(elementId);
        if (!element) return;

        const safeTitle = (scheduleData.title || 'Exam_Schedule').replace(/[^a-zA-Z0-9]/g, '_');
        const filename = `${safeTitle}.pdf`;

        await startDownload(filename, async () => {
            const opt = {
                margin: 0,
                filename: filename,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { 
                    scale: 3, 
                    useCORS: true, 
                    logging: false, 
                    backgroundColor: '#ffffff',
                    windowWidth: 800
                },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            if (Capacitor.isNativePlatform()) {
                const worker = html2pdf().set(opt).from(element).toPdf();
                const pdfString = await worker.output('datauristring');
                const base64Data = pdfString.split('base64,')[1];
                
                try {
                    await FileDownload.savePdf({ base64: base64Data, filename: filename });
                } catch (e) {
                    await Filesystem.writeFile({ path: filename, data: base64Data, directory: Directory.Data });
                }
            } else {
                await html2pdf().set(opt).from(element).save();
            }
        });
    };

    const handleShareExamAsPDF = async (scheduleData, index) => {
        if (!Capacitor.isNativePlatform()) {
            return handleDownloadExamPDF(scheduleData, index);
        }

        const elementId = `exam-pdf-redesign-${index}`;
        const element = document.getElementById(elementId);
        const safeTitle = (scheduleData.title || 'Exam_Schedule').replace(/[^a-zA-Z0-9]/g, '_');
        const filename = `${safeTitle}.pdf`;

        if (!element) return;

        await startShare(filename, async () => {
            const opt = {
                margin: 0,
                filename: filename,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { 
                    scale: 3, 
                    useCORS: true, 
                    logging: false, 
                    backgroundColor: '#ffffff', 
                    windowWidth: 800
                },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            const worker = html2pdf().set(opt).from(element).toPdf();
            const pdfString = await worker.output('datauristring');
            const base64Data = pdfString.split('base64,')[1];

            const fileResult = await Filesystem.writeFile({
                path: filename,
                data: base64Data,
                directory: Directory.Cache
            });

            await CapacitorShare.share({
                title: `RGUKT Connect - ${scheduleData.title}`,
                text: `Sharing Exam Schedule: ${scheduleData.title}`,
                url: fileResult.uri,
                dialogTitle: 'Share with Friends'
            });
        });
    };

    if (isLoading) return <LoadingTransition message="Exam Center Loading" persistent />;

    return (
        <div className="exams-page max-width-wrapper">
            <div className="cmp-top-bar exams-page-header" style={{marginBottom: '1.5rem'}}>
                <div className="cmp-title-section">
                    <div className="cmp-title-text">
                        <h2>Examination Schedules</h2>
                        <p>Official Exam Timetables & Information</p>
                    </div>
                    <div className="cmp-header-icon" style={{ width: '120px', height: '90px', marginLeft: '15px' }}>
                        <svg viewBox="0 0 400 300" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                          <g transform="scale(1.1) translate(-10, -10)">
                            {/* Base Shadow */}
                            <ellipse cx="200" cy="270" rx="100" ry="15" fill="#475569" opacity="0.5"/>
                            
                            {/* Calendar Back Page */}
                            <rect x="130" y="70" width="140" height="160" rx="16" fill="#cbd5e1" stroke="#334155" strokeWidth="4" />
                            
                            {/* Calendar Main Page */}
                            <rect x="110" y="90" width="160" height="160" rx="16" fill="#ffffff" stroke="#1e3a8a" strokeWidth="4" />
                            
                            {/* Calendar Header */}
                            <path d="M 110 106 Q 110 90 126 90 L 254 90 Q 270 90 270 106 L 270 130 L 110 130 Z" fill="#ef4444" stroke="#1e3a8a" strokeWidth="4" />
                            
                            {/* Rings */}
                            <rect x="140" y="75" width="12" height="30" rx="6" fill="#94a3b8" stroke="#1e3a8a" strokeWidth="3" />
                            <rect x="228" y="75" width="12" height="30" rx="6" fill="#94a3b8" stroke="#1e3a8a" strokeWidth="3" />
                            
                            {/* Grid/Dates */}
                            <rect x="135" y="150" width="20" height="20" rx="4" fill="#dbeafe" />
                            <rect x="165" y="150" width="20" height="20" rx="4" fill="#dbeafe" />
                            <rect x="195" y="150" width="20" height="20" rx="4" fill="#dbeafe" />
                            <rect x="225" y="150" width="20" height="20" rx="4" fill="#dbeafe" />
                            
                            <rect x="135" y="180" width="20" height="20" rx="4" fill="#dbeafe" />
                            <rect x="165" y="180" width="20" height="20" rx="4" fill="#dbeafe" />
                            <rect x="195" y="180" width="20" height="20" rx="4" fill="#dbeafe" />
                            <rect x="225" y="180" width="20" height="20" rx="4" fill="#dbeafe" />
                            
                            <rect x="135" y="210" width="20" height="20" rx="4" fill="#dbeafe" />
                            <rect x="165" y="210" width="20" height="20" rx="4" fill="#3b82f6" /> {/* Highlighted date */}
                            <rect x="195" y="210" width="20" height="20" rx="4" fill="#dbeafe" />
                            
                            {/* Checkmark Badge */}
                            <circle cx="260" cy="230" r="32" fill="#10b981" stroke="#047857" strokeWidth="4" />
                            <path d="M 245 230 L 255 240 L 275 220" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                          </g>
                        </svg>
                    </div>
                </div>
            </div>

            {/* Seating Arrangement Search */}
            {isSeatingVisible && (
                <div className="seating-search-section">
                    <div className="seating-section-header">
                        <div className="auto-detect-header">
                            <div className="auto-detect-info">
                                <Zap size={16} className="auto-detect-icon" />
                                <span>Auto Seating Detection</span>
                            </div>
                            <label className="toggle-switch">
                                <input 
                                    type="checkbox" 
                                    checked={isAutoDetect} 
                                    onChange={handleToggleAutoDetect} 
                                />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>
                    </div>

                    {!isAutoDetect && (
                        <div className="seating-search-wrapper animate-fade-in">
                            <div className="seating-search-box">
                                <Search className="search-icon" size={20} />
                                <input 
                                    type="text" 
                                    placeholder="Enter Student ID (e.g. R240204)"
                                    value={seatingSearchId}
                                    onChange={(e) => {
                                        setSeatingSearchId(e.target.value);
                                        setHasSearched(false);
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            handleSearchSeating(seatingSearchId);
                                        }
                                    }}
                                    className="seating-input"
                                />
                                {seatingSearchId && (
                                    <button className="clear-search-btn" onClick={() => { setSeatingSearchId(''); setSeatingResults([]); setHasSearched(false); }}>
                                        &times;
                                    </button>
                                )}
                            </div>
                            <button className="seating-search-btn-v2" onClick={() => handleSearchSeating(seatingSearchId)}>
                                <Search size={18} />
                                <span>Find Seating</span>
                            </button>
                        </div>
                    )}

                    {(autoSearchState.active || isManualSearching) && (
                        <div className="auto-search-loader-overlay animate-fade-in">
                            <div className="auto-loader-content">
                                <div className="loader-circle-wrapper">
                                    <Loader2 className="spin-loader" size={24} />
                                </div>
                                <div className="auto-loader-text">
                                    {autoSearchState.active ? (
                                        autoSearchState.step === 1 ? (
                                            <span>Identified Student ID: <span className="highlight-text">{user?.studentId || user?.email?.split('@')[0]?.toUpperCase()}</span>...</span>
                                        ) : (
                                            <span>Locating Seating Position...</span>
                                        )
                                    ) : (
                                        <span>Searching for <span className="highlight-text">{seatingSearchId?.toUpperCase()}</span> in Registry...</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {seatingResults.length > 0 && (
                        <div className="seating-results-container animate-fade-in">
                            <h3 className="results-heading">
                                <MapPin size={16} /> Seating Information Found
                            </h3>
                            <div className="seating-cards-grid">
                                {seatingResults.map((seat, idx) => (
                                    <React.Fragment key={idx}>
                                    <div id={`seating-card-${idx}`} className="seating-info-card">
                                        {/* PDF Branding Base (Hidden from Redesign now) */}
                                        <div className="pdf-only-component" style={{ marginBottom: '8mm' }}>
                                            <div className="pdf-branding" style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1.5pt solid #4f46e5', paddingBottom: '3mm', marginBottom: '4mm', alignItems: 'center' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8pt' }}>
                                                    <div className="pdf-logo-box" style={{ width: '35pt', height: '35pt', borderRadius: '8pt', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <img src={LOGO_DATA_URI} alt="Logo" style={{ width: '100%', height: '100%' }} />
                                                    </div>
                                                    <div className="pdf-branding-text">
                                                        <h1 style={{ fontSize: '18pt', color: '#1e293b', margin: 0 }}>RGUKT <span style={{ color: '#4f46e5' }}>CONNECT</span></h1>
                                                    </div>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <p style={{ fontSize: '10pt', fontWeight: 800, color: '#1e293b', margin: 0 }}>Seating Allocation</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Watermark for Card */}
                                        <div className="pdf-only-component pdf-watermark" style={{
                                            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-30deg)',
                                            fontSize: '50pt', fontWeight: 900, color: 'rgba(79, 70, 229, 0.04)', pointerEvents: 'none',
                                            zIndex: -1, whiteSpace: 'nowrap'
                                        }}>
                                            RGUKT CONNECT
                                        </div>

                                        <div className="seating-card-header">
                                            <div className="student-identifier">
                                                <div style={{display: 'flex', alignItems: 'center', gap: '1rem', flex: 1}}>
                                                    <div className="student-avatar-placeholder">
                                                        <UserIcon size={20} />
                                                    </div>
                                                    <div>
                                                        <h4>{seat['NAME OF THE STUDENT'] || 'Unknown Student'}</h4>
                                                        <div className="student-tags">
                                                            <span className="student-id-tag">{seat['ID No.']}</span>
                                                            <span className="student-class-tag">{seat['CLASS']}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="seating-card-actions no-pdf">
                                                     <button 
                                                        className="icon-action-btn"
                                                        onClick={() => handleShareSeatingPDF(seat, idx)}
                                                        title="Share"
                                                    >
                                                        <Share2 size={16} />
                                                    </button>
                                                    <button 
                                                        className="icon-action-btn"
                                                        onClick={() => handleDownloadSeatingPDF(seat, idx)}
                                                        title="Download"
                                                    >
                                                        <Download size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="seating-card-body">
                                            <div className="seat-detail-row important-row">
                                                <div className="seat-detail-label"><Bookmark size={14} /> Subject</div>
                                                <div className="seat-detail-value subject-value">{seat['SUBJECT']}</div>
                                            </div>
                                            <div className="seat-detail-row">
                                                <div className="seat-detail-label"><Calendar size={14} /> Date & Time</div>
                                                <div className="seat-detail-value datetime-value">{seat['DATE & TIME']}</div>
                                            </div>
                                            <div className="seating-grid-2col">
                                                <div className="seat-detail-item">
                                                    <div className="seat-detail-label">Exam Hall</div>
                                                    <div className="seat-detail-value hall-value">{seat['EXAM HALL']}</div>
                                                </div>
                                                <div className="seat-detail-item highlight-item">
                                                    <div className="seat-detail-label">Seating Position</div>
                                                    <div className="seat-detail-value position-value">{seat['SP']}</div>
                                                </div>
                                            </div>
                                            
                                            {/* Smaller Footer for Card PDF */}
                                            <div className="pdf-only-component" style={{ marginTop: '5mm', paddingTop: '3mm', borderTop: '0.5pt solid #e2e8f0', fontSize: '6pt', color: '#64748b' }}>
                                                <p style={{ margin: 0 }}>Generated via RGUKT Connect • Official Student Portal • {new Date().toLocaleString()}</p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Redesigned Seating Slip PDF Layout (Hidden) - Premium Admit Card Style */}
                                    <div style={{ width: 0, height: 0, overflow: 'hidden', position: 'absolute', top: 0, left: 0 }}>
                                        <div id={`seating-pdf-redesign-${idx}`} className="pdf-seating-slip-container">
                                            {/* Top A4 padding space to push the card to center naturally */}
                                            <div className="pdf-a4-spacer"></div>

                                            <div className="pdf-admit-card">
                                                {/* Card Header */}
                                                <div className="admit-card-header">
                                                    <div className="admit-header-left">
                                                        <div className="admit-logo"><img src={LOGO_DATA_URI} alt="Logo" style={{ width: '100%', height: '100%' }} /></div>
                                                        <div className="admit-brand">
                                                            <h2>RGUKT <span>CONNECT</span></h2>
                                                            <p>OFFICIAL ACADEMIC PORTAL</p>
                                                        </div>
                                                    </div>
                                                    <div className="admit-header-right">
                                                        <h1>SEATING SLIP</h1>
                                                    </div>
                                                </div>

                                                {/* Card Body */}
                                                <div className="admit-card-body">
                                                    {/* Student Row */}
                                                    <div className="admit-student-section">
                                                        <div className="admit-avatar"><UserIcon size={28} /></div>
                                                        <div className="admit-student-info">
                                                            <h3>{seat['NAME OF THE STUDENT'] || 'Unknown Student'}</h3>
                                                            <div className="admit-tags">
                                                                <span className="admit-tag id-tag">{seat['ID No.']}</span>
                                                                <span className="admit-tag class-tag">{seat['CLASS']}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="admit-divider"></div>

                                                    {/* Exam Details Grid */}
                                                    <div className="admit-details-grid">
                                                        <div className="admit-exam-info">
                                                            <div className="admit-info-row">
                                                                <span className="admit-label"><Bookmark size={12}/> SUBJECT</span>
                                                                <span className="admit-value subject-high">{seat['SUBJECT']}</span>
                                                            </div>
                                                            <div className="admit-info-row">
                                                                <span className="admit-label"><Calendar size={12}/> DATE & TIME</span>
                                                                <span className="admit-value">{seat['DATE & TIME']}</span>
                                                            </div>
                                                            <div className="admit-info-row">
                                                                <span className="admit-label"><MapPin size={12}/> EXAM HALL</span>
                                                                <span className="admit-value hall-high">{seat['EXAM HALL']}</span>
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Seating Block */}
                                                        <div className="admit-seating-block">
                                                            <span className="admit-seat-label">SEAT NO.</span>
                                                            <span className="admit-seat-value">{seat['SP']}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Card Footer */}
                                                <div className="admit-card-footer">
                                                    <div className="admit-warning">
                                                        <AlertCircle size={14} /> <span>Please arrive 15 minutes early to the examination hall.</span>
                                                    </div>
                                                    <div className="admit-verification">
                                                        VERIFY: {Math.random().toString(36).substr(2, 6).toUpperCase()}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Bottom Instructions to fill A4 */}
                                            <div className="pdf-a4-instructions">
                                                <h3>Important Instructions</h3>
                                                <ul>
                                                    <li>Carry your valid Student ID Card to the examination hall.</li>
                                                    <li>Electronic gadgets are strictly prohibited.</li>
                                                    <li>Do not write anything on this seating slip.</li>
                                                    <li>This document was automatically generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}.</li>
                                                </ul>
                                            </div>

                                            {/* Watermark */}
                                            <div className="slip-watermark">RGUKT CONNECT</div>
                                        </div>
                                    </div>
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>
                    )}

                    {hasSearched && seatingResults.length === 0 && (
                        <div className="empty-results-state animate-fade-in">
                            <div className="empty-icon-box">
                                <AlertCircle size={32} />
                            </div>
                            <h3>No Seating Found</h3>
                            <p>We couldn't find any seating arrangement for <span className="highlight-id">{seatingSearchId?.toUpperCase()}</span>. Please verify the ID or check back later.</p>
                        </div>
                    )}
                </div>
            )}

            {examSchedules.length > 0 ? (
                <div className="exams-container animate-fade-in">
                    {examSchedules.map((schedule, sIdx) => {
                        const typeMeta = EXAM_TYPE_META[schedule.type] || EXAM_TYPE_META.others;
                        const TypeIcon = typeMeta.icon;
                        return (
                            <React.Fragment key={schedule.id || sIdx}>
                                <div id={`exam-schedule-${sIdx}`} className="exam-card">
                                 {/* PDF Branding Header */}
                                 <div className="pdf-only-component" style={{ marginBottom: '8mm' }}>
                                     <div className="pdf-branding" style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1.5pt solid #4f46e5', paddingBottom: '5mm', marginBottom: '6mm', alignItems: 'center' }}>
                                         <div style={{ display: 'flex', alignItems: 'center', gap: '12pt' }}>
                                             <div className="pdf-logo-box" style={{ width: '45pt', height: '45pt', borderRadius: '12pt', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                 <img src={LOGO_DATA_URI} alt="Logo" style={{ width: '100%', height: '100%' }} />
                                             </div>
                                             <div className="pdf-branding-text">
                                                 <h1 style={{ fontSize: '20pt', color: '#1e293b', margin: 0 }}>RGUKT <span style={{ color: '#4f46e5' }}>CONNECT</span></h1>
                                                 <p style={{ fontSize: '8pt', letterSpacing: '0.1em', margin: 0 }}>OFFICIAL ACADEMIC PORTAL</p>
                                             </div>
                                         </div>
                                         <div style={{ textAlign: 'right' }}>
                                             <p style={{ fontSize: '7pt', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', margin: 0 }}>Document Type</p>
                                             <p style={{ fontSize: '10pt', fontWeight: 800, color: '#1e293b', margin: 0 }}>Exam Schedule Report</p>
                                         </div>
                                     </div>
                                     <div className="pdf-title-section" style={{ textAlign: 'left', border: 'none', margin: 0, padding: 0 }}>
                                         <h2 style={{ fontSize: '16pt', fontWeight: 900, color: '#0f172a', marginBottom: '2pt' }}>{schedule.title || 'Examinations Schedule'}</h2>
                                         <p style={{ fontSize: '9pt', color: '#64748b', fontWeight: 600 }}>{schedule.subtitle || 'Semester Examinations'} • RGUKT RK Valley</p>
                                     </div>
                                 </div>

                                 {/* Watermark */}
                                 <div className="pdf-only-component pdf-watermark" style={{
                                     position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-30deg)',
                                     fontSize: '100pt', fontWeight: 900, color: 'rgba(79, 70, 229, 0.04)', pointerEvents: 'none',
                                     zIndex: -1, whiteSpace: 'nowrap'
                                 }}>
                                     RGUKT CONNECT
                                 </div>

                                <div className="exam-card-header">
                                    <div className="exam-card-title-group">
                                        <div className="exam-type-badge-container">
                                            <span className="exam-category-badge" style={{ background: typeMeta.bg, color: typeMeta.color }}>
                                                <TypeIcon size={12} />
                                                {typeMeta.badge}
                                            </span>
                                            <h2 className="exam-schedule-title">
                                                {schedule.title || 'Examinations Schedule'}
                                            </h2>
                                        </div>
                                        {schedule.subtitle && (
                                            <p className="exam-schedule-subtitle">
                                                {schedule.subtitle}
                                            </p>
                                        )}
                                    </div>
                                    <div className="exam-card-actions no-pdf">
                                        <button 
                                            className="icon-action-btn"
                                            onClick={() => handleShareExamAsPDF(schedule, sIdx)}
                                            title="Share Exam Schedule"
                                        >
                                            <Share2 size={16} />
                                        </button>
                                        <button 
                                            className="icon-action-btn"
                                            onClick={() => handleDownloadExamPDF(schedule, sIdx)}
                                            title="Download Exam Schedule"
                                        >
                                            <Download size={16} />
                                        </button>
                                    </div>
                                </div>

                                <div className="exam-entries-list">
                                    {schedule.exams.map((exam, eIdx) => (
                                        <div key={eIdx} className="exam-entry-item">
                                            <div className="exam-entry-main">
                                                <div className="exam-date-badge">
                                                    <span className="exam-date-day">
                                                        {exam.date?.split('-')[0] || '--'}
                                                    </span>
                                                    <span className="exam-date-month">
                                                        {exam.date?.split('-')[1] || '--'}/{exam.date?.split('-')[2]?.slice(2) || '--'}
                                                    </span>
                                                </div>
                                                <div className="exam-info">
                                                    <div className="exam-subject-name">
                                                        {exam.subject}
                                                    </div>
                                                    <div className="exam-meta-tags">
                                                        <span className="exam-code-tag">{exam.code}</span>
                                                        <span className="exam-dot">•</span>
                                                        <span className="exam-day-text">{exam.day}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="exam-entry-side">
                                                <div className="exam-time-text">{exam.time}</div>
                                                <div className="exam-credits-text">{exam.credits} Credits</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                 <div className="pdf-only-component pdf-footer">
                                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                         <div style={{ textAlign: 'left' }}>
                                             <p style={{ fontSize: '7.5pt', color: '#475569', fontWeight: 700, margin: 0 }}>RGUKT CONNECT | Official Digital Ecosystem</p>
                                             <p style={{ fontSize: '6.5pt', color: '#94a3b8', margin: 0 }}>Generated as an official digital record of RGUKT RK Valley</p>
                                         </div>
                                         <div style={{ textAlign: 'right' }}>
                                             <p style={{ fontSize: '6.5pt', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Verification: {Math.random().toString(36).substr(2, 9).toUpperCase()}</p>
                                             <p className="pdf-timestamp" style={{ fontSize: '6.5pt', color: '#64748b', marginTop: '2pt', margin: 0 }}>
                                                 Captured on: {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
                                             </p>
                                         </div>
                                     </div>
                                 </div>
                             </div>

                             {/* Redesigned PDF Layout (Hidden safely from Screen) */}
                             <div style={{ width: 0, height: 0, overflow: 'hidden', position: 'absolute', top: 0, left: 0 }}>
                                 <div 
                                     id={`exam-pdf-redesign-${sIdx}`} 
                                     className="pdf-exam-redesign-container"
                                 >
                                     <div className="pdf-header-modern">
                                         <div className="header-left">
                                             <div className="pdf-logo-wrapper">
                                                 <img src={LOGO_DATA_URI} alt="Logo" style={{ width: '100%', height: '100%' }} />
                                             </div>
                                             <div className="pdf-brand-info">
                                                 <h1 className="pdf-app-name">RGUKT <span className="accent">Connect</span></h1>
                                                 <p className="pdf-title">Examination Schedule</p>
                                                 <p className="pdf-subtitle">{schedule.title || 'Semester Exam Timetable'}</p>
                                             </div>
                                         </div>
                                         <div className="header-right">
                                             <div className="pdf-gen-meta">
                                                 <p className="meta-label">Generated On</p>
                                                 <p className="meta-value">{new Date().toLocaleDateString()}</p>
                                                 <p className="meta-value time">{new Date().toLocaleTimeString()}</p>
                                             </div>
                                         </div>
                                     </div>

                                     <div className="pdf-exam-grid-wrapper">
                                         <table className="pdf-exam-grid">
                                             <thead>
                                                 <tr>
                                                     <th>Date</th>
                                                     <th>Day</th>
                                                     <th>Subject</th>
                                                     <th>Time</th>
                                                     <th>Credits</th>
                                                 </tr>
                                             </thead>
                                             <tbody>
                                                 {schedule.exams.map((exam, eIdx) => (
                                                     <tr key={eIdx}>
                                                         <td className="font-bold">{exam.date}</td>
                                                         <td>{exam.day}</td>
                                                         <td className="subject-col font-bold" style={{ color: typeMeta.color }}>{exam.subject}</td>
                                                         <td>{exam.time}</td>
                                                         <td>{exam.credits}</td>
                                                     </tr>
                                                 ))}
                                             </tbody>
                                         </table>
                                     </div>

                                     <div className="pdf-footer-modern">
                                         <div className="footer-line"></div>
                                         <div className="footer-content">
                                             <p>Generated by <strong>RGUKT Connect App</strong></p>
                                             <div className="footer-right">
                                                 <span>Verification ID: {Math.random().toString(36).substr(2, 6).toUpperCase()}</span>
                                                 <span className="page-num">Page 1/1</span>
                                             </div>
                                         </div>
                                     </div>
                                 </div>
                             </div>
                            </React.Fragment>
                        );
                    })}
                </div>
            ) : (
                <div className="empty-exams-card animate-fade-in">
                    <div className="empty-exams-content">
                        <div className="empty-icon-wrapper">
                            <FileText size={64} className="empty-icon" />
                        </div>
                        <h3 className="empty-title">No Exam Schedules</h3>
                        <p className="empty-description">
                            There are currently no active examination schedules available. When a new schedule is released, it will automatically appear here.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Exams;
