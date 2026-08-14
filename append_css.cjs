const fs = require('fs');
const file = 'c:/Users/bilij/Documents/projects/iiit/admin-panel/src/pages/Admin/Admin.css';
let content = fs.readFileSync(file, 'utf8');

const styles = `
.merge-popup-container {
    position: absolute;
    top: -40px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 8px;
    z-index: 50;
    pointer-events: auto;
}

.merge-popup-container .merge-popup-btn {
    position: static;
    transform: none;
}

.merge-popup-btn.cancel {
    background: var(--color-danger);
}

.merge-popup-btn.cancel:hover {
    background: #dc2626; /* darker red */
}
`;

if (!content.includes('.merge-popup-container')) {
    fs.appendFileSync(file, styles);
    console.log('Appended container styles.');
}
