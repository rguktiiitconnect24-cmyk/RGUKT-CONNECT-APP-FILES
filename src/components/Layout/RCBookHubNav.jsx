import { useLocation, useNavigate } from 'react-router-dom';
import { Library, History, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const RCBookHubNav = () => {
    const { user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const NAV_ITEMS = [
        { id: 'home', label: 'Home', path: '/rcbookhub', icon: Library },
        { id: 'orders', label: 'Orders', path: '/rcbookhub/orders', icon: History },
        { id: 'profile', label: 'Profile', path: '/rcbookhub/profile', icon: User }
    ];

    const activeIndex = NAV_ITEMS.findIndex(item =>
        location.pathname === item.path || (item.path !== '/rcbookhub' && location.pathname.startsWith(item.path))
    );

    const handleNav = (path) => {
        if (location.pathname !== path) {
            navigate(path);
        }
    };

    return (
        <nav className="mobile-nav-container md:hidden">
            <div className="mobile-nav-content">
                {/* Sliding Active Pill Background Wrapper */}
                <div
                    className="mobile-nav-pill-wrapper"
                    style={{
                        width: `${100 / NAV_ITEMS.length}%`,
                        transform: `translateX(${activeIndex >= 0 ? activeIndex * 100 : 0}%)`,
                        opacity: activeIndex >= 0 ? 1 : 0,
                        visibility: activeIndex >= 0 ? 'visible' : 'hidden',
                        pointerEvents: 'none'
                    }}
                >
                    <div className="mobile-nav-pill" />
                </div>

                {NAV_ITEMS.map((item) => {
                    const isActive = location.pathname === item.path || (item.path !== '/rcbookhub' && location.pathname.startsWith(item.path));
                    
                    return (
                        <div
                            key={item.path}
                            onClick={() => handleNav(item.path)}
                            className={`mobile-nav-item ${isActive ? 'active' : ''}`}
                            style={{ 
                                touchAction: 'manipulation', 
                                position: 'relative', 
                                cursor: 'pointer',
                                zIndex: 10
                            }}
                        >
                            <div className="mobile-nav-icon-wrapper" style={{ pointerEvents: 'none' }}>
                                {item.id === 'profile' && user?.avatar ? (
                                    <img 
                                        src={user.avatar} 
                                        alt="Profile" 
                                        style={{ 
                                            width: '24px', 
                                            height: '24px', 
                                            borderRadius: '50%', 
                                            objectFit: 'cover',
                                            border: isActive ? '2px solid white' : '2px solid transparent',
                                            transition: 'border-color 0.3s ease'
                                        }} 
                                    />
                                ) : (
                                    <item.icon size={20} className={isActive ? 'active-icon' : ''} style={{ pointerEvents: 'none' }} />
                                )}
                            </div>
                            
                            {/* Visible label */}
                            <span className="mobile-nav-label" style={{ 
                                fontSize: '10px', 
                                marginTop: '4px',
                                fontWeight: isActive ? '600' : '500',
                                transition: 'all 0.3s ease',
                                opacity: isActive ? 1 : 0.8
                            }}>{item.label}</span>
                        </div>
                    );
                })}
            </div>
        </nav>
    );
};

export default RCBookHubNav;
