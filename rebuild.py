import codecs

# Read the recovered lines 1-800
with open(r"admin-panel\src\pages\Admin\FacultyAttendance_recovered.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# Fix the escaped single quotes
content = content.replace("\\'", "'")

# The remaining code to append
append_code = """
                    />
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                    {filteredStudents.map(student => (
                        <div key={student.id} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '1rem', backgroundColor: '#fff', borderRadius: '0.75rem',
                            border: `1px solid ${attendanceData[student.id] === 'absent' ? '#fecdd3' : '#e5e7eb'}`,
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)', transition: 'all 0.2s',
                            borderLeft: `4px solid ${attendanceData[student.id] === 'absent' ? '#f43f5e' : '#10b981'}`
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <img 
                                    src={student.avatar || `https://ui-avatars.com/api/?name=${student.fullName || student.name || 'User'}&background=random`} 
                                    alt="" 
                                    style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                                />
                                <div>
                                    <div style={{ fontWeight: '600', color: '#1f2937', fontSize: '0.95rem' }}>{student.fullName || student.name || 'Unknown'}</div>
                                    <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.125rem' }}>{student.studentId || student.id}</div>
                                </div>
                            </div>
                            <button
                                onClick={() => toggleAttendance(student.id)}
                                style={{
                                    padding: '0.5rem', borderRadius: '0.5rem', cursor: 'pointer', transition: 'all 0.2s',
                                    border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    backgroundColor: attendanceData[student.id] === 'absent' ? '#fff1f2' : '#ecfdf5',
                                    color: attendanceData[student.id] === 'absent' ? '#f43f5e' : '#10b981'
                                }}
                            >
                                {attendanceData[student.id] === 'absent' ? <XCircle size={24} /> : <CheckCircle2 size={24} />}
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="faculty-attendance-page min-h-screen flex flex-col" style={{ background: "var(--color-bg)" }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
                .premium-font { font-family: 'Outfit', sans-serif; }
            `}</style>

            <div className="flex-grow">
            {/* Centered Premium Full-Width Header */}
            <div className="border-b px-6 py-10 mb-8 shadow-sm" style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}>
                <div className="max-w-7xl mx-auto flex flex-col items-center justify-center text-center">
                    <div className="flex items-center justify-center gap-4">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-full shadow-sm inline-flex">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                <line x1="3" y1="10" x2="21" y2="10"></line>
                                <path d="M9 16l2 2 4-4"></path>
                            </svg>
                        </div>
                        <h1 className="premium-font text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-900 to-indigo-600 tracking-tight">
                            Class Attendance
                        </h1>
                    </div>
                    <p className="text-[var(--color-text-muted)] font-medium text-base mt-3 max-w-lg mx-auto">
                        Record real-time attendance directly to the cloud.
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6">
                <div className={`attendance-content-wrapper mx-auto bg-[var(--color-surface)] rounded-2xl p-6 shadow-sm border border-[var(--color-border)] ${step < 5 || showHistoryModal ? 'max-w-4xl' : 'max-w-full'}`}>
                    {showHistoryModal ? renderHistoryPage() : step < 5 ? renderWizard() : renderAttendanceSheet()}
                </div>
                
                {step === 5 && !showHistoryModal && !loading && (
                    <div className="mt-8 mb-12 flex justify-end max-w-full mx-auto">
                        <button 
                            className="btn-primary flex items-center gap-2 py-3 px-8 text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                        >
                            <Save size={20} />
                            {isSubmitting ? 'Saving...' : 'Submit Attendance'}
                        </button>
                    </div>
                )}
            </div>
            </div>
        </div>
    );
};

export default FacultyAttendance;
"""

final_content = content + "\n" + append_code

with open(r"admin-panel\src\pages\Admin\FacultyAttendance.jsx", "w", encoding="utf-8") as f:
    f.write(final_content)

print("Restoration complete!")
