const fs = require('fs');
const path = require('path');

function search(dir, regex) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            search(fullPath, regex);
        } else if (file.match(/\.(js|jsx|ts|tsx)$/)) {
            const content = fs.readFileSync(fullPath, 'utf8');
            if (regex.test(content)) {
                console.log(fullPath);
                const lines = content.split('\n');
                lines.forEach((line, i) => {
                    if (regex.test(line)) {
                        console.log(`  Line ${i + 1}: ${line.trim()}`);
                    }
                });
            }
        }
    }
}

search(path.join(__dirname, 'src'), /Insert Matrix|quiz|Math/i);
