const fs = require('fs');
const path = require('path');

const file = 'c:/Users/bilij/Documents/projects/iiit/admin-panel/src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove Student and Faculty imports
content = content.replace(/^const\s+[A-Za-z0-9]+\s*=\s*lazy\(\(\)\s*=>\s*import\('\.\/pages\/(?!Admin\/|Login|ForgetPassword|Welcome)[A-Za-z0-9/]+'\)\);\r?\n/gm, '');

// 2. Remove ProtectedRoute and FacultyRoute definitions
const protectedRouteStart = content.indexOf('const ProtectedRoute = ({ children }) => {');
const facultyRouteEnd = content.indexOf('};\n\nconst App', protectedRouteStart);
// Wait, AdminRoute is in the middle, so let's just use regex or replace string by string.
content = content.replace(/const ProtectedRoute = \(\{ children \}\) => \{[\s\S]*?return children;\r?\n\};\r?\n/g, '');
content = content.replace(/const FacultyRoute = \(\{ children \}\) => \{[\s\S]*?return children;\r?\n\};\r?\n/g, '');

// 3. Remove Student routes
content = content.replace(/^\s*<Route path="\/dashboard" element={<ProtectedRoute>.*<\/ProtectedRoute>}\s*\/>\r?\n/gm, '');
content = content.replace(/^\s*<Route path="\/courses.*<\/ProtectedRoute>}\s*\/>\r?\n/gm, '');
content = content.replace(/^\s*<Route path="\/timetable.*<\/ProtectedRoute>}\s*\/>\r?\n/gm, '');
content = content.replace(/^\s*<Route path="\/exams.*<\/ProtectedRoute>}\s*\/>\r?\n/gm, '');
content = content.replace(/^\s*<Route path="\/attendance.*<\/ProtectedRoute>}\s*\/>\r?\n/gm, '');
content = content.replace(/^\s*<Route path="\/complaints.*<\/ProtectedRoute>}\s*\/>\r?\n/gm, '');
content = content.replace(/^\s*<Route path="\/complaint.*<\/ProtectedRoute>}\s*\/>\r?\n/gm, '');
content = content.replace(/^\s*<Route path="\/notices.*<\/ProtectedRoute>}\s*\/>\r?\n/gm, '');
content = content.replace(/^\s*<Route path="\/profile.*<\/ProtectedRoute>}\s*\/>\r?\n/gm, '');

// 4. Remove Faculty routes
content = content.replace(/^\s*<Route path="\/faculty.*<\/FacultyRoute>}\s*\/>\r?\n/gm, '');
content = content.replace(/^\s*\{\/\* Faculty Routes \*\/\}\r?\n/gm, '');

// 5. Change fallback route to /admin/dashboard
content = content.replace(/<Route path="\*" element={<Navigate to="\/dashboard" replace \/>} \/>/g, '<Route path="*" element={<Navigate to="/admin/dashboard" replace />} />');

fs.writeFileSync(file, content);
console.log('Stripped Student/Faculty from admin-panel/src/App.jsx');
