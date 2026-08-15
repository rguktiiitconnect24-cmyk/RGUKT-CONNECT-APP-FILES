import { Search, Clock, Download, Eye, BookX } from 'lucide-react';
import { useState, useEffect } from 'react';
import { pdfService } from '../../services/pdfService';
import './Library.css';

const Library = () => {
    const [pdfs, setPdfs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({
        branch: '',
        semester: '',
        year: ''
    });
    useEffect(() => {
        loadPdfs();
    }, []); // Only fetch once on mount

    const loadPdfs = async () => {
        setLoading(true);
        try {
            // Fetch all and filter locally to avoid Firebase composite index requirements
            const data = await pdfService.fetchPdfs({});
            setPdfs(data);
        } catch (error) {
            console.error("Failed to load PDFs:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (pdf) => {
        // Increment download count in background
        pdfService.incrementDownloadCount(pdf.id).catch(console.error);
        
        // Open download link (support both new and legacy field names)
        const downloadLink = pdf.downloadUrl || pdf.googleDriveDownloadLink;
        if (downloadLink) {
            window.open(downloadLink, '_blank');
        } else {
            alert('Download link not available.');
        }
    };

    const handleView = async (pdf) => {
        // Increment view count in background
        pdfService.incrementViewCount(pdf.id).catch(console.error);
        
        // In a full implementation, you might route to a /pdf-viewer/:id page.
        // For simplicity, we open the Google Drive view link in a new tab.
        // Support both new and legacy field names
        const viewLink = pdf.publicViewUrl || pdf.googleDriveViewLink;
        if (viewLink) {
            window.open(viewLink, '_blank');
        } else {
            alert('View link not available.');
        }
    };

    const formatBytes = (bytes, decimals = 2) => {
        if (!bytes || bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    // Client-side search and filtering
    const displayedPdfs = pdfs.filter(pdf => {
        const matchesSearch = 
            pdf.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
            pdf.subject?.toLowerCase().includes(searchTerm.toLowerCase());
            
        const matchesBranch = filters.branch === '' || pdf.branch === filters.branch;
        const matchesYear = filters.year === '' || pdf.year === filters.year;
        const matchesSemester = filters.semester === '' || pdf.semester === filters.semester;

        return matchesSearch && matchesBranch && matchesYear && matchesSemester;
    });

    return (
        <div className="library-container animate-fade-in">
            <div className="library-header">
                <div>
                    <h1 className="library-title">Digital Library</h1>
                    <p className="library-subtitle">Access all course materials, notes, and resources.</p>
                </div>
            </div>

            <div className="library-filters">
                <div className="search-box">
                    <Search size={20} className="text-slate-400 mr-2" />
                    <input 
                        type="text" 
                        className="search-input" 
                        placeholder="Search for subjects, topics..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <select className="filter-select" name="branch" value={filters.branch} onChange={handleFilterChange}>
                        <option value="">All Branches</option>
                        <option value="PUC">PUC</option>
                        <option value="BTech">BTech (Common)</option>
                        <option value="CSE">CSE</option>
                        <option value="ECE">ECE</option>
                        <option value="EEE">EEE</option>
                        <option value="Civil">Civil</option>
                        <option value="Mechanical">Mechanical</option>
                        <option value="Chemical">Chemical</option>
                        <option value="MME">MME</option>
                    </select>

                    <select className="filter-select" name="year" value={filters.year} onChange={handleFilterChange}>
                        <option value="">All Years</option>
                        <option value="Year 1">Year 1</option>
                        <option value="Year 2">Year 2</option>
                        <option value="Year 3">Year 3</option>
                        <option value="Year 4">Year 4</option>
                    </select>

                    <select className="filter-select" name="semester" value={filters.semester} onChange={handleFilterChange}>
                        <option value="">All Semesters</option>
                        <option value="Semester 1">Semester 1</option>
                        <option value="Semester 2">Semester 2</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="library-empty">
                    <div className="library-empty-icon animate-pulse" style={{ background: 'transparent' }}>
                        <div className="animate-spin" style={{ border: '4px solid var(--color-blue-500)', borderTopColor: 'transparent', borderRadius: '50%', width: '40px', height: '40px' }}></div>
                    </div>
                    <h3>Loading Library...</h3>
                </div>
            ) : displayedPdfs.length > 0 ? (
                <div className="pdf-grid">
                    {displayedPdfs.map(pdf => (
                        <div key={pdf.id} className="pdf-card">
                            <div className="pdf-card-header">
                                <div className="pdf-card-icon" style={{ background: 'transparent' }}>
                                    <i className="fa-solid fa-download" style={{ color: "rgb(255, 46, 17)", fontSize: "28px" }}></i>
                                </div>
                                <div>
                                    <h3 className="pdf-card-title">{pdf.title}</h3>
                                    <p className="pdf-card-subject">{pdf.subject}</p>
                                </div>
                            </div>
                            
                            <div className="pdf-card-meta">
                                <span className="meta-badge">{pdf.branch}</span>
                                <span className="meta-badge">{pdf.year}</span>
                                <span className="meta-badge">{pdf.semester}</span>
                            </div>

                            <div className="pdf-card-stats">
                                <div className="stat-item">
                                    <Clock size={14} />
                                    <span>{new Date(pdf.uploadedDate?.toDate()).toLocaleDateString()}</span>
                                </div>
                                <div className="stat-item">
                                    <Download size={14} />
                                    <span>{pdf.downloads || 0}</span>
                                </div>
                                <div className="stat-item">
                                    <span>{formatBytes(pdf.fileSize)}</span>
                                </div>
                            </div>

                            <div className="pdf-card-actions">
                                <button className="btn-action btn-view" onClick={() => handleView(pdf)}>
                                    <Eye size={18} /> View
                                </button>
                                <button className="btn-action btn-download" onClick={() => handleDownload(pdf)}>
                                    <Download size={18} /> Download
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="library-empty">
                    <div className="library-empty-icon">
                        <BookX size={40} />
                    </div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-slate-800)', marginBottom: '0.5rem' }}>No PDFs Found</h3>
                    <p style={{ color: 'var(--color-slate-500)' }}>Try adjusting your search or filters.</p>
                </div>
            )}
        </div>
    );
};

export default Library;
