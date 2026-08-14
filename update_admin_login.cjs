const fs = require('fs');
const path = require('path');

const file = 'c:/Users/bilij/Documents/projects/iiit/admin-panel/src/pages/Login.jsx';
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

const replacement = `    const { logout } = useAuth(); // Needed to logout non-admins

    useEffect(() => {
        if (user && !showSavePrompt && !isSuccess && !isLoading && !isDirectLoggingIn) {
            if (user.role === 'admin') {
                navigate('/admin/dashboard', { replace: true });
            } else {
                logout();
                setError('Access Denied: This portal is exclusively for Administrators.');
            }
        } else if (!user) {
            setShowPinModal(false);
            setIsAdminVerified(false);
        }
    }, [user, navigate, isAdminVerified, showSavePrompt, isSuccess, isLoading, logout]);`;

if (content.includes(searchStr)) {
    content = content.replace(searchStr, replacement);
    fs.writeFileSync(file, content);
    console.log('Login.jsx updated');
} else {
    console.log('Could not find target string in Login.jsx');
}
