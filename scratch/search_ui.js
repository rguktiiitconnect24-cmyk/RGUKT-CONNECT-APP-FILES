const fs = require('fs');
const path = require('path');

function search(dir, regex) {
    if (dir.includes('node_modules') || dir.includes('.git') || dir.includes('dist')) return;
    try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                search(fullPath, regex);
            } else if (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.tsx') || file.endsWith('.ts')) {
                const content = fs.readFileSync(fullPath, 'utf8');
                if (regex.test(content)) {
                    console.log(`Found in: ${fullPath}`);
                }
            }
        }
    } catch (e) {
        // ignore
    }
}

search('./src', /MME|Mathematics & Computing/i);
search('./admin-panel', /MME|Mathematics & Computing/i);
