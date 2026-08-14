import { Layers, FileText, HelpCircle, ChevronRight, Clock, PlayCircle, BookOpen } from 'lucide-react';
import LoadingTransition from '../components/Common/LoadingTransition';
import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { PROGRAMS } from '../config/academics';
import { fetchDynamicSubjects, fetchDynamicUnits } from '../utils/academicsUtils';
import './SubjectUnits.css';

// --- MOCK DATA GENERATORS FOR UI DEMONSTRATION ---
// Since the backend doesn't store exact aggregate stats per unit yet,
// we generate consistent mock data based on unit IDs to showcase the premium UI.
const getMockStats = (unitId, index) => {
    // Generate pseudo-random but consistent numbers based on string length and index
    const baseNum = (unitId.length * 7 + index * 13) % 100;
    
    const modulesCount = (baseNum % 5) + 2; // 2 to 6 modules
    const pdfCount = (baseNum % 4) + 1;     // 1 to 4 PDFs
    const quizCount = (baseNum % 15) + 5;   // 5 to 19 questions
    const progress = Math.min(100, Math.max(0, baseNum)); // 0% to 100%
    
    // Generate a recent date
    const date = new Date();
    date.setDate(date.getDate() - (baseNum % 14)); // Up to 14 days ago
    
    return { modulesCount, pdfCount, quizCount, progress, lastAccessed: date };
};

const ProgressRing = ({ progress }) => {
    const radius = 16;
    const circumference = radius * 2 * Math.PI;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
        <div className="progress-ring">
            <svg width="36" height="36" viewBox="0 0 40 40">
                <circle
                    className="progress-ring-bg"
                    cx="20"
                    cy="20"
                    r={radius}
                />
                <circle
                    className="progress-ring-value"
                    cx="20"
                    cy="20"
                    r={radius}
                    style={{ 
                        strokeDasharray: circumference, 
                        strokeDashoffset: strokeDashoffset 
                    }}
                />
            </svg>
        </div>
    );
};

const UnitCard = ({ unit, index, onClick }) => {
    const stats = getMockStats(unit.id || unit.label, index);
    
    // Format date: "Last accessed: Oct 12"
    const dateFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
    const formattedDate = dateFormatter.format(stats.lastAccessed);

    return (
        <div 
            className="premium-unit-card unit-card-anim" 
            style={{ animationDelay: `${index * 0.1}s` }}
            onClick={onClick}
        >
            <div className="unit-card-header">
                <div className="unit-icon-wrapper">
                    <svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 5C9 3.89543 9.89543 3 11 3H22.5858C23.1162 3 23.6249 3.21071 24 3.58579L30.4142 10C30.7893 10.3751 31 10.8838 31 11.4142V35C31 36.1046 30.1046 37 29 37H11C9.89543 37 9 36.1046 9 35V5Z" stroke="#2563eb" strokeWidth="2.5" fill="#ffffff" />
                        <path d="M23 3.5V9.5C23 10.3284 23.6716 11 24.5 11H30.5" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        <line x1="14" y1="9" x2="19" y2="9" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" />
                        <line x1="14" y1="13" x2="21" y2="13" stroke="#bfdbfe" strokeWidth="2.5" strokeLinecap="round" />
                        <rect x="13" y="17" width="16" height="11" rx="2" fill="#2563eb" />
                        <text x="21" y="25.5" fill="#ffffff" fontSize="9" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">
                            {(index + 1).toString().padStart(2, '0')}
                        </text>
                        <line x1="14" y1="32" x2="20" y2="32" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" />
                        
                        <circle cx="28" cy="27" r="6" fill="#ffffff" stroke="#2563eb" strokeWidth="2.5" />
                        <line x1="32" y1="31" x2="36" y2="35" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                </div>
                <div className="unit-title-box">
                    <span className="unit-index">UNIT {index + 1}</span>
                    <h3 className="unit-title">{unit.label}</h3>
                </div>
            </div>

            <div className="unit-stats-row">
                <div className="stat-item" title="Modules">
                    <Layers size={14} />
                    <span>{stats.modulesCount}</span>
                </div>
                <div className="stat-item" title="PDF Notes">
                    <FileText size={14} />
                    <span>{stats.pdfCount}</span>
                </div>
                <div className="stat-item" title="Quiz Questions">
                    <HelpCircle size={14} />
                    <span>{stats.quizCount}</span>
                </div>
            </div>

            <div className="unit-footer">
                <div className="progress-section">
                    <ProgressRing progress={stats.progress} />
                    <div>
                        <span className="progress-text">{stats.progress}%</span>
                        <span className="progress-status">
                            {stats.progress === 100 ? 'Completed' : stats.progress > 0 ? 'In Progress' : 'Not Started'}
                        </span>
                    </div>
                </div>
                
                <div className="enter-icon">
                    <ChevronRight size={18} strokeWidth={3} />
                </div>
            </div>
            
            {stats.progress > 0 && (
                <div className="text-[10px] text-[var(--color-text-muted)] font-medium mt-1 flex items-center gap-1 opacity-70">
                    <Clock size={10} />
                    Last accessed: {formattedDate}
                </div>
            )}
        </div>
    );
};

const SubjectUnits = () => {
    const { yearId, semesterId, subjectId } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const branchId = searchParams.get('branch');
    const [currentSubject, setCurrentSubject] = useState(null);
    const [dynamicUnits, setDynamicUnits] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadContent = async () => {
            const unitsPromise = fetchDynamicUnits(subjectId);

            let foundSubject = null;
            let currentProgram = null;

            for (const program of PROGRAMS) {
                const foundYear = program.years.find(y => y.id === yearId);
                if (foundYear) {
                    currentProgram = program;
                    let targetSemesters = foundYear.semesters;
                    if (branchId && foundYear.branches) {
                        const branch = foundYear.branches.find(b => b.id === branchId);
                        if (branch) targetSemesters = branch.semesters;
                    }
                    if (targetSemesters) {
                        const foundSemester = targetSemesters.find(s => s.id === semesterId);
                        if (foundSemester) {
                            const staticSubject = foundSemester.subjects.find(s => s.id === subjectId);
                            if (staticSubject) foundSubject = staticSubject;
                        }
                    }
                    break;
                }
            }

            if (!foundSubject && currentProgram) {
                const dynamicSubjects = await fetchDynamicSubjects(currentProgram.id, yearId, branchId || null, semesterId);
                foundSubject = dynamicSubjects.find(s => s.id === subjectId);
            }

            if (foundSubject) {
                setCurrentSubject(foundSubject);
                const units = await unitsPromise;
                setDynamicUnits(units);
            }

            setLoading(false);
        };

        loadContent();
    }, [yearId, semesterId, subjectId]);

    if (loading) return <LoadingTransition persistent variant="book" />;
    if (!currentSubject) return <div className="p-8 text-center text-[var(--color-text-muted)] dark:text-slate-400">Subject not found.</div>;

    const allUnits = [...(currentSubject.units || []), ...dynamicUnits];
    
    // Calculate overall mock progress based on all units
    const overallProgress = allUnits.length > 0 
        ? Math.round(allUnits.reduce((acc, unit, i) => acc + getMockStats(unit.id || unit.label, i).progress, 0) / allUnits.length)
        : 0;

    return (
        <div className="subject-units-container animate-fade-in pb-12">

            {/* Premium Subject Banner */}
            <div className="premium-subject-banner">
                <div className="banner-header">
                    <div className="banner-title-area">
                        <div className="subject-icon-box">
                            <PlayCircle size={32} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h1 className="subject-title">{currentSubject.label}</h1>
                            <p className="subject-subtitle">{allUnits.length} {allUnits.length === 1 ? 'Unit' : 'Units'} • Comprehensive Curriculum</p>
                        </div>
                    </div>
                    
                    <div className="overall-progress-box">
                        <span className="progress-label">Overall Progress</span>
                        <span className="progress-value">{overallProgress}%</span>
                    </div>
                </div>
            </div>

            {allUnits.length === 0 ? (
                <div className="text-center py-16 bg-[var(--color-surface)] rounded-[24px] border border-[var(--color-border)] shadow-sm">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                        <BookOpen size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-[var(--color-text-main)] mb-1">No Units Yet</h3>
                    <p className="text-[var(--color-text-muted)] max-w-sm mx-auto">Units for this subject are currently being prepared and will be available soon.</p>
                </div>
            ) : (
                <div className="unit-cards-grid">
                    {allUnits.map((unit, index) => (
                        <UnitCard
                            key={unit.id || index}
                            unit={unit}
                            index={index}
                            onClick={() => navigate(`/courses/${yearId}/${semesterId}/${subjectId}/${unit.id}${branchId ? `?branch=${branchId}` : ''}`)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default SubjectUnits;
