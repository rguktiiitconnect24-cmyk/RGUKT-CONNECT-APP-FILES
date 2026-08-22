import BottomNav from './BottomNav';
import RCBookHubNav from './RCBookHubNav';
import AppFooter from '../Common/AppFooter';
import Sidebar from './Sidebar';
import LogoutConfirm from '../Common/LogoutConfirm';
import ProfileBottomSheet from './ProfileBottomSheet';
import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import './Sidebar.css';

const Layout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isNativeMobileSidebarOpen, setIsNativeMobileSidebarOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(true); // Default to collapsed
    const [isProfileSheetOpen, setIsProfileSheetOpen] = useState(false);
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const { theme, toggleTheme } = useTheme();
    const { user, logout, setIntentionalLogout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 15);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const isContentPage = location.pathname.includes('/courses/') && 
                         (location.pathname.split('/').filter(Boolean).length >= 5); // /courses/:year/:sem/:sub/:unit (length 5 after filter)
                         
    const showNav = user !== null && location.pathname !== '/';

    const handleLogoutConfirm = async () => {
        try {
            setIntentionalLogout(true);
            await logout();
            navigate('/login');
        } catch (error) {
            console.error("Logout failed:", error);
            setIsLogoutModalOpen(false);
        }
    };

    const isNative = Capacitor.isNativePlatform() || true; // FORCED TRUE FOR TESTING

    return (
        <div className={`app-layout ${!showNav ? 'no-sidebar' : isCollapsed ? 'sidebar-collapsed' : ''} overflow-x-hidden min-h-screen`}>
            {/* Portals / Modals */}
            <ProfileBottomSheet 
                isOpen={isProfileSheetOpen} 
                onClose={() => setIsProfileSheetOpen(false)}
                user={user}
                onLogout={() => setIsLogoutModalOpen(true)}
            />
            <LogoutConfirm 
                isOpen={isLogoutModalOpen} 
                onConfirm={handleLogoutConfirm} 
                onCancel={() => setIsLogoutModalOpen(false)}
            />

            {/* Mobile Notch Fade removed as per user request */}

            {/* Desktop Sidebar */}
            {showNav && (
                <div className="hidden md:block">
                    <Sidebar
                        isOpen={true}
                        onClose={() => { }}
                        isCollapsed={isCollapsed}
                        toggleCollapse={() => setIsCollapsed(!isCollapsed)}
                    />
                </div>
            )}

            {/* Native App Sliding Sidebar Overlay */}
            {isNative && (
                <div className={`native-mobile-sidebar-overlay ${isNativeMobileSidebarOpen ? 'open' : ''}`}>
                    <div className="native-sidebar-backdrop" onClick={() => setIsNativeMobileSidebarOpen(false)}></div>
                    <div className="native-sidebar-container">
                        {/* Header Removed for cleaner look */}
                        <div className="native-sidebar-scrollable">
                            <style>{`
                                .native-sidebar-container {
                                    border-radius: 0 24px 24px 0 !important;
                                    overflow: hidden !important;
                                    padding-top: max(env(safe-area-inset-top), 44px) !important;
                                }
                                .native-sidebar-scrollable .sidebar {
                                    position: static !important;
                                    width: 100% !important;
                                    height: 100% !important;
                                    margin: 0 !important;
                                    padding: 0 !important;
                                    background: transparent !important;
                                    border: none !important;
                                    box-shadow: none !important;
                                    display: flex !important;
                                    transform: none !important;
                                }
                                .native-sidebar-scrollable .sidebar-brand {
                                    display: flex !important;
                                }
                                .native-sidebar-scrollable .collapse-toggle-btn {
                                    display: none !important;
                                }
                                .appbar-menu-btn {
                                    background: transparent !important;
                                    border: none !important;
                                    padding: 0 !important;
                                    margin: 0 !important;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    cursor: pointer;
                                    outline: none;
                                }
                            `}</style>
                            <Sidebar
                                isOpen={true}
                                onClose={() => setIsNativeMobileSidebarOpen(false)}
                                isCollapsed={false}
                                toggleCollapse={() => {}}
                                isNativeMobileMenu={true}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            <div className={`main-content flex-1 flex flex-col min-w-0 transition-all duration-300 relative ${showNav ? 'md:pb-0' : ''}`}>
                
                {/* Dashboard Top Branding Bar */}
                {showNav && location.pathname === '/dashboard' && (
                    <>
                        <div className="dashboard-appbar">
                            {isNative && (
                                <button 
                                    className="appbar-menu-btn" 
                                    onClick={() => setIsNativeMobileSidebarOpen(true)}
                                >
                                    <Menu size={24} color="#ffffff" />
                                </button>
                            )}

                            <div className={`appbar-brand ${isNative ? 'flex-1 justify-center' : ''}`}>
                                <img src="/logo.svg" alt="RGUKT Connect Logo" className="appbar-logo" />
                                <span className="appbar-title">RGUKT CONNECT</span>
                            </div>
                            
                            {!isNative && (
                                <button 
                                    data-route="/profile"
                                    className="appbar-profile-btn"
                                    onClick={() => setIsProfileSheetOpen(true)}
                                >
                                    {user?.avatar ? (
                                        <img src={user.avatar} alt="Profile" className="appbar-avatar" />
                                    ) : (
                                        <div className="appbar-avatar-placeholder">
                                            {user?.fullName?.charAt(0).toUpperCase() || 'S'}
                                        </div>
                                    )}
                                </button>
                            )}
                            
                            {/* Keep a placeholder for flex centering if native */}
                            {isNative && <div style={{ width: '24px' }}></div>}
                        </div>
                        <div className="dashboard-appbar-spacer"></div>
                    </>
                )}


                {/* Page Content */}
                <main className={`flex-1 w-full max-w-full overflow-x-hidden px-4 ${location.pathname === '/dashboard' ? 'pt-0' : 'pt-2 sm:pt-6'} pb-12 sm:p-6 md:p-8 animate-fade-in relative z-0 ${showNav ? 'pb-nav-gap' : ''}`}>
                    <div className="container-fluid mx-auto">
                        <Outlet />
                    </div>
                    
                    <AppFooter />
                </main>
            </div>

            {/* Mobile Bottom Navigation */}
            {showNav && (
                location.pathname.startsWith('/rcbookhub') ? <RCBookHubNav /> : <BottomNav />
            )}
        </div>
    );
};

export default Layout;
