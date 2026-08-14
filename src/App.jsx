import Layout from './components/Layout/Layout';
import { Route } from 'react-router-dom';
import { Routes } from 'react-router-dom';
import NotificationWatcher from './components/Common/NotificationWatcher';
import { CartProvider } from './context/CartContext';
import { NavigationProvider } from './context/NavigationContext';
import NavigationController from './core/NavigationController';
import { DownloadProvider } from './context/DownloadContext';
import { Suspense } from 'react';
import ExitConfirmModal from './components/Common/ExitConfirmModal';
import OfflineIndicator from './components/Common/OfflineIndicator';
import ProfessionalSplash from './components/Common/ProfessionalSplash';
import { Navigate } from 'react-router-dom';
import LoadingTransition from './components/Common/LoadingTransition';
import React, { lazy, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';


import { useAuth } from './context/AuthContext';
import { syncProfileToWidget } from './services/widgetService';
import packageJson from '../package.json';
import { sendHeartbeat } from './services/healthMonitor';
import { FirebaseAnalytics } from '@capacitor-community/firebase-analytics';
import { notificationService } from './services/notificationService';
// Lazy load pages
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard/Dashboard'));
const Courses = lazy(() => import('./pages/Courses'));
const CourseSemesters = lazy(() => import('./pages/CourseSemesters'));
const CourseSubjects = lazy(() => import('./pages/CourseSubjects'));
const SubjectUnits = lazy(() => import('./pages/SubjectUnits'));
const UnitContent = lazy(() => import('./pages/UnitContent'));
const ModuleContent = lazy(() => import('./pages/ModuleContent'));
const TimeTable = lazy(() => import('./pages/TimeTable'));
const Exams = lazy(() => import('./pages/Exams'));
const Profile = lazy(() => import('./pages/Profile/Profile'));
const Complaints = lazy(() => import('./pages/Complaints'));
const ComplaintHistory = lazy(() => import('./pages/ComplaintHistory'));
const ComplaintDetail = lazy(() => import('./pages/ComplaintDetail'));
const AttendanceDetail = lazy(() => import('./pages/AttendanceDetail'));
const AttendanceList = lazy(() => import('./pages/AttendanceList'));
const NoticeBoard = lazy(() => import('./pages/NoticeBoard/NoticeBoard'));
const NoticeDetails = lazy(() => import('./pages/NoticeBoard/NoticeDetails'));
const DownloadedPdfs = lazy(() => import('./pages/DownloadedPdfs'));
const Library = lazy(() => import('./pages/Student/Library'));
const PdfDashboard = lazy(() => import('./pages/Admin/PdfDashboard'));
const PdfUpload = lazy(() => import('./pages/Admin/PdfUpload'));
const AdminFeedback = lazy(() => import('./pages/Admin/AdminFeedback'));
const Welcome = lazy(() => import('./pages/Welcome'));


// RCBookHub
const RCBookHub = lazy(() => import('./pages/RCBookHub/RCBookHub'));
const Cart = lazy(() => import('./pages/RCBookHub/Cart'));
const OrderHistory = lazy(() => import('./pages/RCBookHub/OrderHistory'));
const OrderDetails = lazy(() => import('./pages/RCBookHub/OrderDetails'));
const RCBookHubProfile = lazy(() => import('./pages/RCBookHub/RCBookHubProfile'));

// Faculty Pages
const FacultyDashboard = lazy(() => import('./pages/Faculty/FacultyDashboard'));
const FacultyProfile = lazy(() => import('./pages/Faculty/FacultyProfile'));
const FacultySubjects = lazy(() => import('./pages/Faculty/FacultySubjects'));
const FacultyQuizzes = lazy(() => import('./pages/Faculty/FacultyQuizzes'));
const FacultyAssignments = lazy(() => import('./pages/Faculty/FacultyAssignments'));
const FacultyAttendance = lazy(() => import('./pages/Faculty/FacultyAttendance'));
const FacultyPerformance = lazy(() => import('./pages/Faculty/FacultyPerformance'));
const FacultyNotices = lazy(() => import('./pages/Faculty/FacultyNotices'));
const FacultyCommunication = lazy(() => import('./pages/Faculty/FacultyCommunication'));
const FacultyReports = lazy(() => import('./pages/Faculty/FacultyReports'));

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingTransition persistent />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const FacultyRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingTransition persistent />;
  if (!user || user.role?.toLowerCase() !== 'faculty') return <Navigate to="/dashboard" replace />;
  return children;
};

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingTransition persistent />;
  if (!user || user.role?.toLowerCase() !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
};

const App = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [appInfo, setAppInfo] = React.useState({ version: packageJson.version, build: packageJson.buildNumber });
  const [showExitModal, setShowExitModal] = React.useState(false);
  const [showSplash, setShowSplash] = React.useState(true);
  const initializedFcmUid = React.useRef(null);

  // Sync Profile to Widget whenever user data changes
  useEffect(() => {
    if (user && Capacitor.getPlatform() !== 'web') {
      syncProfileToWidget({
        name: user.name || user.displayName || 'Student',
        id: user.studentId || user.uid || 'R000000'
      });
      
      FirebaseAnalytics.setUserId({
        userId: user.uid
      }).catch(err => console.error('FirebaseAnalytics setUserId error:', err));
    }

    if (user && user.uid !== initializedFcmUid.current) {
      initializedFcmUid.current = user.uid;
      notificationService.initialize(user).catch(err => console.error('FCM init error:', err));
    }
  }, [user]);

  // 1. Fetch App Info once
  useEffect(() => {
    const getAppInfo = async () => {
      if (Capacitor.getPlatform() !== 'web') {
        try {
          const info = await CapacitorApp.getInfo();
          setAppInfo(info);
        } catch (e) {
          console.error("App info fetch failed:", e);
        }
      }
    };
    getAppInfo();
  }, []);





  // App Health Monitor Heartbeat
  useEffect(() => {
    if (!user) return;
    
    // Initial heartbeat
    sendHeartbeat(user);
    
    // Heartbeat every 5 minutes while active
    const interval = setInterval(() => {
        sendHeartbeat(user);
    }, 5 * 60 * 1000);
    
    // Send heartbeat when app resumes
    const setupAppListener = async () => {
        if (Capacitor.getPlatform() !== 'web') {
            await CapacitorApp.addListener('appStateChange', ({ isActive }) => {
                if (isActive) sendHeartbeat(user);
            });
        }
    };
    setupAppListener();
    
    return () => {
        clearInterval(interval);
        if (Capacitor.getPlatform() !== 'web') {
            CapacitorApp.removeAllListeners('appStateChange');
        }
    };
  }, [user]);

  const locationRef = React.useRef(location.pathname);
  useEffect(() => {
    locationRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    const setupBackButton = async () => {
      const listener = await CapacitorApp.addListener('backButton', ({ canGoBack }) => {
        const currentPath = locationRef.current;
        // Paths where we should confirm exit instead of going back
        const rootPaths = ['/dashboard', '/login', '/'];
        
        if (rootPaths.includes(currentPath)) {
          setShowExitModal(true);
        } else if (canGoBack || location.key !== 'default') {
          // Use navigate(-1) to go back in React Router history
          navigate(-1);
        } else {
          setShowExitModal(true);
        }
      });


      return listener;
    };

    const listenerPromise = setupBackButton();

    // --- Custom Validation System ---
    let currentTooltip = null;

    const removeTooltip = () => {
      if (currentTooltip) {
        currentTooltip.style.opacity = '0';
        currentTooltip.style.transform = 'translateY(5px)';
        setTimeout(() => {
          if (currentTooltip && currentTooltip.parentNode) {
            currentTooltip.parentNode.removeChild(currentTooltip);
          }
          currentTooltip = null;
        }, 200);
      }
    };

    const handleInvalid = (e) => {
      // Prevent browser default bubble
      if (e.preventDefault) e.preventDefault();
      const target = e.target;
      
      // 1. Highlight the input
      target.classList.add('input-invalid');
      
      // 2. Find a suitable container for the error message
      const container = target.closest('.login-input-wrapper') || target.closest('.login-form-group') || target.closest('.input-wrapper') || target.closest('.form-group') || target.parentNode;
      
      // Clear any existing error message for this input
      const existingError = container.parentNode.querySelector(`.form-error-message[data-for="${target.id || target.name}"]`);
      if (existingError) existingError.remove();

      // 3. Create and inject the new error message
      const errorDiv = document.createElement('div');
      errorDiv.className = 'form-error-message';
      errorDiv.setAttribute('data-for', target.id || target.name);
      errorDiv.setAttribute('aria-live', 'polite');
      
      // Professional SVG Icon (Triangle Exclamation)
      const errorIcon = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>`;

      // Get field label or name for better message
      const placeholder = (target.getAttribute('placeholder') || '').replace(/[\•\.]/g, '').trim();
      const fieldName = target.getAttribute('name') || target.id || 'field';
      const displayLabel = placeholder || fieldName;
      
      errorDiv.innerHTML = `
        ${errorIcon}
        <span><span class="brand-label">RGUKT CONNECT says:</span> Please enter your ${displayLabel.toLowerCase()} to continue</span>
      `;

      // Insert it after the container
      container.parentNode.insertBefore(errorDiv, container.nextSibling);

      // Trigger animation
      requestAnimationFrame(() => {
        errorDiv.classList.add('visible');
      });

      // 4. Focus the field
      if (target.focus) target.focus();

      // 5. Cleanup on input
      const cleanup = () => {
        if (target) {
            target.classList.remove('input-invalid');
            target.removeEventListener('input', cleanup);
            target.removeEventListener('blur', cleanup);
        }
        if (errorDiv) {
            errorDiv.classList.remove('visible');
            setTimeout(() => { if (errorDiv && errorDiv.parentNode) errorDiv.remove(); }, 250);
        }
      };
      target.addEventListener('input', cleanup);
      target.addEventListener('blur', cleanup);
    };

    const handleGlobalClick = (e) => {
      const btn = e.target.closest('button[type="submit"], input[type="submit"]') || e.target.closest('button:not([type])');
      
      if (btn && btn.form) {
        const form = btn.form;
        if (!form.noValidate) {
          // If the form doesn't have noValidate, we let the browser handle it or we can force it
        }

        if (!form.checkValidity()) {
          e.preventDefault();
          e.stopPropagation();
          if (e.stopImmediatePropagation) e.stopImmediatePropagation();
          
          const firstInvalid = form.querySelector(':invalid');
          if (firstInvalid) {
            handleInvalid({ target: firstInvalid });
          }
        }
      }
    };

    window.addEventListener('invalid', handleInvalid, true);
    window.addEventListener('click', handleGlobalClick, true);

    return () => {
      listenerPromise.then(l => l.remove());
      window.removeEventListener('invalid', handleInvalid, true);
      window.removeEventListener('click', handleGlobalClick, true);
      removeTooltip(); // Cleanup old tooltips if any
    };
  }, [navigate]);
  
  // Track Screen Views
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      FirebaseAnalytics.setScreenName({
        screenName: location.pathname,
        screenClassOverride: location.pathname
      }).catch(err => console.error('FirebaseAnalytics setScreenName error:', err));
    }
  }, [location.pathname]);
  
  if (showSplash) {
    return <ProfessionalSplash onFinish={() => setShowSplash(false)} />;
  }

  if (loading) {
    return <LoadingTransition persistent />;
  }


    return (
    <>
      <OfflineIndicator />
      <ExitConfirmModal 
        isOpen={showExitModal} 
        onConfirm={() => CapacitorApp.exitApp()} 
        onCancel={() => setShowExitModal(false)} 
      />



      <Suspense fallback={<LoadingTransition persistent />}>
        <DownloadProvider>
          <NavigationProvider>
            <NavigationController />
            <CartProvider>
            <NotificationWatcher />
            <Routes>
              <Route path="/" element={<Welcome />} />
              <Route path="/login" element={<Login />} />

              <Route element={<Layout />}>
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/courses" element={<ProtectedRoute><Courses /></ProtectedRoute>} />
                <Route path="/courses/:yearId" element={<ProtectedRoute><CourseSemesters /></ProtectedRoute>} />
                <Route path="/courses/:yearId/:semesterId" element={<ProtectedRoute><CourseSubjects /></ProtectedRoute>} />
                <Route path="/courses/:yearId/:semesterId/:subjectId" element={<ProtectedRoute><SubjectUnits /></ProtectedRoute>} />
                <Route path="/courses/:yearId/:semesterId/:subjectId/:unitId" element={<ProtectedRoute><UnitContent /></ProtectedRoute>} />
                <Route path="/courses/:yearId/:semesterId/:subjectId/:unitId/:moduleId" element={<ProtectedRoute><ModuleContent /></ProtectedRoute>} />
                <Route path="/timetable" element={<ProtectedRoute><TimeTable /></ProtectedRoute>} />
                <Route path="/exams" element={<ProtectedRoute><Exams /></ProtectedRoute>} />
                <Route path="/attendance" element={<ProtectedRoute><AttendanceDetail /></ProtectedRoute>} />
                <Route path="/attendance/list" element={<ProtectedRoute><AttendanceList /></ProtectedRoute>} />
                <Route path="/complaints" element={<ProtectedRoute><Complaints /></ProtectedRoute>} />
                <Route path="/complaints/history" element={<ProtectedRoute><ComplaintHistory /></ProtectedRoute>} />
                <Route path="/complaint/:id" element={<ProtectedRoute><ComplaintDetail /></ProtectedRoute>} />
                <Route path="/notices" element={<ProtectedRoute><NoticeBoard /></ProtectedRoute>} />
                <Route path="/notices/:id" element={<ProtectedRoute><NoticeDetails /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/profile/settings" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/downloads" element={<ProtectedRoute><DownloadedPdfs /></ProtectedRoute>} />
                <Route path="/library" element={<ProtectedRoute><Library /></ProtectedRoute>} />
                
                {/* RCBookHub Routes */}
                <Route path="/rcbookhub" element={<ProtectedRoute><RCBookHub /></ProtectedRoute>} />
                <Route path="/rcbookhub/cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} />
                <Route path="/rcbookhub/orders" element={<ProtectedRoute><OrderHistory /></ProtectedRoute>} />
                <Route path="/rcbookhub/orders/:id" element={<ProtectedRoute><OrderDetails /></ProtectedRoute>} />
                <Route path="/rcbookhub/profile" element={<ProtectedRoute><RCBookHubProfile /></ProtectedRoute>} />

                {/* Admin Routes */}
                <Route path="/admin" element={<AdminRoute><Navigate to="/admin/pdf" replace /></AdminRoute>} />
                <Route path="/admin/pdf" element={<AdminRoute><PdfDashboard /></AdminRoute>} />
                <Route path="/admin/pdf/upload" element={<AdminRoute><PdfUpload /></AdminRoute>} />
                <Route path="/admin/feedback" element={<AdminRoute><AdminFeedback /></AdminRoute>} />

                {/* Faculty Routes */}
                <Route path="/faculty" element={<FacultyRoute><Navigate to="/faculty/dashboard" replace /></FacultyRoute>} />
                <Route path="/faculty/dashboard" element={<FacultyRoute><FacultyDashboard /></FacultyRoute>} />
                <Route path="/faculty/profile" element={<FacultyRoute><FacultyProfile /></FacultyRoute>} />
                <Route path="/faculty/subjects" element={<FacultyRoute><FacultySubjects /></FacultyRoute>} />
                <Route path="/faculty/quizzes" element={<FacultyRoute><FacultyQuizzes /></FacultyRoute>} />
                <Route path="/faculty/assignments" element={<FacultyRoute><FacultyAssignments /></FacultyRoute>} />
                <Route path="/faculty/attendance" element={<FacultyRoute><FacultyAttendance /></FacultyRoute>} />
                <Route path="/faculty/performance" element={<FacultyRoute><FacultyPerformance /></FacultyRoute>} />
                <Route path="/faculty/notices" element={<FacultyRoute><FacultyNotices /></FacultyRoute>} />
                <Route path="/faculty/communication" element={<FacultyRoute><FacultyCommunication /></FacultyRoute>} />
                <Route path="/faculty/reports" element={<FacultyRoute><FacultyReports /></FacultyRoute>} />

                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Route>
            </Routes>
            </CartProvider>
          </NavigationProvider>
        </DownloadProvider>
      </Suspense>
  </>
);
};

export default App;
