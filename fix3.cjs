const fs = require('fs');

const path = 'c:\\Users\\bilij\\Documents\\projects\\iiit\\admin-panel\\src\\pages\\Admin\\TimetableManagement.jsx';
let content = fs.readFileSync(path, 'utf8');

const missingHeader = `    return (
        <div className="admin-container">
            <div className="page-header-v2">
                <div className="header-accent-bar"></div>
                <div className="header-content-v2">
                    <h1 className="page-title-v2">Timetable Management</h1>
                    <p className="page-subtitle-v2">Edit and manage class schedules for all students.</p>
                </div>
            </div>

            <div className="timetable-mgmt-grid">
                {/* Class Selection Sidebar */}
                <div className="section-card h-fit">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Class List</h3>
                        <button
                            className="p-2 rounded-xl bg-[var(--color-primary-50)] text-[var(--color-primary-600)] hover:bg-[var(--color-primary-600)] hover:text-white transition-all transform hover:scale-110"
                            onClick={() => setIsAddingClass(!isAddingClass)}
                            title="Add New Class"
                        >
                            {isAddingClass ? <X size={18} /> : <Plus size={18} />}
                        </button>
                    </div>

                    {isAddingClass && (
                        <div className="new-class-box animate-slide-down">
                            <label className="new-class-label">Create New Class Record</label>
                            <p className="text-xs text-[var(--color-text-muted)] mb-2" style={{ marginTop: '4px' }}>Format: Section (Branch) ex: Section A (CSE)</p>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="e.g. Section A (CSE)"
                                    className="input text-sm w-full mb-2"
                                    value={newClassName}
                                    onChange={(e) => setNewClassName(e.target.value)}
                                    autoFocus
                                />
                                <button
                                    className="btn-primary p-2 min-w-0"
                                    onClick={handleAddClass}
                                    disabled={!newClassName.trim()}
                                >
                                    <Check size={20} />
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="relative mb-6">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" size={18} />
                        <input
                            type="text"
                            placeholder="Filter classes..."
                            className="input pl-10 text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>`;

let idx1 = content.indexOf('    return (\n\n                    <div className="sidebar-card-scroll custom-scrollbar">');

if (idx1 !== -1) {
    content = content.replace('    return (\n\n                    <div className="sidebar-card-scroll custom-scrollbar">', missingHeader + '\n\n                    <div className="sidebar-card-scroll custom-scrollbar">');
    fs.writeFileSync(path, content, 'utf8');
    console.log('Fixed TimetableManagement.jsx header successfully');
} else {
    // try to just find "return (\n"
    let idx2 = content.indexOf('    return (\r\n\r\n                    <div className="sidebar-card-scroll');
    if (idx2 !== -1) {
        content = content.replace('    return (\r\n\r\n                    <div className="sidebar-card-scroll', missingHeader + '\r\n\r\n                    <div className="sidebar-card-scroll');
        fs.writeFileSync(path, content, 'utf8');
        console.log('Fixed TimetableManagement.jsx header successfully with CRLF');
    } else {
        console.log('Could not find the target string');
    }
}
