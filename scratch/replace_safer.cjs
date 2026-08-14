const fs = require('fs');
const path = 'admin-panel/src/pages/Admin/UserManagement.jsx';
let content = fs.readFileSync(path, 'utf8');

// Use regex to replace the block
const startMarker = "{/* View User Modal */}";
const endMarker = "            {/* Edit User Modal */}";

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
    const originalBlock = content.substring(startIndex, endIndex);
    const replacementStr = `{/* View User Modal */}
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
            )}

`;

    content = content.replace(originalBlock, replacementStr);
    fs.writeFileSync(path, content, 'utf8');
    console.log("Successfully replaced block.");
} else {
    console.log("Could not find start or end marker");
}
