import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyBx2D31HmZ2mQ2ZztvHoLArXoNSQ1e7wCo",
    authDomain: "iiit-connect-d4b88.firebaseapp.com",
    projectId: "iiit-connect-d4b88",
    storageBucket: "iiit-connect-d4b88.firebasestorage.app",
    messagingSenderId: "2907414387",
    appId: "1:2907414387:web:0dbaac12825292c7f52f06",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const examData = {
    isVisible: true,
    title: 'Examinations Schedule',
    subtitle: 'P2- Sem2 Regular (2024-Batch) • April 2026',
    exams: [
        { date: '16-04-2026', day: 'Thursday', code: '23PMA2201', subject: 'Mathematics-IV', credits: '5', time: '09:30 AM - 12:30 PM' },
        { date: '18-04-2026', day: 'Saturday', code: '23PTE2201', subject: 'Telugu - IV', credits: '3', time: '09:30 AM - 12:30 PM' },
        { date: '21-04-2026', day: 'Tuesday', code: '23PCY2201', subject: 'Chemistry - IV', credits: '4', time: '09:30 AM - 12:30 PM' },
        { date: '23-04-2026', day: 'Thursday', code: '23PPY2201', subject: 'Physics-IV', credits: '4', time: '09:30 AM - 12:30 PM' },
        { date: '25-04-2026', day: 'Saturday', code: '23PEG2201', subject: 'English-IV', credits: '4', time: '09:30 AM - 12:30 PM' },
        { date: '28-04-2026', day: 'Tuesday', code: '23PIT2201', subject: 'Python Programming Language', credits: '2', time: '09:30 AM - 12:30 PM' },
        { date: '30-04-2026', day: 'Thursday', code: '23PBE2201', subject: 'Biology-IV', credits: '3', time: '09:30 AM - 12:30 PM' },
    ]
};

async function syncExams() {
    try {
        console.log("Uploading exam schedule to Firebase...");
        await setDoc(doc(db, 'settings', 'exam_schedule'), examData);
        console.log("SUCCESS: Exam schedule uploaded to Firebase.");
        process.exit(0);
    } catch (error) {
        console.error("FAILED to upload exam schedule:", error);
        process.exit(1);
    }
}

syncExams();
