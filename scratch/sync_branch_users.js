import readXlsxFile from 'read-excel-file/node';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, updateDoc } from "firebase/firestore";

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

async function syncBranchesToUsers() {
    try {
        console.log(`Processing file: ${inputFile}`);
        const rows = await readXlsxFile(inputFile);
        
        const dataRows = rows.slice(1);
        let updatedUsers = 0;

        const usersRef = collection(db, 'users');
        const userDocs = await getDocs(usersRef);

        const idToBranch = {};
        for (const row of dataRows) {
            const id = row[1] ? String(row[1]).trim().toUpperCase() : '';
            const branch = row[6] ? String(row[6]).trim() : '';
            if (id && branch) idToBranch[id] = branch;
        }

        for (const doc of userDocs.docs) {
            const data = doc.data();
            const studentId = data.studentId ? String(data.studentId).toUpperCase() : '';
            if (studentId && idToBranch[studentId]) {
                const branch = idToBranch[studentId];
                if (data.department !== branch) { // Note: Profile uses formData.department
                    await updateDoc(doc.ref, { department: branch, branch: branch });
                    updatedUsers++;
                    console.log(`Updated user ${studentId} to ${branch}`);
                }
            }
        }

        console.log(`\nSUCCESS: Synced branch to ${updatedUsers} registered users in 'users' collection.`);
        process.exit(0);

    } catch (error) {
        console.error("FAILED to sync branches:", error);
        process.exit(1);
    }
}

syncBranchesToUsers();
