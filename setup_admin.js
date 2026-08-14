import { db } from './src/config/firebase';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';

async function setupAdmin() {
    const adminEmail = 'admin@rguktconnect.ac.in';
    console.log(`Setting up admin for ${adminEmail}...`);

    try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', adminEmail));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.log("Admin user not found in Firestore. Creating entry...");
            // We don't have the UID yet, but we can create it once they login or 
            // the user can just register with this email and we'll fix the role.
            console.log("Please register the user via the UI first, then run this script to elevate to admin.");
        } else {
            const adminDoc = querySnapshot.docs[0];
            await setDoc(doc(db, 'users', adminDoc.id), {
                role: 'admin'
            }, { merge: true });
            console.log("Admin user elevated successfully!");
        }
    } catch (error) {
        console.error("Error setting up admin:", error);
    }
}

// This script is intended to be run in a browser console or similar context where firebase is initialized.
// For now, I'll just provide the instructions to the user.
