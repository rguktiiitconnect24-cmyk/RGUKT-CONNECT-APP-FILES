import { Link, PlusCircle, FileText, HardDrive, Download, Search, Eye, Edit, Trash2, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { pdfService } from '../../services/pdfService';

const PdfDashboard = () => {
    const [pdfs, setPdfs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [stats, setStats] = useState({ total: 0, totalSize: 0, totalDownloads: 0 });
    const [deleteModal, setDeleteModal] = useState({ show: false, id: null, title: '' });

    useEffect(() => {
        loadPdfs();
    }, []);

    const loadPdfs = async () => {
        setLoading(true);
        try {
            const data = await pdfService.fetchPdfs();
            setPdfs(data);
            
            // Calculate stats
            let size = 0, downloads = 0;
            data.forEach(pdf => {
                size += (pdf.fileSize || 0);
                downloads += (pdf.downloads || 0);
            });
            setStats({ total: data.length, totalSize: size, totalDownloads: downloads });
            
        } catch (error) {
            console.error("Failed to load PDFs:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        try {
            await pdfService.deletePdfMetadata(deleteModal.id);
            setDeleteModal({ show: false, id: null, title: '' });
            loadPdfs();
        } catch (error) {
            console.error("Failed to delete PDF:", error);
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

    const filteredPdfs = pdfs.filter(pdf => 
        pdf.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        pdf.subject?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 max-w-7xl mx-auto animate-fade-in" style={{ fontFamily: 'Inter, sans-serif' }}>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">PDF Management Dashboard</h1>
                    <p className="text-slate-500">Manage all uploaded student PDFs directly.</p>
                </div>
                <Link to="/admin/pdf/upload" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold transition-all shadow-lg shadow-blue-200">
                    <PlusCircle size={20} />
                    Upload New PDF
                </Link>
            </div>

            {/* Dashboard Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                        <FileText size={28} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Total PDFs</p>
                        <h3 className="text-2xl font-bold text-slate-900">{stats.total}</h3>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <HardDrive size={28} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Total Storage Used</p>
                        <h3 className="text-2xl font-bold text-slate-900">{formatBytes(stats.totalSize)}</h3>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <Download size={28} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Total Downloads</p>
                        <h3 className="text-2xl font-bold text-slate-900">{stats.totalDownloads}</h3>
                    </div>
                </div>
            </div>

            {/* Search Bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3 mb-6">
                <Search size={20} className="text-slate-400" />
                <input 
                    type="text" 
                    placeholder="Search PDFs by title or subject..." 
                    className="flex-1 bg-transparent border-none outline-none text-slate-700"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* PDFs Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-sm">
                                <th className="p-4">Document Details</th>
                                <th className="p-4">Category</th>
                                <th className="p-4">Metrics</th>
                                <th className="p-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="4" className="p-8 text-center text-slate-500">
                                        Loading PDFs...
                                    </td>
                                </tr>
                            ) : filteredPdfs.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="p-8 text-center text-slate-500">
                                        No PDFs found. Try uploading some!
                                    </td>
                                </tr>
                            ) : (
                                filteredPdfs.map(pdf => (
                                    <tr key={pdf.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-red-50 text-red-500 flex items-center justify-center">
                                                    <FileText size={20} />
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold text-slate-800">{pdf.title}</h4>
                                                    <p className="text-xs text-slate-500">{formatBytes(pdf.fileSize)} • {new Date(pdf.uploadedDate?.toDate()).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <p className="text-sm font-medium text-slate-700">{pdf.subject}</p>
                                            <p className="text-xs text-slate-500">{pdf.branch} • {pdf.year} • {pdf.semester}</p>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex gap-4 text-xs text-slate-500">
                                                <div className="flex items-center gap-1"><Download size={14} /> {pdf.downloads || 0}</div>
                                                <div className="flex items-center gap-1"><Eye size={14} /> {pdf.views || 0}</div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <a href={pdf.googleDriveViewLink} target="_blank" rel="noreferrer" className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View in Drive">
                                                    <Eye size={18} />
                                                </a>
                                                <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Edit Metadata">
                                                    <Edit size={18} />
                                                </button>
                                                <button 
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" 
                                                    title="Delete PDF"
                                                    onClick={() => setDeleteModal({ show: true, id: pdf.id, title: pdf.title })}
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Delete Modal */}
            {deleteModal.show && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
                    <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm animate-scale-in">
                        <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertCircle size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-center text-slate-900 mb-2">Delete PDF?</h3>
                        <p className="text-center text-slate-500 mb-6 text-sm">
                            Are you sure you want to delete the metadata for <strong>{deleteModal.title}</strong>? <br/><br/>
                            <span className="text-xs text-red-500">Note: The file in Google Drive will remain unless deleted manually from Drive.</span>
                        </p>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setDeleteModal({ show: false, id: null, title: '' })}
                                className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleDelete}
                                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PdfDashboard;
