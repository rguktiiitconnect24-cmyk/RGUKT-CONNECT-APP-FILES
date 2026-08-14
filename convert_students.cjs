
const readXlsxFile = require('read-excel-file/node');
const fs = require('fs');
const path = require('path');

const inputPath = 'rkvalley.xlsx';
const outputPath = path.join('src', 'data', 'students.js');

console.log(`Reading from: ${inputPath}`);

readXlsxFile(inputPath).then((rows) => {
    // Row 1 is headers: ["Sl.", "ID No.", "NAME OF THE STUDENT", "CLASS", "Mails"]
    const dataRows = rows.slice(2);
    const students = dataRows.map(row => {
        const id = row[1] ? String(row[1]).trim().toUpperCase() : '';
        const name = row[2] ? String(row[2]).trim() : '';
        const classSection = row[3] ? String(row[3]).trim() : ''; // Added Class Section
        const email = row[4] ? String(row[4]).trim() : '';

        if (!id) return null;

        return {
            id,
            name,
            classSection,
            email
        };
    }).filter(Boolean);

    console.log(`Processed ${students.length} students.`);

    const fileContent = `export const studentsData = ${JSON.stringify(students, null, 2)};`;

    fs.writeFileSync(outputPath, fileContent);
    console.log(`Written to: ${outputPath}`);

}).catch(err => {
    console.error('Error reading excel file:', err);
    process.exit(1);
});
