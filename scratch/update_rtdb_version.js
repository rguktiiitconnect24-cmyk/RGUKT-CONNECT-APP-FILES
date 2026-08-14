import { initializeApp } from "firebase/app";
import { getDatabase, ref, update } from "firebase/database";

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

async function updateRemoteVersion() {
    try {
        await update(ref(db, 'app_update'), {
            latest_version_code: 2,
            latest_version_name: '2.0.0',
            update_message: 'Performance improvements and bug fixes.',
            force_update: false
        });
        console.log("Successfully updated RTDB latest_version_code to 2");
    } catch (error) {
        console.error("Error updating RTDB:", error);
    }
    process.exit(0);
}

updateRemoteVersion();
