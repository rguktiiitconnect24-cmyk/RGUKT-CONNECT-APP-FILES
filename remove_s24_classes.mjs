import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, updateDoc, doc, deleteField } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyBx2D31HmZ2mQ2ZztvHoLArXoNSQ1e7wCo",
    authDomain: "iiit-connect-d4b88.firebaseapp.com",
    projectId: "iiit-connect-d4b88",
    storageBucket: "iiit-connect-d4b88.firebasestorage.app",
    messagingSenderId: "2907414387",
    appId: "1:2907414387:web:0dbaac12825292c7f52f06"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function removeClasses() {
    console.log("Removing class data for S24 students...");
    let masterCount = 0;
    let usersCount = 0;

    // 1. Update students_master
    const masterSnapshot = await getDocs(collection(db, 'students_master'));
    for (const d of masterSnapshot.docs) {
        if (d.id.startsWith("S24")) {
            const data = d.data();
            if (data.classSection) {
                await updateDoc(doc(db, 'students_master', d.id), {
                    classSection: deleteField()
                });
                masterCount++;
            }
        }
    }

    // 2. Update users
    const usersSnapshot = await getDocs(collection(db, 'users'));
    for (const d of usersSnapshot.docs) {
        const data = d.data();
        const studentId = data.studentId || "";
        if (studentId.startsWith("S24")) {
            if (data.currentClass) {
                await updateDoc(doc(db, 'users', d.id), {
                    currentClass: deleteField()
                });
                usersCount++;
            }
        }
    }

    console.log(`Successfully removed class data from ${masterCount} students_master docs and ${usersCount} users docs.`);
    process.exit(0);
}

removeClasses();
