const fs = require('fs');
const path = require('path');

function walkSync(dir, callback) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filepath = path.join(dir, file);
        const stats = fs.statSync(filepath);
        if (stats.isDirectory()) {
            walkSync(filepath, callback);
        } else if (stats.isFile()) {
            callback(filepath);
        }
    });
}

const targetStr = 'React.';
const excludeStr = 'import React';

walkSync(path.join(__dirname, 'src'), (filepath) => {
    if (filepath.endsWith('.js') || filepath.endsWith('.jsx')) {
        const content = fs.readFileSync(filepath, 'utf8');
        if (content.includes(targetStr) && !content.includes(excludeStr)) {
            console.log(filepath);
            const lines = content.split('\n');
            lines.forEach((line, i) => {
                if (line.includes(targetStr)) {
                    console.log(`  Line ${i+1}: ${line.trim()}`);
                }
            });
        }
    }
});
