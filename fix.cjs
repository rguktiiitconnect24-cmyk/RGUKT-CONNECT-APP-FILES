const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('src', function(filePath) {
  if (filePath.endsWith('.css')) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('@media (prefers-color-scheme: dark)')) {
        let originalContent = content;
        content = content.replace(/@media\s*\(prefers-color-scheme:\s*dark\)\s*\{([\s\S]*?)\n\}/g, (match, inner) => {
            return inner.replace(/([^{]+)\{([^}]+)\}/g, (m, selector, rules) => {
                const newSelector = selector.split(',').map(s => `html[data-theme="dark"] ${s.trim()}`).join(', ');
                return `${newSelector} {${rules}}`;
            });
        });
        if (content !== originalContent) {
            fs.writeFileSync(filePath, content);
            console.log('Fixed CSS in: ' + filePath);
        }
    }
  }
});
