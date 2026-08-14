import { Clock, Award, Shield, BookOpen, ArrowRight } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Welcome.css';

const Welcome = () => {
    const { user, loading } = useAuth();
    const navigate = useNavigate();
    const [isTransitioning, setIsTransitioning] = useState(false);

    useEffect(() => {
        if (!loading && user) {
            navigate('/dashboard', { replace: true });
        }
    }, [user, loading, navigate]);

    const handleGetStarted = () => {
        navigate('/login');
    };

    const containerRef = React.useRef(null);

    const handleDragEnd = (event, info) => {
        if (info.offset.x > 150) { // Trigger if dragged more than 150px
            handleGetStarted();
        }
    };

    if (loading || user) return null;

    return (
        <div className="welcome-page-single">
            {/* Ambient Animated Background */}
            <div className="welcome-bg-premium">
                <div className="gradient-sphere gs-1"></div>
                <div className="gradient-sphere gs-2"></div>
                <div className="mesh-overlay"></div>
            </div>

            <main className="welcome-content-container">
                {/* Branding / Header */}
                <motion.header 
                    className="welcome-header-premium"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                >
                    <div className="brand-logo-wrap">
                        <img src="/logo.svg" alt="RGUKT Logo" className="brand-logo" onError={(e) => e.target.style.display='none'} />
                    </div>
                    <h2 className="brand-name">RGUKT CONNECT</h2>
                </motion.header>

                {/* Main Hero Section */}
                <motion.section 
                    className="welcome-hero"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                >
                    <div className="hero-badge">
                        <span className="badge-dot"></span>
                        Premium Education Platform
                    </div>
                    <h1 className="hero-title">
                        Start Your <br />
                        <span className="hero-highlight">Academic Journey</span>
                    </h1>
                    <p className="hero-subtitle">
                        Your unified intelligent hub for coursework, schedules, results, and campus updates. Designed for excellence.
                    </p>
                </motion.section>

                {/* Feature Pills */}
                <motion.section 
                    className="welcome-features"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
                >
                    <div className="feature-pill"><Clock size={16} /> Real-time Updates</div>
                    <div className="feature-pill"><Award size={16} /> Performance Tracking</div>
                    <div className="feature-pill"><Shield size={16} /> Secure Access</div>
                    <div className="feature-pill"><BookOpen size={16} /> Smart Library</div>
                </motion.section>

                {/* Action Area */}
                <motion.section 
                    className="welcome-action-area"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
                >
                    <div className="slide-container" ref={containerRef}>
                        <div className="slide-track">
                            <span className="slide-text">Slide to Start</span>
                            <motion.div
                                className="slide-thumb"
                                drag="x"
                                dragConstraints={containerRef}
                                dragElastic={0.1}
                                dragSnapToOrigin={true}
                                onDragEnd={handleDragEnd}
                                whileDrag={{ scale: 0.95 }}
                            >
                                <ArrowRight size={20} />
                            </motion.div>
                        </div>
                    </div>
                    <p className="footer-note">Experience the next generation of learning</p>
                </motion.section>
            </main>
        </div>
    );
};

export default Welcome;
