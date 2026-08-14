import xlsx from 'xlsx';
import fs from 'fs';
import path from 'path';

try {
    console.log("Loading Excel file...");
    const workbook = xlsx.readFile('all data.xlsx');
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

    console.log(`Loaded ${data.length} rows.`);

    // Find the header row index (Row 3 based on earlier output)
    let headerRowIndex = 0;
    for (let i = 0; i < Math.min(10, data.length); i++) {
        if (data[i].includes('ID.NO') && data[i].includes('SUBJECT')) {
            headerRowIndex = i;
            break;
        }
    }

    const headers = data[headerRowIndex];
    const rows = data.slice(headerRowIndex + 1);

    const getColIndex = (name) => headers.findIndex(h => h && h.toString().trim() === name);

    const colId = getColIndex('ID.NO');
    const colSubject = getColIndex('SUBJECT');
    const colSem = getColIndex('YEAR&SEM');
    const colCredits = getColIndex('CREDITS');
    const colGrp = getColIndex('GRP');
    const colTotCrp = getColIndex('TOT CRP');
    const colInternal = getColIndex('Internal         (max 40 Marks)'); // Exact matching based on previous dump
    const colGrade = getColIndex('Final Grade');
    const colStatus = getColIndex('STATUS');
    const colSgpa = getColIndex('SGPA');
    const colCgpa = getColIndex('CGPA');

    if (colId === -1 || colSubject === -1 || colGrade === -1) {
        throw new Error("Could not find required columns in header!");
    }

    const results = {};

    rows.forEach(row => {
        const id = row[colId];
        if (!id) return; // Skip empty rows

        if (!results[id]) {
            results[id] = {
                cgpa: row[colCgpa] ? parseFloat(row[colCgpa]) : 0,
                sgpa: row[colSgpa] ? parseFloat(row[colSgpa]) : 0,
                subjects: []
            };
        }

        // Keep highest CGPA in case it differs
        const currentCgpa = row[colCgpa] ? parseFloat(row[colCgpa]) : 0;
        if (currentCgpa > results[id].cgpa) {
            results[id].cgpa = currentCgpa;
        }
        
        const currentSgpa = row[colSgpa] ? parseFloat(row[colSgpa]) : 0;
        if (currentSgpa > results[id].sgpa) {
            results[id].sgpa = currentSgpa;
        }

        const subjectData = {
            subject: row[colSubject] || '',
            semester: colSem !== -1 ? (row[colSem] || '') : '',
            grade: row[colGrade] || '',
            credits: row[colCredits] || 0,
            internal: colInternal !== -1 ? (row[colInternal] || 0) : 0,
            status: colStatus !== -1 ? (row[colStatus] || '') : '',
            grp: colGrp !== -1 ? (row[colGrp] || 0) : 0,
            totCrp: colTotCrp !== -1 ? (row[colTotCrp] || 0) : 0,
            sgpa: row[colSgpa] || 0,
            cgpa: row[colCgpa] || 0
        };

        if (subjectData.subject) {
            results[id].subjects.push(subjectData);
        }
    });

    const outputDir = path.join(process.cwd(), 'public', 'data');
    if (!fs.existsSync(outputDir)){
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, 'puc_results.json');
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));

    console.log(`Successfully extracted records for ${Object.keys(results).length} students.`);
    console.log(`Saved to ${outputPath}`);

} catch (error) {
    console.error("Error processing file:", error);
}
