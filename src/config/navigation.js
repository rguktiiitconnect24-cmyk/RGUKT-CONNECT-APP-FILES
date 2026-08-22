import React from 'react';
import { FileText, User, Users, ClipboardList, Database, BookOpen, BarChart } from 'lucide-react';

export const NAV_ITEMS = [
    {
        id: 'dashboard',
        label: 'Home',
        path: '/dashboard',
        icon: ({ size, className }) => React.createElement('i', {
            className: `fa-solid fa-house ${className || ''}`,
            style: { fontSize: size }
        }),
        hideForAdmin: true
    },
    {
        id: 'courses',
        label: 'Content',
        path: '/courses',
        icon: ({ size, className }) => React.createElement('i', {
            className: `fa-solid fa-graduation-cap ${className || ''}`,
            style: { fontSize: size }
        }),
        hideForAdmin: true
    },
    {
        id: 'timetable',
        label: 'Schedule',
        path: '/timetable',
        icon: ({ size, className }) => React.createElement('i', {
            className: `fa-solid fa-calendar ${className || ''}`,
            style: { fontSize: size }
        }),
        hideForAdmin: true
    },
    {
        id: 'exams',
        label: 'Exams',
        path: '/exams',
        icon: ({ size, className }) => React.createElement('i', {
            className: `fa-solid fa-clipboard ${className || ''}`,
            style: { fontSize: size }
        }),
        hideForAdmin: true,
        hideOnNativeBottomNav: true
    },
    {
        id: 'complaints',
        label: 'Support',
        path: '/complaints',
        icon: ({ size, className }) => React.createElement('i', {
            className: `fa-solid fa-message ${className || ''}`,
            style: { fontSize: size }
        }),
        hideForAdmin: true,
        hideOnNativeBottomNav: true
    },
    {
        id: 'notices',
        label: 'Alerts',
        path: '/notices',
        icon: ({ size, className }) => React.createElement('i', {
            className: `fa-solid fa-bell ${className || ''}`,
            style: { fontSize: size }
        }),
        hideForAdmin: true,
        hideOnNativeBottomNav: true
    },
    {
        id: 'offline-downloads',
        label: 'Library',
        path: '/downloads',
        icon: ({ size, className }) => React.createElement('i', {
            className: `fa-solid fa-download ${className || ''}`,
            style: { fontSize: size }
        }),
        hideForAdmin: true
    },
    {
        id: 'profile-mobile',
        label: 'Profile',
        path: '/profile',
        icon: ({ size, className }) => React.createElement('i', {
            className: `fa-solid fa-user ${className || ''}`,
            style: { fontSize: size }
        }),
        nativeBottomNavOnly: true
    },
    // ── Student Only Items ──
];

export const FACULTY_NAV_ITEMS = [
    {
        id: 'faculty-dashboard',
        label: 'Home',
        path: '/faculty/dashboard',
        icon: ({ size, className }) => React.createElement('i', {
            className: `fa-solid fa-house ${className || ''}`,
            style: { fontSize: size }
        }),
    },
    {
        id: 'faculty-subjects',
        label: 'Academic Management',
        path: '/faculty/subjects',
        icon: BookOpen,
    },
    {
        id: 'faculty-quizzes',
        label: 'Quiz Management',
        path: '/faculty/quizzes',
        icon: FileText,
    },
    {
        id: 'faculty-assignments',
        label: 'Assignments',
        path: '/faculty/assignments',
        icon: ClipboardList,
    },
    {
        id: 'faculty-attendance',
        label: 'Attendance',
        path: '/faculty/attendance',
        icon: Database,
    },
    {
        id: 'faculty-notices',
        label: 'Notice',
        path: '/faculty/notices',
        icon: ({ size, className }) => React.createElement('i', {
            className: `fa-solid fa-bell ${className || ''}`,
            style: { fontSize: size }
        }),
    },
    {
        id: 'faculty-students',
        label: 'Students',
        path: '/faculty/performance',
        icon: Users,
    },
    {
        id: 'faculty-reports',
        label: 'Reports & Analytics',
        path: '/faculty/reports',
        icon: BarChart,
    },
    {
        id: 'faculty-profile',
        label: 'Profile & Settings',
        path: '/faculty/profile',
        icon: User,
    }
];
