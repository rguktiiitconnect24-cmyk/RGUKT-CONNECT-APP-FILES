const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else if (file.endsWith('.jsx') || file.endsWith('.js') || file.endsWith('.tsx') || file.endsWith('.ts')) { 
            results.push(file);
        }
    });
    return results;
}

const srcDir = path.join(__dirname, 'src');
const files = walk(srcDir);

let fixedFiles = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;
    
    // Match any import containing admin-panel/src
    const regex = /(['"])([^'"]*admin-panel\/src\/[^'"]+)\1/g;
    
    content = content.replace(regex, (match, quote, importPath) => {
        const fileDir = path.dirname(file);
        const absoluteImportPath = path.resolve(fileDir, importPath);
        
        // Replace admin-panel/src with src
        const newAbsoluteImportPath = absoluteImportPath.replace(/\\admin-panel\\src\\/g, '\\src\\').replace(/\/admin-panel\/src\//g, '/src/');
        
        // Get relative path from fileDir to newAbsoluteImportPath
        let newRelativePath = path.relative(fileDir, newAbsoluteImportPath);
        
        // Ensure it starts with ./ or ../
        newRelativePath = newRelativePath.replace(/\\/g, '/');
        if (!newRelativePath.startsWith('.')) {
            newRelativePath = './' + newRelativePath;
        }
        
        changed = true;
        return `${quote}${newRelativePath}${quote}`;
    });

    if (changed) {
        fs.writeFileSync(file, content, 'utf8');
        fixedFiles++;
        console.log(`Fixed ${file}`);
    }
});

console.log(`Done. Fixed ${fixedFiles} files.`);
