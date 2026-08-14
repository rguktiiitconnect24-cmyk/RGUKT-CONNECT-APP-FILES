const fs = require('fs');
const path = require('path');

const file = 'c:/Users/bilij/Documents/projects/iiit/admin-panel/src/pages/Admin/CreateAdminAccount.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add imports for initializeApp and deleteApp
if (!content.includes("import { initializeApp, deleteApp }")) {
    content = content.replace(
        "import { createUserWithEmailAndPassword } from 'firebase/auth';",
        "import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth';\nimport { initializeApp, deleteApp } from 'firebase/app';\nimport { firebaseConfig } from '../../config/firebase';"
    );
}

// 2. Modify the creation logic to use a secondary app
const oldTryBlock = `        try {
            // 1. Create auth user
            const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
            const user = userCredential.user;

            // 2. Update profile
            await updateProfile(user, {
                displayName: formData.fullName
            });`;

const newTryBlock = `        try {
            // 1. Initialize Secondary App to prevent logging out the current admin
            const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp" + Date.now());
            const secondaryAuth = getAuth(secondaryApp);

            // 2. Create auth user on secondary app
            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, formData.email, formData.password);
            const user = userCredential.user;

            // 3. Update profile
            await updateProfile(user, {
                displayName: formData.fullName
            });

            // 4. Sign out and delete secondary app
            await secondaryAuth.signOut();
            await deleteApp(secondaryApp);`;

if (content.includes(oldTryBlock)) {
    content = content.replace(oldTryBlock, newTryBlock);
    
    // Also, we need to export firebaseConfig from config/firebase.js if not exported
    fs.writeFileSync(file, content);
    console.log('CreateAdminAccount.jsx updated');
} else {
    console.log('Could not find try block in CreateAdminAccount.jsx');
}
