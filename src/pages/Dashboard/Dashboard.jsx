import { Navigate } from 'react-router-dom';
import BirthdayPopup from '../../components/Dashboard/BirthdayPopup';
import NoticeCard from '../../components/NoticeCard/NoticeCard';
import CourseSelectionModal from '../../components/Common/CourseSelectionModal';
import CgpaModal from '../../components/Dashboard/CgpaModal';
import AttendanceBottomSheet from '../../components/Layout/AttendanceBottomSheet';
import CompleteProfileModal from '../../components/Profile/CompleteProfileModal';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { BookOpen, Users, FileText, Clock, Award, Zap, LogOut, Settings, GraduationCap, ClipboardList, MessageSquare, ArrowUpRight, Calendar, Pin, ChevronRight } from 'lucide-react';
import { db, bulkUploadDb, attendanceDb } from '../../config/firebase';
import { doc, getDoc, collection, query, where, onSnapshot, collectionGroup } from 'firebase/firestore';
import { parseTimeRange, formatAttendancePercent } from '../../utils/formatUtils';
import { noticeService } from '../../services/noticeService';
import { PROGRAMS } from '../../config/academics';

import './Dashboard.css';


const EXAM_TYPE_META = {
    semester: { badge: 'SEM', color: '#a855f7', bg: 'rgba(168,85,247,0.12)', icon: GraduationCap },
    mid:      { badge: 'MID', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  icon: FileText },
    supply:   { badge: 'SUP', color: '#f97316', bg: 'rgba(249,115,22,0.12)', icon: Zap },
    others:   { badge: 'REG', color: '#10b981', bg: 'rgba(16,185,129,0.12)', icon: ClipboardList },
};

/* --- Reusable Components --- */
const StatCard = ({ label, value, trend, trendUp, icon: Icon, colorClass, theme }) => (
    <div className={`stat-card ${theme || ''}`}>
        <div className="stat-card-top">
            <div className={`stat-icon-box ${colorClass} bg-opacity-10`}>
                <Icon size={20} />
            </div>
        </div>
        
        <h3 className="stat-value">{value}</h3>
        
        <p className="stat-label">
            <span className="stat-label-badge">{label}</span>
        </p>

        {trend && (
            <div className="stat-trend-box mt-2">
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${trendUp ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} flex items-center justify-center gap-1`}>
                    {trend} {trendUp ? <ArrowUpRight size={10} /> : <div className="rotate-180"><ArrowUpRight size={10} /></div>}
                </span>
            </div>
        )}
    </div>
);

const SectionTitle = ({ title, subtitle, action, onActionClick }) => (
    <div className="section-header-premium">
        <div className="section-title-wrapper-premium">
            <h2 className="section-title-premium">{title}</h2>
            {subtitle && <p className="section-subtitle-premium">{subtitle}</p>}
        </div>
        {action && (
            <button onClick={onActionClick} className="btn btn-ghost text-xs font-bold text-[var(--color-brand)] hover:scale-105 active:scale-95">
                {action}
            </button>
        )}
    </div>
);

const AnimatedDigit = ({ value }) => {
    const [displayValue, setDisplayValue] = React.useState(value);
    const [prevValue, setPrevValue] = React.useState(value);
    const [isAnimating, setIsAnimating] = React.useState(false);

    React.useEffect(() => {
        if (value !== displayValue) {
            setPrevValue(displayValue);
            setDisplayValue(value);
            setIsAnimating(true);
            const timer = setTimeout(() => {
                setIsAnimating(false);
            }, 600); // Increased for smoother feel
            return () => clearTimeout(timer);
        }
    }, [value, displayValue]);

    if (value === ':') return <span className="timer-colon">:</span>;

    return (
        <span className="digit-container">
            <span className={`digit-flipper ${isAnimating ? 'animating' : ''}`}>
                <span className="digit-current">{prevValue}</span>
                <span className="digit-next">{displayValue}</span>
            </span>
        </span>
    );
};

const StudentDashboard = ({ user }) => {
    const navigate = useNavigate();
    const [currentTime, setCurrentTime] = React.useState(new Date());

    const [isCourseModalOpen, setIsCourseModalOpen] = React.useState(false);
    const [isAttendanceSheetOpen, setIsAttendanceSheetOpen] = React.useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = React.useState(false);
    const [isCgpaModalOpen, setIsCgpaModalOpen] = React.useState(false);

    // Sync profile completion state once background progressive loading finishes
    React.useEffect(() => {
        if (user && !user.loadingProfile) {
            const isCompleted = Boolean(user.profileCompleted);
            setIsProfileModalOpen(!isCompleted);
        }
    }, [user?.profileCompleted, user?.loadingProfile]);
    
    // --- Animation Customization State ---
    const defaultCardPrefs = { courses: true, attendance: true, cgpa: true, support: true };
    const [cardPrefs, setCardPrefs] = useState(() => {
        try {
            const saved = localStorage.getItem('dashboard_card_prefs');
            return saved ? { ...defaultCardPrefs, ...JSON.parse(saved) } : defaultCardPrefs;
        } catch (e) { return defaultCardPrefs; }
    });

    useEffect(() => {
        const handleSettingsChange = () => {
            try {
                const saved = localStorage.getItem('dashboard_card_prefs');
                if (saved) setCardPrefs({ ...defaultCardPrefs, ...JSON.parse(saved) });
            } catch (e) {
                console.warn("Error parsing dashboard card preferences:", e);
            }
        };
        window.addEventListener('dashboardSettingsChanged', handleSettingsChange);
        return () => window.removeEventListener('dashboardSettingsChanged', handleSettingsChange);
    }, []);



    React.useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const currentDay = currentTime.toLocaleDateString('en-US', { weekday: 'long' });
    const formattedDate = currentTime.toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric'
    });

    const [todaySchedule, setTodaySchedule] = React.useState(null);
    const [isTableLoading, setIsTableLoading] = React.useState(true);
    const [todayEvents, setTodayEvents] = React.useState([]);

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
    const [timeline, setTimeline] = React.useState(defaultTimeline);

    const convertTo12Hour = (time24) => {
        const [hours, minutes] = time24.split(':');
        const h = parseInt(hours, 10);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12.toString().padStart(2, '0')}:${minutes} ${ampm}`;
    };

    React.useEffect(() => {
        const fetchSettings = async () => {
            try {
                const settingsRef = doc(db, "settings", "timetable");
                const docSnap = await getDoc(settingsRef);
                if (docSnap.exists() && docSnap.data().timeline) {
                    setTimeline(docSnap.data().timeline);
                }
            } catch (error) {
                console.error("Error fetching timetable settings:", error);
            }
        };
        fetchSettings();
    }, []);

    const [examData, setExamData] = React.useState(null);

    React.useEffect(() => {
        const fetchExamData = async () => {
            if (!user?.uid) return;
            const cacheKey = `dashboard_exam_schedule_${user.uid}`;
            const cached = null; // sessionStorage.getItem(cacheKey); disabled to allow real-time updates
            if (cached) {
                setExamData(JSON.parse(cached));
                return;
            }
            try {
                const docSnap = await getDoc(doc(db, 'settings', 'exam_schedule'));
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setExamData(data);
                    sessionStorage.setItem(cacheKey, JSON.stringify(data));
                }
            } catch (error) {
                console.error("Error fetching exams:", error);
            }
        };
        fetchExamData();
    }, [user?.uid]);

    const [attendanceRate, setAttendanceRate] = React.useState('0%');
    const [currentCgpa, setCurrentCgpa] = React.useState('0.00');
    const [currentCgpaRecord, setCurrentCgpaRecord] = React.useState(null);
    
    const [latestNotices, setLatestNotices] = React.useState([]);
    const [noticeInteractions, setNoticeInteractions] = React.useState({});

    React.useEffect(() => {
        const fetchNotices = async () => {
            if (user) {
                const cacheKeyNotices = `dash_notices_${user.uid}`;
                const cacheKeyInter = `dash_inter_${user.uid}`;
                
                const cachedN = sessionStorage.getItem(cacheKeyNotices);
                const cachedI = sessionStorage.getItem(cacheKeyInter);
                
                if (cachedN && cachedI) {
                    setLatestNotices(JSON.parse(cachedN));
                    setNoticeInteractions(JSON.parse(cachedI));
                    return;
                }

                try {
                    const fetchedNotices = await noticeService.getEligibleNotices(user);
                    const interactions = await noticeService.getUserInteractions(user.studentId || user.uid);
                    
                    const topNotices = fetchedNotices.slice(0, 3);
                    setLatestNotices(topNotices);
                    setNoticeInteractions(interactions);
                    
                    sessionStorage.setItem(cacheKeyNotices, JSON.stringify(topNotices));
                    sessionStorage.setItem(cacheKeyInter, JSON.stringify(interactions));
                } catch (e) {
                    console.error("Failed to fetch dashboard notices", e);
                }
            }
        };
        fetchNotices();
    }, [user]);

    React.useEffect(() => {
        let unsubscribeLive = null;
        
        const fetchAttendance = async () => {
            if (!user?.studentId && !user?.uid) {
                setAttendanceRate('0%');
                return;
            }
            try {
                // 1. Live Attendance from new system
                const attendanceRef = collectionGroup(attendanceDb, 'records');
                const cleanId = String(user.studentId || user.rollNo || user.uid).toUpperCase().replace(/\s+/g, '').replace(/^RGUKT-/i, '');
                const q = query(attendanceRef, where('studentId', '==', cleanId));
                
                unsubscribeLive = onSnapshot(q, async (snapshot) => {
                    if (!snapshot.empty) {
                        const records = snapshot.docs.map(d => d.data());
                        let totalP = 0;
                        let totalC = records.length;
                        records.forEach(r => {
                            if (r.status === 'present') totalP++;
                        });
                        const rate = totalC > 0 ? (totalP / totalC) * 100 : 0;
                        setAttendanceRate(formatAttendancePercent(rate));
                    } else {
                        // 2. Fallback to legacy bulk upload system
                        if (user?.studentId) {
                            const id = user.studentId.toUpperCase().replace(/^RGUKT-/i, '').trim();
                            const docSnap = await getDoc(doc(bulkUploadDb, 'attendance_rates', id));
                            if (docSnap.exists()) {
                                setAttendanceRate(formatAttendancePercent(docSnap.data().consolidated));
                            } else {
                                setAttendanceRate('0%');
                            }
                        } else {
                            setAttendanceRate('0%');
                        }
                    }
                });
            } catch (error) {
                console.error("Error fetching attendance:", error);
                setAttendanceRate('0%');
            }
        };
        fetchAttendance();
        
        return () => {
            if (unsubscribeLive) unsubscribeLive();
        };
    }, [user]);

    React.useEffect(() => {
        const fetchCgpa = async () => {
            if (!user?.studentId) {
                setCurrentCgpa('0.00');
                return;
            }
            try {
                const id = user.studentId.toUpperCase().replace(/^RGUKT-/i, '').trim();
                const cacheKey = `dashboard_cgpa_${id}`;
                
                const cached = null; // sessionStorage.getItem(cacheKey); disabled to allow real-time updates
                if (cached) {
                    const parsed = JSON.parse(cached);
                    setCurrentCgpa(parsed.cgpa ? parseFloat(parsed.cgpa).toFixed(2) : '0.00');
                    setCurrentCgpaRecord(parsed);
                    return;
                }

                let cgpaData = null;

                // 1. Try to load local PUC results data first
                try {
                    const res = await fetch(`/data/puc_results.json?v=${Date.now()}`);
                    if (res.ok) {
                        const allResults = await res.json();
                        if (allResults[id]) {
                            cgpaData = allResults[id];
                            // Also map the data into the structure CgpaModal expects
                            cgpaData.source = 'local_excel';
                        }
                    }
                } catch (e) {
                    console.log("Local PUC results not found or fetch error", e);
                }

                // 2. Fallback to Firebase Bulk Upload Data
                if (!cgpaData) {
                    const docSnap = await getDoc(doc(bulkUploadDb, 'cgpa_records', id), { source: 'server' });
                    if (docSnap.exists()) {
                        cgpaData = docSnap.data();
                    }
                }

                if (cgpaData) {
                    setCurrentCgpa(cgpaData.cgpa ? parseFloat(cgpaData.cgpa).toFixed(2) : '0.00');
                    setCurrentCgpaRecord(cgpaData);
                    sessionStorage.setItem(cacheKey, JSON.stringify(cgpaData));
                } else {
                    setCurrentCgpa('0.00');
                    setCurrentCgpaRecord(null);
                    // Cache the empty result to prevent repeated failures
                    sessionStorage.setItem(cacheKey, JSON.stringify({ cgpa: '0.00' }));
                }
            } catch (error) {
                console.error("Error fetching cgpa:", error);
                setCurrentCgpa('0.00');
            }
        };
        fetchCgpa();
    }, [user?.studentId]);

    React.useEffect(() => {
        const fetchEvents = () => {
            const saved = localStorage.getItem('student_calendar_events');
            const events = saved ? JSON.parse(saved) : [];
            const todayStr = new Date().toISOString().split('T')[0];
            setTodayEvents(events.filter(e => e.date === todayStr));
        };
        fetchEvents();
        window.addEventListener('storage', fetchEvents);
        return () => window.removeEventListener('storage', fetchEvents);
    }, [user?.uid]);

    React.useEffect(() => {
        const fetchTodaySchedule = async () => {
            if (!user?.uid) return;
            setIsTableLoading(true);
            const cacheKey = `dashboard_schedule_${user.uid}_${currentDay}`;
            const cached = null; // sessionStorage.getItem(cacheKey); disabled to allow real-time updates
            if (cached && JSON.parse(cached) !== null && JSON.parse(cached) !== 'NOT_FOUND') {
                setTodaySchedule(JSON.parse(cached));
                setIsTableLoading(false);
                return;
            }

            let cls = user?.currentClass || '';

            if (!cls && user?.studentId) {
                try {
                    const docSnap = await getDoc(doc(db, "students_master", user.studentId.toUpperCase().replace(/^RGUKT-/i, '')));
                    if (docSnap.exists()) {
                        const raw = docSnap.data();
                        cls = raw.classSection || raw.currentClass || '';
                    }
                } catch (e) {
                    console.error("Proactive dashboard fetch failed:", e);
                }
            }

            if (!cls) {
                setIsTableLoading(false);
                return;
            }
            try {
                let docSnap = { exists: () => false };
                let docRef = null;
                const branch = user?.department || user?.branch || '';
                let section = cls;
                
                let rawBranch = branch.toUpperCase();
                let branchUpper = rawBranch;
                if (/CSE\(AI&ML\)|CSC\s*\(AI&ML\)|AIML|ARTIFICIAL\s*INTELLIGENCE|AI\s*&?\s*ML/i.test(rawBranch)) branchUpper = 'CSE(AI&ML)';
                else if (/ECE|E\.C\.E|ELECTRONICS/i.test(rawBranch)) branchUpper = 'ECE';
                else if (/CSE|C\.S\.E|COMPUTER/i.test(rawBranch)) branchUpper = 'CSE';
                else if (/CIVIL|CE|C\.E/i.test(rawBranch)) branchUpper = 'CE';
                else if (/MECH|M\.E|ME/i.test(rawBranch)) branchUpper = 'ME';
                else if (/MME|METALLURGY/i.test(rawBranch)) branchUpper = 'MME';
                else if (/CHEM|CHE|C\.H\.E/i.test(rawBranch)) branchUpper = 'CHE';
                else if (/EEE|E\.E\.E/i.test(rawBranch)) branchUpper = 'EEE';
                
                // Clean up section string (remove "section" and branch name)
                let cleanSection = section.toUpperCase();
                cleanSection = cleanSection.replace(/SECTION\s*[-_]?\s*/i, '');
                if (branchUpper && branchUpper !== 'CSE(AI&ML)') {
                    const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    cleanSection = cleanSection.replace(new RegExp(escapeRegExp(branchUpper), 'i'), '');
                }
                cleanSection = cleanSection.replace(/^[-_]+|[-_]+$/g, '').trim();
                
                section = cleanSection;
                
                if (['CSE(AI&ML)', 'CSC (AI&ML)', 'AIML'].includes(section.toUpperCase()) || /ARTIFICIALINTELLIGENCE|AIML/i.test(section)) {
                    section = 'AIML';
                }
                
                if (section === 'AIML') branchUpper = 'CSE(AI&ML)';

                if (branchUpper && section) {
                    try {
                        docRef = doc(db, "timetables", branchUpper, "sections", section.toUpperCase());
                        docSnap = await getDoc(docRef);
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
                        console.log("Matched legacy timetable variant on dashboard:", matchedResult.variant);
                    }
                }
                
                if (docSnap.exists()) {
                    const fullSchedule = docSnap.data();
                    const daySchedule = fullSchedule[currentDay] || null;
                    setTodaySchedule(daySchedule);
                    sessionStorage.setItem(cacheKey, JSON.stringify(daySchedule));
                } else {
                    setTodaySchedule(null);
                    sessionStorage.setItem(cacheKey, JSON.stringify(null));
                }
            } catch (error) {
                console.error("Error fetching today schedule:", error);
            } finally {
                setIsTableLoading(false);
            }
        };

        fetchTodaySchedule();
    }, [user?.currentClass, user?.studentId, currentDay]);

    const subjectMapping = {
        'M': 'Mathematics',
        'P': 'Physics',
        'C': 'Chemistry',
        'E': 'English',
        'IT': 'Info Technology',
        'B': 'Biology',
        'T': 'Telugu',
        'MT': 'Math Tutorial',
        'PT': 'Physics Tutorial',
        'CT': 'Chemistry Tutorial',
        'ET': 'English Tutorial',
        'CL': 'Chemistry Lab',
        'PL': 'Physics Lab',
        'BL': 'Biology Lab',
        'ITL': 'IT Lab',
        'Free': 'Free Period',
        '-': 'Free Period'
    };

    const getFullSubjectName = (code) => subjectMapping[code.toUpperCase()] || code;

    // Timeline Configuration removed (now in state)

    const getCurrentStatus = () => {
        const now = currentTime;
        const isWeekend = currentDay === 'Sunday';

        // 1. Check for Exams First (Higher Priority)
        if (examData) {
            const todayStr = currentTime.toLocaleDateString('en-GB').replace(/\//g, '-'); // DD-MM-YYYY format
            const allExams = [];
            
            if (examData.schedules && Array.isArray(examData.schedules)) {
                examData.schedules.forEach(s => {
                    if (s.isVisible && s.exams) allExams.push(...s.exams);
                });
            } else if (examData.exams) {
                allExams.push(...examData.exams);
            }

            const todayExam = allExams.find(e => e.date === todayStr);

            if (todayExam) {
                const range = parseTimeRange(todayExam.time, now);
                if (range) {
                    if (now >= range.start && now < range.end) {
                        // EXAM IS ONGOING
                        const diff = range.end - now;
                        const mins = Math.floor(diff / 1000 / 60);
                        const secs = Math.floor((diff / 1000) % 60);
                        return {
                            label: 'EXAM ONGOING',
                            sub: todayExam.subject,
                            time: `${mins}:${secs.toString().padStart(2, '0')}`,
                            timeLabel: 'remaining',
                            active: true,
                            isExam: true
                        };
                    } else if (now < range.start) {
                        // EXAM IS UPCOMING TODAY
                        return {
                            label: 'UPCOMING EXAM',
                            sub: todayExam.subject,
                            time: todayExam.time.split('-')[0].trim(),
                            timeLabel: 'starts at',
                            isExam: true
                        }
                    }
                }
            }
        }

        // 2. Fallback to Regular Class Timetable
        if (isWeekend) return { label: 'Weekend', sub: 'Enjoy your break!', time: '' };

        for (const slot of timeline) {
            const [sH, sM] = slot.start.split(':').map(Number);
            const [eH, eM] = slot.end.split(':').map(Number);

            const start = new Date(now);
            start.setHours(sH, sM, 0, 0);

            const end = new Date(now);
            end.setHours(eH, eM, 0, 0);

            if (now >= start && now < end) {
                let label = slot.label;
                let sub = '';

                if (slot.type === 'period' && todaySchedule) {
                    const code = todaySchedule[slot.index];
                    if (code) {
                        sub = getFullSubjectName(code);
                    }
                } else if (slot.type === 'break') {
                    sub = slot.label === 'SB' ? 'SHORT BREAK' : 'LUNCH BREAK';
                }

                // Calculate remaining time
                const diff = end - now;
                const mins = Math.floor(diff / 1000 / 60);
                const secs = Math.floor((diff / 1000) % 60);
                const timerStr = `${mins}:${secs.toString().padStart(2, '0')}`;
                const timerLabel = `remaining`;

                return { label, sub, timerStr, timeLabel: timerLabel, active: true };
            }
        }

        const firstStart = new Date(now).setHours(8, 30, 0, 0);
        if (now < firstStart) return { label: 'Ready?', sub: 'First class at 8:30 AM', time: '' };

        return { label: 'Done', sub: 'No more classes today', time: '' };
    };

    const getGreeting = () => {
        const hour = currentTime.getHours();
        if (hour >= 5 && hour < 12) return 'Good Morning';
        if (hour >= 12 && hour < 17) return 'Good Afternoon';
        if (hour >= 17 && hour < 21) return 'Good Evening';
        return 'Good Night';
    };

    const currentStatus = getCurrentStatus();

    const timeSlots = timeline.filter(t => t.type === 'period').map(t => `${convertTo12Hour(t.start)} - ${convertTo12Hour(t.end)}`);

    const renderSchedule = () => {
        if (isTableLoading) {
            return (
                <div className="p-8 text-center">
                    <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                    <p className="text-xs text-[var(--color-text-muted)]">Fetching schedule...</p>
                </div>
            );
        }

        const isSriramanavami = currentTime.getMonth() === 2 && currentTime.getDate() === 27 && currentTime.getFullYear() === 2026;

        if (isSriramanavami) {
            return (
                <div className="schedule-holiday-box animate-fade-in">
                    <h3 className="holiday-title">Happy Sriramanavami! 🏹</h3>
                    <p className="holiday-subtitle">Today is a holiday. May the divine blessings of Lord Rama and Sita bring peace and joy to your life.</p>
                </div>
            );
        }

        if (currentDay === 'Sunday') {
            return (
                <div className="schedule-sunday-empty animate-fade-in">
                    <div className="sunday-icon-box">
                        <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>
                            flights_and_hotels
                        </span>
                    </div>
                    <h3>I'm Off Today!</h3>
                    <p>Timetable says: “See you tomorrow, I'm off today!”</p>
                </div>
            );
        }

        if (!todaySchedule || todaySchedule.length === 0) {
            return (
                <div className="schedule-empty">
                    <Calendar size={48} className="empty-icon" />
                    <p>No classes scheduled for today.</p>
                </div>
            );
        }

        const items = [];
        
        const groupedPeriods = [];
        let currentGroup = null;

        for (let i = 0; i < 7; i++) {
            let subjectCode = todaySchedule[i];
            let isContinuation = subjectCode === '\u200B';

            if (isContinuation && currentGroup) {
                if (!(currentGroup.endIndex === 3 && i === 4)) {
                    currentGroup.endIndex = i;
                    continue;
                }
            }
            
            let subjectNameToUse;
            let isFreeToUse;
            
            if (isContinuation && currentGroup && currentGroup.endIndex === 3 && i === 4) {
                subjectNameToUse = currentGroup.subjectName;
                isFreeToUse = currentGroup.isFree;
            } else {
                let isFree = !subjectCode || subjectCode.trim() === '' || subjectCode === '-' || subjectCode === 'Free';
                subjectCode = isFree ? 'Free Period' : subjectCode;
                subjectNameToUse = isFree ? 'Free Period' : getFullSubjectName(subjectCode);
                isFreeToUse = isFree;
            }

            if (!currentGroup) {
                currentGroup = { subjectName: subjectNameToUse, isFree: isFreeToUse, startIndex: i, endIndex: i };
            } else {
                if (currentGroup.subjectName === subjectNameToUse && !(currentGroup.endIndex === 3 && i === 4)) {
                    currentGroup.endIndex = i;
                } else {
                    groupedPeriods.push(currentGroup);
                    currentGroup = { subjectName: subjectNameToUse, isFree: isFreeToUse, startIndex: i, endIndex: i };
                }
            }
        }
        if (currentGroup) {
            groupedPeriods.push(currentGroup);
        }

        const breakPoints = {};
        let periodCount = -1;
        timeline.forEach(t => {
            if (t.type === 'period') {
                periodCount++;
            } else if (t.type === 'break') {
                breakPoints[periodCount] = {
                    type: 'break',
                    label: t.label,
                    time: `${convertTo12Hour(t.start)} - ${convertTo12Hour(t.end)}`,
                    badge: t.label.toLowerCase().includes('lunch') ? 'L' : 'B',
                    className: t.label.toLowerCase().includes('lunch') ? 'lunch-item' : 'break-item'
                };
            }
        });

        for (let i = 0; i < groupedPeriods.length; i++) {
            const group = groupedPeriods[i];
            const startTime = timeSlots[group.startIndex].split(' - ')[0];
            const endTime = timeSlots[group.endIndex].split(' - ')[1];
            
            const badgeText = group.startIndex === group.endIndex 
                ? `P${group.startIndex + 1}` 
                : `P${group.startIndex + 1}-P${group.endIndex + 1}`;

            items.push(
                <div key={`group-${group.startIndex}`} className={`schedule-item ${group.isFree ? 'is-free' : ''}`}>
                    <div 
                        className="period-badge" 
                        style={group.startIndex !== group.endIndex ? { fontSize: '0.65rem', padding: '0 4px', width: 'auto', borderRadius: '12px' } : {}}
                    >
                        {badgeText}
                    </div>
                    <div className="item-details">
                        <div className="item-subject">{group.subjectName}</div>
                        <div className="item-time">{startTime} - {endTime}</div>
                    </div>
                </div>
            );

            if (breakPoints[group.endIndex] && group.endIndex < 6) {
                const b = breakPoints[group.endIndex];
                items.push(
                    <div key={`break-${group.endIndex}`} className={`schedule-item ${b.className}`}>
                        <div className="period-badge">{b.badge}</div>
                        <div className="item-details">
                            <div className="item-subject">{b.label}</div>
                            <div className="item-time">{b.time}</div>
                        </div>
                    </div>
                );
            }
        }

        return items;
    };

    return (
        <div className="animate-fade-in dashboard-container">
            {/* Mandatory Profile Setup Modal */}
            <CompleteProfileModal 
                isOpen={isProfileModalOpen} 
                user={user} 
            />

            {isAttendanceSheetOpen && (
                <AttendanceBottomSheet 
                    isOpen={isAttendanceSheetOpen}
                    onClose={() => setIsAttendanceSheetOpen(false)}
                    user={user}
                />
            )}

            <CgpaModal 
                isOpen={isCgpaModalOpen}
                onClose={() => setIsCgpaModalOpen(false)}
                cgpaValue={currentCgpa}
                cgpaRecord={currentCgpaRecord}
                studentId={user?.studentId}
                user={user}
            />

            <CourseSelectionModal 
                isOpen={isCourseModalOpen}
                onClose={() => setIsCourseModalOpen(false)}
            />



            <main className="dashboard-main scrollbar-hide">
            {user.loadingProfile ? (
                <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
                    <div className="animate-spin w-10 h-10 border-4 border-brand border-t-transparent rounded-full mb-4"></div>
                    <p className="text-sm font-bold text-[var(--color-text-muted)] uppercase tracking-widest">Securing Session...</p>
                </div>
            ) : (
                <>
            {/* Premium Animated Welcome Header */}
            <header className="dashboard-header-animated anim-theme-flow">
                <div className="border-animation-container">
                    <svg className="header-border-svg" width="100%" height="100%">
                        <defs>
                            <linearGradient id="theme-gradient-flow" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="var(--anim-primary)" />
                                <stop offset="50%" stopColor="var(--anim-secondary)" />
                                <stop offset="100%" stopColor="var(--anim-primary)" />
                            </linearGradient>
                            <linearGradient id="wave-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="var(--anim-primary)" stopOpacity="0.2" />
                                <stop offset="50%" stopColor="var(--anim-primary)" />
                                <stop offset="100%" stopColor="var(--anim-primary)" stopOpacity="0.2" />
                            </linearGradient>
                            <linearGradient id="streak-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="transparent" />
                                <stop offset="50%" stopColor="var(--anim-primary)" />
                                <stop offset="100%" stopColor="var(--anim-secondary)" />
                            </linearGradient>
                        </defs>
                        <style>
                            {`
                            .dashboard-header-animated {
                                border-radius: 14px !important;
                                padding: 0.75rem 1.25rem !important;
                            }
                            .force-animate-border {
                                stroke: rgba(139, 92, 246, 0.6);
                                stroke-width: 1.5px;
                                rx: 14px;
                                ry: 14px;
                                animation: softBreathe 4s ease-in-out infinite alternate;
                            }
                            @keyframes softBreathe {
                                0% { opacity: 0.3; stroke-width: 1.5px; }
                                100% { opacity: 1; stroke-width: 2px; }
                            }
                            `}
                        </style>
                        {/* Static Border */}
                        <rect 
                            className="force-animate-border"
                            x="1.5" y="1.5" 
                            pathLength="100"
                            style={{ width: 'calc(100% - 3px)', height: 'calc(100% - 3px)' }}
                        />
                    </svg>
                </div>

                <div className="header-content-premium">
                    <div className="header-left-box">
                        <span className="welcome-label">WELCOME BACK,</span>
                        <h1 
                            className="student-name-premium animate-text-shine"
                            style={{ 
                                '--name-size': (user.fullName || 'Student').length > 20 ? '1.1rem' 
                                            : (user.fullName || 'Student').length > 15 ? '1.3rem' 
                                            : '1.5rem' 
                            }}
                        >
                            {user.fullName || 'Student'}
                        </h1>
                    </div>
                    {user.studentId && (
                        <div className="student-id-pill-new">
                            {user.studentId?.replace(/^RGUKT-/i, '')}
                        </div>
                    )}
                </div>
            </header>

            {/* Stats Grid */}
            {Object.values(cardPrefs).some(Boolean) && (
            <div className="stats-grid">

                {cardPrefs.courses && (
                <div onClick={() => setIsCourseModalOpen(true)} className="cursor-pointer transition-transform active:scale-95">
                    <StatCard icon={BookOpen} label="Registered Courses" value="06" colorClass="bg-blue-100 text-blue-600" theme="theme-blue" />
                </div>
                )}
                {cardPrefs.attendance && (
                <div onClick={() => setIsAttendanceSheetOpen(true)} className="cursor-pointer transition-transform active:scale-95">
                    <StatCard icon={Clock} label="Attendance Rate" value={attendanceRate} colorClass="bg-emerald-100 text-emerald-600" theme="theme-emerald" />
                </div>
                )}
                {cardPrefs.cgpa && (
                <div onClick={() => setIsCgpaModalOpen(true)} className="cursor-pointer transition-transform active:scale-95">
                    <StatCard icon={Award} label="Current CGPA" value={currentCgpa} colorClass="bg-purple-100 text-purple-600" theme="theme-purple" />
                </div>
                )}
                {cardPrefs.support && (
                <div onClick={() => navigate('/complaints')} className="cursor-pointer transition-transform active:scale-95">
                    <StatCard icon={MessageSquare} label="Support & Issues" value="Help Desk" colorClass="bg-orange-100 text-orange-600" theme="theme-orange" />
                </div>
                )}
            </div>
            )}

            <div className="grid grid-cols-1 gap-8">
                {/* Main Column */}
                <div className="flex flex-col gap-4">
                    
                    {/* Pinned Semesters */}
                    {user?.favoriteSemesters?.some(fav => fav.isPinned) && (
                        <section className="animate-fade-in mb-2">
                            <SectionTitle title="Pinned Semesters" subtitle="Quick Access" />
                            <div className="flex flex-col gap-3 mt-4">
                                {user.favoriteSemesters.filter(fav => fav.isPinned).map((fav, idx) => {
                                    let displaySubtitle = fav.subtitle || '';
                                    if (fav.branchId && fav.programId && fav.yearId) {
                                        const program = PROGRAMS.find(p => p.id === fav.programId);
                                        if (program) {
                                            displaySubtitle = displaySubtitle.replace(`${program.label} • `, '').replace(program.label, '').trim();
                                            const year = program.years.find(y => y.id === fav.yearId);
                                            if (year && year.branches) {
                                                const branch = year.branches.find(b => b.id === fav.branchId);
                                                if (branch && !displaySubtitle.includes(branch.label)) {
                                                    displaySubtitle += (displaySubtitle ? ` • ` : '') + branch.label;
                                                }
                                            }
                                        }
                                    }
                                    return (
                                        <div 
                                            key={idx}
                                            className="dashboard-event-card transition-transform active:scale-95"
                                            style={{ 
                                                cursor: 'pointer', 
                                                background: 'var(--color-surface)', 
                                                border: '1px solid var(--color-border)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                gap: '12px',
                                                padding: '16px',
                                                borderRadius: '16px'
                                            }}
                                            onClick={() => navigate(`/courses/${fav.yearId}/${fav.semesterId}?branch=${fav.branchId}`)}
                                        >
                                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', minWidth: 0, flex: 1 }}>
                                                <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '10px', borderRadius: '12px', color: '#6366f1', flexShrink: 0 }}>
                                                    <Pin size={20} fill="currentColor" />
                                                </div>
                                                <div style={{ minWidth: 0, flex: 1 }}>
                                                    <h4 style={{ margin: 0, fontWeight: 800, color: 'var(--color-text-main)', fontSize: '1.05rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {fav.title}
                                                    </h4>
                                                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', fontWeight: 700, marginTop: '2px', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {displaySubtitle}
                                                    </span>
                                                </div>
                                            </div>
                                            <ChevronRight size={20} style={{ color: 'var(--color-text-muted)', opacity: 0.5, flexShrink: 0 }} />
                                        </div>
                                    )
                                })}
                            </div>
                        </section>
                    )}

                    {latestNotices.length > 0 && (
                        <section className="animate-fade-in mb-2">
                            <SectionTitle title="Latest Notices" subtitle="Campus Announcements" action="View All" onActionClick={() => navigate('/notices')} />
                            <div className="flex flex-col gap-3 mt-4">
                                {latestNotices.map(notice => (
                                    <NoticeCard 
                                        key={notice.id} 
                                        notice={notice} 
                                        isRead={noticeInteractions[notice.id]?.isRead || false} 
                                    />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* CASE 1: Tasks exist -> Show ABOVE Schedule */}
                    {todayEvents.length > 0 && (
                        <section className="animate-fade-in">
                            <SectionTitle title="Today's Tasks" subtitle="Calendar" action="View All" />
                            <div className="calendar-events-section">
                                {todayEvents.map(event => (
                                    <div key={event.id} className={`dashboard-event-card ${event.category.toLowerCase()}`} onClick={() => navigate('/timetable')}>
                                        <div className="event-time-badge">
                                            <Clock size={12} />
                                            {event.time || 'All Day'}
                                        </div>
                                        <div className="event-info">
                                            <h4>{event.title}</h4>
                                            <span className="event-category-tag">{event.category}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    <section>
                        <SectionTitle title="Today's Schedule" subtitle={formattedDate} />
                        <div className="schedule-card">
                            <div className="schedule-list">
                                {renderSchedule()}
                            </div>
                            <div className="schedule-footer">
                                <button 
                                    onClick={() => navigate('/timetable')}
                                    className="btn btn-ghost w-full justify-center text-[var(--color-brand)] font-bold text-xs uppercase tracking-widest"
                                >
                                    Full Time Table
                                </button>
                            </div>
                        </div>
                    </section>


                    {examData && (
                        <div className="flex flex-col gap-10" style={{ marginTop: '2rem' }}>
                            {/* New Array Format */}
                            {examData.schedules && Array.isArray(examData.schedules) ? (
                                examData.schedules.map((schedule, sIdx) => schedule.isVisible && schedule.exams && schedule.exams.length > 0 && (() => {
                                    const typeMeta = EXAM_TYPE_META[schedule.type] || EXAM_TYPE_META.others;
                                    const TypeIcon = typeMeta.icon;
                                    return (
                                    <section key={schedule.id || sIdx} className="animate-fade-in">
                                        <div className="section-header" style={{ marginBottom: '1rem' }}>
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.25rem' }}>
                                                    <span style={{
                                                        display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                                                        padding: '0.2rem 0.7rem', borderRadius: '9999px',
                                                        background: typeMeta.bg, color: typeMeta.color,
                                                        fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase'
                                                    }}>
                                                        <TypeIcon size={11} />
                                                        {typeMeta.badge}
                                                    </span>
                                                    <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-text-main)', margin: 0 }}>
                                                        {schedule.title || 'Examinations Schedule'}
                                                    </h2>
                                                </div>
                                                {schedule.subtitle && (
                                                    <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-light)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 0 }}>
                                                        {schedule.subtitle}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="schedule-card exam-schedule-card" style={{ borderTop: `3px solid ${typeMeta.color}` }}>
                                            <div className="schedule-list">
                                                {schedule.exams.map((exam, idx) => (
                                                    <div key={idx} className="schedule-item exam-item transition-all hover:bg-[var(--color-surface-hover)]">
                                                        <div className="exam-item-container flex w-full justify-between items-center sm:items-start gap-4">
                                                            <div className="exam-item-left flex items-center gap-4">
                                                                <div className="exam-date-badge">
                                                                    <span className="exam-date-day">{exam.date.split('-')[0]}</span>
                                                                    <span className="exam-date-month">{exam.date.split('-')[1]}/{exam.date.split('-')[2]?.slice(2)}</span>
                                                                </div>
                                                                <div className="exam-subject-details">
                                                                    <div className="exam-subject-name">{exam.subject}</div>
                                                                    <div className="exam-meta">
                                                                        <span className="exam-code">{exam.code}</span>
                                                                        <span style={{ opacity: 0.5 }}>•</span>
                                                                        <span>{exam.day}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="exam-item-right">
                                                                <div className="exam-time">{exam.time}</div>
                                                                <div className="exam-credits">{exam.credits} Credits</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </section>
                                    );
                                })())
                            ) : (
                                /* Legacy Single Object Format */
                                examData.isVisible && examData.exams && examData.exams.length > 0 && (
                                    <section className="animate-fade-in">
                                        <SectionTitle title={examData.title || "Examinations Schedule"} subtitle={examData.subtitle || ""} />
                                        <div className="schedule-card exam-schedule-card">
                                            <div className="schedule-list">
                                                {examData.exams.map((exam, idx) => (
                                                    <div key={idx} className="schedule-item exam-item transition-all hover:bg-[var(--color-surface-hover)]">
                                                        <div className="exam-item-container flex w-full justify-between items-center sm:items-start gap-4">
                                                            <div className="exam-item-left flex items-center gap-4">
                                                                <div className="exam-date-badge">
                                                                    <span className="exam-date-day">{exam.date.split('-')[0]}</span>
                                                                    <span className="exam-date-month">{exam.date.split('-')[1]}/{exam.date.split('-')[2]?.slice(2)}</span>
                                                                </div>
                                                                <div className="exam-subject-details">
                                                                    <div className="exam-subject-name">{exam.subject}</div>
                                                                    <div className="exam-meta">
                                                                        <span className="exam-code">{exam.code}</span>
                                                                        <span style={{ opacity: 0.5 }}>•</span>
                                                                        <span>{exam.day}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="exam-item-right">
                                                                <div className="exam-time">{exam.time}</div>
                                                                <div className="exam-credits">{exam.credits} Credits</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </section>
                                )
                            )}
                        </div>
                    )}

                    {/* CASE 2: No Tasks -> Show Empty State at LAST */}
                    {todayEvents.length === 0 && (
                        <section className="animate-fade-in">
                            <SectionTitle title="Today's Events" subtitle="Calendar" />
                            <div className="calendar-events-section">
                                <div className="empty-events-card" onClick={() => navigate('/timetable')}>
                                    <Calendar size={32} opacity={0.2} />
                                    <p>No calendar events today</p>
                                </div>
                            </div>
                        </section>
                    )}
                </div>
                {/* Sidebar Column (Can be used for other widgets later) */}
                <div className="flex flex-col gap-10">
                </div>
            </div>
        </>
    )}
    <BirthdayPopup user={user} />
</main>
</div>
    );
};

const FacultyDashboard = () => (
    <div className="space-y-8 animate-fade-in">
        <h1 className="text-2xl font-bold text-[var(--color-text-main)]">Faculty Portal</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            <StatCard icon={BookOpen} label="Active Courses" value="03" colorClass="bg-blue-100 text-blue-600" />
            <StatCard icon={Users} label="Total Students" value="142" colorClass="bg-indigo-100 text-indigo-600" />
            <StatCard icon={FileText} label="Pending Grading" value="15" colorClass="bg-rose-100 text-rose-600" />
        </div>
    </div>
);

const Dashboard = () => {
    const { user } = useAuth();
    if (!user) return null;

    return (
        <div className="">

            {user.role === 'student' && <StudentDashboard user={user} />}
            {user.role === 'admin' && <Navigate to="/admin/dashboard" replace />}
            {user.role === 'faculty' && <Navigate to="/faculty/dashboard" replace />}
        </div>
    );
};

export default Dashboard;
