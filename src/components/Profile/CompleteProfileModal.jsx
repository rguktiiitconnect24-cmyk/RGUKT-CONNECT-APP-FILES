import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { User, Calendar, Smartphone, ChevronDown, ArrowRight, Loader2, CheckCircle, MapPin } from 'lucide-react';
import { nativeAuthService } from '../../services/nativeAuthService';
import DOBSelector from '../Common/DOBSelector';
import { Capacitor } from '@capacitor/core';
import './CompleteProfileModal.css';

const CompleteProfileModal = ({ isOpen, user }) => {
    const { updateProfileData, logout, setIntentionalLogout } = useAuth();
    const { showToast } = useToast();
    
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [formData, setFormData] = useState({
        fullName: (user?.fullName && user.fullName !== 'Loading...') ? user.fullName : '',
        dob: user?.dob || '',
        phone: user?.phone || '',
        studentId: user?.studentId || '',
        currentClass: user?.currentClass || '',
        countryCode: '+91',
        campus: 'RGUKT RK Valley'
    });
    const [errors, setErrors] = useState({});

    const [forceOpen, setForceOpen] = useState(false);
    const [isExiting, setIsExiting] = useState(false);
    const [isCampusOpen, setIsCampusOpen] = useState(false);
    const campusRef = useRef(null);
    const phoneAutoDetectAttempted = useRef(false);

    const handleAutoDetectPhone = async () => {
        if (!Capacitor.isNativePlatform()) return;
        try {
            const detectedPhone = await nativeAuthService.requestPhoneNumber();
            if (detectedPhone) {
                // Strip country code (assuming +91 for now)
                let cleanPhone = detectedPhone.replace(/\D/g, '');
                if (cleanPhone.length > 10) {
                    cleanPhone = cleanPhone.slice(-10);
                }
                setFormData(prev => ({ ...prev, phone: cleanPhone }));
                showToast('Phone number detected!', 'success');
            }
        } catch (error) {
            console.error('Auto detect phone failed:', error);
            showToast('Could not auto-detect phone number', 'error');
        }
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (campusRef.current && !campusRef.current.contains(event.target)) {
                setIsCampusOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen || forceOpen) {
            document.body.style.overflow = 'hidden';
            window.history.pushState(null, null, window.location.href);
            const handlePopState = () => window.history.pushState(null, null, window.location.href);
            window.addEventListener('popstate', handlePopState);
            return () => {
                document.body.style.overflow = 'unset';
                window.removeEventListener('popstate', handlePopState);
            };
        }
    }, [isOpen, forceOpen]);

    useEffect(() => {
        if (user && !user.loadingProfile) {
            setFormData(prev => ({
                ...prev,
                fullName: prev.fullName || (user.fullName !== 'Loading...' ? user.fullName : ''),
                dob: prev.dob || user.dob || '',
                phone: prev.phone || user.phone || '',
                studentId: prev.studentId || user.studentId || '',
                currentClass: prev.currentClass || user.currentClass || '',
                campus: 'RGUKT RK Valley'
            }));
        }
    }, [user]);

    const actuallyOpen = isOpen || forceOpen;
    if (!actuallyOpen && !isExiting) return null;

    const validateForm = () => {
        const newErrors = {};
        if (!formData.fullName.trim()) newErrors.fullName = 'Full Name is required';
        if (!formData.dob) newErrors.dob = 'Date of Birth is required';
        if (!formData.campus) newErrors.campus = 'Campus selection is required';
        if (!formData.studentId?.trim()) newErrors.studentId = 'University/Student ID is required';
        if (!formData.phone.trim()) {
            newErrors.phone = 'Mobile Number is required';
        } else if (!/^\d{10}$/.test(formData.phone.trim())) {
            newErrors.phone = 'Mobile number must be 10 digits';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        setIsLoading(true);
        setForceOpen(true);
        try {
            await updateProfileData({
                fullName: formData.fullName,
                dob: formData.dob,
                phone: formData.phone,
                studentId: formData.studentId.toUpperCase(),
                campus: formData.campus,
                profileCompleted: true
            });
            setIsSuccess(true);
            setTimeout(() => {
                setIsExiting(true);
                setTimeout(() => {
                    setForceOpen(false);
                    setIsExiting(false);
                }, 600); // 600ms fade out duration
            }, 1500);
        } catch (error) {
            setForceOpen(false);
            console.error('Failed to complete profile:', error);
            showToast("Failed to complete profile.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={`onboarding-overlay ${isExiting ? 'exiting' : ''}`}>
            <div className="floating-blob" style={{ top: '-100px', left: '-100px' }}></div>
            <div className="floating-blob" style={{ bottom: '-100px', right: '-100px', background: 'radial-gradient(circle, rgba(78, 222, 163, 0.05) 0%, rgba(78, 222, 163, 0) 70%)' }}></div>
            
            {isSuccess && (
                <div className="form-success-overlay">
                    <div className="success-animation-container">
                        <svg className="success-svg" viewBox="0 0 52 52">
                            <circle className="success-circle" cx="26" cy="26" r="25" fill="none"/>
                            <path className="success-check" fill="none" d="M14 27l7 7 16-16"/>
                        </svg>
                        <h2 className="success-heading">All Set!</h2>
                        <p className="success-message">Your profile has been updated successfully.</p>
                    </div>
                </div>
            )}
            
            <main className={`onboarding-main`}>
                <section className="onboarding-header">
                    <h2 className="onboarding-title">Let's Get Started</h2>
                    <p className="onboarding-subtitle">Tell us a bit about yourself to personalize your academic experience.</p>
                </section>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative', zIndex: 10 }}>
                    <div className="glass-card">
                        <div className="form-field">
                            <label className="form-label">Full Name</label>
                            <div className="input-container">
                                <User size={20} className="input-icon" />
                                <input 
                                    type="text" 
                                    className="glow-input disabled-input"
                                    placeholder="John Doe"
                                    value={formData.fullName}
                                    readOnly
                                    title="Name cannot be changed"
                                />
                            </div>
                        </div>

                        <div className="form-field">
                            <label className="form-label">University / Student ID</label>
                            <div className="input-container">
                                <User size={20} className="input-icon" />
                                <input 
                                    type="text" 
                                    className="glow-input disabled-input"
                                    placeholder="e.g. R200000"
                                    value={formData.studentId}
                                    readOnly
                                    title="Student ID cannot be changed"
                                />
                            </div>
                        </div>

                        <div className="form-field">
                            <label className="form-label">Date of Birth</label>
                            <DOBSelector 
                                value={formData.dob}
                                onChange={(val) => setFormData({...formData, dob: val})}
                                error={!!errors.dob}
                            />
                            {errors.dob && <span className="error-message">{errors.dob}</span>}
                        </div>

                        <div className="form-field">
                            <label className="form-label">Mobile Number</label>
                            <div className="mobile-input-group">
                                <div className="select-container">
                                    <select 
                                        value={formData.countryCode}
                                        onChange={e => setFormData({...formData, countryCode: e.target.value})}
                                    >
                                        <option value="+1">+1</option>
                                        <option value="+44">+44</option>
                                        <option value="+91">+91</option>
                                        <option value="+61">+61</option>
                                    </select>
                                    <ChevronDown size={16} className="select-icon" />
                                </div>
                                <div className="input-container" style={{ flex: 1 }}>
                                    <Smartphone size={20} className="input-icon" />
                                    <input 
                                        type="tel" 
                                        className={`glow-input ${errors.phone ? 'error' : ''}`}
                                        placeholder="555-0123"
                                        value={formData.phone}
                                        autoComplete="tel"
                                        onFocus={() => {
                                            if (!phoneAutoDetectAttempted.current && !formData.phone) {
                                                phoneAutoDetectAttempted.current = true;
                                                handleAutoDetectPhone();
                                            }
                                        }}
                                        onChange={e => {
                                            const cleanVal = e.target.value.replace(/\D/g, '');
                                            if (cleanVal.length <= 10) setFormData({...formData, phone: cleanVal});
                                        }}
                                    />
                                </div>
                            </div>
                            {errors.phone && <span className="error-message">{errors.phone}</span>}
                        </div>

                        <div className="form-field">
                            <label className="form-label">Campus</label>
                            <div className="input-container">
                                <MapPin size={20} className="input-icon" />
                                <input 
                                    type="text" 
                                    className="glow-input disabled-input"
                                    value={formData.campus}
                                    readOnly
                                    title="Campus is locked to RGUKT RK Valley"
                                />
                            </div>
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        className="continue-btn"
                        disabled={isLoading || isSuccess}
                    >
                        {isLoading ? (
                            <><Loader2 className="animate-spin" /> Validating...</>
                        ) : (
                            <>Continue <ArrowRight /></>
                        )}
                    </button>
                </form>

                <p className="terms-text">
                    By continuing, you agree to Academic Pulse's <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
                </p>
            </main>
        </div>
    );
};

export default CompleteProfileModal;
