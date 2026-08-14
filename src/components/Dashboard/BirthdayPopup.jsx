import { X, Gift } from 'lucide-react';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './BirthdayPopup.css';

const BirthdayPopup = ({ user }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (!user || !user.dob) return;

        try {
            const today = new Date();
            const currentYear = today.getFullYear();
            const currentMonth = today.getMonth() + 1; // 1-12
            const currentDay = today.getDate();

            // dob is expected in 'YYYY-MM-DD' format
            const dobParts = user.dob.split('-');
            if (dobParts.length !== 3) return;

            const dobMonth = parseInt(dobParts[1], 10);
            const dobDay = parseInt(dobParts[2], 10);

            // Check if today is the user's birthday
            if (currentMonth === dobMonth && currentDay === dobDay) {
                const sessionKey = `hasShownBirthdaySession_${user.uid || user.id}`;
                if (!sessionStorage.getItem(sessionKey)) {
                    setIsVisible(true);
                    sessionStorage.setItem(sessionKey, 'true');
                }
            }
        } catch (error) {
            console.error("Error checking birthday:", error);
        }
    }, [user]);

    useEffect(() => {
        let audio;
        let playAudioHandler;

        if (isVisible) {
            document.body.classList.add('hide-bottom-nav');
            
            try {
                audio = new Audio('https://cdn.pixabay.com/download/audio/2022/11/22/audio_d1718ab41b.mp3');
                audio.volume = 0.6;

                let isPlaying = false;
                
                playAudioHandler = () => {
                    if (!isPlaying && audio) {
                        audio.play().then(() => {
                            isPlaying = true;
                            document.removeEventListener('click', playAudioHandler);
                            document.removeEventListener('touchstart', playAudioHandler);
                        }).catch(e => console.log('Audio blocked:', e));
                    }
                };

                // Try autoplay first
                audio.play().then(() => {
                    isPlaying = true;
                }).catch(() => {
                    // If autoplay is blocked by browser policy, wait for first interaction
                    document.addEventListener('click', playAudioHandler);
                    document.addEventListener('touchstart', playAudioHandler);
                });

            } catch (error) {
                console.error('Error playing audio:', error);
            }

            return () => {
                document.body.classList.remove('hide-bottom-nav');
                if (audio) {
                    audio.pause();
                    audio.currentTime = 0;
                }
                if (playAudioHandler) {
                    document.removeEventListener('click', playAudioHandler);
                    document.removeEventListener('touchstart', playAudioHandler);
                }
            };
        }
    }, [isVisible]);

    if (!isVisible) return null;

    const displayName = user?.fullName || user?.name || 'Student';

    return createPortal(
        <div className="birthday-popup-overlay">
            <div className="birthday-popup-content">
                <button className="birthday-close-btn" onClick={() => setIsVisible(false)}>
                    <X size={18} />
                </button>
                
                {/* Confetti Elements */}
                <div className="confetti-piece"></div>
                <div className="confetti-piece"></div>
                <div className="confetti-piece"></div>
                <div className="confetti-piece"></div>
                <div className="confetti-piece"></div>

                <div className="birthday-icon-wrapper">
                    <Gift size={40} className="icon" />
                </div>
                
                <h2 className="birthday-title">Happy Birthday!</h2>
                <p className="birthday-message">
                    Wishing you a fantastic day, <strong>{displayName}</strong>! May this year bring you closer to your goals. Have a great celebration! 🎉
                </p>
                
                <button className="birthday-btn" onClick={() => setIsVisible(false)}>
                    Thank You!
                </button>
            </div>
        </div>,
        document.body
    );
};

export default BirthdayPopup;
