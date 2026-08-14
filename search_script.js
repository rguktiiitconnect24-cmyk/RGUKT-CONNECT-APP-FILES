const fs = require('fs');
const path = require('path');

function search(dir, pattern) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      search(fullPath, pattern);
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js') || fullPath.endsWith('.css')) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      if (content.includes(pattern)) {
        console.log(`Found in: ${fullPath}`);
      }
    }
  }
}

search('./src', 'Free Off Today');
search('./src', 'Schedule');
