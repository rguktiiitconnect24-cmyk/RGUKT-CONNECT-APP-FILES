import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, limit, query } from "firebase/firestore";

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

async function inspectData() {
    try {
        console.log("--- Inspecting 'users' collection ---");
        const usersSnapshot = await getDocs(query(collection(db, "users"), limit(5)));
        usersSnapshot.forEach(doc => {
            const data = doc.data();
            console.log(`User ${doc.id}: class=${data.currentClass || data.classSection}`);
        });

        console.log("\n--- Inspecting 'students_master' collection ---");
        const smSnapshot = await getDocs(query(collection(db, "students_master"), limit(5)));
        smSnapshot.forEach(doc => {
            const data = doc.data();
            console.log(`Student ${doc.id}: class=${data.currentClass || data.classSection}`);
        });

        process.exit(0);
    } catch (error) {
        console.error("Error inspecting data:", error);
        process.exit(1);
    }
}

inspectData();
