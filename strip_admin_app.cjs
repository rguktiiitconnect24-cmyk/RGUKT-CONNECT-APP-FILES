const fs = require('fs');
const path = require('path');

const file = 'c:/Users/bilij/Documents/projects/iiit/src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove all Admin imports
content = content.replace(/^const\s+[A-Za-z0-9]+\s*=\s*lazy\(\(\)\s*=>\s*import\('\.\/pages\/Admin\/.*'\)\);\r?\n/gm, '');

// 2. Remove AdminRoute definition
const adminRouteStart = content.indexOf('const AdminRoute = ({ children, permission }) => {');
const adminRouteEnd = content.indexOf('};\n\nconst FacultyRoute', adminRouteStart);
if (adminRouteStart !== -1 && adminRouteEnd !== -1) {
    content = content.substring(0, adminRouteStart) + content.substring(adminRouteEnd + 4);
}

// 3. Remove all Admin routes
content = content.replace(/^\s*<Route path="\/admin.*<\/AdminRoute>}\s*\/>\r?\n/gm, '');

fs.writeFileSync(file, content);
console.log('Stripped Admin from src/App.jsx');
