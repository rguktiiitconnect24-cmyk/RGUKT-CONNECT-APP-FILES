import readXlsxFile from 'read-excel-file/node';
import fs from 'fs';

const inputPath = 'C:\\Users\\bilij\\Documents\\iiit\\rkvalley.xlsx';
const outputPath = 'C:\\Users\\bilij\\Documents\\iiit\\src\\data\\students.js';

readXlsxFile(inputPath).then((rows) => {
    // Skip first 2 rows (Title and Headers)
    const dataRows = rows.slice(2);

    const students = dataRows.map(row => {
        // row[1] = ID, row[2] = Name, row[3] = Class, row[4] = Email
        if (!row[1] || !row[4]) return null; // Skip invalid rows

        return {
            id: String(row[1]).trim(),
            name: String(row[2]).trim(),
            classSection: String(row[3]).trim(),
            email: String(row[4]).trim()
        };
    }).filter(s => s !== null);

    console.log(`Parsed ${students.length} students.`);

    const fileContent = `export const studentsData = ${JSON.stringify(students, null, 2)};`;

    fs.writeFileSync(outputPath, fileContent);
    console.log(`Updated ${outputPath} successfully.`);

}).catch((error) => {
    console.error("Error processing Excel:", error);
});
