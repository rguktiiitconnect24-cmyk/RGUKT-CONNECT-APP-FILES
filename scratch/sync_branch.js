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

const inputFile = 'C:\\Users\\bilij\\Documents\\iiit\\RKV1 BRANCH ALLOCATION DATA.xlsx';

async function syncBranches() {
    try {
        console.log(`Processing file: ${inputFile}`);
        const rows = await readXlsxFile(inputFile);
        console.log(`Successfully read ${rows.length} rows.`);

        // headers are at index 0
        const dataRows = rows.slice(1);
        let updatedStudentsMaster = 0;

        let batch = writeBatch(db);
        let batchCount = 0;

        for (const row of dataRows) {
            const id = row[1] ? String(row[1]).trim().toUpperCase() : '';
            const branch = row[6] ? String(row[6]).trim() : '';

            if (!id || !branch) continue;

            const masterRef = doc(db, 'students_master', id);
            batch.set(masterRef, { branch, updatedAt: new Date().toISOString() }, { merge: true });
            
            batchCount++;
            updatedStudentsMaster++;

            if (batchCount === 400) {
                console.log(`Committing batch of ${batchCount} students...`);
                await batch.commit();
                batch = writeBatch(db);
                batchCount = 0;
            }
        }

        if (batchCount > 0) {
            console.log(`Committing final batch of ${batchCount} students...`);
            await batch.commit();
        }

        console.log(`\nSUCCESS: Synced ${updatedStudentsMaster} students in students_master.`);
        process.exit(0);

    } catch (error) {
        console.error("FAILED to sync branches:", error);
        process.exit(1);
    }
}

syncBranches();
