const { onCall, HttpsError } = require("firebase-functions/v2/https");

const admin = require("firebase-admin");

admin.initializeApp();

exports.deleteAdminUser = onCall(async (request) => {
    // 1. Verify the caller is authenticated
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "You must be logged in to perform this action.");
    }

    const callerUid = request.auth.uid;
    const targetUid = request.data.uid;

    if (!targetUid) {
        throw new HttpsError("invalid-argument", "The function must be called with a valid 'uid'.");
    }

    if (callerUid === targetUid) {
        throw new HttpsError("invalid-argument", "You cannot delete your own account through this function.");
    }

    // 2. Verify the caller is an admin
    try {
        const callerDoc = await admin.firestore().collection("users").doc(callerUid).get();
        if (!callerDoc.exists || callerDoc.data().role !== "admin") {
            throw new HttpsError("permission-denied", "Only administrators can delete accounts.");
        }
    } catch (error) {
        console.error("Error verifying caller role:", error);
        throw new HttpsError("internal", "Error verifying permissions.");
    }

    // 3. Delete the target user from Authentication
    try {
        await admin.auth().deleteUser(targetUid);
        console.log(`Successfully deleted user auth record for UID: ${targetUid}`);
        
        // Note: The client handles deleting the Firestore document.
        // We only handle Authentication deletion here for security.
        return { success: true, message: `Successfully deleted user ${targetUid}` };
    } catch (error) {
        console.error("Error deleting user from Firebase Auth:", error);
        throw new HttpsError("internal", "Failed to delete the user's Authentication record.");
    }
});


exports.sendManualNotification = onCall(async (request) => {
    // 1. Verify caller is logged in
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "You must be logged in to perform this action.");
    }

    const { title, body, imageUrl, targetBranch } = request.data;
    if (!title || !body) {
        throw new HttpsError("invalid-argument", "Title and body are required.");
    }

    // 2. Verify the caller is an admin
    try {
        const callerDoc = await admin.firestore().collection("users").doc(request.auth.uid).get();
        if (!callerDoc.exists || callerDoc.data().role !== "admin") {
            throw new HttpsError("permission-denied", "Only administrators can send notifications.");
        }
    } catch (error) {
        throw new HttpsError("internal", "Error verifying permissions.");
    }

    // 3. Fetch target users
    try {
        let query = admin.firestore().collection('users').where('fcmToken', '!=', null);
        
        const usersSnapshot = await query.get();
        let tokens = [];

        usersSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.fcmToken) {
                if (!targetBranch || targetBranch === 'all' || data.branch === targetBranch) {
                    tokens.push(data.fcmToken);
                }
            }
        });

        if (tokens.length === 0) {
            return { success: true, message: "No users found with valid tokens matching criteria." };
        }

        let successCount = 0;
        let failureCount = 0;
        const chunkSize = 500; // FCM limit

        for (let i = 0; i < tokens.length; i += chunkSize) {
            const chunk = tokens.slice(i, i + chunkSize);
            const message = {
                notification: { 
                    title, 
                    body,
                    ...(imageUrl && { imageUrl })
                },
                tokens: chunk
            };
            const response = await admin.messaging().sendEachForMulticast(message);
            successCount += response.successCount;
            failureCount += response.failureCount;
        }

        console.log(`Manual notification sent: ${successCount} successful, ${failureCount} failed.`);
        return { success: true, message: `Notification sent to ${successCount} devices.` };
    } catch (error) {
        console.error("Error sending manual notification:", error);
        throw new HttpsError("internal", "Failed to send notification.");
    }
});
