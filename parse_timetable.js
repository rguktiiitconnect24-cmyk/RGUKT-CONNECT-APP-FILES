import readXlsxFile from 'read-excel-file/node';
import fs from 'fs';

const inputPath = 'C:\\Users\\bilij\\Documents\\iiit\\TIMETABLE.xlsx';
const outputPath = 'C:\\Users\\bilij\\Documents\\iiit\\src\\data\\timetable.js';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const PERIODS_PER_DAY = 7;
const START_COL_INDEX = 2; // Monday starts at index 2 (Column C)

readXlsxFile(inputPath).then((rows) => {
    // Data starts from row index 4 (5th row) based on previous analysis
    // Row 0: Title
    // Row 1: Empty?
    // Row 2: Days (MONDAY, TUESDAY...)
    // Row 3: Periods (P1, P2...)
    // Row 4: Data starts

    // Let's inspect row 4 to be sure it's data
    // console.log("Row 4:", rows[4]); 

    const timetable = {};

    // Start iterating from row 4
    for (let i = 4; i < rows.length; i++) {
        const row = rows[i];

        // Column 1 is Class (e.g., F-08)
        const className = row[1];

        if (!className) continue; // Skip empty rows or rows without class

        const cleanClass = String(className).trim();
        timetable[cleanClass] = {};

        // Iterate through days
        DAYS.forEach((day, dayIndex) => {
            const dayStartCol = START_COL_INDEX + (dayIndex * PERIODS_PER_DAY);
            timetable[cleanClass][day] = [];

            for (let p = 0; p < PERIODS_PER_DAY; p++) {
                const subject = row[dayStartCol + p];
                timetable[cleanClass][day].push(subject ? String(subject).trim() : "Free");
            }
        });
    }

    console.log(`Parsed timetable for ${Object.keys(timetable).length} classes.`);

    const fileContent = `export const timetableData = ${JSON.stringify(timetable, null, 2)};`;

    fs.writeFileSync(outputPath, fileContent);
    console.log(`Updated ${outputPath} successfully.`);

}).catch((error) => {
    console.error("Error processing Excel:", error);
});
