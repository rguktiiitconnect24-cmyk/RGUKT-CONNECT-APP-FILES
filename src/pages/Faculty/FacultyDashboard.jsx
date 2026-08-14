import { BookOpen, Users, FileText, CheckCircle, Clock, Bell } from 'lucide-react';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getFacultyDashboardStats } from '../../services/facultyService';
import { useNavigate } from 'react-router-dom';
import { generateInitialsAvatar } from '../../utils/formatUtils';
import './FacultyDashboard.css';

const FacultyDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (user?.uid) {
        try {
          const dashboardStats = await getFacultyDashboardStats(user.uid);
          setStats(dashboardStats);
        } catch (error) {
          console.error("Failed to load dashboard stats", error);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchStats();
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--color-background)]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="faculty-dashboard-container">
      {/* Header section */}
      <div className="faculty-header">
        <div className="faculty-title-wrapper">
          <h1>Faculty Portal</h1>
          <p>Welcome back, Prof. {user?.fullName || 'Faculty'}</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/faculty/profile')}
            className="faculty-profile-btn"
          >
            <img 
              src={user?.avatar || generateInitialsAvatar(user?.fullName || 'F')} 
              alt="Profile" 
              className="faculty-profile-img"
            />
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="faculty-stats-grid">
        <StatCard 
            icon={<BookOpen size={28} />} 
            title="Assigned Subjects" 
            value={stats?.totalSubjects || 2} 
            colorVar="#3b82f6"
            bgVar="59, 130, 246"
        />
        <StatCard 
            icon={<Users size={28} />} 
            title="Total Students" 
            value={stats?.totalStudents || 120} 
            colorVar="#10b981"
            bgVar="16, 185, 129"
        />
        <StatCard 
            icon={<FileText size={28} />} 
            title="Active Quizzes" 
            value={stats?.activeQuizzes || 3} 
            colorVar="#8b5cf6"
            bgVar="139, 92, 246"
        />
        <StatCard 
            icon={<CheckCircle size={28} />} 
            title="Pending Review" 
            value={stats?.pendingEvaluations || 15} 
            colorVar="#f97316"
            bgVar="249, 115, 22"
        />
        <StatCard 
            icon={<Clock size={28} />} 
            title="Attendance Today" 
            value="85%" 
            colorVar="#ec4899"
            bgVar="236, 72, 153"
        />
        <StatCard 
            icon={<Bell size={28} />} 
            title="Recent Notices" 
            value="4" 
            colorVar="#06b6d4"
            bgVar="6, 182, 212"
        />
      </div>

      <div className="faculty-content-grid">
        {/* Quick Actions */}
        <div className="faculty-panel">
          <div className="faculty-panel-header">
              <h2 className="faculty-panel-title">Quick Actions</h2>
          </div>
          <div className="quick-actions-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
            <QuickActionButton 
                icon={<BookOpen size={20} />} 
                label="Upload Notes" 
                onClick={() => navigate('/faculty/subjects')} 
                colorVar="#3b82f6"
                bgVar="59, 130, 246"
            />
            <QuickActionButton 
                icon={<FileText size={20} />} 
                label="Create Quiz" 
                onClick={() => navigate('/faculty/quizzes')} 
                colorVar="#8b5cf6"
                bgVar="139, 92, 246"
            />
            <QuickActionButton 
                icon={<CheckCircle size={20} />} 
                label="Create Assignment" 
                onClick={() => navigate('/faculty/assignments')} 
                colorVar="#f97316"
                bgVar="249, 115, 22"
            />
            <QuickActionButton 
                icon={<Users size={20} />} 
                label="Mark Attendance" 
                onClick={() => navigate('/faculty/attendance')} 
                colorVar="#10b981"
                bgVar="16, 185, 129"
            />
            <QuickActionButton 
                icon={<Bell size={20} />} 
                label="Post Notice" 
                onClick={() => navigate('/faculty/notices')} 
                colorVar="#ec4899"
                bgVar="236, 72, 153"
            />
            <QuickActionButton 
                icon={<FileText size={20} />} 
                label="View Reports" 
                onClick={() => navigate('/faculty/reports')} 
                colorVar="#06b6d4"
                bgVar="6, 182, 212"
            />
          </div>
        </div>

        {/* Recent Activity / Pending */}
        <div className="faculty-panel">
          <div className="faculty-panel-header">
            <h2 className="faculty-panel-title">Upcoming Tasks</h2>
            <button onClick={() => navigate('/faculty/assignments')} className="faculty-panel-link">View All</button>
          </div>
          
          <div className="tasks-list">
            {/* Dummy Data for Tasks */}
            <TaskItem title="Grade Database Systems Assignment 2" time="Due Today" type="Grading" />
            <TaskItem title="Review Operating Systems Quiz" time="Due Tomorrow" type="Review" />
            <TaskItem title="Submit Weekly Attendance Report" time="In 2 days" type="Administrative" />
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, title, value, colorVar, bgVar }) => (
  <div className="stat-card-premium" style={{ 
      '--stat-gradient': `linear-gradient(90deg, ${colorVar}, transparent)`,
      '--stat-bg': `rgba(${bgVar}, 0.1)`,
      '--stat-color': colorVar
  }}>
    <div className="stat-icon-wrapper">
      {icon}
    </div>
    <h3 className="stat-value">{value}</h3>
    <p className="stat-title">{title}</p>
  </div>
);

const QuickActionButton = ({ icon, label, onClick, colorVar, bgVar }) => (
  <button 
    onClick={onClick}
    className="action-btn-premium"
    style={{
        '--action-color': colorVar,
        '--action-bg': `rgba(${bgVar}, 0.05)`,
        '--action-bg-strong': `rgba(${bgVar}, 0.1)`
    }}
  >
    <div className="action-icon">
      {icon}
    </div>
    <span className="action-label">{label}</span>
  </button>
);

const TaskItem = ({ title, time, type }) => (
  <div className="task-item-premium">
    <div className="task-item-left">
      <div className="task-icon-wrap">
        <Clock size={20} />
      </div>
      <div className="task-details">
        <h4>{title}</h4>
        <div className="task-meta">
          <span className="task-badge">{type}</span>
          <span className="task-time">{time}</span>
        </div>
      </div>
    </div>
    <button className="task-start-btn">Start</button>
  </div>
);

export default FacultyDashboard;
