import readXlsxFile from 'read-excel-file/node';

const inputPath = 'C:\\Users\\bilij\\Documents\\iiit\\TIMETABLE.xlsx';

readXlsxFile(inputPath).then((rows) => {
    console.log("Total rows:", rows.length);
    rows.forEach((row, i) => {
        if (i >= 20) {
            console.log(`Row ${i}: Class[${row[1]}]`);
        }
    });
}).catch(err => console.error(err));
