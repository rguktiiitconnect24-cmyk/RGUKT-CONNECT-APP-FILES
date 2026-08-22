import { AlertCircle, Calendar, X, Download } from 'lucide-react';
import CustomCalendar from '../components/Calendar/CustomCalendar';
import MobileTimetable from '../components/MobileTimetable/MobileTimetable';
import LiveClassTracker from '../components/LiveClassTracker';
import TimetableDashboardHeader from '../components/TimetableDashboardHeader';
import LoadingTransition from '../components/Common/LoadingTransition';
import React from 'react';
import { createPortal } from 'react-dom';
import { Capacitor } from '@capacitor/core';
import { nativeFileService } from '../services/nativeFileService';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share as CapacitorShare } from '@capacitor/share';
import { useDownload } from '../context/DownloadContext';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc, getDocs, collection } from 'firebase/firestore';
import { db } from '../config/firebase';
import { pdfService } from '../services/pdfService';
import { mapSubjectName } from '../utils/formatUtils';

import { syncScheduleToWidget } from '../services/widgetService';
import { holidayService } from '../services/holidayService';
import './TimeTable.css';

const LOGO_DATA_URI = `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgdmlld0JveD0iMCAwIDUxMiA1MTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPHJlY3Qgd2lkdGg9IjUxMiIgaGVpZ2h0PSI1MTIiIHJ4PSIxMjgiIGZpbGw9InVybCgjcGFpbnQwX2xpbmVhcikiLz4KICA8cGF0aCBkPSJNMjU2IDEyMEw2NCAyMTBMMjU2IDMwMEw0NDggMjEwTDI1NiAxMjBaIiBmaWxsPSJ3aGl0ZSIvPgogIDxwYXRoIGQ9Ik0xMjggMjQwVjMyMEMxMjggMzIwIDE4MCAzNzAgMjU2IDM3MEMzMzIgMzcwIDM4NCAzMjAgMzg0IDMyMFYyNDBMMjU2IDMwMEwxMjggMjQwWiIgZmlsbD0id2hpdGUiLz4KICA8cGF0aCBkPSJNNDE2IDIxMFYzNDAiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMjAiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgogIDxjaXJjbGUgY3g9IjQxNiIgY3k9IjM1MCIgcj0iMTUiIGZpbGw9IndoaGl0ZSIvPgogIDxkZWZzPgogICAgPGxpbmVhckdyYWRpZW50IGlkPSJwYWludDBfbGluZWFyIiB4MT0iMCIgeTE9IjAiIHgyPSI1MTIiIHkyPSI1MTIiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIj4KICAgICAgPHN0b3Agc3RvcC1jb2xvcj0iIzRmNDZlNSIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiMzNzMwYTMiLz4KICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgPC9kZWZzPgo8L3N2Zz4=`;

const svgToPng = (svgDataUri) => {
    return new Promise((resolve) => {
        if (!svgDataUri || !svgDataUri.includes('svg')) return resolve(svgDataUri);
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 512;
            canvas.height = 512;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, 512, 512);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => resolve(null);
        img.src = svgDataUri;
    });
};

const TimeTable = () => {
    const { user } = useAuth();

    // specific logic to match F-04 from profile with F04 in timetable
    const [schedule, setSchedule] = React.useState(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [showPreview, setShowPreview] = React.useState(false);
    const [timetableDownloadStatus, setTimetableDownloadStatus] = React.useState('idle'); // idle, loading, done
    const { startDownload, startShare } = useDownload();
    const [expandedSections, setExpandedSections] = React.useState([]); // All sections closed by default
    const [holidayStatus, setHolidayStatus] = React.useState({ holidayDate: '', reason: '' });
    const [availableClasses, setAvailableClasses] = React.useState([]);
    const [showGoogleCalendar, setShowGoogleCalendar] = React.useState(false);

    const getInitialDay = () => {
        const day = new Date().toLocaleDateString('en-US', { weekday: 'long' });
        return day === 'Sunday' ? 'Monday' : day;
    };
    const [selectedDayOfWeek, setSelectedDayOfWeek] = React.useState(getInitialDay());

    const todayStr = new Date().toISOString().split('T')[0];
    const isHolidayToday = holidayStatus.holidayDate === todayStr;


    const toggleSection = (sectionId) => {
        setExpandedSections(prev => 
            prev.includes(sectionId) 
                ? prev.filter(s => s !== sectionId) 
                : [...prev, sectionId]
        );
    };

    const defaultTimeline = [
        { start: '08:30', end: '09:30', label: 'P1', type: 'period', index: 0 },
        { start: '09:30', end: '10:30', label: 'P2', type: 'period', index: 1 },
        { start: '10:30', end: '10:40', label: 'Short Break', type: 'break' },
        { start: '10:40', end: '11:40', label: 'P3', type: 'period', index: 2 },
        { start: '11:40', end: '12:40', label: 'P4', type: 'period', index: 3 },
        { start: '12:40', end: '13:40', label: 'Lunch Break', type: 'break' },
        { start: '13:40', end: '14:40', label: 'P5', type: 'period', index: 4 },
        { start: '14:40', end: '15:40', label: 'P6', type: 'period', index: 5 },
        { start: '15:40', end: '16:40', label: 'P7', type: 'period', index: 6 }
    ];
    const [timelineConfig, setTimelineConfig] = React.useState(defaultTimeline);

    const convertTo12Hour = (time24) => {
        const [hours, minutes] = time24.split(':');
        const h = parseInt(hours, 10);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12.toString().padStart(2, '0')}:${minutes} ${ampm}`;
    };

    const timeSlots = timelineConfig.filter(t => t.type === 'period').map(t => `${convertTo12Hour(t.start)} - ${convertTo12Hour(t.end)}`);
    const breaks = timelineConfig.filter(t => t.type === 'break');

    React.useEffect(() => {
        let isMounted = true;
        const fetchSchedule = async () => {
            setIsLoading(true);
            let cls = user?.currentClass || '';

            const cacheKey = `timetable_full_${cls || user?.studentId || 'unknown'}`;
            const cached = null; // sessionStorage.getItem(cacheKey); disabled to allow real-time updates
            let parsedCache = null;
            if (cached) {
                try {
                    parsedCache = JSON.parse(cached);
                } catch(e) {
                    console.error("Invalid timetable cache:", e);
                    sessionStorage.removeItem(cacheKey);
                }
            }

            if (parsedCache && parsedCache !== 'NOT_FOUND') {
                if (isMounted) {
                    setSchedule(parsedCache);
                    setIsLoading(false);
                }
                return;
            }

            if (!cls && user?.studentId) {
                try {
                    const docSnap = await getDoc(doc(db, "students_master", user.studentId.toUpperCase().replace(/^RGUKT-/i, '')));
                    if (docSnap.exists()) {
                        const raw = docSnap.data();
                        cls = raw.classSection || raw.currentClass || '';
                        if (cls === 'AIML' || cls === 'CSC (AI&ML)') cls = 'CSE(AI&ML)';
                        if (cls) {
                            console.log("Found class via proactive fetch:", cls);
                        }
                    }
                } catch (e) {
                    console.error("Proactive fetch failed:", e);
                }
            }

            if (!cls) {
                if (isMounted) setIsLoading(false);
                return;
            }
            try {
                // Implement a safety timeout to prevent infinite loading
                const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timetable fetch timeout')), 10000));
                
                let docSnap = { exists: () => false };
                let docRef = null;
                const branch = user?.department || user?.branch || '';
                let section = cls;
                
                let rawBranch = branch.toUpperCase();
                let branchUpper = rawBranch;
                if (/CSE\(AI&ML\)|CSC\s*\(AI&ML\)|AIML|ARTIFICIAL\s*INTELLIGENCE|AI\s*&?\s*ML/i.test(rawBranch)) branchUpper = 'CSE(AI&ML)';
                else if (/ECE|E\.C\.E|^ELECTRONICS/i.test(rawBranch)) branchUpper = 'ECE';
                else if (/CSE|C\.S\.E|^COMPUTER/i.test(rawBranch)) branchUpper = 'CSE';
                else if (/\bCE\b|C\.E|^CIVIL/i.test(rawBranch)) branchUpper = 'CE';
                else if (/\bME\b|M\.E|^MECH/i.test(rawBranch)) branchUpper = 'ME';
                else if (/MME|^METALLURGY/i.test(rawBranch)) branchUpper = 'MME';
                else if (/CHE|C\.H\.E|^CHEM/i.test(rawBranch)) branchUpper = 'CHE';
                else if (/EEE|E\.E\.E/i.test(rawBranch)) branchUpper = 'EEE';
                
                // Clean up section string (remove "section" and branch name)
                let cleanSection = section.toUpperCase();
                cleanSection = cleanSection.replace(/SECTION\s*[-_]?\s*/i, '');
                
                // Remove year prefix (E1, E2, E3, E4, P1, P2, PUC1, PUC2)
                cleanSection = cleanSection.replace(/\b(E[1-4]|P(UC)?[- ]?[1-2])\b/gi, '');

                if (branchUpper && branchUpper !== 'CSE(AI&ML)') {
                    const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    cleanSection = cleanSection.replace(new RegExp(escapeRegExp(branchUpper), 'ig'), '');
                }
                
                // Remove all non-alphanumeric characters (turns "E2-ECE-A" -> "A", "F-04" -> "F04")
                cleanSection = cleanSection.replace(/[^A-Z0-9]/ig, '').trim();
                
                section = cleanSection;
                
                if (['CSE(AI&ML)', 'CSC (AI&ML)', 'AIML'].includes(section.toUpperCase()) || /ARTIFICIALINTELLIGENCE|AIML/i.test(section)) {
                    section = 'AIML';
                }
                
                if (section === 'AIML') branchUpper = 'CSE(AI&ML)';
                
                if (section === 'AIML') branchUpper = 'CSE(AI&ML)';

                if (branchUpper && section) {
                    try {
                        docRef = doc(db, "timetables", branchUpper, "sections", section.toUpperCase());
                        docSnap = await Promise.race([getDoc(docRef), timeoutPromise]);
                    } catch(e) {
                        console.error("Error reading branch/section timetable:", e);
                    }
                }

                // Fallback to legacy format if new structure fails
                if (!docSnap.exists() && branchUpper && section) {
                    const variants = section === 'AIML' 
                        ? ['CSE(AI&ML)', 'AIML', 'AI&ML', 'CSE (AI&ML)', 'Artificial Intelligence and Machine Learning'] 
                        : [
                            `Section ${section.toUpperCase()} (${branchUpper})`, 
                            `SECTION ${section.toUpperCase()}(${branchUpper})`,
                            `SECTION${section.toUpperCase()}(${branchUpper})`,
                            `SECTION-${section.toUpperCase()}(${branchUpper})`,
                            `SECTION-${section.toUpperCase()} (${branchUpper})`,
                            `Section-${section.toUpperCase()}(${branchUpper})`,
                            `Section-${section.toUpperCase()} (${branchUpper})`
                          ];
                    
                    const legacyPromises = variants.map(async (legacyVariant) => {
                        try {
                            const vRef = doc(db, "timetable", legacyVariant);
                            const vSnap = await getDoc(vRef);
                            return { variant: legacyVariant, snap: vSnap };
                        } catch(e) {
                            console.warn("Legacy timetable variant lookup failed:", legacyVariant, e);
                            return null;
                        }
                    });
                    
                    const legacyResults = await Promise.all(legacyPromises);
                    const matchedResult = legacyResults.find(result => result?.snap?.exists());
                    
                    if (matchedResult) {
                        docSnap = matchedResult.snap;
                        console.log("Matched legacy timetable variant:", matchedResult.variant);
                    }
                }

                if (docSnap && docSnap.exists && docSnap.exists()) {
                    const data = docSnap.data();
                    if (isMounted) setSchedule(data);
                    sessionStorage.setItem(cacheKey, JSON.stringify(data));
                } else {
                    const clsUpper = cls.toUpperCase().replace(/\s/g, '');
                    console.log(`No timetable found for variants: ${clsUpper}`);
                    setSchedule('NOT_FOUND');
                    sessionStorage.setItem(cacheKey, JSON.stringify('NOT_FOUND'));
                    
                    // Fetch available classes to suggest
                    try {
                        const classesSnap = await getDocs(collection(db, "timetable"));
                        const classList = classesSnap.docs.map(d => d.id);
                        setAvailableClasses(classList.sort());
                    } catch (e) {
                        console.error("Error fetching class list for suggestions:", e);
                    }
                    if (isMounted) setSchedule('NOT_FOUND');
                }
            } catch (error) {
                console.error("Error fetching timetable:", error);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        const fetchSettings = async () => {
            try {
                const settingsRef = doc(db, "settings", "timetable");
                const docSnap = await getDoc(settingsRef);
                if (docSnap.exists() && docSnap.data().timeline) {
                    if (isMounted) setTimelineConfig(docSnap.data().timeline);
                }
            } catch (error) {
                console.error("Error fetching timetable settings:", error);
            }
        };

        const fetchHolidayStatus = async () => {
            const cacheKey = 'timetable_holiday_status';
            const cached = null; // sessionStorage.getItem(cacheKey); disabled to allow real-time updates
            if (cached) {
                setHolidayStatus(JSON.parse(cached));
                return;
            }
            try {
                // 1. Manual check from Firebase (Priority Override)
                const docSnap = await getDoc(doc(db, "settings", "timetable_status"));
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    if (data.holidayDate === todayStr) {
                        setHolidayStatus(data);
                        sessionStorage.setItem(cacheKey, JSON.stringify(data));
                        return;
                    }
                }

                // 2. Automatic check from Google Calendar
                const googleHoliday = await holidayService.getTodayHoliday();
                if (googleHoliday) {
                    const autoStatus = {
                        holidayDate: todayStr,
                        reason: googleHoliday.summary,
                        isAuto: true
                    };
                    setHolidayStatus(autoStatus);
                    sessionStorage.setItem(cacheKey, JSON.stringify(autoStatus));
                }
            } catch (error) {
                console.error("Error fetching holiday status:", error);
            }
        };

        fetchSettings();
        fetchSchedule();
        fetchHolidayStatus();
        
        return () => { isMounted = false; };
    }, [user?.currentClass, user?.studentId]);
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDay = new Date().toLocaleDateString('en-US', { weekday: 'long' });

    // Sync to Widget Effect
    React.useEffect(() => {
        if (schedule && schedule !== 'NOT_FOUND' && Capacitor.isNativePlatform()) {
            const daySchedule = schedule[currentDay] || [];
            if (daySchedule.length > 0) {
                // Find current or next class based on time
                const now = new Date();
                const curHour = now.getHours();
                const curMin = now.getMinutes();
                const totalMin = curHour * 60 + curMin;

                // Time slots map to minutes from 00:00
                const periodSlots = timelineConfig.filter(t => t.type === 'period');
                const slotsMin = periodSlots.map(p => {
                    const [sH, sM] = p.start.split(':').map(Number);
                    const [eH, eM] = p.end.split(':').map(Number);
                    return { 
                        start: sH * 60 + sM, 
                        end: eH * 60 + eM, 
                        label: `${convertTo12Hour(p.start)} - ${convertTo12Hour(p.end)}` 
                    };
                });

                let currentIdx = slotsMin.findIndex(s => totalMin >= s.start && totalMin < s.end);
                let currentTopic = currentIdx !== -1 ? daySchedule[currentIdx] : 'No ongoing class';
                let currentTime = currentIdx !== -1 ? slotsMin[currentIdx].label : '---';
                
                // Find next
                let nextIdx = slotsMin.findIndex(s => totalMin < s.start);
                let nextTopic = nextIdx !== -1 ? daySchedule[nextIdx] : 'Finished for today';
                if (nextTopic !== 'Finished for today' && nextIdx !== -1) {
                    nextTopic = `${daySchedule[nextIdx]} @ ${slotsMin[nextIdx].label.split(' - ')[0]}`;
                }

                syncScheduleToWidget({
                    topic: currentTopic === '-' || currentTopic === 'Free' ? 'Free Period' : currentTopic,
                    time: currentTime,
                    next: nextTopic === '-' || nextTopic === 'Free' ? 'Free Period' : nextTopic
                });
            }
        }
    }, [schedule, currentDay]);

    // Subject type detection
    const getSubjectClass = (subject) => {
        if (!subject || subject === 'Free' || subject === '-') return 'empty';
        if (subject.toLowerCase().includes('lunch')) return 'lunch';
        let hash = 0;
        for (let i = 0; i < subject.length; i++) {
            hash = subject.charCodeAt(i) + ((hash << 5) - hash);
        }
        const colors = ['purple', 'green', 'orange', 'blue', 'red', 'teal'];
        const color = colors[Math.abs(hash) % colors.length];
        return `color-${color}`;
    };



    const handleDownloadPDF = async () => {
        console.log("TimeTable: handleDownloadPDF triggered");
        const filename = `Timetable_${user?.currentClass || 'Class'}.pdf`;

        await startDownload(filename, async () => {
            console.log("TimeTable: downloadFn callback started");
            // Convert Logo to PNG
            const pngLogo = await svgToPng(LOGO_DATA_URI);
            // Generate Native Vector PDF
            const doc = await pdfService.generateTimetablePdf(schedule, user, pngLogo);
            
            if (Capacitor.isNativePlatform()) {
                const pdfBase64 = doc.output('datauristring').split(',')[1];
                await nativeFileService.savePdfToDownloads(filename, pdfBase64);
            } else {
                doc.save(filename);
            }
        });
    };

    const handleShareElementAsPDF = async (type) => {
        if (!Capacitor.isNativePlatform()) {
            return handleDownloadPDF();
        }

        const cls = user?.currentClass || 'Class';
        const filename = `Timetable_${cls.replace(/\s+/g, '_')}.pdf`;

        await startShare(filename, async () => {
            // Convert Logo to PNG
            const pngLogo = await svgToPng(LOGO_DATA_URI);
            // Generate Native Vector PDF
            const doc = await pdfService.generateTimetablePdf(schedule, user, pngLogo);
            const pdfBase64 = doc.output('datauristring').split(',')[1];

            const fileResult = await Filesystem.writeFile({
                path: filename,
                data: pdfBase64,
                directory: Directory.Cache
            });

            await CapacitorShare.share({
                title: 'Official Class Timetable',
                text: `Sharing Timetable of ${user?.fullName || 'Student'}`,
                url: fileResult.uri,
            });
        });
    };

    if (isLoading) return <LoadingTransition message="Time Table Loading" persistent />;

    return (
        <div className="timetable-page max-width-wrapper">
             
             <TimetableDashboardHeader 
                user={user} 
                currentDay={currentDay} 
                schedule={schedule} 
                onShare={() => handleShareElementAsPDF('timetable')}
                onDownload={handleDownloadPDF}
                onShowCalendar={() => setShowGoogleCalendar(true)}
             />

            {!user?.currentClass && !schedule && (
                <div className="alert alert-warning">
                    <AlertCircle size={18} className="alert-icon" />
                    <p>
                        <strong>No Class Selected:</strong> Please update your profile with your Class/Section (e.g., F-08) to view your timetable.
                    </p>
                </div>
            )}

            {schedule === 'NOT_FOUND' && (
                <div className="alert alert-danger animate-shake">
                    <AlertCircle size={18} className="alert-icon" />
                    <div className="alert-content">
                        <p>
                            <strong>Timetable Not Found:</strong> We couldn't find a schedule for "{(user?.currentClass || 'your class')}".
                        </p>
                        {availableClasses.length > 0 && (
                            <div className="available-classes-container">
                                <p className="text-[10px] font-bold mb-2 opacity-60 uppercase tracking-widest text-white">Available Classes In Database:</p>
                                <div className="classes-scroll-area custom-scrollbar">
                                    {availableClasses.map(cls => (
                                        <span 
                                            key={cls} 
                                            className="class-suggestion-chip"
                                            onClick={() => {
                                                alert(`To see ${cls}, please update your Profile 'Class / Section' field to exactly: ${cls}`);
                                            }}
                                        >
                                            {cls}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {isHolidayToday && (
                <div className="holiday-banner animate-fade-in">
                    <div className="holiday-content">
                        <div className="holiday-icon-wrapper">
                            <Calendar size={48} className="holiday-icon" />
                            <div className="holiday-sparkles"></div>
                        </div>
                        <h2 className="holiday-title">
                            {holidayStatus.isAuto ? holidayStatus.reason : 'College Holiday Today!'}
                        </h2>
                        <p className="holiday-description">
                            {holidayStatus.isAuto 
                                ? `The campus is closed today for ${holidayStatus.reason}. Enjoy your break!`
                                : "Enjoy your break! The regular timetable will resume as scheduled tomorrow."}
                        </p>
                        <div className="holiday-badges">
                            <span className="holiday-badge">Campus Closed</span>
                            <span className="holiday-badge">Relax & Recharge</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Class Timetable Section */}
            {(() => {
                const timetableContent = (
                    <>
                        {/* Actions moved to TimetableDashboardHeader */}
                        <section className={`timetable-section ${isHolidayToday ? 'holiday-mode' : ''}`}>
                             {schedule && schedule !== 'NOT_FOUND' ? (
                                 <div id="timetable-to-pdf">
                                     {/* PDF Branding Header (Applies to both Mobile & Desktop PDF) */}
                                     <div className="pdf-only-component" style={{ marginBottom: '8mm' }}>
                                         <div className="pdf-branding" style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1.5pt solid #4f46e5', paddingBottom: '3mm', marginBottom: '5mm', alignItems: 'center' }}>
                                             <div style={{ display: 'flex', alignItems: 'center', gap: '10pt' }}>
                                                 <div className="pdf-logo-box" style={{ width: '40pt', height: '40pt', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                     <img src={LOGO_DATA_URI} alt="Logo" style={{ width: '100%', height: '100%' }} />
                                                 </div>
                                                 <div className="pdf-branding-text">
                                                     <h1 style={{ fontSize: '18pt', color: '#1e293b', margin: 0, fontWeight: 900 }}>RGUKT <span style={{ color: '#4f46e5' }}>CONNECT</span></h1>
                                                     <p style={{ fontSize: '7.5pt', letterSpacing: '0.1em', margin: 0, fontWeight: 700, color: '#64748b' }}>OFFICIAL ACADEMIC PORTAL</p>
                                                 </div>
                                             </div>
                                             <div style={{ textAlign: 'right' }}>
                                                 <p style={{ fontSize: '6pt', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', margin: 0 }}>Document Type</p>
                                                 <p style={{ fontSize: '9pt', fontWeight: 900, color: '#1e293b', margin: 0 }}>Official Class Timetable</p>
                                             </div>
                                         </div>
                                         <div style={{ marginBottom: '4mm' }}>
                                             <h2 style={{ fontSize: '14pt', fontWeight: 900, color: '#0f172a', margin: 0 }}>Class/Section: {user?.currentClass === 'AIML' ? 'CSE(AI&ML)' : (user?.currentClass || 'F-08')}</h2>
                                             <p style={{ fontSize: '8.5pt', color: '#64748b', fontWeight: 600, margin: '2pt 0 0 0' }}>Spring 2026 Academic Semester • RGUKT RK Valley</p>
                                         </div>
                                     </div>

                                     {/* Shared Watermark */}
                                     <div className="pdf-only-component pdf-watermark" style={{
                                         position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-30deg)',
                                         fontSize: '100pt', fontWeight: 900, color: 'rgba(79, 70, 229, 0.04)', pointerEvents: 'none',
                                         zIndex: -1, whiteSpace: 'nowrap'
                                     }}>
                                         RGUKT CONNECT
                                     </div>

                                     <div className="screen-only-component">
                                         <LiveClassTracker schedule={schedule} timeSlots={timeSlots} />
                                     </div>

                                     <div className="md:hidden screen-only-component">
                                         <MobileTimetable schedule={schedule} selectedDay={selectedDayOfWeek} timeSlots={timeSlots} breaks={breaks} />
                                     </div>

                                     <div className="hidden md:block timetable-grid-wrapper">
                                         <div className="table-responsive">
                                             <table className="modern-timetable">
                                                 <thead>
                                                     <tr>
                                                         <th className="sticky-col header-time-cell">
                                                             <div className="th-time-title">Time</div>
                                                         </th>
                                                         {timeSlots.slice(0, 4).map((slot, idx) => (
                                                             <th key={idx}>
                                                                 <div className="th-slot">P{idx + 1}</div>
                                                                 <div className="th-time">{slot.replace(' AM', '').replace(' PM', '').replace(' - ', '-')}</div>
                                                             </th>
                                                         ))}
                                                         <th className="lunch-col-header"></th>
                                                         {timeSlots.slice(4).map((slot, idx) => (
                                                             <th key={idx+4}>
                                                                 <div className="th-slot">P{idx + 5}</div>
                                                                 <div className="th-time">{slot.replace(' AM', '').replace(' PM', '').replace(' - ', '-')}</div>
                                                             </th>
                                                         ))}
                                                     </tr>
                                                 </thead>
                                                 <tbody>
                                                     {days.map(day => {
                                                         const isToday = day === currentDay;
                                                         const daySchedule = schedule[day] || [];
                                                         return (
                                                             <tr key={day} className={isToday ? 'active-row' : ''}>
                                                                 <td className="sticky-col day-header-cell">
                                                                     {isToday && <span className="active-indicator"></span>}
                                                                     {day.substring(0, 3).toUpperCase()}
                                                                     {isToday && <span className="active-arrow">▶</span>}
                                                                 </td>
                                                                 {/* P1 to P4 */}
                                                                 {(() => {
                                                                     const blocks = [];
                                                                     for (let i = 0; i < 4; i++) {
                                                                         if (daySchedule[i] === '\u200B') continue;
                                                                         let colSpan = 1;
                                                                         while (i + colSpan < 4 && daySchedule[i + colSpan] === '\u200B') colSpan++;
                                                                         blocks.push({ idx: i, colSpan, subject: daySchedule[i] });
                                                                     }
                                                                     return blocks.map(block => (
                                                                         <td key={block.idx} colSpan={block.colSpan}>
                                                                             <div className={`subject-cell ${getSubjectClass(block.subject)}`}>
                                                                                 {!block.subject || block.subject === 'Free' ? '-' : mapSubjectName(block.subject)}
                                                                             </div>
                                                                         </td>
                                                                     ));
                                                                 })()}
                                                                 {/* Lunch spanning down */}
                                                                 {day === 'Monday' && (
                                                                     <td rowSpan={6} className="lunch-vertical-cell">
                                                                         <div className="lunch-text">Lunch</div>
                                                                     </td>
                                                                 )}
                                                                 {/* P5 to P7 */}
                                                                 {(() => {
                                                                     const blocks = [];
                                                                     for (let i = 4; i < 7; i++) {
                                                                         if (daySchedule[i] === '\u200B') continue;
                                                                         let colSpan = 1;
                                                                         while (i + colSpan < 7 && daySchedule[i + colSpan] === '\u200B') colSpan++;
                                                                         blocks.push({ idx: i, colSpan, subject: daySchedule[i] });
                                                                     }
                                                                     return blocks.map(block => (
                                                                         <td key={block.idx} colSpan={block.colSpan}>
                                                                             <div className={`subject-cell ${getSubjectClass(block.subject)}`}>
                                                                                 {!block.subject || block.subject === 'Free' ? '-' : mapSubjectName(block.subject)}
                                                                             </div>
                                                                         </td>
                                                                     ));
                                                                 })()}
                                                             </tr>
                                                         );
                                                     })}
                                                 </tbody>
                                             </table>
                                         </div>
                                     </div>

                                     {/* Shared Footer */}
                                     <div className="pdf-only-component" style={{ borderTop: '0.5pt solid #e2e8f0', marginTop: '8mm', padding: '5mm 0' }}>
                                         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                             <div style={{ textAlign: 'left' }}>
                                                 <p style={{ fontSize: '7.5pt', color: '#475569', fontWeight: 700, margin: 0 }}>RGUKT CONNECT | Official Digital Ecosystem</p>
                                                 <p style={{ fontSize: '6.5pt', color: '#94a3b8', margin: 0 }}>Generated as an official digital record of RGUKT RK Valley</p>
                                             </div>
                                             <div style={{ textAlign: 'right' }}>
                                                 <p style={{ fontSize: '6.5pt', color: '#94a3b8', textTransform: 'uppercase', margin: 0 }}>Verification: {Math.random().toString(36).substr(2, 9).toUpperCase()}</p>
                                                 <p className="pdf-timestamp" style={{ fontSize: '6.5pt', color: '#64748b', marginTop: '2pt', margin: 0 }}>
                                                     Generated on: {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
                                                 </p>
                                             </div>
                                         </div>
                                     </div>
                                 </div>
                            ) : (
                                <div className="empty-state-card">
                                    <div className="empty-state-content">
                                        <Calendar size={64} className="empty-state-icon" />
                                        <h3 className="empty-state-title">Schedule Not Available</h3>
                                        <p className="empty-state-description">
                                            {schedule === 'NOT_FOUND'
                                                ? `We couldn't find a timetable for class "${user?.currentClass}". Please verify your class details or contact the coordinator.`
                                                : "Please navigate to your Profile and update your 'Class / Section' field to view your timetable."}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </section>
                    </>
                );

                return timetableContent;
            })()}




            {/* PDF Preview Modal - Uses Portal to ensure "on screen" feel on mobile */}
            {showPreview && createPortal(
                <div className="preview-modal-overlay no-pdf">
                    <div className="preview-modal-container">
                        <div className="preview-modal-header">
                            <h3>Timetable Preview</h3>
                            <button className="preview-close-btn" onClick={() => setShowPreview(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="preview-modal-body">
                            <div className="preview-a4-wrapper">
                                 <div id="timetable-modal-pdf" className="generating-pdf">
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
                                                 <p style={{ fontSize: '10pt', fontWeight: 800, color: '#1e293b', margin: 0 }}>Official Class Timetable</p>
                                             </div>
                                         </div>
                                         <div className="pdf-title-section" style={{ textAlign: 'left', border: 'none', margin: 0, padding: 0 }}>
                                             <h2 style={{ fontSize: '16pt', fontWeight: 900, color: '#0f172a', marginBottom: '2pt' }}>Class: {user?.currentClass || 'F-08'}</h2>
                                             <p style={{ fontSize: '9pt', color: '#64748b', fontWeight: 600 }}>Spring 2026 Academic Semester Schedule • RGUKT RK Valley</p>
                                         </div>
                                     </div>

                                     {/* Subtle Watermark */}
                                     <div className="pdf-only-component pdf-watermark" style={{
                                         position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-30deg)',
                                         fontSize: '100pt', fontWeight: 900, color: 'rgba(79, 70, 229, 0.04)', pointerEvents: 'none',
                                         zIndex: -1, whiteSpace: 'nowrap'
                                     }}>
                                         RGUKT CONNECT
                                     </div>

                                    <div className="table-responsive">
                                        <table className="timetable-table">
                                            <thead>
                                                <tr>
                                                    <th className="sticky-col">Day</th>
                                                    {[1, 2].map(p => (
                                                        <th key={p}>
                                                            <div className="period-title">P{p}</div>
                                                            <span className="period-time">{timeSlots[p - 1]}</span>
                                                        </th>
                                                    ))}
                                                    <th className="break-header">
                                                        <div className="period-title">BREAK</div>
                                                        <span className="period-time">{breaks[0] ? `${convertTo12Hour(breaks[0].start)} - ${convertTo12Hour(breaks[0].end)}` : '10:30 - 10:40'}</span>
                                                    </th>
                                                    {[3, 4].map(p => (
                                                        <th key={p}>
                                                            <div className="period-title">P{p}</div>
                                                            <span className="period-time">{timeSlots[p - 1]}</span>
                                                        </th>
                                                    ))}
                                                    <th className="lunch-header">
                                                        <div className="period-title">LUNCH</div>
                                                        <span className="period-time">{breaks[1] ? `${convertTo12Hour(breaks[1].start)} - ${convertTo12Hour(breaks[1].end)}` : '12:40 - 01:40'}</span>
                                                    </th>
                                                    {[5, 6].map(p => (
                                                        <th key={p}>
                                                            <div className="period-title">P{p}</div>
                                                            <span className="period-time">{timeSlots[p - 1]}</span>
                                                        </th>
                                                    ))}
                                                    <th className="break-header">
                                                        <div className="period-title">BREAK</div>
                                                        <span className="period-time">{breaks[2] ? `${convertTo12Hour(breaks[2].start)} - ${convertTo12Hour(breaks[2].end)}` : '03:40 - 03:50'}</span>
                                                    </th>
                                                    <th>
                                                        <div className="period-title">P7</div>
                                                        <span className="period-time">{timeSlots[6]}</span>
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {days.map(day => (
                                                    <tr key={day}>
                                                        <td className="day-cell">{day}</td>
                                                        {schedule[day]?.slice(0, 2).map((subject, idx) => (
                                                            <td key={idx}>
                                                                <div className={`subject-chip ${getSubjectClass(subject)}`}>
                                                                    {subject === 'Free' ? '-' : mapSubjectName(subject)}
                                                                </div>
                                                            </td>
                                                        ))}
                                                        <td className="break-cell"><div className="break-label">Break</div></td>
                                                        {schedule[day]?.slice(2, 4).map((subject, idx) => (
                                                            <td key={idx + 2}>
                                                                <div className={`subject-chip ${getSubjectClass(subject)}`}>
                                                                    {subject === 'Free' ? '-' : mapSubjectName(subject)}
                                                                </div>
                                                            </td>
                                                        ))}
                                                        <td className="lunch-cell"><div className="lunch-label">Lunch</div></td>
                                                        {schedule[day]?.slice(4, 6).map((subject, idx) => (
                                                            <td key={idx + 4}>
                                                                <div className={`subject-chip ${getSubjectClass(subject)}`}>
                                                                    {subject === 'Free' ? '-' : mapSubjectName(subject)}
                                                                </div>
                                                            </td>
                                                        ))}
                                                        <td className="break-cell"><div className="break-label">Break</div></td>
                                                        <td>
                                                            <div className={`subject-chip ${getSubjectClass(schedule[day]?.[6])}`}>
                                                                {schedule[day]?.[6] === 'Free' ? '-' : schedule[day]?.[6]}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                     <div className="pdf-only-component" style={{ borderTop: '0.5pt solid #e2e8f0', marginTop: '8mm', padding: '5mm 0', textAlign: 'center' }}>
                                         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                             <div style={{ textAlign: 'left' }}>
                                                 <p style={{ fontSize: '7.5pt', color: '#475569', fontWeight: 700, margin: 0 }}>RGUKT CONNECT | Official Digital Ecosystem</p>
                                                 <p style={{ fontSize: '6.5pt', color: '#94a3b8', margin: 0 }}>Generated as an official digital record of RGUKT RK Valley</p>
                                             </div>
                                             <div style={{ textAlign: 'right' }}>
                                                 <p style={{ fontSize: '6.5pt', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Verification Code: {Math.random().toString(36).substr(2, 9).toUpperCase()}</p>
                                                 <p className="pdf-timestamp" style={{ fontSize: '6.5pt', color: '#64748b', marginTop: '2pt', margin: 0 }}>
                                                     Captured on: {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
                                                 </p>
                                             </div>
                                         </div>
                                     </div>
                                 </div>
                            </div>
                        </div>

                        <div className="preview-modal-footer">
                            <button className="btn-cancel" onClick={() => setShowPreview(false)}>
                                Close
                            </button>
                            <button className="btn-confirm-download" onClick={handleDownloadPDF}>
                                <Download size={18} />
                                Download PDF
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Google Calendar Popup Modal */}
            {showGoogleCalendar && createPortal(
                <div className="google-calendar-overlay" onClick={() => setShowGoogleCalendar(false)}>
                    <div className="google-calendar-modal" onClick={e => e.stopPropagation()}>
                        <div className="calendar-modal-header">
                            <div className="calendar-modal-title">
                                <h3>Academic Calendar</h3>
                            </div>
                            <button className="calendar-close-btn" onClick={() => setShowGoogleCalendar(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="calendar-modal-body">
                            <CustomCalendar />
                        </div>
                        <div className="calendar-modal-footer">
                            <p className="text-[10px] opacity-60">Displaying Public Holidays & Academic Events</p>
                            <button className="btn-secondary-v2" onClick={() => setShowGoogleCalendar(false)}>Close</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Redesigned PDF Layout (Hidden safely from Screen) - Fixed for Android Engine */}
            {schedule && schedule !== 'NOT_FOUND' && (
                <div style={{ position: 'fixed', top: '-10000px', left: 0, width: '297mm', height: '210mm', zIndex: -1000, overflow: 'hidden', pointerEvents: 'none' }}>
                    <div 
                        id="timetable-pdf-redesign" 
                        className="pdf-redesign-container"
                    >
                    <div className="pdf-header-modern">
                        <div className="header-left">
                            <div className="pdf-logo-wrapper">
                                <svg width="100%" height="100%" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <rect width="512" height="512" rx="128" fill="#4f46e5"/>
                                    <path d="M256 120L64 210L256 300L448 210L256 120Z" fill="white"/>
                                    <path d="M128 240V320C128 320 180 370 256 370C332 370 384 320 384 320V240L256 300L128 240Z" fill="white"/>
                                    <path d="M416 210V340" stroke="white" strokeWidth="20" strokeLinecap="round"/>
                                    <circle cx="416" cy="350" r="15" fill="white"/>
                                </svg>
                            </div>
                            <div className="pdf-brand-info">
                                <h1 className="pdf-app-name">RGUKT <span className="accent">Connect</span></h1>
                                <p className="pdf-title">Weekly Academic Timetable</p>
                                <p className="pdf-subtitle">Official Student Portal • Spring 2026</p>
                            </div>
                        </div>
                        <div className="header-right">
                            <div className="pdf-gen-meta">
                                <div className="meta-item">
                                    <span>Date: {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                </div>
                                <div className="meta-item">
                                    <span>Time: {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                            </div>
                            <div className="pdf-class-tag">
                                <span className="label">CLASS SECTION</span>
                                <span className="value">{user?.currentClass || 'N/A'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="pdf-grid-wrapper">
                        <table className="pdf-main-grid">
                            <thead>
                                <tr>
                                    <th className="day-header">DAYS</th>
                                    {timeSlots.map((slot, idx) => (
                                        <th key={idx}>
                                            <div className="p-num">P{idx + 1}</div>
                                            <div className="p-time">{slot.replace(':00', '')}</div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {days.map(day => (
                                    <tr key={day}>
                                        <td className="day-name">{day}</td>
                                        {(schedule[day] || []).map((subject, idx) => (
                                            <td key={idx}>
                                                <div className={`pdf-subject-box ${getSubjectClass(subject)}`}>
                                                    {subject === 'Free' || subject === '-' ? (
                                                        <span className="free-dash">-</span>
                                                    ) : (
                                                        <span className="sub-text">{mapSubjectName(subject)}</span>
                                                    )}
                                                </div>
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="pdf-extras">
                        <div className="pdf-legend">
                            <div className="legend-item"><span className="box lab"></span> LAB</div>
                            <div className="legend-item"><span className="box lecture"></span> THEORY</div>
                            <div className="legend-item"><span className="box free"></span> FREE</div>
                        </div>
                        <div className="pdf-watermark">RGUKT RK Valley</div>
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
            )}
        </div>
    );
};

export default TimeTable;
