import LoadingTransition from '../components/Common/LoadingTransition';
import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { PROGRAMS } from '../config/academics';
import { fetchDynamicSubjects, fetchDynamicUnits } from '../utils/academicsUtils';
import { Book, Globe, Calculator, Zap, FlaskConical, Terminal, Heart, ChevronRight, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './CourseSubjects.css';

const getSubjectStyles = (subjectName, index) => {
    const name = subjectName.toLowerCase();
    if (name.includes('telugu')) return { bg: 'bg-vibrant-violet', shadow: 'shadow-violet-200', text: 'color-violet', label: 'Core', icon: Book };
    if (name.includes('english')) return { bg: 'bg-vibrant-indigo', shadow: 'shadow-indigo-200', text: 'color-indigo', label: 'Language', icon: Globe };
    if (name.includes('math')) return { bg: 'bg-vibrant-blue', shadow: 'shadow-blue-200', text: 'color-blue', label: 'Expert', icon: Calculator };
    if (name.includes('physics')) return { bg: 'bg-vibrant-rose', shadow: 'shadow-rose-200', text: 'color-rose', label: 'Active', icon: Zap };
    if (name.includes('chemistry')) return { bg: 'bg-vibrant-emerald', shadow: 'shadow-emerald-200', text: 'color-emerald', label: 'Lab', icon: FlaskConical };
    if (name.includes('it') || name.includes('information')) return { bg: 'bg-vibrant-orange', shadow: 'shadow-orange-200', text: 'color-orange', label: 'Tech', icon: Terminal };
    
    const fallbacks = [
        { bg: 'bg-vibrant-violet', shadow: 'shadow-violet-200', text: 'color-violet', label: 'Core', icon: Book },
        { bg: 'bg-vibrant-indigo', shadow: 'shadow-indigo-200', text: 'color-indigo', label: 'Core', icon: Book },
        { bg: 'bg-vibrant-blue', shadow: 'shadow-blue-200', text: 'color-blue', label: 'Core', icon: Book },
        { bg: 'bg-vibrant-emerald', shadow: 'shadow-emerald-200', text: 'color-emerald', label: 'Core', icon: Book },
    ];
    return fallbacks[index % fallbacks.length];
};

const CourseSubjects = () => {
    const { yearId, semesterId } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const branchId = searchParams.get('branch');
    const [dynamicSubjects, setDynamicSubjects] = useState([]);
    const [subjectUnitCounts, setSubjectUnitCounts] = useState({});
    const [loading, setLoading] = useState(true);
    const [expandedSubjectId, setExpandedSubjectId] = useState(null);
    const [expandedUnits, setExpandedUnits] = useState([]);
    const [loadingUnits, setLoadingUnits] = useState(false);
    const { user, toggleFavoriteSemester } = useAuth();
    const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);
    const [burstParticles, setBurstParticles] = useState([]);
    const [floatingMessage, setFloatingMessage] = useState(null);
    const [isAnimating, setIsAnimating] = useState(false);
    const [isBannerFadingOut, setIsBannerFadingOut] = useState(false);
    const [isBannerHidden, setIsBannerHidden] = useState(false);

    let currentYear = null;
    let currentProgram = null;
    let currentSemester = null;
    let currentBranch = null;

    for (const program of PROGRAMS) {
        const foundYear = program.years.find(y => y.id === yearId);
        if (foundYear) {
            currentYear = foundYear;
            currentProgram = program;
            let targetSemesters = foundYear.semesters;
            if (branchId && foundYear.branches) {
                const branch = foundYear.branches.find(b => b.id === branchId);
                if (branch) {
                    targetSemesters = branch.semesters;
                    currentBranch = branch;
                }
            }
            if (targetSemesters) {
                const foundSemester = targetSemesters.find(s => s.id === semesterId);
                if (foundSemester) {
                    currentSemester = foundSemester;
                }
            }
            break;
        }
    }

    useEffect(() => {
        const loadDynamicContent = async () => {
            if (currentProgram && currentYear && currentSemester) {
                const dynamic = await fetchDynamicSubjects(currentProgram.id, currentYear.id, branchId || null, currentSemester.id);
                setDynamicSubjects(dynamic);

                // Fetch unit counts for dynamic subjects so they display accurately
                const counts = {};
                await Promise.all(dynamic.map(async (subj) => {
                    try {
                        const units = await fetchDynamicUnits(subj.id);
                        counts[subj.id] = units.length;
                    } catch (e) {
                        counts[subj.id] = 0;
                    }
                }));
                setSubjectUnitCounts(counts);
            }
            setLoading(false);
        };
        loadDynamicContent();
    }, [currentProgram, currentYear, currentSemester, branchId]);

    const handleSubjectClick = async (subject) => {
        if (expandedSubjectId === subject.id) {
            setExpandedSubjectId(null);
            // Leaving expandedUnits populated so collapse animation is smooth
            return;
        }

        setExpandedSubjectId(subject.id);
        setLoadingUnits(true);
        setExpandedUnits([]);

        try {
            const staticUnits = subject.units || [];
            const dynamicUnits = await fetchDynamicUnits(subject.id);
            setExpandedUnits([...staticUnits, ...dynamicUnits]);
        } catch (error) {
            console.error("Error loading units:", error);
        } finally {
            setLoadingUnits(false);
        }
    };

    if (!currentSemester) {
        return <div className="cs-fallback-text">Semester not found.</div>;
    }

    const allSubjects = [...(currentSemester.subjects || []), ...dynamicSubjects];

    const formatSemesterTitle = (label) => {
        if (!label) return '';
        const romanMap = {
            '1': 'I', '2': 'II', '3': 'III', '4': 'IV',
            '5': 'V', '6': 'VI', '7': 'VII', '8': 'VIII',
            '9': 'IX', '10': 'X'
        };
        return label.replace(/Semester\s+(\d+)/i, (match, p1) => {
            return `Semester - ${romanMap[p1] || p1}`;
        });
    };

    const isFavorite = user?.favoriteSemesters?.some(s => 
        s.semesterId === currentSemester.id && 
        s.branchId === branchId &&
        s.programId === currentProgram.id
    );

    useEffect(() => {
        if (isFavorite && !isTogglingFavorite && !isAnimating) {
            setIsBannerHidden(true);
        }
    }, [isFavorite, isTogglingFavorite, isAnimating]);

    const handleToggleFavorite = async () => {
        setIsTogglingFavorite(true);
        setIsAnimating(true);
        
        if (!isFavorite) {
            const colors = ['#FF3B5C', '#FF5E7A', '#FF7AA2'];
            const newParticles = Array.from({ length: 18 }).map((_, i) => {
                const isSparkle = Math.random() > 0.6;
                const angle = Math.random() * Math.PI * 2;
                const distance = 40 + Math.random() * 90;
                return {
                    id: Date.now() + i,
                    type: isSparkle ? 'sparkle' : 'heart',
                    tx: `${Math.cos(angle) * distance}px`,
                    ty: `${Math.sin(angle) * distance - 20}px`,
                    size: isSparkle ? 6 + Math.random() * 6 : 10 + Math.random() * 14,
                    duration: 1.8 + Math.random() * 0.7, // 1.8s to 2.5s
                    delay: Math.random() * 0.2,
                    rot: Math.random() * 360 - 180,
                    color: isSparkle ? '#FFD6E7' : colors[Math.floor(Math.random() * 3)]
                };
            });
            setBurstParticles(newParticles);
            setFloatingMessage("❤️ Added to Favorites");
            
            setTimeout(() => setBurstParticles([]), 3000);
            setTimeout(() => {
                setFloatingMessage(null);
                setIsAnimating(false);
                setIsBannerFadingOut(true);
                setTimeout(() => setIsBannerHidden(true), 500); // Wait for CSS fade out
            }, 2500);
        } else {
            const newParticles = Array.from({ length: 5 }).map((_, i) => {
                const angle = Math.random() * Math.PI * 2;
                const distance = 20 + Math.random() * 30;
                return {
                    id: Date.now() + i,
                    type: 'heart',
                    tx: `${Math.cos(angle) * distance}px`,
                    ty: `${Math.sin(angle) * distance}px`,
                    size: 8 + Math.random() * 5,
                    duration: 0.6 + Math.random() * 0.3,
                    delay: 0,
                    rot: Math.random() * 90 - 45,
                    color: 'rgba(255,255,255,0.4)'
                };
            });
            setBurstParticles(newParticles);
            setTimeout(() => {
                setBurstParticles([]);
                setIsAnimating(false);
            }, 1000);
        }

        try {
            let subtitleText = `${currentProgram.label} • ${currentYear.label}`;
            if (currentBranch) {
                subtitleText += ` • ${currentBranch.label}`;
            }

            await toggleFavoriteSemester({
                semesterId: currentSemester.id,
                branchId: branchId,
                programId: currentProgram.id,
                yearId: currentYear.id,
                title: formatSemesterTitle(currentSemester.label),
                subtitle: subtitleText
            });
        } finally {
            setIsTogglingFavorite(false);
        }
    };

    return (
        <main className="course-subjects-main">
                <div className="cmp-top-bar course-subjects-header" style={{ marginBottom: '1.5rem' }}>
                    <div className="cmp-title-section" style={{ position: 'relative' }}>
                        <div className="cmp-title-text" style={{ flex: 1 }}>
                            <h2 style={{ fontSize: '1.75rem', margin: 0 }}>{formatSemesterTitle(currentSemester.label)}</h2>
                            <p style={{ marginTop: '4px' }}>Academic Year {new Date().getFullYear()}</p>
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
                                    
                                    {/* Top Book */}
                                    <path d="M 130 110 L 260 110 L 280 140 L 150 140 Z" className="secondary" />
                                    <path d="M 130 110 L 260 110 L 280 140 L 150 140 Z" className="outline" />
                                    <path d="M 130 110 L 150 140 L 150 150 L 130 120 Z" className="primary" />
                                    <path d="M 130 110 L 150 140 L 150 150 L 130 120 Z" className="outline" />
                                    <path d="M 150 140 L 280 140 L 280 150 L 150 150 Z" className="white" />
                                    <path d="M 150 140 L 280 140 L 280 150 L 150 150 Z" className="outline" />
                                    
                                    {/* Bookmark in Top Book */}
                                    <path d="M 220 110 L 235 110 L 245 145 L 230 145 Z" className="accent" />
                                    <path d="M 220 110 L 235 110 L 245 145 L 230 145 Z" className="outline" />
                                    <path d="M 245 145 L 245 160 L 237 155 L 230 160 L 230 145 Z" className="accent" />
                                    <path d="M 245 145 L 245 160 L 237 155 L 230 160 L 230 145 Z" className="outline" />
                                    
                                    {/* Apple on top */}
                                    <circle cx="190" cy="80" r="24" className="white" />
                                    <circle cx="190" cy="80" r="24" className="outline" />
                                    <path d="M 170 80 C 170 60, 210 60, 210 80 C 210 100, 170 100, 170 80 Z" className="primary" />
                                    <path d="M 190 56 C 200 40, 210 50, 210 50" className="outline" />
                                    <path d="M 190 56 L 205 50 C 200 65, 190 56, 190 56 Z" className="accent" />
                                    <path d="M 190 56 L 205 50 C 200 65, 190 56, 190 56 Z" className="outline" />
                                    
                                    {/* Sparkles */}
                                    <circle cx="90" cy="110" r="4" className="secondary" />
                                    <circle cx="280" cy="70" r="6" className="accent" />
                                </g>
                            </svg>
                        </div>
                    </div>
                </div>

                {!isBannerHidden && (
                    <div className={`favorite-banner-container ${isAnimating ? 'is-animating' : ''} ${isBannerFadingOut ? 'banner-fade-out' : ''}`}>
                        <div className="flex items-center gap-4 relative z-10">
                        <div className="favorite-icon-box">
                            <Heart size={22} fill="#ef4444" color="#ef4444" />
                        </div>
                        <div>
                            <h3 className="favorite-banner-title">Add to Favorites</h3>
                            <p className="favorite-banner-desc">Save this semester for quick access</p>
                        </div>
                    </div>
                    
                    <div className="sparkle-icon" style={{ opacity: 0.8 }}>
                        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 20C12 20 18 20 20 12C20 12 20 18 28 20C28 20 20 20 20 28C20 28 20 22 12 20Z" fill="#ef4444"/>
                            <path d="M26 10C26 10 28.5 10 29.5 7C29.5 7 29.5 9.5 32.5 10C32.5 10 29.5 10.5 29.5 13.5C29.5 13.5 29.5 11 26 10Z" fill="#a855f7"/>
                            <path d="M30 24C30 24 31 24 31.5 23C31.5 23 31.5 24 32.5 24C32.5 24 31.5 24.5 31.5 25.5C31.5 25.5 31.5 24.5 30 24Z" fill="#3b82f6"/>
                        </svg>
                    </div>

                    <button
                        onClick={handleToggleFavorite}
                        disabled={isTogglingFavorite}
                        className={`favorite-btn-gradient ${isAnimating ? 'btn-animating' : ''}`}
                        style={{ position: 'relative' }}
                    >
                        {floatingMessage && (
                            <div className="floating-message-premium">
                                {floatingMessage}
                            </div>
                        )}
                        {burstParticles.map(p => (
                            <div 
                                key={p.id} 
                                className="premium-burst-particle"
                                style={{
                                    '--tx': p.tx,
                                    '--ty': p.ty,
                                    '--rot': `${p.rot}deg`,
                                    '--scale1': 1.2,
                                    '--scale2': 1.0,
                                    animationDuration: `${p.duration}s`,
                                    animationDelay: `${p.delay}s`
                                }}
                            >
                                {p.type === 'heart' ? (
                                    <Heart fill={p.color} color={p.color} size={p.size} />
                                ) : (
                                    <div style={{ width: p.size, height: p.size, background: p.color, borderRadius: '50%', boxShadow: `0 0 8px ${p.color}` }} />
                                )}
                            </div>
                        ))}
                        <Heart size={18} fill={isFavorite ? "white" : "none"} color="white" style={{ position: 'relative', zIndex: 5 }} />
                        <span className="favorite-btn-text" style={{ position: 'relative', zIndex: 5 }}>
                            <span className="btn-text-desktop">{isFavorite ? "Saved" : "Add to Favorites"}</span>
                            <span className="btn-text-mobile">{isFavorite ? "Saved" : "Add"}</span>
                        </span>
                    </button>
                </div>
                )}
                {loading ? (
                    <LoadingTransition persistent variant="book" />
                ) : allSubjects.length === 0 ? (
                    <div className="empty-state-card">
                        <div className="empty-state-text">No subjects available yet.</div>
                        <button
                            onClick={() => navigate(-1)}
                            className="go-back-btn"
                        >
                            Go Back
                        </button>
                    </div>
                ) : (
                    <div className="subjects-grid">
                        {allSubjects.map((subject, index) => {
                            const style = getSubjectStyles(subject.label, index);
                            const Icon = style.icon;
                            const isExpanded = expandedSubjectId === subject.id;

                            return (
                                <div 
                                    key={subject.id} 
                                    className={`new-subject-card ${isExpanded ? 'expanded' : ''}`}
                                    onClick={() => handleSubjectClick(subject)}
                                >
                                    <div className="subject-card-header">
                                        <div className="subject-icon-box">
                                            <i className="fa-regular fa-file subject-file-icon"></i>
                                        </div>
                                        <div className="subject-info">
                                            <h3 className="subject-title">
                                                {subject.label}
                                            </h3>
                                            <div className="unit-badge">
                                                <span className={`unit-badge-text ${style.text}`}>
                                                    {(isExpanded && expandedUnits.length > 0) ? expandedUnits.length : (subjectUnitCounts[subject.id] !== undefined ? subjectUnitCounts[subject.id] : (subject.units?.length || 0))} UNITS • {style.label.toUpperCase()}
                                                </span>
                                            </div>
                                        </div>
                                        <ChevronRight className="expand-chevron" />
                                    </div>

                                    {/* Units Dropdown */}
                                    <div className="new-unit-list" onClick={(e) => e.stopPropagation()}>
                                        <div className="unit-list-inner">
                                            {loadingUnits ? (
                                                <div className="units-loader">
                                                    <Loader2 className="cs-spinner" size={24} />
                                                </div>
                                            ) : expandedUnits.length > 0 ? (
                                                expandedUnits.map((unit, i) => (
                                                    <div 
                                                        key={unit.id}
                                                        onClick={() => navigate(`/courses/${yearId}/${semesterId}/${subject.id}/${unit.id}${branchId ? `?branch=${branchId}` : ''}`)}
                                                        className="unit-item"
                                                    >
                                                        <div className="unit-item-left">
                                                            <div className="unit-item-svg-wrapper">
                                                                <svg width="24" height="24" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                    <path d="M9 5C9 3.89543 9.89543 3 11 3H22.5858C23.1162 3 23.6249 3.21071 24 3.58579L30.4142 10C30.7893 10.3751 31 10.8838 31 11.4142V35C31 36.1046 30.1046 37 29 37H11C9.89543 37 9 36.1046 9 35V5Z" stroke="#2563eb" strokeWidth="2.5" fill="#ffffff" />
                                                                    <path d="M23 3.5V9.5C23 10.3284 23.6716 11 24.5 11H30.5" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                                                    <line x1="14" y1="9" x2="19" y2="9" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" />
                                                                    <line x1="14" y1="13" x2="21" y2="13" stroke="#bfdbfe" strokeWidth="2.5" strokeLinecap="round" />
                                                                    <rect x="13" y="17" width="16" height="11" rx="2" fill="#2563eb" />
                                                                    <text x="21" y="25.5" fill="#ffffff" fontSize="9" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">
                                                                        {(i + 1).toString().padStart(2, '0')}
                                                                    </text>
                                                                    <line x1="14" y1="32" x2="20" y2="32" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" />
                                                                    <circle cx="28" cy="27" r="6" fill="#ffffff" stroke="#2563eb" strokeWidth="2.5" />
                                                                    <line x1="32" y1="31" x2="36" y2="35" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" />
                                                                </svg>
                                                            </div>
                                                            <span className="unit-item-label">
                                                                {unit.label}
                                                            </span>
                                                        </div>
                                                        <ChevronRight size={16} className="unit-item-arrow" />
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="no-units-text">
                                                    No units available.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
                
                {allSubjects.length > 0 && (
                    <footer className="explore-footer">
                        <div className="explore-footer-inner">
                            <div className="explore-dots">
                                <div className="explore-dot explore-dot-1"></div>
                                <div className="explore-dot explore-dot-2"></div>
                                <div className="explore-dot explore-dot-3"></div>
                            </div>
                            <p className="explore-text">
                                Keep exploring your semester!
                            </p>
                        </div>
                    </footer>
                )}
        </main>
    );
};

export default CourseSubjects;
