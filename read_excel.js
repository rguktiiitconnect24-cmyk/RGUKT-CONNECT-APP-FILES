import xlsx from 'xlsx';

try {
    const workbook = xlsx.readFile('all data.xlsx');
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

    console.log("Sheet Name:", sheetName);
    console.log("Total Rows:", data.length);
    console.log("--- First 10 Rows ---");
    for (let i = 0; i < Math.min(10, data.length); i++) {
        console.log(`Row ${i}:`, data[i]);
    }
} catch (error) {
    console.error("Error reading file:", error);
}
