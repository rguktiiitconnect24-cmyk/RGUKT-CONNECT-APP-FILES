import { MessageSquare, CheckCircle2, Search, User, Star, Calendar } from 'lucide-react';
import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

const AdminFeedback = () => {
    const [feedbacks, setFeedbacks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const q = query(collection(db, 'feedbacks'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fbData = [];
            snapshot.forEach((doc) => {
                fbData.push({ id: doc.id, ...doc.data() });
            });
            setFeedbacks(fbData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching feedbacks:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const markAsRead = async (id, currentStatus) => {
        try {
            await updateDoc(doc(db, 'feedbacks', id), {
                read: !currentStatus
            });
        } catch (error) {
            console.error("Error updating feedback status:", error);
        }
    };

    const filteredFeedbacks = feedbacks.filter(fb => 
        fb.studentId?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        fb.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        fb.feedback?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 max-w-7xl mx-auto animate-fade-in" style={{ fontFamily: 'Inter, sans-serif' }}>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">App Feedbacks</h1>
                    <p className="text-slate-500">View and manage feedback submitted by students.</p>
                </div>
            </div>

            {/* Dashboard Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                        <MessageSquare size={28} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Total Feedbacks</p>
                        <h3 className="text-2xl font-bold text-slate-900">{feedbacks.length}</h3>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <CheckCircle2 size={28} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Unread Feedbacks</p>
                        <h3 className="text-2xl font-bold text-slate-900">{feedbacks.filter(f => !f.read).length}</h3>
                    </div>
                </div>
            </div>

            {/* Search Bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3 mb-6">
                <Search size={20} className="text-slate-400" />
                <input 
                    type="text" 
                    placeholder="Search feedbacks by ID, name, or text..." 
                    className="flex-1 bg-transparent border-none outline-none text-slate-700"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Feedbacks List */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-slate-500">Loading feedbacks...</div>
                ) : filteredFeedbacks.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">No feedbacks found.</div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {filteredFeedbacks.map(fb => (
                            <div key={fb.id} className={`p-6 transition-colors ${fb.read ? 'bg-white' : 'bg-blue-50/30'}`}>
                                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                                            <User size={24} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900">{fb.studentName || 'Unknown Student'}</h3>
                                            <p className="text-sm text-slate-500">{fb.studentId} • {fb.studentEmail}</p>
                                            {fb.rating && (
                                                <div className="flex items-center mt-1">
                                                    {[...Array(5)].map((_, i) => (
                                                        <Star 
                                                            key={i} 
                                                            size={12} 
                                                            className={i < fb.rating ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200'} 
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 shrink-0">
                                        <div className="flex items-center gap-1 text-xs text-slate-400">
                                            <Calendar size={14} />
                                            {fb.createdAt ? new Date(fb.createdAt.toDate()).toLocaleString() : 'Just now'}
                                        </div>
                                        <button 
                                            onClick={() => markAsRead(fb.id, fb.read)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${fb.read ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
                                        >
                                            {fb.read ? 'Mark Unread' : 'Mark Read'}
                                        </button>
                                    </div>
                                </div>
                                <div className="pl-16">
                                    <p className="text-slate-700 whitespace-pre-wrap">{fb.feedback}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminFeedback;
