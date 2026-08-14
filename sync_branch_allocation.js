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

async function syncBranchAllocations() {
    try {
        console.log("--- STARTING BRANCH ALLOCATION SYNC ---");
        
        console.log(`Processing file: ${inputFile}`);
        const rows = await readXlsxFile(inputFile);
        console.log(`Successfully read ${rows.length} rows.`);

        // headers: ['SNO', 'CAMPUS ID', 'NAME OF STUDENT', 'GENDER', 'CGPA OF PUC', 'CASTE', 'ALLOTTED BRANCH']
        // data starts from row 1 (index 1) if row 0 is header
        const dataRows = rows.slice(1);
        let updatedCount = 0;
        let batch = writeBatch(db);
        let batchCount = 0;

        for (const row of dataRows) {
            const studentIdRaw = row[1];
            const branchRaw = row[6];
            
            if (!studentIdRaw || !branchRaw) continue;

            const id = String(studentIdRaw).trim().toUpperCase();
            const branch = String(branchRaw).trim();

            const studentData = {
                branch: branch,
                department: branch, // Store in both to be safe
                branchUpdatedAt: new Date().toISOString()
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

        console.log(`SUCCESS: Synced branch allocation for ${updatedCount} students.`);
        process.exit(0);

    } catch (error) {
        console.error("FAILED to sync branch allocations:", error);
        process.exit(1);
    }
}

syncBranchAllocations();
