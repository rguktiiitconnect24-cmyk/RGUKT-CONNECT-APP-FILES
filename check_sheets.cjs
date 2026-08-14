const readXlsxFile = require('read-excel-file/node');

const inputPath = 'C:\\Users\\bilij\\Documents\\iiit\\rkvalley.xlsx';

readXlsxFile(inputPath, { getSheets: true }).then((sheets) => {
    console.log("Sheets found:", sheets);
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
