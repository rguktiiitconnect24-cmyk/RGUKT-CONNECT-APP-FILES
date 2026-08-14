const fs = require('fs');
const path = require('path');

const report = JSON.parse(fs.readFileSync('eslint-report.json', 'utf8'));
const missingImports = {};

report.forEach(file => {
    const undefs = file.messages.filter(m => m.ruleId === 'react/jsx-no-undef' || m.ruleId === 'no-undef');
    if (undefs.length > 0) {
        missingImports[file.filePath] = [...new Set(undefs.map(m => m.message.replace(/'/g, '').replace(' is not defined.', '')))];
    }
});

const localExports = {}; // name -> absolute path

function scanDir(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file !== 'node_modules' && file !== 'dist') scanDir(fullPath);
        } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            // very basic export matching
            const exportDefaultMatch = content.match(/export\s+default\s+([A-Za-z0-9_]+)/);
            if (exportDefaultMatch) {
                // If the file exports a component matching its filename, map the filename
                const basename = path.basename(file, path.extname(file));
                localExports[basename] = fullPath;
            }
            
            // if it defines a class or function and exports default at the bottom, the basename logic covers it usually
            const exportConstMatch = content.matchAll(/export\s+(?:const|function|class)\s+([A-Z][A-Za-z0-9_]*)/g);
            for (const match of exportConstMatch) {
                localExports[match[1]] = fullPath;
            }
        }
    }
}

// Map local files
scanDir(path.join(__dirname, 'src'));
scanDir(path.join(__dirname, 'admin-panel', 'src'));

// Known 3rd party exports
const thirdParty = {
    'Route': 'react-router-dom',
    'Routes': 'react-router-dom',
    'Navigate': 'react-router-dom',
    'NavLink': 'react-router-dom',
    'AnimatePresence': 'framer-motion',
    'motion': 'framer-motion',
    'ResponsiveContainer': 'recharts',
    'BarChart': 'recharts',
    'CartesianGrid': 'recharts',
    'XAxis': 'recharts',
    'YAxis': 'recharts',
    'Bar': 'recharts',
    'PieChart': 'recharts',
    'Pie': 'recharts',
    'Cell': 'recharts',
    'Legend': 'recharts',
    'AreaChart': 'recharts',
    'Area': 'recharts',
    'RechartsTooltip': 'recharts',
    'Tooltip': 'recharts',
    'StrictMode': 'react',
    'Suspense': 'react',
    'Capacitor': '@capacitor/core'
};

function getRelativePath(fromPath, toPath) {
    let rel = path.relative(path.dirname(fromPath), toPath).replace(/\\/g, '/');
    if (!rel.startsWith('.')) rel = './' + rel;
    // strip extension
    rel = rel.replace(/\.jsx?$/, '');
    return rel;
}

Object.keys(missingImports).forEach(filePath => {
    let missing = missingImports[filePath].filter(name => /^[A-Z]/.test(name)); // Only PascalCase
    if (missing.length === 0) return;
    
    let content = fs.readFileSync(filePath, 'utf8');
    let lucideMissing = [];
    
    missing.forEach(comp => {
        if (thirdParty[comp]) {
            const pkg = thirdParty[comp];
            // inject import { comp } from pkg
            content = `import { ${comp === 'RechartsTooltip' ? 'Tooltip as RechartsTooltip' : comp} } from '${pkg}';\n` + content;
        } else if (localExports[comp] && localExports[comp] !== filePath) {
            const relPath = getRelativePath(filePath, localExports[comp]);
            // check if it's default export or named. We'll guess default if it matches filename
            if (path.basename(localExports[comp]).startsWith(comp)) {
                content = `import ${comp} from '${relPath}';\n` + content;
            } else {
                content = `import { ${comp} } from '${relPath}';\n` + content;
            }
        } else {
            // assume lucide-react
            lucideMissing.push(comp);
        }
    });
    
    if (lucideMissing.length > 0) {
        const lucideRegex = /import\s+\{([^}]+)\}\s+from\s+['"]lucide-react['"]/;
        const match = content.match(lucideRegex);
        if (match) {
            const existing = match[1].split(',').map(s => s.trim());
            const toAdd = lucideMissing.filter(m => !existing.includes(m));
            if (toAdd.length > 0) {
                const newImport = `import { ${[...existing, ...toAdd].join(', ')} } from 'lucide-react'`;
                content = content.replace(lucideRegex, newImport);
            }
        } else {
            content = `import { ${lucideMissing.join(', ')} } from 'lucide-react';\n` + content;
        }
    }
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed imports in ${filePath}`);
});
console.log("Done");
