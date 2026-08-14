import NoticeCard from '../../components/NoticeCard/NoticeCard';
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { noticeService } from '../../services/noticeService';
import { BookOpen, FileText, LayoutGrid, Calendar, Briefcase, Megaphone, ClipboardList, Bell, Search, AlertCircle } from 'lucide-react';
import './NoticeBoard.css';

const CATEGORIES = [
    { id: 'All', label: 'All', Icon: LayoutGrid },
    { id: 'Academic', label: 'Academic', Icon: BookOpen },
    { id: 'Exams', label: 'Exams', Icon: FileText },
    { id: 'Events', label: 'Events', Icon: Calendar },
    { id: 'Placements', label: 'Placements', Icon: Briefcase },
    { id: 'Circulars', label: 'Circulars', Icon: Megaphone },
    { id: 'Assignments', label: 'Assignments', Icon: ClipboardList }
];

// Module-level cache to prevent reloading spinner on every visit
let cachedNotices = null;
let cachedInteractions = null;

const NoticeBoard = () => {
    const { user } = useAuth();
    
    // Initialize from module cache or local storage
    const [notices, setNotices] = useState(() => {
        if (cachedNotices) return cachedNotices;
        try {
            const saved = localStorage.getItem('noticeboard_cache_notices');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    });
    
    const [interactions, setInteractions] = useState(() => {
        if (cachedInteractions) return cachedInteractions;
        try {
            const saved = localStorage.getItem('noticeboard_cache_interactions');
            return saved ? JSON.parse(saved) : {};
        } catch (e) {
            return {};
        }
    });
    
    const [loading, setLoading] = useState(() => {
        if (cachedNotices) return false;
        if (localStorage.getItem('noticeboard_cache_notices')) return false;
        return true;
    });
    
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');

    useEffect(() => {
        const fetchNotices = async () => {
            if (!user) return;
            
            // If we have cache, we still fetch in background but don't show loading
            if (!cachedNotices && !localStorage.getItem('noticeboard_cache_notices')) {
                setLoading(true);
            }
            
            try {
                const fetchedNotices = await noticeService.getEligibleNotices(user);
                const userInteractions = await noticeService.getUserInteractions(user.studentId || user.uid);
                
                cachedNotices = fetchedNotices;
                cachedInteractions = userInteractions;
                
                setNotices(fetchedNotices);
                setInteractions(userInteractions);
                
                // Persist to local storage for instant loads on restart
                try {
                    localStorage.setItem('noticeboard_cache_notices', JSON.stringify(fetchedNotices));
                    localStorage.setItem('noticeboard_cache_interactions', JSON.stringify(userInteractions));
                } catch (e) {
                    console.warn('Failed to cache notices to localStorage', e);
                }
                
            } catch (error) {
                console.error("Failed to fetch notices:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchNotices();
    }, [user]);

    const filteredNotices = useMemo(() => {
        return notices.filter(notice => {
            const matchesCategory = activeCategory === 'All' || notice.category === activeCategory;
            const matchesSearch = notice.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                  notice.content.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesCategory && matchesSearch;
        });
    }, [notices, searchQuery, activeCategory]);

    const stats = useMemo(() => {
        const total = notices.length;
        const unread = notices.filter(n => !interactions[n.id]?.isRead).length;
        const bookmarked = notices.filter(n => interactions[n.id]?.bookmarked).length;
        return { total, unread, bookmarked };
    }, [notices, interactions]);

    if (loading) {
        return (
            <div className="max-width-wrapper notice-board-page">
                <div className="cmp-top-bar noticeboard-page-header" style={{marginBottom: '1.5rem'}}>
                    <div className="cmp-title-section">
                        <div className="cmp-title-text" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <div className="skeleton" style={{ width: '180px', height: '32px', borderRadius: '8px' }}></div>
                            <div className="skeleton" style={{ width: '240px', height: '16px', borderRadius: '6px' }}></div>
                        </div>
                        <div className="cmp-header-icon skeleton" style={{ width: '100px', height: '80px', borderRadius: '16px' }}></div>
                    </div>
                </div>

                <div className="notice-dashboard-stats">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="notice-stat-card skeleton" style={{ minHeight: '90px' }}></div>
                    ))}
                </div>

                <div className="notice-filters" style={{ margin: '1.5rem 0' }}>
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="skeleton filter-chip" style={{ width: '100px', height: '38px', border: 'none' }}></div>
                    ))}
                </div>

                <div className="notice-list">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="skeleton" style={{ height: '240px', borderRadius: 'var(--radius-xl)' }}></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="max-width-wrapper notice-board-page animate-fade-in">
            <div className="cmp-top-bar noticeboard-page-header" style={{marginBottom: '1.5rem'}}>
                <div className="cmp-title-section">
                    <div className="cmp-title-text">
                        <h2>Notice Board</h2>
                        <p>Stay updated with the latest campus announcements</p>
                    </div>
                    <div className="cmp-header-icon" style={{ width: '120px', height: '90px', marginLeft: '15px' }}>
                        <svg viewBox="0 0 400 300" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                          <g transform="scale(1.1) translate(-10, -10)">
                            {/* Base Shadow */}
                            <ellipse cx="200" cy="260" rx="110" ry="10" fill="#475569" opacity="0.6"/>
                            
                            {/* Back Card */}
                            <rect x="130" y="80" width="140" height="160" rx="16" fill="#64748b" stroke="#1e3a8a" strokeWidth="4" />
                            
                            {/* Front Card */}
                            <rect x="100" y="100" width="180" height="150" rx="16" fill="#ffffff" stroke="#2563eb" strokeWidth="4" />
                            
                            {/* Header line */}
                            <line x1="100" y1="130" x2="280" y2="130" stroke="#2563eb" strokeWidth="4" />
                            
                            {/* Content lines */}
                            <rect x="120" y="150" width="140" height="12" rx="6" fill="#dbeafe" />
                            <rect x="120" y="175" width="100" height="12" rx="6" fill="#dbeafe" />
                            <rect x="120" y="200" width="120" height="12" rx="6" fill="#dbeafe" />
                            
                            {/* Notification Bell Badge overlapping */}
                            <circle cx="280" cy="115" r="30" fill="#fef3c7" stroke="#d97706" strokeWidth="4" />
                            <path d="M 280 95 C 270 95 265 105 265 115 L 260 125 L 300 125 L 295 115 C 295 105 290 95 280 95 Z" fill="#f59e0b" stroke="#d97706" strokeWidth="3" strokeLinejoin="round" />
                            <circle cx="280" cy="130" r="4" fill="#d97706" />
                            
                            {/* Notice Pin */}
                            <circle cx="190" cy="115" r="6" fill="#ef4444" />
                          </g>
                        </svg>
                    </div>
                </div>
            </div>

            <div className="notice-dashboard-stats">
                <div className="notice-stat-card">
                    <div className="stat-icon-wrapper blue">
                        <FileText size={24} />
                    </div>
                    <div className="stat-content">
                        <h4>Total Notices</h4>
                        <p>{stats.total}</p>
                    </div>
                </div>
                <div className="notice-stat-card">
                    <div className="stat-icon-wrapper orange">
                        <Bell size={24} />
                    </div>
                    <div className="stat-content">
                        <h4>Unread</h4>
                        <p>{stats.unread}</p>
                    </div>
                </div>
                <div className="notice-stat-card">
                    <div className="stat-icon-wrapper purple">
                        <BookOpen size={24} />
                    </div>
                    <div className="stat-content">
                        <h4>Bookmarked</h4>
                        <p>{stats.bookmarked}</p>
                    </div>
                </div>
            </div>

            <div className="notice-search-bar">
                <Search className="notice-search-icon" size={20} />
                <input 
                    type="text" 
                    placeholder="Search notices..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            <div className="notice-filters">
                {CATEGORIES.map(category => {
                    const IconComponent = category.Icon;
                    return (
                        <button
                            key={category.id}
                            className={`filter-chip ${activeCategory === category.id ? 'active' : ''}`}
                            onClick={() => setActiveCategory(category.id)}
                        >
                            <span className="filter-chip-icon">
                                <IconComponent size={16} />
                            </span>
                            {category.label}
                        </button>
                    );
                })}
            </div>

            {filteredNotices.length > 0 ? (
                <div className="notice-list">
                    {filteredNotices.map(notice => (
                        <NoticeCard 
                            key={notice.id} 
                            notice={notice} 
                            isRead={interactions[notice.id]?.isRead || false} 
                        />
                    ))}
                </div>
            ) : (
                <div className="empty-notices">
                    <div className="empty-notices-icon">
                        <AlertCircle size={32} />
                    </div>
                    <h3>No Notices Found</h3>
                    <p>There are no active notices matching your current filters or search query.</p>
                </div>
            )}
        </div>
    );
};

export default NoticeBoard;
