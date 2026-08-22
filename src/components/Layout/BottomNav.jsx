import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { NAV_ITEMS } from '../../config/navigation';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { complaintsDb } from '../../config/firebase';
import { Badge } from '@capawesome/capacitor-badge';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import '../../styles/BottomNav.css';

const BottomNav = () => {
    const { user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const visibleItems = React.useMemo(() => {
        const isNative = Capacitor.isNativePlatform() || true; // FORCED TRUE FOR TESTING
        return NAV_ITEMS.filter(item => {
            if (item.hideOnMobile) return false;
            if (isNative && item.hideOnNativeBottomNav) return false;
            if (!isNative && item.nativeBottomNavOnly) return false;
            return true;
        });
    }, []);

    const [hasUnreadStudentReply, setHasUnreadStudentReply] = React.useState(false);

    // Student Unread Reply Listener
    React.useEffect(() => {
        if (!user || user?.role === 'faculty') {
            setHasUnreadStudentReply(false);
            return;
        }

        const setupNotifications = async () => {
            if (!Capacitor.isNativePlatform()) return;
            try {
                // Try to request notification permissions for badge to work reliably
                const permStatus = await LocalNotifications.checkPermissions();
                if (permStatus.display !== 'granted') {
                    await LocalNotifications.requestPermissions();
                }

                // Create a silent channel for the badge notification
                await LocalNotifications.createChannel({
                    id: 'silent_badge_channel',
                    name: 'App Badges',
                    description: 'Silent notifications used only to trigger app icon badges',
                    importance: 2, // Low importance, no sound
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
                // Try Capacitor Badge plugin first (works on some custom launchers)
                if (hasUnread) {
                    await Badge.set({ count: 1 });
                    
                    // Fallback to Silent Notification (works on pure Android to show dot)
                    await LocalNotifications.schedule({
                        notifications: [
                            {
                                title: 'New Reply',
                                body: 'An admin has replied to your complaint.',
                                id: 9999, // Fixed ID to cancel later
                                channelId: 'silent_badge_channel',
                                schedule: { at: new Date(Date.now() + 1000) } // Schedule 1 second in future
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

    const activeIndex = visibleItems.findIndex(item =>
        location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path))
    );

    const handleNav = (path) => {
        if (location.pathname !== path) {
            navigate(path);
        }
    };

    return (
        <nav className="mobile-nav-container md:hidden">
            <div className="mobile-nav-content">
                <div
                    className="mobile-nav-pill-wrapper-unified"
                    style={{
                        width: `${100 / visibleItems.length}%`,
                        transform: `translateX(${activeIndex >= 0 ? activeIndex * 100 : 0}%)`,
                        opacity: activeIndex >= 0 ? 1 : 0,
                    }}
                >
                    <div className="mobile-nav-pill-unified" />
                </div>

                {visibleItems.map((item) => {
                    const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                    
                    return (
                        <div
                            key={item.path}
                            onClick={() => handleNav(item.path)}
                            className={`mobile-nav-item ${isActive ? 'active' : ''}`}
                        >
                            <div className="mobile-nav-icon-wrapper">
                                <item.icon className={isActive ? 'active-icon' : ''} />
                                {item.id === 'complaints' && hasUnreadStudentReply && user?.role !== 'admin' && (
                                    <span className="unread-pulse-badge"></span>
                                )}
                            </div>
                            
                            <span className="mobile-nav-label">{item.label}</span>
                        </div>
                    );
                })}
            </div>
        </nav>
    );
};

export default BottomNav;
