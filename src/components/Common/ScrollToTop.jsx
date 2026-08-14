import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToTop = () => {
    const { pathname } = useLocation();

    useEffect(() => {
        // Reset window scroll
        window.scrollTo(0, 0);
        
        // Reset specific scroll containers if they exist (fixes clipped headers on navigation)
        const scrollContainers = document.querySelectorAll('main, .main-content, .app-layout, .overflow-y-auto, .overflow-x-hidden');
        scrollContainers.forEach(container => {
            container.scrollTop = 0;
            container.scrollTo(0, 0);
        });
    }, [pathname]);

    return null;
};

export default ScrollToTop;
