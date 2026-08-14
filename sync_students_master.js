import readXlsxFile from 'read-excel-file/node';
import { initializeApp } from "firebase/app";
import { getFirestore, doc, writeBatch } from "firebase/firestore";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBx2D31HmZ2mQ2ZztvHoLArXoNSQ1e7wCo",
    authDomain: "iiit-connect-d4b88.firebaseapp.com",
    databaseURL: "https://iiit-connect-d4b88-default-rtdb.firebaseio.com",
    projectId: "iiit-connect-d4b88",
    storageBucket: "iiit-connect-d4b88.firebasestorage.app",
    messagingSenderId: "2907414387",
    appId: "1:2907414387:web:0dbaac12825292c7f52f06",
    measurementId: "G-9C23HFGZJ2"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const files = [
    'C:\\Users\\bilij\\Documents\\iiit\\rkvalley.xlsx',
    'C:\\Users\\bilij\\Documents\\iiit\\ong.xlsx'
];

async function syncStudents() {
    try {
        console.log("--- STARTING MULTI-FILE STUDENTS MASTER SYNC ---");
        
        for (const inputPath of files) {
            console.log(`\nProcessing file: ${inputPath}`);
            const rows = await readXlsxFile(inputPath);
            console.log(`Successfully read ${rows.length} rows.`);

            // headers: ["Sl.", "ID No.", "NAME OF THE STUDENT", "CLASS", "Mails"]
            // data starts from row 2 (index 2)
            const dataRows = rows.slice(2);
            let updatedCount = 0;
            let batch = writeBatch(db);
            let batchCount = 0;

            for (const row of dataRows) {
                const id = row[1] ? String(row[1]).trim().toUpperCase() : '';
                const name = row[2] ? String(row[2]).trim() : '';
                const classSection = row[3] ? String(row[3]).trim() : '';
                const email = row[4] ? String(row[4]).trim() : '';

                if (!id) continue;

                const studentData = {
                    name,
                    classSection,
                    email,
                    role: 'student',
                    updatedAt: new Date().toISOString()
                };

                const docRef = doc(db, "students_master", id);
                batch.set(docRef, studentData, { merge: true });
                
                batchCount++;
                updatedCount++;

                if (batchCount === 400) {
                    console.log(`Commiting batch of ${batchCount} students...`);
                    await batch.commit();
                    batch = writeBatch(db);
                    batchCount = 0;
                }
            }

            if (batchCount > 0) {
                console.log(`Commiting final batch of ${batchCount} students...`);
                await batch.commit();
            }

            console.log(`SUCCESS: Synced ${updatedCount} students from ${inputPath.split('\\').pop()}`);
        }

        console.log(`\nALL FILES SYNCED SUCCESSFULLY.`);
        process.exit(0);

    } catch (error) {
        console.error("FAILED to sync students:", error);
        process.exit(1);
    }
}

syncStudents();
