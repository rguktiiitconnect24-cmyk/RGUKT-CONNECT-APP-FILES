import { Heart, ChevronDown, ArrowLeft, Info, Pin, PinOff, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { PROGRAMS } from '../config/academics';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import './CoursesDesign.css';

const Courses = () => {
    const navigate = useNavigate();
    const { user, toggleFavoriteSemester, togglePinFavoriteSemester } = useAuth();
    const { showToast } = useToast();
    const [expandedYearId, setExpandedYearId] = useState(null);
    const [expandedBranchId, setExpandedBranchId] = useState(null);
    const [semesterToDelete, setSemesterToDelete] = useState(null);
    const [semesterToPin, setSemesterToPin] = useState(null);
    const [isPinningAction, setIsPinningAction] = useState(false);

    useEffect(() => {
        if (semesterToDelete || semesterToPin) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [semesterToDelete, semesterToPin]);

    const handleYearClick = (yearId) => {
        setExpandedYearId(prev => prev === yearId ? null : yearId);
        setExpandedBranchId(null); // Reset branch when year toggles
    };

    const handleBranchClick = (branchId) => {
        setExpandedBranchId(prev => prev === branchId ? null : branchId);
    };

    return (
        <div className="courses-page-new">


            {/* Main */}
            <main className="courses-main">
                <div className="cmp-top-bar courses-main-header" style={{marginBottom: '1.5rem'}}>
                    <div className="cmp-title-section">
                        <div className="cmp-title-text">
                            <h2>Academic Hub</h2>
                            <p>Select your path to access study materials.</p>
                        </div>
                        <div className="cmp-header-icon">
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
                                    <ellipse cx="200" cy="240" rx="120" ry="15" fill="#475569" opacity="0.2" />
                                    
                                    {/* Laptop Base */}
                                    <path d="M 60 210 L 340 210 L 360 230 L 40 230 Z" className="secondary" />
                                    <path d="M 60 210 L 340 210 L 360 230 L 40 230 Z" className="outline" />
                                    
                                    {/* Laptop Screen */}
                                    <rect x="80" y="80" width="240" height="130" rx="6" className="primary" />
                                    <rect x="80" y="80" width="240" height="130" rx="6" className="outline" />
                                    
                                    {/* Screen Inner */}
                                    <rect x="90" y="90" width="220" height="110" rx="4" className="white" />
                                    
                                    {/* Screen Content */}
                                    <rect x="100" y="100" width="80" height="60" rx="4" className="secondary" />
                                    <line x1="190" y1="110" x2="280" y2="110" className="outline" strokeWidth="6" />
                                    <line x1="190" y1="130" x2="260" y2="130" className="outline" strokeWidth="6" />
                                    <line x1="190" y1="150" x2="240" y2="150" className="outline" strokeWidth="6" />
                                    
                                    {/* Play Button */}
                                    <circle cx="140" cy="130" r="16" className="primary" />
                                    <path d="M 135 122 L 148 130 L 135 138 Z" className="white" />
                                    
                                    {/* Floating Academic Cap */}
                                    <g transform="translate(230, 20) scale(0.8)">
                                        <path d="M60 20 L110 40 L60 60 L10 40 Z" className="accent" />
                                        <path d="M60 20 L110 40 L60 60 L10 40 Z" className="outline" strokeWidth="5" />
                                        
                                        <path d="M30 48 L30 70 C45 80 75 80 90 70 L90 48" className="dark-accent" />
                                        <path d="M30 48 L30 70 C45 80 75 80 90 70 L90 48" className="outline" strokeWidth="5" />
                                        
                                        <circle cx="60" cy="20" r="5" className="white" />
                                        <circle cx="60" cy="20" r="5" className="outline" strokeWidth="5" />
                                        <path d="M60 20 L100 65" className="outline" strokeWidth="5" />
                                        <rect x="95" y="65" width="10" height="20" rx="2" className="accent" />
                                        <rect x="95" y="65" width="10" height="20" rx="2" className="outline" strokeWidth="5" />
                                    </g>
                                    
                                    {/* Decorative elements */}
                                    <circle cx="70" cy="60" r="6" className="accent" />
                                    <circle cx="110" cy="40" r="4" className="secondary" />
                                </g>
                            </svg>
                        </div>
                    </div>
                </div>

                <div style={{display: 'flex', flexDirection: 'column', gap: '40px', padding: '0 1.5rem'}}>
                    {user?.favoriteSemesters?.length > 0 && (
                        <div className="accordion-container" style={{ marginBottom: '-10px' }}>
                            <div className={`accordion-item ${expandedYearId === 'favorite' ? 'expanded' : ''}`}>
                                <button className="accordion-trigger" onClick={() => handleYearClick('favorite')}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                                        <div className="p-2 rounded-xl flex-shrink-0" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
                                            <Heart size={20} fill="#ef4444" color="#ef4444" />
                                        </div>
                                        <div className="accordion-trigger-left" style={{ minWidth: 0, overflow: 'hidden', textAlign: 'left' }}>
                                            <h4 className="font-headline-sm" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>Your Academic Favorites</h4>
                                            <span className="font-label-md" style={{ color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', marginTop: '2px' }}>Your saved semesters</span>
                                        </div>
                                    </div>
                                    <ChevronDown className="chevron-icon" size={24} />
                                </button>
                                <div className="accordion-content">
                                    <div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', width: '100%' }}>
                                            {user.favoriteSemesters.map((fav, idx) => {
                                                let displaySubtitle = fav.subtitle || '';
                                                if (fav.branchId && fav.programId && fav.yearId) {
                                                    const program = PROGRAMS.find(p => p.id === fav.programId);
                                                    if (program) {
                                                        const year = program.years.find(y => y.id === fav.yearId);
                                                        if (year && year.branches) {
                                                            displaySubtitle = displaySubtitle.replace(`${program.label} • `, '').replace(program.label, '').trim();
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
                                                        className="semester-btn"
                                                        style={{ 
                                                            display: 'block',
                                                            background: 'rgba(239, 68, 68, 0.05)', 
                                                            border: '1px solid rgba(239, 68, 68, 0.2)',
                                                            textAlign: 'left',
                                                            position: 'relative',
                                                            padding: '20px 16px 28px 16px',
                                                            paddingRight: '76px',
                                                            width: '100%',
                                                            overflow: 'hidden'
                                                        }}
                                                        onClick={(e) => {
                                                            if (e.target.closest('.semester-delete-btn') || e.target.closest('.semester-pin-btn')) return;
                                                            navigate(`/courses/${fav.yearId}/${fav.semesterId}?branch=${fav.branchId}`);
                                                        }}
                                                    >
                                                        <span className="font-title-lg semester-title" style={{ color: '#ef4444', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0, padding: 0, textAlign: 'left' }}>{fav.title}</span>
                                                        <span className="font-label-md semester-subtitle" style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '8px', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', padding: 0, textAlign: 'left' }}>{displaySubtitle}</span>
                                                        
                                                        <button 
                                                            className="semester-pin-btn"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSemesterToPin(fav);
                                                            }}
                                                        >
                                                            {fav.isPinned ? <PinOff size={14} strokeWidth={2.5} /> : <Pin size={14} fill="none" />}
                                                        </button>

                                                        <button 
                                                            className="semester-delete-btn"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSemesterToDelete(fav);
                                                            }}
                                                        >
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"></path></svg>
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    {PROGRAMS.map((program) => {
                        const isPrimary = program.color === 'blue';
                        const colorClass = isPrimary ? 'primary' : 'secondary';
                        const Icon = program.icon;

                        return (
                            <div key={program.id} className="program-section">
                                <div className="program-header">
                                    <div className={`program-icon-box ${colorClass}`}>
                                        <Icon size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-title-lg" style={{lineHeight: '1.2'}}>{program.label}</h3>
                                        <p className="font-body-md" style={{color: 'var(--sys-on-surface-variant)', opacity: 0.8}}>{program.description}</p>
                                    </div>
                                </div>

                                <div className="accordion-container">
                                    {program.years.map((year) => {
                                        const isExpanded = expandedYearId === year.id;
                                        return (
                                            <div key={year.id} className={`accordion-item ${isExpanded ? 'expanded' : ''}`}>
                                                <button className="accordion-trigger" onClick={() => handleYearClick(year.id)}>
                                                    <div className="accordion-trigger-left">
                                                        <h4 className="font-headline-sm">{year.label}</h4>
                                                        <span className="font-label-md">{year.subLabel}</span>
                                                    </div>
                                                    <ChevronDown className="chevron-icon" size={24} />
                                                </button>
                                                <div className="accordion-content">
                                                    <div>
                                                        <div className="semesters-grid" style={{width: '100%'}}>
                                                            {year.branches ? (
                                                                expandedBranchId && year.branches.some(b => b.id === expandedBranchId) ? (
                                                                    <div style={{width: '100%', gridColumn: '1 / -1'}}>
                                                                        <button 
                                                                            onClick={() => setExpandedBranchId(null)}
                                                                            className="flex items-center gap-2 text-sm font-medium mb-4 transition-colors"
                                                                            style={{ color: 'var(--color-primary-500)', backgroundColor: 'transparent', padding: '0', border: 'none', cursor: 'pointer' }}
                                                                        >
                                                                            <ArrowLeft size={16} /> Back to Branches
                                                                        </button>
                                                                        <div className="semesters-grid">
                                                                            {year.branches.find(b => b.id === expandedBranchId).semesters.map((sem) => (
                                                                                <button 
                                                                                    key={sem.id} 
                                                                                    className={`semester-btn ${colorClass}`}
                                                                                    onClick={() => navigate(`/courses/${year.id}/${sem.id}?branch=${expandedBranchId}`)}
                                                                                >
                                                                                    <span className="font-title-lg semester-title">{sem.label.replace('Semester ', 'Sem ')}</span>
                                                                                    <span className="font-label-md semester-subtitle">{sem.subLabel || 'Explore'}</span>
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    year.branches.map((branch) => (
                                                                        <button 
                                                                            key={branch.id} 
                                                                            className={`semester-btn ${colorClass}`}
                                                                            onClick={() => handleBranchClick(branch.id)}
                                                                        >
                                                                            <span className="font-title-lg semester-title">{branch.id.toUpperCase()}</span>
                                                                        </button>
                                                                    ))
                                                                )
                                                            ) : (
                                                                year.semesters?.map((sem) => (
                                                                    <button 
                                                                        key={sem.id} 
                                                                        className={`semester-btn ${colorClass}`}
                                                                        onClick={() => navigate(`/courses/${year.id}/${sem.id}`)}
                                                                    >
                                                                        <span className="font-title-lg semester-title">{sem.label.replace('Semester ', 'Sem ')}</span>
                                                                        <span className="font-label-md semester-subtitle">{sem.subLabel || 'Explore'}</span>
                                                                    </button>
                                                                ))
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', padding: '0 1.5rem', marginTop: '2rem' }}>
                    <div className="missing-course-box">
                        <div className="missing-course-bg-blur"></div>
                        <div className="missing-course-content">
                            <div className="missing-info-icon">
                                <Info size={24} />
                            </div>
                            <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                                <h4 className="font-title-lg">Missing a course?</h4>
                                <p className="font-body-md" style={{color: 'rgba(255,255,255,0.8)'}}>Materials are updated weekly based on the department's latest syllabus changes.</p>
                            </div>
                            <button className="missing-course-btn font-label-md" onClick={() => navigate('/complaints')}>Contact Academic Cell</button>
                        </div>
                    </div>

                    <div className="missing-course-box" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
                        <div className="missing-course-bg-blur"></div>
                        <div className="missing-course-content">
                            <div className="missing-info-icon" style={{ background: 'rgba(255,255,255,0.2)' }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path></svg>
                            </div>
                            <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                                <h4 className="font-title-lg">Need a Textbook?</h4>
                                <p className="font-body-md" style={{color: 'rgba(255,255,255,0.8)'}}>Order library books or request new study materials directly from here.</p>
                            </div>
                            <button className="missing-course-btn font-label-md" style={{ color: '#059669' }} onClick={() => navigate('/rcbookhub')}>Order Books</button>
                        </div>
                    </div>
                </div>
            </main>

            {/* Custom Confirm Modal for Delete */}
            {semesterToDelete && createPortal(
                <div className="courses-modal-overlay" onClick={() => setSemesterToDelete(null)}>
                    <div className="courses-modal-content" onClick={e => e.stopPropagation()}>
                        <h3 className="font-headline-sm" style={{ color: 'var(--color-text-main, #1e1b4b)', marginBottom: '12px' }}>Remove Favorite?</h3>
                        <p className="font-label-md" style={{ color: 'var(--color-text-muted, #64748b)', marginBottom: '24px', lineHeight: '1.5' }}>
                            Are you sure you want to remove <strong style={{ color: '#f43f5e' }}>{semesterToDelete.title}</strong> from your favorites?
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button 
                                className="modal-btn-cancel"
                                onClick={() => setSemesterToDelete(null)}
                            >
                                Cancel
                            </button>
                            <button 
                                className="modal-btn-delete"
                                onClick={() => {
                                    toggleFavoriteSemester({
                                        semesterId: semesterToDelete.semesterId,
                                        programId: semesterToDelete.programId,
                                        branchId: semesterToDelete.branchId
                                    });
                                    setSemesterToDelete(null);
                                }}
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Custom Confirm Modal for Pin */}
            {semesterToPin && createPortal(
                <div className="courses-modal-overlay" onClick={() => setSemesterToPin(null)}>
                    <div className="courses-modal-content" onClick={e => e.stopPropagation()}>
                        <h3 className="font-headline-sm" style={{ color: 'var(--color-text-main, #1e1b4b)', marginBottom: '12px' }}>
                            {semesterToPin.isPinned ? "Unpin Favorite?" : "Pin Favorite?"}
                        </h3>
                        <p className="font-label-md" style={{ color: 'var(--color-text-muted, #64748b)', marginBottom: '24px', lineHeight: '1.5' }}>
                            Are you sure you want to {semesterToPin.isPinned ? "unpin" : "pin"} <strong style={{ color: '#6366f1' }}>{semesterToPin.title}</strong>?
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button 
                                className="modal-btn-cancel"
                                onClick={() => setSemesterToPin(null)}
                                disabled={isPinningAction}
                                style={{ opacity: isPinningAction ? 0.5 : 1 }}
                            >
                                Cancel
                            </button>
                            <button 
                                className="modal-btn-delete"
                                style={{ 
                                    backgroundColor: 'rgba(99, 102, 241, 0.1)', 
                                    color: '#6366f1', 
                                    borderColor: 'rgba(99, 102, 241, 0.15)',
                                    opacity: isPinningAction ? 0.7 : 1,
                                    cursor: isPinningAction ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                                disabled={isPinningAction}
                                onClick={async () => {
                                    setIsPinningAction(true);
                                    try {
                                        await togglePinFavoriteSemester(semesterToPin);
                                        showToast(semesterToPin.isPinned ? 'Unpinned successfully' : 'Pinned successfully', 'success');
                                    } catch (err) {
                                        console.error(err);
                                        showToast('Failed to pin', 'error');
                                    } finally {
                                        setIsPinningAction(false);
                                        setSemesterToPin(null);
                                    }
                                }}
                            >
                                {isPinningAction && <Loader2 size={16} className="animate-spin" />}
                                {isPinningAction 
                                    ? (semesterToPin.isPinned ? "Unpinning..." : "Pinning...")
                                    : (semesterToPin.isPinned ? "Unpin" : "Pin")
                                }
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
            
        </div>
    );
};

export default Courses;
