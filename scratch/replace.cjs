const fs = require('fs');
const path = 'admin-panel/src/pages/Admin/UserManagement.jsx';
let content = fs.readFileSync(path, 'utf8');

const targetStr = `            {/* View User Modal */}
            {viewUser && (
                <div className="modal-overlay" onClick={() => setViewUser(null)}>
                    <div className="modal-content full-screen max-w-4xl" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6 pb-4 border-b border-[var(--color-border)]">
                            <h2 className="text-2xl font-bold text-[var(--color-text-main)]">Comprehensive User Details</h2>
                            <button onClick={() => setViewUser(null)} className="modal-close-btn">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 overflow-y-auto pr-2 custom-scrollbar">
                            {/* Left Column: Profile Card & Bio */}
                            <div className="space-y-6">
                                <div className="flex flex-col items-center p-6 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-md relative overflow-hidden">
                                    <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 opacity-80"></div>
                                    <div className="z-10 mt-2 mb-4">
                                        <img
                                            src={viewUser.avatar || \`https://ui-avatars.com/api/?name=\${viewUser.fullName}&background=random\`}
                                            className="rounded-full border-4 border-[var(--color-surface)] shadow-lg bg-white object-cover flex-shrink-0"
                                            style={{ width: '110px', height: '110px', minWidth: '110px', minHeight: '110px' }}
                                            alt="Profile"
                                        />
                                    </div>
                                    <div className="text-center z-10 w-full flex flex-col items-center">
                                        <h3 className="text-xl font-extrabold text-[var(--color-text-main)] mb-1">{viewUser.fullName}</h3>
                                        <p className="text-[var(--color-text-muted)] text-sm mb-4">{viewUser.email}</p>
                                        <div className="flex gap-2 justify-center flex-wrap">
                                            <span className={\`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full \${viewUser.role === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : viewUser.role === 'faculty' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'}\`}>
                                                {viewUser.role}
                                            </span>
                                            <span className={\`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full \${viewUser.status === 'inactive' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'}\`}>
                                                {viewUser.status || 'ACTIVE'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="p-5 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/10 dark:to-blue-900/10 rounded-xl border border-indigo-100 dark:border-indigo-800/30 shadow-sm">
                                        <span className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-2">
                                            <AlertCircle size={14} /> Bio
                                        </span>
                                        <p className="text-sm text-[var(--color-text-main)] leading-relaxed bg-white/50 dark:bg-black/20 p-3 rounded-lg">
                                            {viewUser.bio || <span className="italic opacity-60">No bio provided.</span>}
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-orange-50 dark:bg-orange-900/10 rounded-xl border border-orange-100 dark:border-orange-800/30 flex flex-col justify-center items-center text-center shadow-sm">
                                            <span className="block text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider mb-1">Phone</span>
                                            <span className="text-sm font-semibold text-[var(--color-text-main)]">{viewUser.phone ? \`+91 \${viewUser.phone}\` : 'N/A'}</span>
                                        </div>
                                        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-800/30 flex flex-col justify-center items-center text-center shadow-sm">
                                            <span className="block text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">Joined</span>
                                            <span className="text-sm font-semibold text-[var(--color-text-main)]">{viewUser.createdAt ? new Date(viewUser.createdAt).toLocaleDateString() : 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Settings & Academic */}
                            <div className="space-y-6">
                                <div className="p-6 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm">
                                    <h4 className="flex items-center gap-2 text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-5 pb-2 border-b border-blue-100 dark:border-blue-900/30">
                                        <Monitor size={16} /> Academic Details
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="flex flex-col p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 rounded-xl">
                                            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1 uppercase">Department</span>
                                            <span className="text-sm font-bold text-[var(--color-text-main)]">{getUserBranch(viewUser) || 'Not Assigned'}</span>
                                        </div>
                                        <div className="flex flex-col p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 rounded-xl">
                                            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1 uppercase">Class / Section</span>
                                            <span className="text-sm font-bold text-[var(--color-text-main)]">{viewUser.currentClass || 'N/A'}</span>
                                        </div>
                                        <div className="flex flex-col p-3 bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800/30 rounded-xl">
                                            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-1 uppercase">ID Number</span>
                                            <span className="text-sm font-mono font-bold text-indigo-700 dark:text-indigo-300">{formatStudentId(viewUser.studentId)}</span>
                                        </div>
                                        {viewUser.role === 'faculty' && viewUser.designation && (
                                            <div className="flex flex-col p-3 bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800/30 rounded-xl">
                                                <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-1 uppercase">Designation</span>
                                                <span className="text-sm font-bold text-[var(--color-text-main)]">{viewUser.designation}</span>
                                            </div>
                                        )}
                                        {viewUser.rcId && (
                                            <div className="flex flex-col p-3 bg-fuchsia-50 dark:bg-fuchsia-900/10 border border-fuchsia-100 dark:border-fuchsia-800/30 rounded-xl">
                                                <span className="text-xs font-semibold text-fuchsia-600 dark:text-fuchsia-400 mb-1 uppercase">RGUKT ID</span>
                                                <span className="text-sm font-mono font-bold text-fuchsia-700 dark:text-fuchsia-300">{viewUser.rcId}</span>
                                            </div>
                                        )}
                                        {viewUser.role === 'admin' && viewUser.pin && (
                                            <div className="flex flex-col p-3 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-800/30 rounded-xl">
                                                <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 mb-1 uppercase">Admin PIN</span>
                                                <span className="text-sm font-mono font-bold text-[var(--color-text-main)]">{viewUser.pin}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="p-6 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm">
                                        <h4 className="text-sm font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider mb-5 pb-2 border-b border-teal-100 dark:border-teal-900/30">
                                            Preferences
                                        </h4>
                                        <div className="flex flex-col gap-4">
                                            <div className="flex flex-col p-3 bg-teal-50 dark:bg-teal-900/10 border border-teal-100 dark:border-teal-800/30 rounded-xl">
                                                <span className="text-xs font-semibold text-teal-600 dark:text-teal-400 mb-1 uppercase">Language</span>
                                                <span className="text-sm font-bold text-[var(--color-text-main)]">{viewUser.language || 'English'}</span>
                                            </div>
                                            <div className="flex flex-col p-3 bg-teal-50 dark:bg-teal-900/10 border border-teal-100 dark:border-teal-800/30 rounded-xl">
                                                <span className="text-xs font-semibold text-teal-600 dark:text-teal-400 mb-1 uppercase">Timezone</span>
                                                <span className="text-sm font-bold text-[var(--color-text-main)]">{viewUser.timezone || 'IST'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-6 bg-red-50/30 border border-red-200 rounded-2xl shadow-sm">
                                        <h4 className="flex items-center gap-2 text-sm font-bold text-red-600 uppercase tracking-wider mb-5 pb-2 border-b border-red-200">
                                            <AlertTriangle size={16} /> Recovery
                                        </h4>
                                        <div className="flex flex-col gap-4">
                                            <div className="flex flex-col p-3 bg-white rounded-xl border border-red-100">
                                                <span className="text-xs font-semibold text-red-600 mb-1 uppercase">User Password</span>
                                                <code className="bg-red-50 text-red-600 font-mono text-sm select-all font-bold p-1 rounded">
                                                    {viewUser.password || 'Not Stored'}
                                                </code>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 pt-5 border-t border-[var(--color-border)] flex justify-end">
                            <button
                                className="btn-primary"
                                onClick={() => setViewUser(null)}
                            >
                                <Check size={18} /> Done
                            </button>
                        </div>
                    </div>
                </div>
            )}`;

const replacementStr = `            {/* View User Modal */}
            {viewUser && (
                <div className="modal-overlay" onClick={() => setViewUser(null)}>
                    <div className="modal-content full-screen max-w-4xl user-details-modal" onClick={e => e.stopPropagation()}>
                        <div className="user-details-header">
                            <h2 className="user-details-title">Comprehensive User Details</h2>
                            <button onClick={() => setViewUser(null)} className="modal-close-btn">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="user-details-grid custom-scrollbar">
                            {/* Left Column: Profile Card & Bio */}
                            <div className="user-card-col">
                                <div className="profile-card-vibrant">
                                    <div className="profile-avatar-wrapper">
                                        <img
                                            src={viewUser.avatar || \`https://ui-avatars.com/api/?name=\${viewUser.fullName}&background=random\`}
                                            className="profile-avatar-img"
                                            alt="Profile"
                                        />
                                    </div>
                                    <h3 className="profile-name-vibrant">{viewUser.fullName}</h3>
                                    <p className="profile-email-vibrant">{viewUser.email}</p>
                                    <div className="profile-tags">
                                        <span className={\`tag-vibrant \${viewUser.role === 'admin' ? 'tag-role' : viewUser.role === 'faculty' ? 'tag-role' : 'tag-role'}\`}>
                                            {viewUser.role}
                                        </span>
                                        <span className={\`tag-vibrant \${viewUser.status === 'inactive' ? 'tag-status-inactive' : 'tag-status'}\`}>
                                            {viewUser.status || 'ACTIVE'}
                                        </span>
                                    </div>
                                </div>

                                <div className="user-card-col" style={{ gap: '16px' }}>
                                    <div className="detail-card-vibrant">
                                        <div className="detail-card-header indigo">
                                            <AlertCircle size={16} /> Bio
                                        </div>
                                        <div className="bio-content-vibrant">
                                            {viewUser.bio || <span className="italic opacity-60">No bio provided.</span>}
                                        </div>
                                    </div>
                                    
                                    <div className="info-grid-2">
                                        <div className="info-box-vibrant orange">
                                            <span className="info-label-vibrant orange">Phone</span>
                                            <span className="info-value-vibrant">{viewUser.phone ? \`+91 \${viewUser.phone}\` : 'N/A'}</span>
                                        </div>
                                        <div className="info-box-vibrant emerald">
                                            <span className="info-label-vibrant emerald">Joined</span>
                                            <span className="info-value-vibrant">{viewUser.createdAt ? new Date(viewUser.createdAt).toLocaleDateString() : 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Settings & Academic */}
                            <div className="user-card-col">
                                <div className="detail-card-vibrant">
                                    <h4 className="detail-card-header blue">
                                        <Monitor size={16} /> Academic Details
                                    </h4>
                                    <div className="info-grid-2">
                                        <div className="info-box-vibrant blue">
                                            <span className="info-label-vibrant blue">Department</span>
                                            <span className="info-value-vibrant">{getUserBranch(viewUser) || 'Not Assigned'}</span>
                                        </div>
                                        <div className="info-box-vibrant blue">
                                            <span className="info-label-vibrant blue">Class / Section</span>
                                            <span className="info-value-vibrant">{viewUser.currentClass || 'N/A'}</span>
                                        </div>
                                        <div className="info-box-vibrant indigo">
                                            <span className="info-label-vibrant indigo">ID Number</span>
                                            <span className="info-value-vibrant mono">{formatStudentId(viewUser.studentId)}</span>
                                        </div>
                                        {viewUser.role === 'faculty' && viewUser.designation && (
                                            <div className="info-box-vibrant purple">
                                                <span className="info-label-vibrant purple">Designation</span>
                                                <span className="info-value-vibrant">{viewUser.designation}</span>
                                            </div>
                                        )}
                                        {viewUser.rcId && (
                                            <div className="info-box-vibrant fuchsia">
                                                <span className="info-label-vibrant fuchsia">RGUKT ID</span>
                                                <span className="info-value-vibrant mono">{viewUser.rcId}</span>
                                            </div>
                                        )}
                                        {viewUser.role === 'admin' && viewUser.pin && (
                                            <div className="info-box-vibrant rose">
                                                <span className="info-label-vibrant rose">Admin PIN</span>
                                                <span className="info-value-vibrant mono">{viewUser.pin}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="info-grid-2">
                                    <div className="detail-card-vibrant">
                                        <h4 className="detail-card-header teal">Preferences</h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            <div className="info-box-vibrant teal">
                                                <span className="info-label-vibrant teal">Language</span>
                                                <span className="info-value-vibrant">{viewUser.language || 'English'}</span>
                                            </div>
                                            <div className="info-box-vibrant teal">
                                                <span className="info-label-vibrant teal">Timezone</span>
                                                <span className="info-value-vibrant">{viewUser.timezone || 'IST'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="detail-card-vibrant" style={{ borderColor: 'rgba(239, 68, 68, 0.2)', background: 'rgba(239, 68, 68, 0.05)' }}>
                                        <h4 className="detail-card-header red" style={{ borderBottomColor: 'rgba(239, 68, 68, 0.2)' }}>
                                            <AlertTriangle size={16} /> Recovery
                                        </h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            <div className="info-box-vibrant red" style={{ background: 'var(--color-surface)' }}>
                                                <span className="info-label-vibrant red">User Password</span>
                                                <code className="info-value-vibrant mono" style={{ color: '#ef4444', userSelect: 'all' }}>
                                                    {viewUser.password || 'Not Stored'}
                                                </code>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer-vibrant">
                            <button
                                className="btn-primary"
                                onClick={() => setViewUser(null)}
                            >
                                <Check size={18} /> Done
                            </button>
                        </div>
                    </div>
                </div>
            )}`;

content = content.replace(targetStr, replacementStr);
fs.writeFileSync(path, content, 'utf8');
console.log('Replaced successfully');
