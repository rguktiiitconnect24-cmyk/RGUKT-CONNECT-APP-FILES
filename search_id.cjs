const readXlsxFile = require('read-excel-file/node');

const inputPath = 'C:\\Users\\bilij\\Documents\\iiit\\rkvalley.xlsx';

readXlsxFile(inputPath).then((rows) => {
    const targetId = 'N240088';
    const row = rows.find(r => r[1] && String(r[1]).trim().toUpperCase() === targetId);
    if (row) {
        console.log("FOUND ROW:", row);
    } else {
        console.log("NOT FOUND in entire file.");
        // Let's print a few rows from the middle
        console.log("Sample Middle Rows:", rows.slice(500, 505));
    }
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
