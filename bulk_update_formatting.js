import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, updateDoc } from "firebase/firestore";

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

function formatClassID(cls) {
    if (!cls) return '';
    let normalized = String(cls).toUpperCase()
        .replace(/[μΜ]/g, 'MUE')
        .replace(/[φΦ]/g, 'PHI')
        .replace(/\s+/g, ''); // Remove spaces

    const match = normalized.match(/^([A-Z]+)-?(\d+)$/);
    if (match) {
        const prefix = match[1];
        const num = match[2];
        const paddedNum = num.length === 1 ? `0${num}` : num;
        return `${prefix}-${paddedNum}`;
    }
    return normalized;
}

async function bulkUpdate() {
    try {
        console.log("Starting bulk update...");

        // 1. Update 'users'
        console.log("\nUpdating 'users' collection...");
        const usersSnapshot = await getDocs(collection(db, "users"));
        console.log(`Processing ${usersSnapshot.size} users.`);
        for (const userDoc of usersSnapshot.docs) {
            const data = userDoc.data();
            const originalClass = data.currentClass || data.classSection;
            if (originalClass) {
                const standardizedClass = formatClassID(originalClass);
                if (standardizedClass !== originalClass) {
                    await updateDoc(userDoc.ref, {
                        currentClass: standardizedClass,
                        classSection: standardizedClass
                    });
                    console.log(`User ${userDoc.id}: ${originalClass} -> ${standardizedClass}`);
                }
            }
        }

        // 2. Update 'students_master'
        console.log("\nUpdating 'students_master' collection...");
        const smSnapshot = await getDocs(collection(db, "students_master"));
        console.log(`Processing ${smSnapshot.size} master student records.`);
        
        // Use batches for master records if there are many
        let count = 0;
        for (const smDoc of smSnapshot.docs) {
            const data = smDoc.data();
            const originalClass = data.classSection || data.currentClass;
            if (originalClass) {
                const standardizedClass = formatClassID(originalClass);
                if (standardizedClass !== originalClass) {
                    await updateDoc(smDoc.ref, {
                        classSection: standardizedClass,
                        currentClass: standardizedClass
                    });
                    count++;
                }
            }
        }
        console.log(`Updated ${count} master records.`);

        console.log("\nBulk update complete!");
        process.exit(0);
    } catch (error) {
        console.error("Bulk update failed:", error);
        process.exit(1);
    }
}

bulkUpdate();
