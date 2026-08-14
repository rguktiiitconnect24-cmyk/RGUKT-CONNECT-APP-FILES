const fs = require('fs');
const lines = fs.readFileSync('seating.csv', 'utf16le').split('\n');

let data = [];
let headers = [];

for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('R24 BATCH') || line.startsWith('Table')) continue;
    
    // Parse CSV line handling quotes and newlines loosely
    const rowRaw = line.split(',');
    
    if (headers.length === 0) {
        // Find header row starting with Sl. No.
        const firstCol = rowRaw[0].replace(/"/g, '').trim();
        if (firstCol.includes('Sl.')) {
            headers = rowRaw.map(h => h.replace(/["\r\n]/g, '').trim());
            // fix broken EXAM HALL header
            headers = headers.map(h => {
                if (h === 'EXAM') return 'EXAM';
                if (h === 'SUBJECT') return 'SUBJECT';
                if (h.includes('HALL')) return 'EXAM HALL';
                if (h.includes('TIME')) return 'DATE_TIME';
                return h;
            });
        }
        continue;
    }
    
    if (headers.length > 0) {
        let obj = {};
        let colIdx = 0;
        let inQuotes = false;
        let currentValue = '';
        
        // simple csv parse
        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                if (headers[colIdx]) {
                    obj[headers[colIdx]] = currentValue.trim();
                }
                colIdx++;
                currentValue = '';
            } else {
                currentValue += char;
            }
        }
        if (headers[colIdx]) {
            obj[headers[colIdx]] = currentValue.trim();
        }
        
        if (obj['ID No.']) {
            data.push(obj);
        }
    }
}

// Make sure src/data exists
if (!fs.existsSync('src/data')) {
    fs.mkdirSync('src/data', { recursive: true });
}

fs.writeFileSync('src/data/seating.json', JSON.stringify(data, null, 2));
console.log('Successfully written', data.length, 'records.');
