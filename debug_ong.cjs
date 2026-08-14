const readXlsxFile = require('read-excel-file/node');

const inputPath = 'C:\\Users\\bilij\\Documents\\iiit\\ong.xlsx';

readXlsxFile(inputPath).then((rows) => {
    console.log("Header (Row 0):", rows[0]);
    console.log("Header (Row 1):", rows[1]);
    console.log("Data   (Row 2):", rows[2]);
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
