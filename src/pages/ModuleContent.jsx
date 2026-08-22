import { BookOpen, PlayCircle, Lightbulb, RefreshCw, ArrowRight, ArrowLeft, HelpCircle, ExternalLink } from 'lucide-react';
import EmbeddedQuiz from '../components/Quiz/EmbeddedQuiz';
import PdfDownloadCard from '../components/Common/PdfDownloadCard';
import LoadingTransition from '../components/Common/LoadingTransition';
import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { PROGRAMS } from '../config/academics';
import { fetchDynamicSubjects, getModuleById, getUnitById } from '../utils/academicsUtils';
import { getEmbedUrl, getPdfEmbedUrl } from '../utils/videoUtils';
import { pdfService } from '../services/pdfService';
import { getQuestionsForQuiz, getUserAttemptsForQuiz } from '../services/quizService';
import { useAuth } from '../context/AuthContext';
import AppAlert from '../components/Common/AppAlert';

const ModuleContent = () => {
    const { user } = useAuth();
    const { yearId, semesterId, subjectId, unitId, moduleId } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const branchId = searchParams.get('branch');
    const [currentModule, setCurrentModule] = useState(null);
    const [currentUnit, setCurrentUnit] = useState(null);
    const [currentProgram, setCurrentProgram] = useState(null);
    const [currentSubject, setCurrentSubject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showQuiz, setShowQuiz] = useState(false);
    const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
    const [quizQuestions, setQuizQuestions] = useState(null);
    const [pastAttemptToView, setPastAttemptToView] = useState(null);
    const [alertConfig, setAlertConfig] = useState(null);
    const [showFab, setShowFab] = useState(false);
    const [viewMode, setViewMode] = useState('selection');
    const [activePdf, setActivePdf] = useState({ label: '', url: '', embedUrl: '' });
    const [showPdfHelp, setShowPdfHelp] = useState(false);
    const [useBackupViewer, setUseBackupViewer] = useState(false);
    
    const [quizSettings, setQuizSettings] = useState({
        isEnabled: true,
        passingPercentage: 40,
        maxRetakes: 3
    });

    // Fetch Quiz Settings
    useEffect(() => {
        if (!currentModule) return;
        const fetchSettings = async () => {
            try {
                const docRef = doc(db, 'quiz_settings', currentModule.id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setQuizSettings(docSnap.data());
                }
            } catch (error) {
                console.error("Error fetching quiz settings:", error);
            }
        };
        fetchSettings();
    }, [currentModule]);

    // Timer to show FAB after 60 seconds of "reading"
    useEffect(() => {
        if (!currentModule || !quizSettings.isEnabled) return;
        
        // If they already have progress saved, show it immediately
        if (localStorage.getItem(`quiz_progress_${currentModule.id}`)) {
            setShowFab(true);
            return;
        }

        const timer = setTimeout(() => {
            setShowFab(true);
        }, 60000); // 60 seconds

        return () => clearTimeout(timer);
    }, [currentModule]);

    const handleGenerateQuiz = async () => {
        if (quizQuestions && !pastAttemptToView) {
            setShowQuiz(true);
            return;
        }
        setIsGeneratingQuiz(true);
        try {
            // 1. Check if admin has pre-configured questions for this module from Firebase
            let questions = await getQuestionsForQuiz(currentModule.id);
            
            // 2. If no questions exist, alert the user instead of using AI
            if (!questions || questions.length === 0) {
                setAlertConfig({
                    isOpen: true,
                    title: "No MCQs Available",
                    message: "No MCQ questions have been added for this module yet. Please check back later.",
                    type: "warning",
                    onClose: () => setAlertConfig(null)
                });
                setIsGeneratingQuiz(false);
                return;
            }
            setQuizQuestions(questions);

            if (user) {
                const attempts = await getUserAttemptsForQuiz(user.uid, currentModule.id);
                if (attempts.length >= (quizSettings.maxRetakes || 3)) {
                    setPastAttemptToView(attempts[0]);
                    setAlertConfig({
                        isOpen: true,
                        title: "Attempt Limit Reached",
                        message: "You have reached the maximum number of attempts for this MCQ. Showing your highest scoring attempt.",
                        type: "info",
                        onClose: () => {
                            setAlertConfig(null);
                            setShowQuiz(true);
                        }
                    });
                    setIsGeneratingQuiz(false);
                    return;
                }
            }
            
            setShowQuiz(true);
        } catch (error) {
            console.error("Failed to fetch quiz from Firebase", error);
            setAlertConfig({
                isOpen: true,
                title: "Error",
                message: "Failed to load MCQ from database. Please try again or check connection.",
                type: "error",
                onClose: () => setAlertConfig(null)
            });
        } finally {
            setIsGeneratingQuiz(false);
        }
    };

    useEffect(() => {
        const loadModule = async () => {
            const modulePromise = getModuleById(moduleId);
            const unitPromise = getUnitById(unitId);

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
                    const dynSubjects = await fetchDynamicSubjects(program.id, yearId, branchId || null, semesterId);
                    subject = dynSubjects.find(s => s.id === subjectId);
                }
                return { program, subject };
            };

            const [moduleData, unitData, hierarchy] = await Promise.all([
                modulePromise,
                unitPromise,
                resolveHierarchy()
            ]);

            if (moduleData) {
                // Resolve PDF metadata if stored as an ID
                const resolvePdf = async (url) => {
                    if (url && !url.startsWith('http')) {
                        const pdfData = await pdfService.getPdfById(url);
                        return pdfData;
                    }
                    return null;
                };

                const mainPdfData = await resolvePdf(moduleData.pdfUrl);
                const hwPdfData = await resolvePdf(moduleData.handwrittenNotesUrl);
                
                // Add resolved data to module object
                if (mainPdfData) moduleData.resolvedPdfData = mainPdfData;
                if (hwPdfData) moduleData.resolvedHwPdfData = hwPdfData;

                if (moduleData.additionalNotes && moduleData.additionalNotes.length > 0) {
                    for (let note of moduleData.additionalNotes) {
                        const noteData = await resolvePdf(note.url);
                        if (noteData) note.resolvedData = noteData;
                    }
                }

                setCurrentModule(moduleData);
            }
            if (unitData) setCurrentUnit(unitData);
            if (hierarchy.program) setCurrentProgram(hierarchy.program);
            if (hierarchy.subject) setCurrentSubject(hierarchy.subject);

            setLoading(false);
        };
        loadModule();
    }, [yearId, semesterId, subjectId, unitId, moduleId]);

    const hierarchy = [
        searchParams.get('branch') ? `Branch_${searchParams.get('branch')}` : (currentProgram?.label || 'General'),
        'Semester', // Can't easily get semester name here without extra lookup
        'Subject',   // Can't easily get subject name here without extra lookup
        currentUnit?.label || 'Unit',
        currentModule?.label || 'Module'
    ];



    if (loading) return <LoadingTransition persistent variant="book" />;

    if (!currentModule) {
        return <div className="p-12 text-center text-[var(--color-text-muted)] font-bold italic">Module not found.</div>;
    }

    const renderSelectionView = () => (
        <div className="flex-1 flex flex-col items-center justify-center py-12 px-4">

            <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-7xl hover-blur-group`}>
                
                {/* Notes Column */}
                <div className="flex flex-col gap-4 w-full">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <BookOpen size={20} className="text-[var(--color-primary-500)]" />
                        Available Materials
                    </h2>
                    
                    {currentModule.pdfUrl && (
                        <div onClick={() => {
                            if (currentModule.resolvedPdfData?.embedUrl) {
                                setActivePdf({ label: currentModule.pdfName || 'Main Lecture Notes', url: currentModule.resolvedPdfData.pdfUrl || currentModule.resolvedPdfData.downloadUrl || currentModule.resolvedPdfData.url || currentModule.resolvedPdfData.googleDriveDownloadLink, embedUrl: currentModule.resolvedPdfData.embedUrl });
                                setViewMode('notes');
                            }
                        }}>
                            <PdfDownloadCard 
                                label={currentModule.pdfName || currentModule.resolvedPdfData?.fileName || "Main Lecture Notes"} 
                                url={currentModule.resolvedPdfData?.pdfUrl || currentModule.resolvedPdfData?.downloadUrl || currentModule.resolvedPdfData?.url || currentModule.resolvedPdfData?.googleDriveDownloadLink || currentModule.pdfUrl} 
                                idPrefix={currentModule.id} 
                                hierarchy={hierarchy} 
                                size={currentModule.resolvedPdfData?.size}
                                backendUrl={currentModule.resolvedPdfData?.backendUrl}
                            />
                        </div>
                    )}
                    
                    {currentModule.additionalNotes?.map((note, idx) => (
                        <div key={`add_${idx}`} onClick={() => {
                            if (note.resolvedData?.embedUrl) {
                                setActivePdf({ label: note.resolvedData.fileName || note.label, url: note.resolvedData.pdfUrl || note.resolvedData.downloadUrl || note.resolvedData.url || note.resolvedData.googleDriveDownloadLink, embedUrl: note.resolvedData.embedUrl });
                                setViewMode('notes');
                            }
                        }}>
                            <PdfDownloadCard 
                                label={note.resolvedData?.fileName || note.label} 
                                url={note.resolvedData?.pdfUrl || note.resolvedData?.downloadUrl || note.resolvedData?.url || note.resolvedData?.googleDriveDownloadLink || note.url} 
                                idPrefix={currentModule.id} 
                                hierarchy={hierarchy}
                                size={note.resolvedData?.size} 
                                backendUrl={note.resolvedData?.backendUrl}
                            />
                        </div>
                    ))}

                    {currentModule.handwrittenNotesUrl && (
                        <div onClick={() => {
                            if (currentModule.resolvedHwPdfData?.embedUrl) {
                                setActivePdf({ label: currentModule.handwrittenNotesName || currentModule.resolvedHwPdfData?.fileName || 'Handwritten Notes', url: currentModule.resolvedHwPdfData.pdfUrl || currentModule.resolvedHwPdfData.downloadUrl || currentModule.resolvedHwPdfData.url || currentModule.resolvedHwPdfData.googleDriveDownloadLink, embedUrl: currentModule.resolvedHwPdfData.embedUrl });
                                setViewMode('notes');
                            }
                        }}>
                            <PdfDownloadCard 
                                label={currentModule.handwrittenNotesName || currentModule.resolvedHwPdfData?.fileName || "Handwritten Notes"} 
                                url={currentModule.resolvedHwPdfData?.pdfUrl || currentModule.resolvedHwPdfData?.downloadUrl || currentModule.resolvedHwPdfData?.url || currentModule.resolvedHwPdfData?.googleDriveDownloadLink || currentModule.handwrittenNotesUrl} 
                                idPrefix={`${currentModule.id}_HW`} 
                                hierarchy={hierarchy} 
                                size={currentModule.resolvedHwPdfData?.size}
                                backendUrl={currentModule.resolvedHwPdfData?.backendUrl}
                            />
                        </div>
                    )}

                    {(!currentModule.pdfUrl && !currentModule.handwrittenNotesUrl && (!currentModule.additionalNotes || currentModule.additionalNotes.length === 0)) && (
                        <div className="p-8 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 border-dashed">
                            No materials available for download.
                        </div>
                    )}
                </div>

                {/* Video Card */}
                {currentModule.videoUrl?.trim() && (
                    <div className="flex flex-col gap-4 w-full">
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <PlayCircle size={20} className="text-red-500" />
                            Video Lecture
                        </h2>
                        <div className="embedded-card group h-64 md:h-auto md:aspect-video rounded-2xl overflow-hidden shadow-sm border border-slate-200">
                            <div className="embed-container w-full h-full">
                                <iframe
                                    className="w-full h-full"
                                    src={getEmbedUrl(currentModule.videoUrl)}
                                    title="Video Preview"
                                    frameBorder="0"
                                ></iframe>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Test Your Knowledge Action (Inline) */}
            {quizSettings.isEnabled && (
                <div className="mt-16 w-full max-w-4xl mx-auto px-4 pb-16">
                    <div className="relative w-full rounded-3xl overflow-hidden p-8 md:p-12 shadow-xl border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                        {/* Decorative glow effects */}
                        <div className="absolute top-0 right-0 w-64 h-64 rounded-full mix-blend-multiply filter blur-[80px] opacity-30 -mr-20 -mt-20 pointer-events-none" style={{ background: 'var(--color-primary-500)' }}></div>
                        <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full mix-blend-multiply filter blur-[80px] opacity-20 -ml-20 -mb-20 pointer-events-none" style={{ background: '#6366f1' }}></div>
                        
                        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                            <div className="flex-1 text-center md:text-left">
                                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-6 shadow-lg border" style={{ background: 'var(--color-primary-600)', borderColor: 'var(--color-primary-400)' }}>
                                    <Lightbulb size={28} color="#ffffff" className="animate-pulse" style={{ animationDuration: '3s' }} />
                                </div>
                                <h3 className="text-2xl md:text-3xl font-bold mb-3" style={{ color: 'var(--color-text-main)' }}>Ready to test your knowledge?</h3>
                                <p className="text-lg max-w-lg mx-auto md:mx-0" style={{ color: 'var(--color-text-muted)' }}>Take a quick 15-minute MCQ to solidify your understanding of this topic and track your progress.</p>
                            </div>
                            
                            <div className="shrink-0 flex flex-col items-center">
                                <button 
                                    onClick={handleGenerateQuiz}
                                    disabled={isGeneratingQuiz}
                                    className="btn-primary transform hover:scale-105 active:scale-95 transition-all shadow-lg"
                                    style={{ 
                                        padding: '1rem 2.5rem', 
                                        fontSize: '1.125rem', 
                                        borderRadius: '9999px', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: '0.75rem',
                                        boxShadow: '0 10px 25px -5px rgba(var(--color-primary-500-rgb), 0.4)'
                                    }}
                                >
                                    {isGeneratingQuiz ? (
                                        <>
                                            <RefreshCw className="animate-spin" size={20} /> Preparing MCQ...
                                        </>
                                    ) : (
                                        <>
                                            Start Unit MCQ <ArrowRight size={20} />
                                        </>
                                    )}
                                </button>
                                <span className="mt-4 text-xs font-medium uppercase tracking-wider opacity-70" style={{ color: 'var(--color-text-muted)' }}>
                                    {quizSettings.passingPercentage}% to pass
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    const renderFullNotes = () => (
        <div className="fixed inset-0 z-[50000] bg-[var(--color-background)] flex flex-col animate-fade-in">
            <div className="flex items-center justify-between px-8 py-4 border-b border-[var(--color-border)] bg-[var(--color-surface)]/[0.8] backdrop-blur-xl z-10 shrink-0">
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => setViewMode('selection')}
                        className="group flex items-center justify-center w-12 h-12 rounded-[var(--radius-lg)] bg-[var(--color-surface-hover)] border border-[var(--color-border)] hover:bg-[var(--color-brand)] hover:text-[var(--color-on-brand)] transition-all transform hover:rotate-[-5deg] mobile-hidden"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h2 className="text-2xl font-black text-[var(--color-text-main)] italic tracking-tight">{activePdf.label}</h2>
                        <div className="flex items-center gap-2">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] italic">Document Flow</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    {currentModule.videoUrl && (
                        <button
                            onClick={() => setViewMode('video')}
                            className="hidden md:flex items-center gap-3 px-6 py-3 rounded-[var(--radius-lg)] bg-red-50 dark:bg-red-900/20 text-red-600 font-black text-xs hover:bg-red-600 hover:text-white transition-all transform hover:scale-105 shadow-lg shadow-red-500/10"
                        >
                            <PlayCircle size={18} /> Switch to Video
                        </button>
                    )}
                    <button onClick={() => setShowPdfHelp(!showPdfHelp)} className="p-3 rounded-[var(--radius-lg)] bg-amber-50 dark:bg-amber-900/30 text-amber-600 hover:bg-amber-600 hover:text-white transition-all">
                        <HelpCircle size={22} />
                    </button>
                </div>
            </div>

            <div className="flex-1 bg-[var(--color-slate-100)] dark:bg-[var(--color-slate-950)] relative">
                <iframe
                    src={activePdf.embedUrl || getPdfEmbedUrl(activePdf.url, useBackupViewer)}
                    className="w-full h-full border-none"
                    title="Fullscreen PDF"
                ></iframe>

                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-6 bg-[var(--color-surface)]/[0.9] backdrop-blur-3xl p-4 rounded-full border border-[var(--color-border)] shadow-2xl">
                    <button
                        onClick={() => setUseBackupViewer(!useBackupViewer)}
                        className={`flex items-center gap-3 px-8 h-12 rounded-full font-black text-xs transition-all ${useBackupViewer ? 'bg-[var(--color-brand)] text-[var(--color-on-brand)] shadow-lg shadow-primary-500/40' : 'bg-[var(--color-surface-hover)] text-[var(--color-brand)] hover:bg-[var(--color-primary-50)]'}`}
                    >
                        <RefreshCw size={18} className={useBackupViewer ? 'animate-spin-slow' : ''} />
                        {useBackupViewer ? 'Using Backup Proxy' : 'Toggle Backup Viewer'}
                    </button>
                    <a href={activePdf.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-8 h-12 rounded-full bg-[var(--color-brand)] text-[var(--color-on-brand)] font-black text-xs shadow-lg shadow-primary-500/40 hover:scale-[1.05] active:scale-95 transition-all">
                        <ExternalLink size={18} /> Open Direct
                    </a>
                </div>
            </div>
        </div>
    );

    const renderFullVideo = () => (
        <div className="fixed inset-0 z-[50000] bg-slate-950 flex flex-col p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-8 px-4 h-16 shrink-0 bg-transparent">
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => setViewMode('selection')}
                        className="flex items-center justify-center w-14 h-14 rounded-[var(--radius-xl)] bg-white/5 hover:bg-white/10 text-white transition-all transform hover:rotate-[-5deg] border border-white/10 mobile-hidden"
                    >
                        <ArrowLeft size={28} />
                    </button>
                    <div>
                        <h2 className="text-3xl font-black text-white italic tracking-tight">Cinema Mode</h2>
                        <p className="text-xs font-black uppercase tracking-[0.4em] text-red-500 italic flex items-center gap-2">
                            Immersive Video Lecture
                        </p>
                    </div>
                </div>
                {activePdf.url && (
                    <button
                        onClick={() => setViewMode('notes')}
                        className="hidden md:flex items-center gap-3 px-8 h-14 rounded-2xl bg-[var(--color-brand)]/[0.1] text-[var(--color-brand)] font-black text-sm border-2 border-[var(--color-brand)]/[0.2] hover:bg-[var(--color-brand)] hover:text-[var(--color-on-brand)] transition-all shadow-2xl shadow-primary-500/10"
                    >
                        <BookOpen size={20} /> Switch to Notes
                    </button>
                )}
            </div>

            <div className="flex-1 rounded-[3rem] overflow-hidden bg-black relative border-8 border-white/5 ring-4 ring-white/5 p-2 bg-gradient-to-b from-white/5 to-transparent shadow-2xl">
                <iframe
                    className="w-full h-full rounded-[2.5rem]"
                    src={getEmbedUrl(currentModule.videoUrl)}
                    title="Immersive video player"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                ></iframe>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen flex flex-col gap-8 pb-20 overflow-visible animate-fade-in">
            {/* Unified Theme Header - Standard Pattern */}
            {viewMode === 'selection' && (
                <div className="page-header-v2">

                    <div className="header-accent-bar"></div>
                    <div className="header-content-v2">
                        <h1 className="page-title-v2">{currentModule.label}</h1>
                        <p className="page-subtitle-v2">Academic Mastery Module</p>
                    </div>
                </div>
            )}

            {/* Content Display */}
            <div className="flex-1 flex flex-col justify-center min-h-0">
                {viewMode === 'selection' && renderSelectionView()}
                {viewMode === 'notes' && renderFullNotes()}
                {viewMode === 'video' && renderFullVideo()}
            </div>

            {/* Quiz Overlay */}
            {showQuiz && quizQuestions && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-12">
                    <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm" onClick={() => setShowQuiz(false)}></div>
                    <div className="relative z-10 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl bg-white rounded-3xl" style={{ animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                        <EmbeddedQuiz 
                            moduleId={currentModule.id} 
                            moduleTitle={currentModule.label} 
                            questions={quizQuestions} 
                            onClose={() => {
                                setShowQuiz(false);
                                setPastAttemptToView(null);
                            }} 
                            passingPercentage={quizSettings.passingPercentage}
                            pastAttempt={pastAttemptToView}
                            semester={semesterId}
                            subject={currentSubject?.label || subjectId}
                        />
                    </div>
                </div>
            )}

            {/* Floating Action Button for Quiz (Appears after 60s) */}
            {showFab && !showQuiz && viewMode === 'selection' && quizSettings.isEnabled && (
                <button
                    onClick={handleGenerateQuiz}
                    disabled={isGeneratingQuiz}
                    className="fixed bottom-24 right-6 z-50 bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-full shadow-2xl shadow-indigo-500/50 flex items-center justify-center transition-all transform hover:scale-110 active:scale-95 animate-bounce-short"
                    title="Take Unit MCQ"
                >
                    {isGeneratingQuiz ? <RefreshCw className="animate-spin" size={24} /> : <Lightbulb size={24} />}
                </button>
            )}

            {/* Custom App Alert */}
            {alertConfig && (
                <AppAlert
                    isOpen={alertConfig.isOpen}
                    onClose={alertConfig.onClose}
                    title={alertConfig.title}
                    message={alertConfig.message}
                    type={alertConfig.type}
                />
            )}
        </div>
    );
};

export default ModuleContent;
