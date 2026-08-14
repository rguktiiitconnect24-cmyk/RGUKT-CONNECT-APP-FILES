import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

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

async function verifySync() {
    try {
        console.log("Fetching all documents from 'timetable' collection...");
        const querySnapshot = await getDocs(collection(db, "timetable"));
        console.log(`Total documents found: ${querySnapshot.size}`);
        
        querySnapshot.forEach((doc) => {
            console.log(`ID: ${doc.id}`);
            // Briefly check Monday schedule
            if (doc.data().Monday) {
                console.log(`  Monday count: ${doc.data().Monday.length}`);
            }
        });
        process.exit(0);
    } catch (error) {
        console.error("Error fetching documents:", error);
        process.exit(1);
    }
}

verifySync();
