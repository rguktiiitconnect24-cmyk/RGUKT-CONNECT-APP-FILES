const fs = require('fs');
const path = require('path');

let output = '';
function searchDir(dir, pattern) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory() && file !== 'node_modules' && file !== '.git') {
            searchDir(fullPath, pattern);
        } else if (stat.isFile() && (fullPath.endsWith('.jsx') || fullPath.endsWith('.tsx') || fullPath.endsWith('.js') || fullPath.endsWith('.css'))) {
            const content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes(pattern)) {
                output += 'Found in: ' + fullPath + '\n';
            }
        }
    }
}

searchDir(path.join(__dirname, 'src'), 'Manage Quiz Questions');
fs.writeFileSync(path.join(__dirname, 'search_result.txt'), output || 'Not found');
