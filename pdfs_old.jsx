import React, { useState } from 'react';
import { Search, Trash2, Download } from 'lucide-react';
import './DownloadedPdfs.css';

const DownloadedPdfs = () => {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Mock data matching the design screenshot
  const [pdfs, setPdfs] = useState([
    { 
      id: '1', 
      title: 'wf - AC_AY26_27_Engineering', 
      branch: 'Branch_cse', 
      semester: 'Semester 1', 
      date: 'Aug 13, 2026, 12:25 AM' 
    },
    { 
      id: '2', 
      title: 'f - Main Notes', 
      branch: 'Branch_cse', 
      semester: 'Semester 1', 
      date: 'Aug 12, 2026, 11:51 PM' 
    },
    { 
      id: '3', 
      title: 'f - Main Notes', 
      branch: 'Branch_cse', 
      semester: 'Semester 1', 
      date: 'Aug 11, 2026, 11:51 PM' 
    }
  ]);

  const handleDelete = (id) => {
    // In a real implementation, you would also remove the file from the device storage
    setPdfs(pdfs.filter(pdf => pdf.id !== id));
  };

  const filteredPdfs = pdfs.filter(pdf => 
    pdf.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="offline-library-container">
      {/* Header Card */}
      <div className="offline-library-header-card">
        <div className="offline-library-header-text">
          <h1>Offline Library</h1>
          <p>Your downloaded PDFs for offline access.</p>
        </div>
        <div className="offline-library-illustration">
          <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="50" cy="82" rx="25" ry="3" fill="#e2e8f0"/>
            <rect x="32" y="22" width="36" height="52" rx="2" fill="white" stroke="#3b82f6" strokeWidth="1.5"/>
            <path d="M68 36H54V22L68 36Z" fill="#eff6ff" stroke="#3b82f6" strokeWidth="1.5" strokeLinejoin="round"/>
            <rect x="40" y="42" width="20" height="2" rx="1" fill="#93c5fd"/>
            <rect x="40" y="48" width="20" height="2" rx="1" fill="#93c5fd"/>
            <rect x="40" y="54" width="14" height="2" rx="1" fill="#93c5fd"/>
            <rect x="32" y="62" width="16" height="12" rx="1" fill="#3b82f6"/>
            <text x="40" y="70" fill="white" fontSize="5" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">PDF</text>
            <circle cx="68" cy="64" r="7" fill="#10b981"/>
            <path d="M68 61V66M68 66L66 64M68 66L70 64" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="24" cy="30" r="1.5" fill="#10b981"/>
            <circle cx="82" cy="28" r="1" fill="#93c5fd"/>
            <circle cx="26" cy="60" r="1" fill="#6366f1"/>
          </svg>
        </div>
      </div>

      {/* Search Bar */}
      <div className="offline-library-search-wrapper">
        <Search className="offline-library-search-icon" size={18} />
        <input 
          type="text" 
          className="offline-library-search-input"
          placeholder="Search PDFs..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* PDF List */}
      <div className="offline-library-list">
        {filteredPdfs.length > 0 ? (
          filteredPdfs.map(pdf => (
            <div key={pdf.id} className="offline-library-item">
              <div className="offline-library-item-icon">
                <Download size={22} strokeWidth={2.5} />
              </div>
              <div className="offline-library-item-content">
                <h3 className="offline-library-item-title">{pdf.title}</h3>
                <p className="offline-library-item-meta">
                  {pdf.branch} • {pdf.semester} • {pdf.date}
                </p>
              </div>
              <button 
                className="offline-library-item-delete"
                onClick={() => handleDelete(pdf.id)}
                aria-label="Delete PDF"
              >
                <Trash2 size={18} strokeWidth={2} />
              </button>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <div style={{ color: '#d1d5db', marginBottom: '16px' }}>
              <Search size={48} style={{ margin: '0 auto' }} />
            </div>
            <h3>No PDFs Found</h3>
            <p>Try adjusting your search query.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DownloadedPdfs;