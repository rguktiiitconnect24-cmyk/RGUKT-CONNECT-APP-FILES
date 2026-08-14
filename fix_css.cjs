const fs = require('fs');
const file = 'c:/Users/bilij/Documents/projects/iiit/admin-panel/src/pages/Admin/Admin.css';
let content = fs.readFileSync(file, 'utf8');

const targetStr = '/* Timetable Merging Styles */';
const idx = content.indexOf(targetStr);
const fallbackIdx = content.indexOf('\0/\0*\0 \0T\0i\0m\0e');

let baseContent = content;
if (idx > -1) {
    baseContent = content.substring(0, idx);
} else if (fallbackIdx > -1) {
    baseContent = content.substring(0, fallbackIdx);
}

const styles = `
/* Timetable Merging Styles */
.cell-selected {
    outline: 2px solid var(--color-primary-600) !important;
    background-color: var(--color-primary-50) !important;
    z-index: 10;
}

[data-theme='dark'] .cell-selected {
    background-color: rgba(59, 130, 246, 0.2) !important;
}

.merge-popup-btn {
    position: absolute;
    top: -40px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--color-primary-600);
    color: white;
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    z-index: 50;
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 6px;
    pointer-events: auto;
}

.merge-popup-btn:hover {
    background: var(--color-primary-700);
}

.period-cell-wrapper {
    position: relative;
    height: 100%;
    width: 100%;
}
`;

fs.writeFileSync(file, baseContent + styles);
console.log('Fixed CSS encoding issue.');
