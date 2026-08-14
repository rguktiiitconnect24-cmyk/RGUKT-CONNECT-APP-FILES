const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, setDoc } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: 'AIzaSyBx2D31HmZ2mQ2ZztvHoLArXoNSQ1e7wCo',
    authDomain: 'iiit-connect-d4b88.firebaseapp.com',
    projectId: 'iiit-connect-d4b88'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function restore() {
    const defaultData = {
        "Monday": ["-", "-", "-", "-", "-", "-", "-"],
        "Tuesday": ["-", "-", "-", "-", "-", "-", "-"],
        "Wednesday": ["-", "-", "-", "-", "-", "-", "-"],
        "Thursday": ["-", "-", "-", "-", "-", "-", "-"],
        "Friday": ["-", "-", "-", "-", "-", "-", "-"],
        "Saturday": ["-", "-", "-", "-", "-", "-", "-"],
    };

    const classes = [
        "SECTION-A(CIVIL)",
        "SECTION-A(CSE)",
        "SECTION-A(ECE)",
        "SECTION-B(CIVIL)",
        "SECTION-B(CSE)",
        "SECTION-B(ECE)",
        "SECTION-C(ECE)",
        "SECTION-D(ECE)",
        "SECTION-C(CSE)",
        "SECTION-D(CSE)"
    ];

    for (const cls of classes) {
        console.log("Restoring", cls);
        await setDoc(doc(db, 'timetable', cls), defaultData);
    }
    console.log("Restored successfully!");
}

restore().catch(console.error).then(() => process.exit(0));
