import readXlsxFile from 'read-excel-file/node';

const schema = {
    'Student ID': {
        prop: 'id',
        type: String
    },
    'Name': {
        prop: 'name',
        type: String
    },
    'Class': {
        prop: 'classSection',
        type: String
    },
    'Email': {
        prop: 'email',
        type: String
    }
}

readXlsxFile('C:\\Users\\bilij\\Documents\\iiit\\TIMETABLE.xlsx').then((rows) => {
    console.log("Total rows:", rows.length);
    console.log("Headers:", rows[0]);
    console.log("First 5 data rows:");
    rows.slice(1, 6).forEach(row => console.log(row));
}).catch((error) => {
    console.error("Error reading Excel:", error);
});
