import readXlsxFile from 'read-excel-file/node';
import { initializeApp } from "firebase/app";
import { getFirestore, doc, writeBatch, collection, getDocs, updateDoc } from "firebase/firestore";

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

async function mergeStudentData() {
    try {
        console.log(`Processing file: ${inputFile}`);
        const rows = await readXlsxFile(inputFile);
        console.log(`Successfully read ${rows.length} rows.`);

        // headers are at index 0
        const dataRows = rows.slice(1);
        
        const idToData = {};

        let batch = writeBatch(db);
        let batchCount = 0;
        let updatedStudentsMaster = 0;

        console.log("Updating students_master collection...");
        for (const row of dataRows) {
            const id = row[1] ? String(row[1]).trim().toUpperCase() : '';
            if (!id) continue;

            const studentData = {
                name: row[2] ? String(row[2]).trim() : '',
                gender: row[3] ? String(row[3]).trim() : '',
                cgpa: row[4] ? Number(row[4]) : null,
                caste: row[5] ? String(row[5]).trim() : '',
                branch: row[6] ? String(row[6]).trim() : '',
                department: row[6] ? String(row[6]).trim() : '',
                updatedAt: new Date().toISOString()
            };

            // Remove null/empty fields
            Object.keys(studentData).forEach(key => {
                if (studentData[key] === null || studentData[key] === '') {
                    delete studentData[key];
                }
            });

            idToData[id] = studentData;

            const masterRef = doc(db, 'students_master', id);
            batch.set(masterRef, studentData, { merge: true });
            
            batchCount++;
            updatedStudentsMaster++;

            if (batchCount === 400) {
                await batch.commit();
                batch = writeBatch(db);
                batchCount = 0;
            }
        }

        if (batchCount > 0) {
            await batch.commit();
        }
        console.log(`Synced ${updatedStudentsMaster} students in students_master.`);

        console.log("Updating registered users in 'users' collection...");
        const usersRef = collection(db, 'users');
        const userDocs = await getDocs(usersRef);
        let updatedUsers = 0;

        for (const userDoc of userDocs.docs) {
            const data = userDoc.data();
            const studentId = data.studentId ? String(data.studentId).toUpperCase() : '';
            
            if (studentId && idToData[studentId]) {
                const newData = idToData[studentId];
                const updatePayload = {};

                if (newData.name && data.fullName !== newData.name && (!data.fullName || data.fullName === 'Loading...')) {
                    updatePayload.fullName = newData.name;
                }
                if (newData.gender && data.gender !== newData.gender) {
                    updatePayload.gender = newData.gender;
                }
                if (newData.cgpa !== undefined && data.cgpa !== newData.cgpa) {
                    updatePayload.cgpa = newData.cgpa;
                }
                if (newData.caste && data.caste !== newData.caste) {
                    updatePayload.caste = newData.caste;
                }
                if (newData.branch && data.branch !== newData.branch) {
                    updatePayload.branch = newData.branch;
                    updatePayload.department = newData.branch;
                }

                if (Object.keys(updatePayload).length > 0) {
                    await updateDoc(userDoc.ref, updatePayload);
                    updatedUsers++;
                }
            }
        }

        console.log(`Synced data for ${updatedUsers} registered users in 'users' collection.`);
        process.exit(0);

    } catch (error) {
        console.error("FAILED to merge student data:", error);
        process.exit(1);
    }
}

mergeStudentData();
