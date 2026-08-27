const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./functions/serviceAccountKey.json'); // assuming this exists, if not I will use a different way

try {
  initializeApp({
    credential: cert(serviceAccount)
  });
} catch(e) {}

const db = getFirestore();

async function check() {
  const snap = await db.collection('students_master').get();
  let cseB = [];
  snap.forEach(doc => {
    const data = doc.data();
    const str = JSON.stringify(data).toUpperCase();
    if (str.includes('CSE') && (str.includes('B') || str.includes('SECTION B') || str.includes('SECTIONB'))) {
        cseB.push(data);
    }
  });
  console.log("Total matched string-wise:", cseB.length);
  // Let's print out a few that might fail the roll number test (not 24)
  const repeaters = cseB.filter(s => {
      const id = (s.id || s.studentId || s.rollNo || '').toUpperCase();
      return !id.includes('24');
  });
  console.log("Not 24 batch:", repeaters.map(s => s.id || s.rollNo));
}

check().catch(console.error);
