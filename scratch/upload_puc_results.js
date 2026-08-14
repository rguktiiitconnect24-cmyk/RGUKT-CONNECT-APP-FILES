import readXlsxFile from 'read-excel-file/node';
import { initializeApp } from "firebase/app";
import { getFirestore, doc, writeBatch } from "firebase/firestore";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBI3Ic0c2hSAj6m29TEOcUrsROcCqIKnTk",
    authDomain: "blue-sea-restaurant-854b5.firebaseapp.com",
    projectId: "blue-sea-restaurant-854b5",
    storageBucket: "blue-sea-restaurant-854b5.firebasestorage.app",
    messagingSenderId: "454691522253",
    appId: "1:454691522253:web:d4bd7905f10a5d2dddcb84",
    measurementId: "G-E3LCLR9GKX"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const inputFile = 'C:\\Users\\bilij\\Documents\\iiit\\R24B PUC RESULT FOR Branch allocation_7-7-2026 (1).xlsx';

async function uploadPucResults() {
    try {
        console.log(`Processing file: ${inputFile}`);
        const rows = await readXlsxFile(inputFile);
        console.log(`Successfully read ${rows.length} rows.`);

        // headers are at index 2 (row 3)
        // data starts at index 3 (row 4)
        const dataRows = rows.slice(3);
        
        // Group by ID
        const studentData = {};

        for (const row of dataRows) {
            const id = row[2] ? String(row[2]).trim().toUpperCase() : '';
            if (!id) continue;

            if (!studentData[id]) {
                studentData[id] = {
                    cgpa: row[23] ? Number(row[23]).toFixed(2) : '0.00',
                    sgpa: row[22] ? Number(row[22]).toFixed(2) : '0.00',
                    yearSem: row[3] || '',
                    batch: row[16] || '',
                    subjects: []
                };
            }

            studentData[id].subjects.push({
                subject: row[6] || '',
                credits: row[7] || 0,
                internal: row[10] || 0,
                grade: row[13] || '',
                status: row[17] || ''
            });
        }

        console.log(`Found ${Object.keys(studentData).length} unique students.`);

        let batch = writeBatch(db);
        let batchCount = 0;
        let totalUpdated = 0;

        for (const id in studentData) {
            const record = studentData[id];
            const docRef = doc(db, 'cgpa_records', id);
            batch.set(docRef, record, { merge: true });
            
            batchCount++;
            totalUpdated++;

            if (batchCount === 400) {
                console.log(`Committing batch of ${batchCount} records...`);
                await batch.commit();
                batch = writeBatch(db);
                batchCount = 0;
            }
        }

        if (batchCount > 0) {
            console.log(`Committing final batch of ${batchCount} records...`);
            await batch.commit();
        }

        console.log(`\nSUCCESS: Synced ${totalUpdated} CGPA records in cgpa_records collection.`);
        process.exit(0);

    } catch (error) {
        console.error("FAILED to sync CGPA records:", error);
        process.exit(1);
    }
}

uploadPucResults();
