import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, updateDoc, doc, deleteField } from "firebase/firestore";

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

async function clearRcIds() {
    console.log("Starting cleanup of old RGUKT Connect IDs...");
    try {
        const usersRef = collection(db, 'users');
        const snapshot = await getDocs(usersRef);
        console.log(`Found ${snapshot.size} users.`);

        const promises = snapshot.docs.map(userDoc => {
            if (userDoc.data().rcId) {
                console.log(`Clearing rcId for user: ${userDoc.id}`);
                return updateDoc(doc(db, 'users', userDoc.id), {
                    rcId: deleteField()
                });
            }
            return Promise.resolve();
        });

        await Promise.all(promises);
        console.log("SUCCESS: All existing RC IDs cleared. They will be re-generated with the new year-based logic on next login.");
        process.exit(0);
    } catch (error) {
        console.error("FAILED to clear RC IDs:", error);
        process.exit(1);
    }
}

clearRcIds();
