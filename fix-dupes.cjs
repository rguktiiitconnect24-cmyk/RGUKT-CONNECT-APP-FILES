const fs = require('fs');
const report = JSON.parse(fs.readFileSync('parse-errors.json', 'utf8').replace(/^\uFEFF/, ''));

report.forEach(file => {
    let fatalMessages = file.messages.filter(m => m.fatal && m.message.includes('has already been declared'));
    if (fatalMessages.length > 0) {
        let content = fs.readFileSync(file.filePath, 'utf8');
        let dupes = [...new Set(fatalMessages.map(m => m.message.match(/Identifier '([^']+)' has already been declared/)?.[1] || m.message.match(/The symbol "([^"]+)" has already been declared/)?.[1] || m.message.match(/'([^']+)' has already been declared/)?.[1]))].filter(Boolean);
        
        if (dupes.length > 0) {
            console.log(`Fixing duplicates in ${file.filePath}: ${dupes.join(', ')}`);
            const lucideRegex = /import\s+\{([^}]+)\}\s+from\s+['"]lucide-react['"];?/;
            const match = content.match(lucideRegex);
            if (match) {
                let existing = match[1].split(',').map(s => s.trim());
                existing = existing.filter(e => !dupes.includes(e));
                if (existing.length > 0) {
                    content = content.replace(lucideRegex, `import { ${existing.join(', ')} } from 'lucide-react';`);
                } else {
                    content = content.replace(lucideRegex, ''); // remove the whole import
                }
                fs.writeFileSync(file.filePath, content, 'utf8');
            }
        }
    }
});
console.log("Done fixing duplicates");
