import readXlsxFile from 'read-excel-file/node';
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, deleteDoc, collection, getDocs } from "firebase/firestore";

// Firebase configuration from src/config/firebase.js
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

const inputPath = 'C:\\Users\\bilij\\Documents\\iiit\\TIMETABLE.xlsx';
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const PERIODS_PER_DAY = 7;
const START_COL_INDEX = 2; // Monday starts at index 2 (Column C)

async function syncTimetable() {
    try {
        console.log("--- STARTING TIMETABLE SYNC & CLEANUP ---");

        // 1. CLEANUP: Delete all existing documents in 'timetable' collection
        console.log("Step 1: Cleaning up 'timetable' collection...");
        const querySnapshot = await getDocs(collection(db, "timetable"));
        console.log(`Found ${querySnapshot.size} existing documents to remove.`);
        
        const deletePromises = querySnapshot.docs.map(d => deleteDoc(d.ref));
        await Promise.all(deletePromises);
        console.log("Cleanup complete. Collection is now empty.");

        // 2. PARSE EXCEL
        console.log("\nStep 2: Reading Excel file...");
        const rows = await readXlsxFile(inputPath);
        console.log(`Successfully read ${rows.length} rows.`);

        let updatedCount = 0;

        // Data starts from row index 5
        for (let i = 5; i < rows.length; i++) {
            const row = rows[i];
            const className = row[1]; // Column 1 is Class (e.g., μ-1, F-04)

            if (!className) continue;

            // Normalize Class Name: Replace Symbols with Text
            let cleanClass = String(className).trim();
            
            // Symbol to Text Replacement (Case-insensitive)
            cleanClass = cleanClass.replace(/[μΜ]/g, 'MUE');
            cleanClass = cleanClass.replace(/[φΦ]/g, 'PHI');

            // Format to PREFIX-XX (e.g., MUE-01, F-07)
            const match = cleanClass.match(/^([a-zA-Z]+)-?(\d+)$/i);
            let normalizedCls;
            if (match) {
                const prefix = match[1].toUpperCase();
                const num = match[2];
                // Pad with zero if single digit
                const paddedNum = num.length === 1 ? `0${num}` : num;
                normalizedCls = `${prefix}-${paddedNum}`;
            } else {
                // Fallback for non-standard names
                normalizedCls = cleanClass.toUpperCase().replace(/[\s-]/g, '');
            }

            const schedule = {};

            // Iterate through days
            DAYS.forEach((day, dayIndex) => {
                const dayStartCol = START_COL_INDEX + (dayIndex * PERIODS_PER_DAY);
                schedule[day] = [];

                for (let p = 0; p < PERIODS_PER_DAY; p++) {
                    const subject = row[dayStartCol + p];
                    schedule[day].push(subject ? String(subject).trim() : "Free");
                }
            });

            // 3. UPLOAD to Firestore
            const docRef = doc(db, "timetable", normalizedCls);
            await setDoc(docRef, schedule);
            console.log(`[${updatedCount + 1}] Created: ${normalizedCls} (From: ${className})`);
            updatedCount++;
        }

        console.log(`\nSUCCESS: Synced ${updatedCount} classes to Firebase with text-based IDs.`);
        process.exit(0);

    } catch (error) {
        console.error("FAILED to sync timetable:", error);
        process.exit(1);
    }
}

syncTimetable();
