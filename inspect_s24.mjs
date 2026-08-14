import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";

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

async function inspect() {
    const q = query(collection(db, 'students_master'));
    const snapshot = await getDocs(q);
    let count = 0;
    snapshot.forEach(doc => {
        if (doc.id.startsWith("S24")) {
            const data = doc.data();
            if (data.classSection) {
                console.log(doc.id, data.classSection);
                count++;
            }
        }
    });
    console.log("Total S24 students with classSection:", count);
    process.exit(0);
}
inspect();
