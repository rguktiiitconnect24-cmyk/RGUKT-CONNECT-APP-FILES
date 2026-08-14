import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const contentConfig = {
    apiKey: "AIzaSyDo6b9-klI1cu_3PRnEvh8vp-_ch4ApQMQ",
    authDomain: "rc-content-35e33.firebaseapp.com",
    projectId: "rc-content-35e33",
    storageBucket: "rc-content-35e33.firebasestorage.app",
    messagingSenderId: "871234526994",
    appId: "1:871234526994:web:dbfcb2784c149007fc9dcb",
};

const app = initializeApp(contentConfig);
const db = getFirestore(app);

async function run() {
    console.log("Fetching all questions...");
    const snapshot = await getDocs(collection(db, 'questions'));
    console.log(`Found ${snapshot.docs.length} questions.`);
    snapshot.docs.forEach(doc => {
        console.log(`DocID: ${doc.id} | QuizID: ${doc.data().quizId} | Q: ${doc.data().questionText}`);
    });
    
    console.log("\nFetching all units...");
    const unitSnapshot = await getDocs(collection(db, 'academic_units'));
    console.log(`Found ${unitSnapshot.docs.length} dynamic units.`);
    unitSnapshot.docs.forEach(doc => {
        console.log(`UnitID: ${doc.id} | Label: ${doc.data().label}`);
    });
    
    console.log("\nFetching all modules...");
    const modSnapshot = await getDocs(collection(db, 'academic_modules'));
    console.log(`Found ${modSnapshot.docs.length} dynamic modules.`);
    modSnapshot.docs.forEach(doc => {
        console.log(`ModuleID: ${doc.id} | Label: ${doc.data().label}`);
    });
    
    process.exit(0);
}

run().catch(console.error);
