const fs = require('fs');

const report = JSON.parse(fs.readFileSync('eslint-report.json', 'utf8'));
const missingImports = {};

report.forEach(file => {
    const undefs = file.messages.filter(m => m.ruleId === 'react/jsx-no-undef' || m.ruleId === 'no-undef');
    if (undefs.length > 0) {
        missingImports[file.filePath] = [...new Set(undefs.map(m => m.message.replace(/'/g, '').replace(' is not defined.', '')))];
    }
});

let lucideIcons = [];

// Try to auto-fix lucide-react imports if they start with a capital letter
Object.keys(missingImports).forEach(filePath => {
    const missing = missingImports[filePath].filter(name => /^[A-Z]/.test(name));
    if (missing.length > 0) {
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Check if there is already a lucide-react import
        const lucideRegex = /import\s+\{([^}]+)\}\s+from\s+['"]lucide-react['"]/;
        const match = content.match(lucideRegex);
        
        if (match) {
            // Append missing
            const existing = match[1].split(',').map(s => s.trim());
            const toAdd = missing.filter(m => !existing.includes(m));
            if (toAdd.length > 0) {
                const newImport = `import { ${[...existing, ...toAdd].join(', ')} } from 'lucide-react'`;
                content = content.replace(lucideRegex, newImport);
                fs.writeFileSync(filePath, content, 'utf8');
                console.log(`Updated lucide imports in ${filePath}`);
            }
        } else {
            // No lucide-react import found, add one at the top (after other imports)
            // But we don't know for sure if all missing PascalCase are lucide icons.
            // Let's assume all missing PascalCase variables in this repo are lucide icons,
            // EXCEPT for React, App, components etc.
            // Let's just print them out for manual review or safe injection.
            console.log(`Missing in ${filePath}:`, missing.join(', '));
        }
    }
});

fs.writeFileSync('missing-imports.json', JSON.stringify(missingImports, null, 2));
console.log("Done");
