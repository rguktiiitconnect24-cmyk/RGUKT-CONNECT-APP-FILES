import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * NavigationController
 * 
 * Centralized, event-delegated navigation controller.
 * Listens for click events on elements with `data-route="..."` attributes.
 * Navigates immediately and synchronously, avoiding data/API locks or native Android interception.
 */
const NavigationController = () => {
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const handleGlobalNavClick = (e) => {
            // Find the closest ancestor (or the element itself) with a data-route attribute
            const navElement = e.target.closest('[data-route]');
            if (!navElement) return;

            const route = navElement.getAttribute('data-route');
            if (route) {
                // Prevent default anchor / button behaviors to strictly control navigation
                e.preventDefault();
                e.stopPropagation();

                // Do not navigate if we are already strictly on the target route (avoid redundant re-renders)
                if (location.pathname !== route) {
                    navigate(route);
                }
            }
        };

        const handleAppNavigate = (e) => {
            if (e.detail && typeof e.detail === 'string') {
                if (location.pathname !== e.detail) {
                    navigate(e.detail);
                }
            }
        };

        // Attach global listener using capture phase to ensure it intercepts clicks before complex React synthetic events or Native overlays
        document.addEventListener('click', handleGlobalNavClick, true);
        window.addEventListener('appNavigate', handleAppNavigate);

        return () => {
            document.removeEventListener('click', handleGlobalNavClick, true);
            window.removeEventListener('appNavigate', handleAppNavigate);
        };
    }, [navigate, location.pathname]);

    return null; // Headless component
};

export default NavigationController;
