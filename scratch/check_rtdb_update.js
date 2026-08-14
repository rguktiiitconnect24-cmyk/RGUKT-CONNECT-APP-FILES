import { initializeApp } from "firebase/app";
import { getDatabase, ref, get } from "firebase/database";

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
const db = getDatabase(app);

async function checkUpdate() {
    try {
        const snapshot = await get(ref(db, 'app_update'));
        if (snapshot.exists()) {
            console.log("Current app_update in RTDB:", snapshot.val());
        } else {
            console.log("app_update does not exist in RTDB");
        }
    } catch (error) {
        console.error("Error fetching app_update:", error);
    }
    process.exit(0);
}

checkUpdate();
