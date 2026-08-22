import { useLocation, useNavigate } from 'react-router-dom';
import LogoutConfirm from '../Common/LogoutConfirm';
import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { complaintsDb } from '../../config/firebase';
import { Badge } from '@capawesome/capacitor-badge';
import { LocalNotifications } from '@capacitor/local-notifications';
import { useAuth } from '../../context/AuthContext';
import { MessageSquare, GraduationCap, ChevronRight, ChevronLeft, Sun, Moon, LogOut } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { NAV_ITEMS, FACULTY_NAV_ITEMS } from '../../config/navigation';
import './Sidebar.css';

const Sidebar = ({ isOpen, onClose, isCollapsed, toggleCollapse, isNativeMobileMenu }) => {
    const { user, logout, setIntentionalLogout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const location = useLocation();
    const navigate = useNavigate();

    const [hasUnreadStudentReply, setHasUnreadStudentReply] = useState(false);

    // Student Unread Reply Listener
    useEffect(() => {
        if (!user || user?.role === 'faculty') {
            setHasUnreadStudentReply(false);
            return;
        }

        const setupNotifications = async () => {
            if (!Capacitor.isNativePlatform()) return;
            try {
                const permStatus = await LocalNotifications.checkPermissions();
                if (permStatus.display !== 'granted') {
                    await LocalNotifications.requestPermissions();
                }

                await LocalNotifications.createChannel({
                    id: 'silent_badge_channel',
                    name: 'App Badges',
                    description: 'Silent notifications used only to trigger app icon badges',
                    importance: 2,
                    vibration: false
                });
            } catch (err) {
                console.warn("LocalNotifications setup skipped (Web/Unsupported):", err.message);
            }
        };

        setupNotifications();

        const q = query(
            collection(complaintsDb, 'complaints'),
            where('uid', '==', user.uid)
        );

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            let hasUnread = false;
            snapshot.forEach(doc => {
                if (doc.data().hasUnreadReply === true) {
                    hasUnread = true;
                }
            });
            setHasUnreadStudentReply(hasUnread);
            
            try {
                if (hasUnread) {
                    await Badge.set({ count: 1 });
                    
                    await LocalNotifications.schedule({
                        notifications: [
                            {
                                title: 'New Reply',
                                body: 'An admin has replied to your complaint.',
                                id: 9999,
                                channelId: 'silent_badge_channel',
                                schedule: { at: new Date(Date.now() + 1000) }
                            }
                        ]
                    });
                } else {
                    await Badge.clear();
                    await LocalNotifications.cancel({ notifications: [{ id: 9999 }] });
                }
            } catch (err) {
                console.log("Badge/Notification API not supported/failed:", err);
            }
        });

        return () => unsubscribe();
    }, [user]);


    // Filter items based on role
    const visibleItems = (() => {
        const userRole = (user?.role || '').toLowerCase();
        
        if (userRole === 'faculty') {
            return FACULTY_NAV_ITEMS;
        }

        let items = NAV_ITEMS;
        if (isNativeMobileMenu) {
            // Only show Exams, Support, and Alerts in the native sidebar
            items = items.filter(item => ['exams', 'complaints', 'notices'].includes(item.id));
        } else {
            // Desktop/Web sidebar shouldn't show mobile-only items
            items = items.filter(item => item.id !== 'profile-mobile');
        }

        if (userRole === 'admin') {
            items = items.filter(item => !item.hideForAdmin);
            items.push({
                id: 'admin-feedback',
                label: 'App Feedbacks',
                path: '/admin/feedback',
                icon: MessageSquare
            });
        }
        return items;
    })();


    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

    const handleLogoutConfirm = async () => {
        try {
            setIntentionalLogout(true);
            await logout();
            window.location.href = '/login';
        } catch (error) {
            console.error("Logout failed:", error);
            setIsLogoutModalOpen(false);
        }
    };

    return (
        <>
            <LogoutConfirm 
                isOpen={isLogoutModalOpen} 
                onConfirm={handleLogoutConfirm} 
                onCancel={() => setIsLogoutModalOpen(false)}
            />
            {/* Sidebar Container */}
            <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
                {/* Brand */}
                <div className="sidebar-brand">
                    <GraduationCap className="brand-icon" size={28} />
                    {!isCollapsed && (
                        <div className="brand-name">
                            <span className="brand-part">RGUKT</span>
                            <span className="brand-part">CONNECT</span>
                        </div>
                    )}
                </div>

                {/* Unified Toggle / Close Button */}
                <button
                    onClick={() => {
                        if (window.innerWidth < 768) {
                            onClose();
                        } else {
                            toggleCollapse();
                        }
                    }}
                    className="collapse-toggle-btn"
                    title={
                        window.innerWidth < 768
                            ? "Close Sidebar"
                            : isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"
                    }
                >
                    {/* On Desktop: Left/Right based on collapse. On Mobile: Always Left (Close) */}
                    {window.innerWidth >= 768 && isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>

                {/* Navigation */}
                <nav className="sidebar-nav">
                    {!isCollapsed && (
                        <div className="mb-2 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider animate-fade-in hidden">
                            Menu
                        </div>
                    )}

                    {visibleItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <a
                                key={item.path}
                                data-route={item.path}
                                href={item.path}
                                className={`nav-item ${isActive ? 'active' : ''} ${item.path === '/profile' ? 'user-profile-link' : ''}`}
                                onClick={(e) => {
                                    e.preventDefault();
                                    if (onClose && (window.innerWidth < 768 || isNativeMobileMenu)) {
                                        onClose();
                                    }
                                    navigate(item.path);
                                }}
                                title={item.label}
                            >
                                <div className="nav-icon-container">
                                    {item.id === 'profile' && user?.avatar ? (
                                        <img src={user.avatar} className="nav-avatar" alt="" />
                                    ) : (
                                        <item.icon size={22} className="shrink-0" />
                                    )}
                                    {item.id === 'complaints' && hasUnreadStudentReply && user?.role !== 'admin' && (
                                        <span className={`unread-pulse-badge ${isCollapsed ? 'collapsed' : ''}`}></span>
                                    )}
                                </div>
                                <span className={`nav-label whitespace-nowrap overflow-hidden transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto ml-3'}`}>
                                    {item.label}
                                </span>
                            </a>
                        );
                    })}
                </nav>

                {/* Footer / User Wrapper */}
                {!isNativeMobileMenu && (
                    <div className="sidebar-footer">


                        {/* Theme Toggle */}
                        <button
                            onClick={toggleTheme}
                            className="sidebar-footer-btn mb-2 theme-toggle-btn"
                            title="Toggle Theme"
                        >
                            {theme === 'dark' ? <Sun size={20} className="shrink-0" /> : <Moon size={20} className="shrink-0" />}
                            <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto ml-2'}`}>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                        </button>

                        <button
                            onClick={() => setIsLogoutModalOpen(true)}
                            className="sidebar-footer-btn logout btn-click-effect"
                            title="Sign Out"
                        >
                            <LogOut size={20} className="shrink-0" />
                            <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto ml-2'}`}>Sign Out</span>
                        </button>
                    </div>
                )}
            </aside>
        </>
    );
};

export default Sidebar;

