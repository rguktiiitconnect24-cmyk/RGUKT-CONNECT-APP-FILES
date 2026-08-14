const fs = require('fs');

const file = 'c:/Users/bilij/Documents/projects/iiit/admin-panel/src/pages/Admin/TimetableManagement.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add imports (Link icon for Merge/Unmerge)
if (!content.includes('Link,')) {
    content = content.replace("import { Search, Save, Trash2, Calendar, AlertCircle, Check, Loader2, Plus, X, Users, Clock, Edit2 } from 'lucide-react';", 
    "import { Search, Save, Trash2, Calendar, AlertCircle, Check, Loader2, Plus, X, Users, Clock, Edit2, Link, Unlink } from 'lucide-react';");
}

// 2. Add State for selectedCells inside TimetableManagement component
const stateHookStr = `    const [holidayStatus, setHolidayStatus] = useState({ holidayDate: '', reason: '' });`;
const newStateStr = `    const [holidayStatus, setHolidayStatus] = useState({ holidayDate: '', reason: '' });
    const [selectedCells, setSelectedCells] = useState([]);`;
if (content.includes(stateHookStr) && !content.includes('const [selectedCells')) {
    content = content.replace(stateHookStr, newStateStr);
}

// 3. Add Merge/Unmerge Handlers
const getCellClassStr = `    const getCellClass = (value) => {`;
const handlersStr = `    const handleCellClick = (e, day, idx) => {
        if (!isEditMode) return;
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setSelectedCells(prev => {
                const isSelected = prev.some(c => c.day === day && c.idx === idx);
                if (isSelected) {
                    return prev.filter(c => !(c.day === day && c.idx === idx));
                } else {
                    // Only allow selecting cells from the same day
                    if (prev.length > 0 && prev[0].day !== day) {
                        return [{day, idx}];
                    }
                    return [...prev, {day, idx}].sort((a, b) => a.idx - b.idx);
                }
            });
        }
    };

    const handleMerge = () => {
        if (selectedCells.length < 2) return;
        const day = selectedCells[0].day;
        const sortedIdx = selectedCells.map(c => c.idx).sort();
        
        // Ensure contiguous
        for (let i = 0; i < sortedIdx.length - 1; i++) {
            if (sortedIdx[i+1] - sortedIdx[i] !== 1) {
                showToast("Only contiguous periods can be merged.", "warning");
                return;
            }
        }

        const startIdx = sortedIdx[0];
        const primaryValue = schedule[day][startIdx];

        setSchedule(prev => {
            const newDaySchedule = [...prev[day]];
            for (let i = 1; i < sortedIdx.length; i++) {
                newDaySchedule[sortedIdx[i]] = '\\u200B';
            }
            return { ...prev, [day]: newDaySchedule };
        });
        setSelectedCells([]);
    };

    const handleUnmerge = (day, startIdx, colSpan) => {
        setSchedule(prev => {
            const newDaySchedule = [...prev[day]];
            for (let i = 1; i < colSpan; i++) {
                newDaySchedule[startIdx + i] = '-';
            }
            return { ...prev, [day]: newDaySchedule };
        });
        setSelectedCells([]);
    };

    const getCellClass = (value) => {`;
if (content.includes(getCellClassStr) && !content.includes('handleMerge')) {
    content = content.replace(getCellClassStr, handlersStr);
}

// 4. Update the tbody rendering
const oldTbody = `                                    <tbody>
                                        {days.map(day => (
                                            <tr key={day}>
                                                <td className="bg-slate-50 font-bold text-[10px] uppercase text-slate-500 py-3 border-r">
                                                    {day.substring(0, 3)}
                                                </td>
                                                {periods.map((period, idx) => (
                                                    <td key={\`\${day}-\${idx}\`} className="p-0">
                                                        <div className={\`period-cell \${getCellClass(schedule[day]?.[idx])}\`}>
                                                            <input
                                                                type="text"
                                                                className="period-input"
                                                                value={schedule[day]?.[idx] || ''}
                                                                onChange={(e) => handleCellChange(day, idx, e.target.value)}
                                                                placeholder="-"
                                                                disabled={!isEditMode}
                                                            />
                                                        </div>
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>`;

const newTbody = `                                    <tbody>
                                        {days.map(day => {
                                            const cells = [];
                                            const daySchedule = schedule[day] || Array(7).fill('-');
                                            
                                            for (let i = 0; i < 7; i++) {
                                                if (daySchedule[i] === '\\u200B') continue;
                                                
                                                let colSpan = 1;
                                                while (i + colSpan < 7 && daySchedule[i + colSpan] === '\\u200B') {
                                                    colSpan++;
                                                }
                                                
                                                const isSelected = selectedCells.some(c => c.day === day && c.idx === i);
                                                const showMergeBtn = isSelected && selectedCells.length > 1 && selectedCells[0].day === day && i === selectedCells[0].idx;
                                                const showUnmergeBtn = isSelected && colSpan > 1;

                                                cells.push(
                                                    <td key={\`\${day}-\${i}\`} colSpan={colSpan} className="p-0 border relative">
                                                        <div 
                                                            className={\`period-cell-wrapper \${isSelected ? 'cell-selected' : ''}\`}
                                                            onClick={(e) => handleCellClick(e, day, i)}
                                                        >
                                                            {showMergeBtn && (
                                                                <button className="merge-popup-btn" onClick={(e) => { e.stopPropagation(); handleMerge(); }}>
                                                                    <Link size={14} /> Merge
                                                                </button>
                                                            )}
                                                            {showUnmergeBtn && (
                                                                <button className="merge-popup-btn" onClick={(e) => { e.stopPropagation(); handleUnmerge(day, i, colSpan); }}>
                                                                    <Unlink size={14} /> Unmerge
                                                                </button>
                                                            )}
                                                            <div className={\`period-cell h-full \${getCellClass(daySchedule[i])}\`}>
                                                                <input
                                                                    type="text"
                                                                    className="period-input h-full"
                                                                    value={daySchedule[i] || ''}
                                                                    onChange={(e) => handleCellChange(day, i, e.target.value)}
                                                                    placeholder="-"
                                                                    disabled={!isEditMode}
                                                                    style={{ cursor: isEditMode ? (selectedCells.length > 0 ? 'pointer' : 'text') : 'default' }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </td>
                                                );
                                            }

                                            return (
                                                <tr key={day}>
                                                    <td className="bg-slate-50 font-bold text-[10px] uppercase text-slate-500 py-3 border-r">
                                                        {day.substring(0, 3)}
                                                    </td>
                                                    {cells}
                                                </tr>
                                            );
                                        })}
                                    </tbody>`;

if (content.includes(oldTbody)) {
    content = content.replace(oldTbody, newTbody);
}

// 5. Unselect cells when leaving Edit Mode
const editModeStr = `                                            onClick={async () => {
                                                await handleSave();
                                                setIsEditMode(false);
                                            }}`;
const newEditModeStr = `                                            onClick={async () => {
                                                await handleSave();
                                                setIsEditMode(false);
                                                setSelectedCells([]);
                                            }}`;
if (content.includes(editModeStr)) {
    content = content.replace(editModeStr, newEditModeStr);
}
const discardStr = `                                        onClick={() => handleSelectClass(selectedClass)}`;
const newDiscardStr = `                                        onClick={() => { handleSelectClass(selectedClass); setSelectedCells([]); }}`;
if (content.includes(discardStr)) {
    content = content.replace(discardStr, newDiscardStr);
}


fs.writeFileSync(file, content);
console.log('Update script completed successfully.');
