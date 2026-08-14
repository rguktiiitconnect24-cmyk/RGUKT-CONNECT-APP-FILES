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

async function removeOngole() {
    try {
        console.log("--- STARTING ONGOLE STUDENTS DELETION ---");
        
        let rows;
        try {
             rows = await readXlsxFile('C:\\Users\\bilij\\Documents\\iiit\\ong.xlsx');
             console.log("Found file at C:\\Users\\bilij\\Documents\\iiit\\ong.xlsx");
        } catch(e) {
             rows = await readXlsxFile('C:\\Users\\bilij\\Documents\\projects\\iiit\\ong.xlsx');
             console.log("Found file at C:\\Users\\bilij\\Documents\\projects\\iiit\\ong.xlsx");
        }

        console.log(`Successfully read ${rows.length} rows.`);

        const dataRows = rows.slice(2);
        let deletedCount = 0;
        let batch = writeBatch(db);
        let batchCount = 0;

        for (const row of dataRows) {
            const id = row[1] ? String(row[1]).trim().toUpperCase() : '';
            if (!id) continue;

            const docRef = doc(db, "students_master", id);
            batch.delete(docRef);
            
            batchCount++;
            deletedCount++;

            if (batchCount === 400) {
                console.log(`Commiting batch of ${batchCount} deletions...`);
                await batch.commit();
                batch = writeBatch(db);
                batchCount = 0;
            }
        }

        if (batchCount > 0) {
            console.log(`Commiting final batch of ${batchCount} deletions...`);
            await batch.commit();
        }

        console.log(`SUCCESS: Deleted ${deletedCount} students from Firestore`);
        process.exit(0);

    } catch (error) {
        console.error("FAILED to delete students:", error);
        process.exit(1);
    }
}

removeOngole();
