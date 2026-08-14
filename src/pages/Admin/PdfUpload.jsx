import { AlertCircle, CheckCircle, FileText, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { pdfService } from '../../services/pdfService';
import { useAuth } from '../../context/AuthContext';
import './PdfUpload.css';

// Replace this with your actual Google Apps Script Web App URL after deploying
const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbz_REPLACE_WITH_YOUR_URL/exec";

const PdfUpload = () => {
    const { user } = useAuth();
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState({ type: '', message: '' });

    const [formData, setFormData] = useState({
        title: '',
        branch: 'BTech',
        year: 'Year 1',
        semester: 'Semester 1',
        subject: '',
        module: '',
        description: '',
        pdfUrl: ''
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        
        if (!formData.pdfUrl) {
            setUploadStatus({ type: 'error', message: 'Please provide a PDF URL.' });
            return;
        }

        if (!formData.title || !formData.subject) {
            setUploadStatus({ type: 'error', message: 'Please fill in all required metadata fields.' });
            return;
        }

        setIsUploading(true);
        setUploadStatus({ type: 'info', message: 'Saving metadata to database...' });

        try {
            const pdfMetadata = {
                ...formData,
                fileSize: 0,
                fileType: 'application/pdf',
                uploadedBy: user ? user.uid : 'admin',
                googleDriveFileId: '',
                googleDriveViewLink: formData.pdfUrl,
                googleDriveDownloadLink: formData.pdfUrl
            };

            await pdfService.uploadPdfMetadata(pdfMetadata);
            
            setUploadStatus({ type: 'success', message: 'PDF link successfully saved and indexed!' });
            
            // Reset form after 3 seconds
            setTimeout(() => {
                setFormData({
                    title: '',
                    branch: 'BTech',
                    year: 'Year 1',
                    semester: 'Semester 1',
                    subject: '',
                    module: '',
                    description: '',
                    pdfUrl: ''
                });
                setIsUploading(false);
                setUploadStatus({ type: '', message: '' });
            }, 3000);

        } catch (error) {
            console.error("Upload error: ", error);
            setUploadStatus({ type: 'error', message: error.message || 'Failed to save PDF metadata.' });
            setIsUploading(false);
        }
    };

    return (
        <div className="pdf-upload-container animate-fade-in">
            <div className="pdf-upload-header">
                <h1 className="pdf-upload-title">Add New PDF Link</h1>
                <p className="pdf-upload-subtitle">Add new learning materials to the student library by providing a direct link.</p>
            </div>

            <div className="pdf-upload-card">
                {!isUploading ? (
                    <>
                        {/* Status Message */}
                        {uploadStatus.message && (
                            <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
                                uploadStatus.type === 'error' ? 'bg-red-50 text-red-600 border border-red-200' :
                                uploadStatus.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                                'bg-blue-50 text-blue-600 border border-blue-200'
                            }`}>
                                {uploadStatus.type === 'error' && <AlertCircle size={20} />}
                                {uploadStatus.type === 'success' && <CheckCircle size={20} />}
                                <span>{uploadStatus.message}</span>
                            </div>
                        )}

                        {/* Metadata Form */}
                        <form onSubmit={handleUpload}>
                            <div className="metadata-grid">
                                <div className="form-group full-width">
                                    <label className="form-label">PDF URL / Link *</label>
                                    <input 
                                        type="url" 
                                        className="form-input" 
                                        name="pdfUrl"
                                        value={formData.pdfUrl}
                                        onChange={handleChange}
                                        placeholder="https://example.com/file.pdf or Google Drive link"
                                        required 
                                    />
                                </div>

                                <div className="form-group full-width">
                                    <label className="form-label">Document Title *</label>
                                    <input 
                                        type="text" 
                                        className="form-input" 
                                        name="title"
                                        value={formData.title}
                                        onChange={handleChange}
                                        placeholder="E.g., Engineering Physics Unit 1"
                                        required 
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Branch *</label>
                                    <select className="form-select" name="branch" value={formData.branch} onChange={handleChange}>
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
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Academic Year *</label>
                                    <select className="form-select" name="year" value={formData.year} onChange={handleChange}>
                                        <option value="Year 1">Year 1</option>
                                        <option value="Year 2">Year 2</option>
                                        <option value="Year 3">Year 3</option>
                                        <option value="Year 4">Year 4</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Semester *</label>
                                    <select className="form-select" name="semester" value={formData.semester} onChange={handleChange}>
                                        <option value="Semester 1">Semester 1</option>
                                        <option value="Semester 2">Semester 2</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Subject *</label>
                                    <input 
                                        type="text" 
                                        className="form-input" 
                                        name="subject"
                                        value={formData.subject}
                                        onChange={handleChange}
                                        placeholder="E.g., Physics, Data Structures"
                                        required 
                                    />
                                </div>

                                <div className="form-group full-width">
                                    <label className="form-label">Description (Optional)</label>
                                    <textarea 
                                        className="form-textarea" 
                                        name="description"
                                        value={formData.description}
                                        onChange={handleChange}
                                        placeholder="Brief description of the PDF contents..."
                                    />
                                </div>
                            </div>

                            <div className="upload-actions">
                                <button type="button" className="btn-cancel" onClick={() => setUploadStatus({type:'', message:''})}>Clear</button>
                                <button type="submit" className="btn-upload" disabled={!formData.pdfUrl || !formData.title}>
                                    <FileText size={20} />
                                    Save PDF Link
                                </button>
                            </div>
                        </form>
                    </>
                ) : (
                    <div className="upload-progress-container animate-scale-in">
                        {uploadStatus.type === 'success' ? (
                            <div style={{ color: 'var(--color-emerald-500)', marginBottom: '1rem' }}>
                                <CheckCircle size={64} style={{ margin: '0 auto' }} />
                            </div>
                        ) : (
                            <div style={{ color: 'var(--color-blue-500)', marginBottom: '1rem' }}>
                                <Loader2 size={64} className="animate-spin" style={{ margin: '0 auto' }} />
                            </div>
                        )}
                        
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-slate-800)', marginBottom: '0.5rem' }}>
                            {uploadStatus.type === 'success' ? 'Saved Successfully!' : 'Processing...'}
                        </h3>
                        <p style={{ color: 'var(--color-slate-500)' }}>{uploadStatus.message}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PdfUpload;
