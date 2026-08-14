const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs } = require("firebase/firestore");

const firebaseConfig = {
    apiKey: "dummy",
    authDomain: "dummy",
    projectId: "rgukt-connect-85bd4",
    storageBucket: "rgukt-connect-85bd4.appspot.com",
    messagingSenderId: "dummy",
    appId: "dummy"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
    const qs = await getDocs(collection(db, "questions"));
    console.log("Questions count:", qs.size);
    qs.forEach(doc => console.log(doc.id, "=>", doc.data().quizId, doc.data().questionText));

    const ms = await getDocs(collection(db, "academic_modules"));
    console.log("Modules count:", ms.size);
    ms.forEach(doc => console.log(doc.id, "=>", doc.data().unitId, doc.data().label));

    const us = await getDocs(collection(db, "academic_units"));
    console.log("Units count:", us.size);
    us.forEach(doc => console.log(doc.id, "=>", doc.data().subjectId, doc.data().label));
}

run();
