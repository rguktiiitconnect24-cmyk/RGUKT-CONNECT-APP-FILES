import { FileText, Book, Video, LinkIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './FacultySubjects.css';

const FacultySubjects = () => {
  const navigate = useNavigate();

  return (
    <div className="faculty-subjects-container">
      <div className="faculty-subjects-header">
        <h1>Assigned Subjects</h1>
        <p>Manage course content, modules, and resources.</p>
      </div>

      <div className="subjects-grid">
        {/* Dummy Subject Card */}
        <div className="subject-card" onClick={() => navigate('/courses')} style={{ cursor: 'pointer' }}>
          <div className="subject-card-banner banner-blue">
            <h2>Database Systems</h2>
            <p>B.Tech CSE - Semester 4</p>
          </div>
          <div className="subject-card-content">
            <div className="subject-meta-row">
              <span className="subject-meta-stats">4 Units • 12 Modules</span>
              <button className="manage-content-btn" onClick={(e) => { e.stopPropagation(); navigate('/courses'); }}>Manage Content</button>
            </div>
            <div className="resources-grid">
              <ResourceIcon icon={<FileText size={20} />} label="PDFs" type="res-pdf" />
              <ResourceIcon icon={<Book size={20} />} label="Notes" type="res-notes" />
              <ResourceIcon icon={<Video size={20} />} label="Videos" type="res-video" />
              <ResourceIcon icon={<LinkIcon size={20} />} label="Links" type="res-link" />
            </div>
          </div>
        </div>

        {/* Dummy Subject Card 2 */}
        <div className="subject-card" onClick={() => navigate('/courses')} style={{ cursor: 'pointer' }}>
          <div className="subject-card-banner banner-emerald">
            <h2>Operating Systems</h2>
            <p>B.Tech CSE - Semester 4</p>
          </div>
          <div className="subject-card-content">
            <div className="subject-meta-row">
              <span className="subject-meta-stats">5 Units • 15 Modules</span>
              <button className="manage-content-btn" onClick={(e) => { e.stopPropagation(); navigate('/courses'); }}>Manage Content</button>
            </div>
            <div className="resources-grid">
              <ResourceIcon icon={<FileText size={20} />} label="PDFs" type="res-pdf" />
              <ResourceIcon icon={<Book size={20} />} label="Notes" type="res-notes" />
              <ResourceIcon icon={<Video size={20} />} label="Videos" type="res-video" />
              <ResourceIcon icon={<LinkIcon size={20} />} label="Links" type="res-link" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ResourceIcon = ({ icon, label, type }) => (
  <div className={`resource-item ${type}`}>
    <div className="resource-icon-wrapper">
      {icon}
    </div>
    <span>{label}</span>
  </div>
);

export default FacultySubjects;
