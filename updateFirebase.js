import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";

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

const defaultTimeline = [
    { start: '08:30', end: '09:30', label: 'P1', type: 'period', index: 0 },
    { start: '09:30', end: '10:30', label: 'P2', type: 'period', index: 1 },
    { start: '10:30', end: '10:40', label: 'Short Break', type: 'break' },
    { start: '10:40', end: '11:40', label: 'P3', type: 'period', index: 2 },
    { start: '11:40', end: '12:40', label: 'P4', type: 'period', index: 3 },
    { start: '12:40', end: '13:40', label: 'Lunch Break', type: 'break' },
    { start: '13:40', end: '14:40', label: 'P5', type: 'period', index: 4 },
    { start: '14:40', end: '15:40', label: 'P6', type: 'period', index: 5 },
    { start: '15:40', end: '16:40', label: 'P7', type: 'period', index: 6 }
];

async function run() {
    try {
        const settingsRef = doc(db, "settings", "timetable");
        await setDoc(settingsRef, { timeline: defaultTimeline }, { merge: true });
        console.log("Firebase timetable settings updated successfully!");
    } catch (e) {
        console.error("Error:", e);
    }
    process.exit(0);
}

run();
