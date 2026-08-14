import { ArrowLeft, ChevronDown } from 'lucide-react';
import EmbeddedQuiz from '../components/Quiz/EmbeddedQuiz';
import PdfDownloadCard from '../components/Common/PdfDownloadCard';
import LoadingTransition from '../components/Common/LoadingTransition';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { PROGRAMS } from '../config/academics';
import { fetchDynamicSubjects, fetchDynamicUnits, fetchDynamicModules, getUnitById } from '../utils/academicsUtils';
import { pdfService } from '../services/pdfService';
import { getQuestionsForQuiz, getPendingQuiz, deletePendingQuiz } from '../services/quizService';
import { useAuth } from '../context/AuthContext';
import './UnitContent.css';


const UnitContent = () => {
    const { user } = useAuth();
    const { yearId, semesterId, subjectId, unitId } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const branchId = searchParams.get('branch');
    const [currentUnit, setCurrentUnit] = useState(null);
    const [dynamicModules, setDynamicModules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showQuiz, setShowQuiz] = useState(false);
    const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
    const [quizQuestions, setQuizQuestions] = useState(null);
    const [selectedDifficulty, setSelectedDifficulty] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [pendingQuizData, setPendingQuizData] = useState(null);
    const [quizError, setQuizError] = useState(null);

    const [contextData, setContextData] = useState({
        program: null,
        year: null,
        semester: null,
        subject: null
    });

    useEffect(() => {
        const withTimeout = (promise, ms) => {
            return Promise.race([
                promise,
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
            ]);
        };

        const loadContent = async () => {
            try {
                const modulesPromise = withTimeout(fetchDynamicModules(unitId), 8000).catch(() => []);

                const resolveHierarchy = async () => {
                    const program = PROGRAMS.find(p => p.years.some(y => y.id === yearId));
                    const year = program?.years.find(y => y.id === yearId);
                    let targetSemesters = year?.semesters;
                    if (branchId && year?.branches) {
                        const branch = year.branches.find(b => b.id === branchId);
                        if (branch) targetSemesters = branch.semesters;
                    }
                    const semester = targetSemesters?.find(s => s.id === semesterId);
                    let subject = semester?.subjects.find(s => s.id === subjectId);

                    if (!subject && program) {
                        try {
                            const dynSubjects = await withTimeout(fetchDynamicSubjects(program.id, yearId, branchId || null, semesterId), 8000);
                            subject = dynSubjects.find(s => s.id === subjectId);
                        } catch (e) {
                            console.warn("Failed to fetch dynamic subjects", e);
                        }
                    }
                    return { program, year, semester, subject };
                };

                const resolveUnit = async (subject) => {
                    let unit = subject?.units?.find(u => u.id === unitId);
                    try {
                        if (!unit && subjectId) {
                            const dynUnits = await withTimeout(fetchDynamicUnits(subjectId), 8000);
                            unit = dynUnits.find(u => u.id === unitId);
                        }
                        if (!unit) {
                            unit = await withTimeout(getUnitById(unitId), 8000);
                        }
                    } catch (e) {
                        console.warn("Failed to resolve dynamic unit", e);
                    }
                    return unit;
                };

                const hierarchy = await resolveHierarchy();
                setContextData(hierarchy);

                const [unit, modules] = await Promise.all([
                    resolveUnit(hierarchy.subject),
                    modulesPromise
                ]);

                if (unit) {
                    // Resolve PDF metadata if stored as an ID
                    const resolvePdf = async (url) => {
                        try {
                            if (url && typeof url === 'string' && !url.startsWith('http') && url !== 'null' && url !== 'undefined') {
                                const pdfData = await withTimeout(pdfService.getPdfById(url), 6000);
                                return pdfData;
                            }
                        } catch (e) {
                            console.warn("Failed to resolve PDF by ID:", url, e);
                        }
                        return null;
                    };

                    const mainPdfData = await resolvePdf(unit.pdfUrl);
                    if (mainPdfData) unit.resolvedPdfData = mainPdfData;

                    if (unit.additionalNotes && unit.additionalNotes.length > 0) {
                        for (let note of unit.additionalNotes) {
                            const noteData = await resolvePdf(note.url);
                            if (noteData) note.resolvedData = noteData;
                        }
                    }

                    setCurrentUnit(unit);
                    setDynamicModules(modules || []);
                }
            } catch (error) {
                console.error("Error loading unit content:", error);
            } finally {
                setLoading(false);
            }
        };
        loadContent();
    }, [yearId, semesterId, subjectId, unitId]);

    const hierarchy = [
        searchParams.get('branch') ? `Branch_${searchParams.get('branch')}` : (contextData.program?.label || 'General'),
        contextData.semester?.label || 'Semester',
        contextData.subject?.label || 'Subject',
        currentUnit?.label || 'Unit'
    ];

    useEffect(() => {
        const fetchPendingQuiz = async () => {
            if (currentUnit && user && subjectId) {
                const uniqueModuleId = `${subjectId}_${currentUnit.id}`;
                try {
                    const data = await getPendingQuiz(user.uid, uniqueModuleId, selectedDifficulty);
                    if (data) {
                        setPendingQuizData(data);
                    } else {
                        const key = `quiz_progress_${uniqueModuleId}_${selectedDifficulty}`;
                        const saved = localStorage.getItem(key);
                        if (saved) {
                            setPendingQuizData(JSON.parse(saved));
                        } else {
                            setPendingQuizData(null);
                        }
                    }
                } catch(e) {
                    console.error("Failed to load pending quiz from firebase", e);
                }
            }
        };
        fetchPendingQuiz();
    }, [currentUnit, showQuiz, user, selectedDifficulty, subjectId]);

    const handleResumeQuiz = () => {
        if (pendingQuizData && pendingQuizData.questions) {
            setQuizQuestions(pendingQuizData.questions);
            setShowQuiz(true);
        }
    };

    const handleDeletePendingQuiz = async () => {
        if (window.confirm("Are you sure you want to delete your pending quiz progress?")) {
            const uniqueModuleId = `${subjectId}_${currentUnit.id}`;
            if (user) {
                try {
                    await deletePendingQuiz(user.uid, uniqueModuleId, selectedDifficulty);
                } catch (e) {
                    console.error("Failed to delete pending quiz in Firebase", e);
                }
            }
            localStorage.removeItem(`quiz_progress_${uniqueModuleId}_${selectedDifficulty}`);
            setPendingQuizData(null);
        }
    };

    const handleGenerateQuiz = async () => {
        if (!selectedDifficulty) {
            setQuizError("Please select a difficulty stage first.");
            return;
        }
        setQuizError(null);
        const uniqueModuleId = `${subjectId}_${currentUnit.id}`;
        if (pendingQuizData) {
            if (!window.confirm(`Starting a new quiz will discard your pending progress for ${selectedDifficulty} Stage. Do you want to continue?`)) {
                return;
            }
            if (user) {
                try {
                    await deletePendingQuiz(user.uid, uniqueModuleId, selectedDifficulty);
                } catch (e) {
                    console.error("Failed to delete pending quiz in Firebase", e);
                }
            }
            localStorage.removeItem(`quiz_progress_${uniqueModuleId}_${selectedDifficulty}`);
            setPendingQuizData(null);
        }

        setIsGeneratingQuiz(true);
        const difficulty = selectedDifficulty;
        try {
            // Fetch questions from Firebase database
            let questions = await getQuestionsForQuiz(uniqueModuleId);
            
            // Backward compatibility: If no questions found under the new unique ID, try the legacy unit ID
            if (!questions || questions.length === 0) {
                const legacyQuestions = await getQuestionsForQuiz(currentUnit.id);
                if (legacyQuestions && legacyQuestions.length > 0) {
                    questions = legacyQuestions;
                }
            }
            
            if (!questions || questions.length === 0) {
                setQuizError("No MCQs have been added for this unit yet. Please check back later.");
                setIsGeneratingQuiz(false);
                return;
            }
            
            // Filter by selected difficulty
            const filteredQuestions = questions.filter(q => (q.difficulty || 'Moderate') === difficulty);
            
            if (filteredQuestions.length === 0) {
                setQuizError(`No ${difficulty} questions available for this unit yet. Try another difficulty!`);
                setIsGeneratingQuiz(false);
                return;
            }
            
            setQuizQuestions(filteredQuestions);
            setShowQuiz(true);
        } catch (error) {
            console.error("Failed to fetch quiz from Firebase", error);
            setQuizError("Failed to load quiz from database. Please try again or check connection.");
        } finally {
            setIsGeneratingQuiz(false);
        }
    };

    if (loading) return <LoadingTransition message="Learning Content Loading" persistent />;
    if (!currentUnit) return <div className="p-8 text-center text-[var(--color-text-muted)]">Unit not found.</div>;

    return (
        <div className="uc-page-container">
            {/* Top Navigation Bar */}
            {/* Top Navigation Bar */}
            <div className="cmp-top-bar" style={{margin: '1.2rem 16px 0', width: 'auto', padding: '6px 14px', minHeight: '48px'}}>
                <div className="cmp-title-section" style={{ position: 'relative', gap: '0.5rem' }}>
                    <button onClick={() => navigate(-1)} className="uc-back-btn" style={{ marginRight: '4px', width: '32px', height: '32px' }}>
                        <ArrowLeft size={18} />
                    </button>
                    <div className="cmp-title-text" style={{ flex: 1, marginLeft: '4px' }}>
                        <h2 style={{ fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif", fontSize: '1.4rem', margin: 0, fontWeight: 700, lineHeight: 1.1 }}>{currentUnit?.label || 'Unit - 1'}</h2>
                        <p style={{ fontFamily: "'Inter', sans-serif", marginTop: '4px', fontSize: '0.8rem', opacity: 0.9, lineHeight: 1.2 }}>{contextData.subject?.label || 'Mathematics'}</p>
                    </div>
                    <div className="cmp-header-icon" style={{ width: '28px', height: '24px', marginLeft: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'translateY(-2px)' }}>
                        <svg viewBox="50 100 300 180" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style={{ overflow: 'visible' }}>
                            <defs>
                                <style>
                                    {`
                                    .primary { fill: #3b82f6; }
                                    .secondary { fill: #dbeafe; }
                                    .accent { fill: #10b981; }
                                    .dark-accent { fill: #047857; }
                                    .outline { stroke: #2563eb; fill: none; stroke-width: 4; stroke-linejoin: round; stroke-linecap: round; }
                                    .white { fill: #ffffff; }
                                    `}
                                </style>
                            </defs>
                            <g transform="scale(1.1) translate(-10, -10)">
                                {/* Base Shadow */}
                                <ellipse cx="200" cy="250" rx="110" ry="15" fill="#475569" opacity="0.2" />
                                
                                {/* Bottom Book */}
                                <path d="M 120 200 L 280 200 L 300 230 L 140 230 Z" className="primary" />
                                <path d="M 120 200 L 280 200 L 300 230 L 140 230 Z" className="outline" />
                                <path d="M 120 200 L 140 230 L 140 240 L 120 210 Z" className="dark-accent" />
                                <path d="M 120 200 L 140 230 L 140 240 L 120 210 Z" className="outline" />
                                <path d="M 140 230 L 300 230 L 300 240 L 140 240 Z" className="white" />
                                <path d="M 140 230 L 300 230 L 300 240 L 140 240 Z" className="outline" />
                                
                                {/* Middle Book */}
                                <path d="M 100 160 L 250 160 L 270 190 L 120 190 Z" className="accent" />
                                <path d="M 100 160 L 250 160 L 270 190 L 120 190 Z" className="outline" />
                                <path d="M 100 160 L 120 190 L 120 200 L 100 170 Z" className="dark-accent" />
                                <path d="M 100 160 L 120 190 L 120 200 L 100 170 Z" className="outline" />
                                <path d="M 120 190 L 270 190 L 270 200 L 120 200 Z" className="white" />
                                <path d="M 120 190 L 270 190 L 270 200 L 120 200 Z" className="outline" />
                                
                                {/* Apple */}
                                <circle cx="210" cy="140" r="15" fill="#ef4444" />
                                <path d="M 210 125 Q 215 115 225 115" stroke="#16a34a" strokeWidth="3" fill="none" />
                            </g>
                        </svg>
                    </div>
                </div>
            </div>

            <main className="uc-main">
                {/* Content Area */}
                {(currentUnit.pdfUrl || (currentUnit.additionalNotes && currentUnit.additionalNotes.length > 0)) ? (
                    <section className="uc-notes-section">
                        <div className="mb-4">
                            <h2 className="text-lg font-bold text-slate-800">Available Materials</h2>
                            <p className="text-sm text-slate-500">Download materials to view them offline</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {currentUnit.pdfUrl && (
                                <PdfDownloadCard 
                                    label={currentUnit.pdfName || currentUnit.resolvedPdfData?.fileName || "Main Notes"} 
                                    url={currentUnit.resolvedPdfData?.pdfUrl || currentUnit.resolvedPdfData?.downloadUrl || currentUnit.resolvedPdfData?.url || currentUnit.resolvedPdfData?.googleDriveDownloadLink || currentUnit.pdfUrl} 
                                    idPrefix={currentUnit.id} 
                                    hierarchy={hierarchy}
                                    backendUrl={currentUnit.resolvedPdfData?.backendUrl}
                                />
                            )}
                            {currentUnit.additionalNotes?.map((note, idx) => (
                                <PdfDownloadCard 
                                    key={idx}
                                    label={note.resolvedData?.fileName || note.label} 
                                    url={note.resolvedData?.pdfUrl || note.resolvedData?.downloadUrl || note.resolvedData?.url || note.resolvedData?.googleDriveDownloadLink || note.url} 
                                    idPrefix={currentUnit.id} 
                                    hierarchy={hierarchy}
                                    backendUrl={note.resolvedData?.backendUrl}
                                />
                            ))}
                        </div>
                    </section>
                ) : (
                    <section className="uc-empty-state">
                        <div className="uc-orb-container">
                            <div className="uc-orb-1 animated-orb"></div>
                            <div className="uc-orb-2"></div>
                            <div className="uc-orb-icon">
                                <i className="fa-solid fa-download" style={{ color: "rgb(255, 46, 17)", fontSize: "40px" }}></i>
                            </div>
                        </div>
                        <div className="uc-empty-texts">
                            <h3 className="uc-empty-title">Knowledge Under Construction</h3>
                            <p className="uc-empty-desc">Our professors are carefully curating premium notes for this unit. Check back soon for deeper insights.</p>
                        </div>
                        <button onClick={() => window.location.reload()} className="uc-refresh-btn">
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>refresh</span>
                            Refresh Content
                        </button>
                    </section>
                )}

                {/* CTA: Test Your Knowledge Section */}
                {currentUnit?.isQuizEnabled !== false && (
                    <section className="uc-quiz-wrapper">
                        <div className="uc-quiz-card">
                            <div className="uc-quiz-bg-anim"></div>
                            <div className="uc-quiz-header">
                                <div className="uc-quiz-icon">
                                    <i className="fa-solid fa-brain" style={{ color: '#ffffff', fontSize: '20px' }}></i>
                                </div>
                                <div>
                                    <h3 className="uc-quiz-title">MCQ's</h3>
                                    <p className="uc-quiz-desc">Challenge yourself with timed MCQs covering all key concepts of {currentUnit?.label || 'Unit 1'}.</p>
                                </div>
                            </div>
                            <div className="uc-quiz-actions-row">
                                <div className="uc-quiz-difficulty-section">
                                    <label className="uc-difficulty-label">Select Difficulty:</label>
                                    <div className="uc-dropdown-container">
                                        <button 
                                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                            className="uc-dropdown-btn"
                                        >
                                            <span>{selectedDifficulty ? `${selectedDifficulty} Stage` : 'Select Stage'}</span>
                                            <ChevronDown size={16} style={{ transition: 'transform 0.2s', transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                                        </button>
                                        
                                        {isDropdownOpen && (
                                            <>
                                                <div 
                                                    style={{ position: 'fixed', inset: 0, zIndex: 10 }} 
                                                    onClick={() => setIsDropdownOpen(false)}
                                                ></div>
                                                <div className="uc-dropdown-menu">
                                                    {['Easy', 'Moderate', 'High'].map(diff => (
                                                        <button
                                                            key={diff}
                                                            onClick={() => { setSelectedDifficulty(diff); setIsDropdownOpen(false); }}
                                                            className={`uc-dropdown-item ${selectedDifficulty === diff ? 'active' : ''}`}
                                                        >
                                                            {diff} Stage
                                                        </button>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <button 
                                    onClick={handleGenerateQuiz} 
                                    disabled={isGeneratingQuiz || !selectedDifficulty} 
                                    className="uc-quiz-start-btn"
                                    style={{ opacity: !selectedDifficulty ? 0.5 : 1, cursor: !selectedDifficulty ? 'not-allowed' : 'pointer' }}
                                >
                                    {isGeneratingQuiz ? 'Loading...' : 'Start MCQs'}
                                </button>
                            </div>
                            {quizError && (
                                <div style={{
                                    marginTop: '12px',
                                    padding: '12px',
                                    background: 'rgba(255, 60, 60, 0.15)',
                                    border: '1px solid rgba(255, 60, 60, 0.3)',
                                    borderRadius: '12px',
                                    color: '#ffb3b3',
                                    fontSize: '14px',
                                    textAlign: 'center'
                                }}>
                                    {quizError}
                                </div>
                            )}
                            {pendingQuizData && (
                                <div className="uc-quiz-pending-row" style={{ 
                                    marginTop: '8px', 
                                    padding: '16px', 
                                    background: 'rgba(0, 0, 0, 0.15)', 
                                    borderRadius: '16px',
                                    display: 'flex', 
                                    flexDirection: 'row',
                                    justifyContent: 'space-between', 
                                    alignItems: 'center',
                                    gap: '12px',
                                    flexWrap: 'wrap'
                                }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1 1 auto' }}>
                                        <span style={{ color: '#ffffff', fontSize: '15px', fontWeight: 'bold' }}>Pending Quiz Available</span>
                                        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px' }}>Resume where you left off</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px', flex: '0 0 auto' }}>
                                        <button onClick={handleDeletePendingQuiz} style={{ 
                                            padding: '8px 14px', 
                                            borderRadius: '12px', 
                                            background: 'rgba(255, 255, 255, 0.1)', 
                                            border: '1px solid rgba(255, 255, 255, 0.2)', 
                                            color: '#ffffff', 
                                            fontSize: '13px', 
                                            fontWeight: '600', 
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}>Delete</button>
                                        <button onClick={handleResumeQuiz} style={{ 
                                            padding: '8px 16px', 
                                            borderRadius: '12px', 
                                            background: '#ffffff', 
                                            color: '#1e00a9', 
                                            fontSize: '13px', 
                                            fontWeight: 'bold', 
                                            border: 'none', 
                                            cursor: 'pointer', 
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                            transition: 'all 0.2s'
                                        }}>Resume</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>
                )}
            </main>

            {/* Quiz Overlay */}
            {showQuiz && quizQuestions && createPortal(
                <div style={{ position: 'fixed', inset: 0, backgroundColor: '#0b1326', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', zIndex: 999999 }}>
                    <div style={{ width: '100%', height: '100%', position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column' }} className="animate-fade-in">
                        <EmbeddedQuiz 
                            moduleId={`${subjectId}_${currentUnit.id}`} 
                            moduleTitle={`${currentUnit.label} (${selectedDifficulty} Stage)`}
                            questions={quizQuestions} 
                            onClose={() => setShowQuiz(false)} 
                            passingPercentage={40}
                            difficulty={selectedDifficulty}
                            initialState={pendingQuizData}
                        />
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default UnitContent;
