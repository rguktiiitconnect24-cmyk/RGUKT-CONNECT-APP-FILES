import CourseCard from './CourseCard';
import LoadingTransition from '../components/Common/LoadingTransition';
import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { PROGRAMS } from '../config/academics';
import { fetchDynamicSubjects } from '../utils/academicsUtils';
import { Calendar } from 'lucide-react';

const CourseSemesters = () => {
    const { yearId } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const branchId = searchParams.get('branch');
    const [semesterCounts, setSemesterCounts] = useState({});
    const [loading, setLoading] = useState(true);

    // Find the year data
    let currentYear = null;
    let currentProgram = null;

    for (const program of PROGRAMS) {
        const foundYear = program.years.find(y => y.id === yearId);
        if (foundYear) {
            currentYear = foundYear;
            currentProgram = program;
            break;
        }
    }

    let targetSemesters = currentYear?.semesters || [];
    let currentBranch = null;
    if (branchId && currentYear?.branches) {
        currentBranch = currentYear.branches.find(b => b.id === branchId);
        if (currentBranch) {
            targetSemesters = currentBranch.semesters || [];
        }
    }

    useEffect(() => {
        const loadCounts = async () => {
            if (currentProgram && currentYear) {
                const counts = {};
                for (const sem of targetSemesters) {
                    const dynamic = await fetchDynamicSubjects(currentProgram.id, currentYear.id, currentBranch?.id || null, sem.id);
                    counts[sem.id] = (sem.subjects?.length || 0) + dynamic.length;
                }
                setSemesterCounts(counts);
            }
            setLoading(false);
        };
        loadCounts();
    }, [currentProgram, currentYear, targetSemesters, currentBranch]);

    if (!currentYear) {
        return <div className="p-8 text-center text-[var(--color-text-muted)] dark:text-slate-400">Year not found.</div>;
    }

    return (
        <div className="space-y-20 animate-fade-in pb-12">
            <div className="cmp-top-bar course-semesters-header" style={{marginBottom: '1.5rem'}}>
                <div className="cmp-title-section">
                    <div className="cmp-title-text">
                        <h2>{currentBranch ? `${currentYear.label} - ${currentBranch.label}` : currentYear.label}</h2>
                        <p>Select a semester to view courses.</p>
                    </div>
                    <div className="cmp-header-icon" style={{ width: '120px', height: '90px', marginLeft: '15px' }}>
                        <svg viewBox="0 0 400 300" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
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
                                <ellipse cx="200" cy="240" rx="100" ry="15" fill="#475569" opacity="0.2" />
                                
                                {/* Calendar Background Pages */}
                                <path d="M 120 70 L 280 70 L 280 210 L 120 210 Z" className="secondary" />
                                <path d="M 120 70 L 280 70 L 280 210 L 120 210 Z" className="outline" />
                                <path d="M 110 80 L 270 80 L 270 220 L 110 220 Z" className="white" />
                                <path d="M 110 80 L 270 80 L 270 220 L 110 220 Z" className="outline" />
                                
                                {/* Front Calendar Page */}
                                <path d="M 100 90 L 260 90 L 260 230 L 100 230 Z" className="white" />
                                <path d="M 100 90 L 260 90 L 260 230 L 100 230 Z" className="outline" />
                                
                                {/* Calendar Header */}
                                <path d="M 100 90 L 260 90 L 260 130 L 100 130 Z" className="primary" />
                                <path d="M 100 90 L 260 90 L 260 130 L 100 130 Z" className="outline" />
                                
                                {/* Binder Rings */}
                                <rect x="130" y="70" width="10" height="40" rx="5" className="white" />
                                <rect x="130" y="70" width="10" height="40" rx="5" className="outline" />
                                <rect x="175" y="70" width="10" height="40" rx="5" className="white" />
                                <rect x="175" y="70" width="10" height="40" rx="5" className="outline" />
                                <rect x="220" y="70" width="10" height="40" rx="5" className="white" />
                                <rect x="220" y="70" width="10" height="40" rx="5" className="outline" />
                                
                                {/* Calendar Grid */}
                                <rect x="120" y="150" width="25" height="20" rx="2" className="secondary" />
                                <rect x="155" y="150" width="25" height="20" rx="2" className="secondary" />
                                <rect x="190" y="150" width="25" height="20" rx="2" className="primary" />
                                <rect x="225" y="150" width="25" height="20" rx="2" className="secondary" />
                                
                                <rect x="120" y="180" width="25" height="20" rx="2" className="secondary" />
                                <rect x="155" y="180" width="25" height="20" rx="2" className="secondary" />
                                <rect x="190" y="180" width="25" height="20" rx="2" className="secondary" />
                                <rect x="225" y="180" width="25" height="20" rx="2" className="secondary" />
                                
                                {/* Checkmark Badge on Calendar */}
                                <g transform="translate(240, 190) scale(1.2)">
                                    <circle cx="20" cy="20" r="16" className="accent" />
                                    <circle cx="20" cy="20" r="16" className="outline" />
                                    <path d="M 13 20 L 18 25 L 27 15" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                                    <path d="M 13 20 L 18 25 L 27 15" className="outline" strokeWidth="2" />
                                </g>
                                
                                {/* Sparkles */}
                                <circle cx="80" cy="110" r="4" className="secondary" />
                                <circle cx="90" cy="90" r="6" className="accent" />
                            </g>
                        </svg>
                    </div>
                </div>
            </div>

            {loading ? (
                <LoadingTransition persistent variant="book" />
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl">
                    {targetSemesters.map((sem) => (
                        <CourseCard 
                            key={sem.id}
                            label={sem.label}
                            icon={Calendar}
                            onClick={() => navigate(`/courses/${yearId}/${sem.id}${branchId ? `?branch=${branchId}` : ''}`)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default CourseSemesters;
