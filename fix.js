const fs = require('fs');

const path = 'c:\\Users\\bilij\\Documents\\projects\\iiit\\admin-panel\\src\\pages\\Admin\\TimetableManagement.jsx';
let content = fs.readFileSync(path, 'utf8');

const missingBlock = `                <div className="section-card min-h-[600px]">
                    {!selectedClass ? (
                        <div className="flex flex-col items-center justify-center animate-fade-in" style={{ padding: '8rem 1rem', color: 'var(--color-text-muted)' }}>
                            <div className="rounded-full flex items-center justify-center mb-6" style={{ width: '5rem', height: '5rem', backgroundColor: 'var(--color-surface-hover)' }}>
                                <Calendar size={40} style={{ opacity: 0.2 }} />
                            </div>
                            <h3 className="text-lg font-bold" style={{ color: 'var(--color-text-muted)', opacity: 0.5 }}>No Class Selected</h3>
                            <p className="text-sm">Select a class from the list to manage its schedule</p>
                        </div>
                    ) : isLoading ? (
                        <LoadingTransition message="Timetable Registry Loading" persistent />
                    ) : schedule ? (
                        <div className="animate-fade-in">
                            <div className="editor-top-bar">
                                <div className="editor-title-group">
                                    <div className="editor-title-icon">
                                        <Calendar size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold">{selectedClass} Schedule</h2>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="timetable-status-badge">Live Document</span>
                                        </div>
                                    </div>
                                </div>

                                {/* High-End Live Class Status Banner */}
                                {periodInfo && (
                                    <div className="happening-now-banner animate-elastic-in">
                                        <div className="live-indicator-group">
                                            <div className="live-pulse-container">
                                                <span className="live-pulse-ring"></span>
                                                <span className="live-pulse-dot"></span>
                                            </div>
                                            <div className="live-info">
                                                <span className="live-label">Happening Now</span>
                                                <span className="live-subject">
                                                    {schedule?.[periodInfo.currentDay]?.[periodInfo.slot.index] || 'Free Period'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="live-timer-badge">
                                            <div className="timer-icon-bg">
                                                <Clock size={12} className="text-indigo-600" />
                                            </div>
                                            <div className="timer-content">
                                                <span className="timer-label">Ending In</span>
                                                <span className="timer-value">{periodInfo.timerStr}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-3 items-center">
                                    {isEditMode && (
                                        <label className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] cursor-pointer mr-2">
                                            <input 
                                                type="checkbox" 
                                                className="hidden" 
                                                checked={isAutoSave} 
                                                onChange={(e) => setIsAutoSave(e.target.checked)} 
                                            />
                                            <div 
                                                className="flex-shrink-0 rounded-full relative transition-colors"
                                                style={{ 
                                                    backgroundColor: isAutoSave ? 'var(--color-primary-600)' : '#cbd5e1',
                                                    width: '36px', 
                                                    height: '20px',
                                                    display: 'block'
                                                }}
                                            >
                                                <div 
                                                    className="absolute rounded-full bg-white transition-all"
                                                    style={{ 
                                                        left: isAutoSave ? '18px' : '2px', 
                                                        top: '2px',
                                                        width: '16px', 
                                                        height: '16px' 
                                                    }}
                                                ></div>
                                            </div>
                                            <span className="font-medium">Auto Save</span>
                                        </label>
                                    )}
                                    <button
                                        className="btn btn-secondary"
                                        onClick={() => { handleSelectClass(selectedClass); setSelectedCells([]); }}
                                    >
                                        Discard
                                    </button>
                                    {isEditMode ? (
                                        <button
                                            className="btn-primary flex items-center gap-2"
                                            onClick={async () => {
                                                await handleSave();
                                                setIsEditMode(false);`;

content = content.replace(/{[\s\n]*\/\* Timetable Editor \*\/[\s\n]*}\s*setIsEditMode\(false\);/, '{/* Timetable Editor */}\n' + missingBlock);

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed TimetableManagement.jsx');
