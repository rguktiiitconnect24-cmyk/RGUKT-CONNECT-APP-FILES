import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "dummy",
    authDomain: "rgukt-connect-85ca3.firebaseapp.com",
    projectId: "rgukt-connect-85ca3",
    storageBucket: "rgukt-connect-85ca3.appspot.com",
    messagingSenderId: "dummy",
    appId: "dummy"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function listTimetables() {
    const snap = await getDocs(collection(db, "timetable"));
    console.log("Timetables:", snap.docs.map(d => d.id));
    process.exit(0);
}
listTimetables();
