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

async function repairRoles() {
    console.log("Starting role repair...");
    const s = await getDocs(collection(db, 'users'));
    let count = 0;
    for (const d of s.docs) {
        const data = d.data();
        if (!data.role) {
            console.log(`Fixing user ${d.id} (${data.fullName}): Setting role to 'student'`);
            await updateDoc(d.ref, { role: 'student' });
            count++;
        }
    }
    console.log(`Repair complete. Fixed ${count} users.`);
    process.exit(0);
}

repairRoles();
