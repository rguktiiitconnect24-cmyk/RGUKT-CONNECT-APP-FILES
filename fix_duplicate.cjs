const fs = require('fs');
const file = 'c:/Users/bilij/Documents/projects/iiit/admin-panel/src/pages/Admin/TimetableManagement.jsx';
let content = fs.readFileSync(file, 'utf8');

const firstImport = content.indexOf("import React");
const secondImport = content.indexOf("import React", firstImport + 1);

if (secondImport > -1) {
    const validContent = content.substring(secondImport);
    fs.writeFileSync(file, validContent);
    console.log('Fixed duplication by keeping the second part.');
} else {
    console.log('No duplicate found.');
}
