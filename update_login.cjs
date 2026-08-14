const fs = require('fs');
const path = require('path');

const file = 'c:/Users/bilij/Documents/projects/iiit/src/pages/Login.jsx';
let content = fs.readFileSync(file, 'utf8');

const searchStr = `    useEffect(() => {
        // Only auto-redirect if NOT in the middle of a process (login, success check, or save prompt)
        if (user && !showSavePrompt && !isSuccess && !isLoading && !isDirectLoggingIn) {
            // Redirect directly based on role
            if (user.role === 'admin') navigate('/admin', { replace: true });
            else if (user.role === 'faculty') navigate('/faculty', { replace: true });
            else navigate('/dashboard', { replace: true });
        } else if (!user) {
            // If user is null (logged out), ensure modal is closed
            setShowPinModal(false);
            setIsAdminVerified(false);
        }
    }, [user, navigate, isAdminVerified, showSavePrompt, isSuccess, isLoading]);`;

const replacement = `    const { logout } = useAuth(); // We need logout to kick them out if they are admin

    useEffect(() => {
        // Only auto-redirect if NOT in the middle of a process
        if (user && !showSavePrompt && !isSuccess && !isLoading && !isDirectLoggingIn) {
            if (user.role === 'admin') {
                logout();
                setError('Admins cannot login to the mobile app. Please use the Admin Web Panel.');
            } else if (user.role === 'faculty') {
                navigate('/faculty', { replace: true });
            } else {
                navigate('/dashboard', { replace: true });
            }
        } else if (!user) {
            setShowPinModal(false);
            setIsAdminVerified(false);
        }
    }, [user, navigate, isAdminVerified, showSavePrompt, isSuccess, isLoading, logout]);`;

if (content.includes(searchStr)) {
    content = content.replace(searchStr, replacement);
    
    // Also remove the verifyAdminPin function and showPinModal JSX if present, but for now we just change the login behavior.
    fs.writeFileSync(file, content);
    console.log('Login.jsx updated');
} else {
    console.log('Could not find target string in Login.jsx');
}
