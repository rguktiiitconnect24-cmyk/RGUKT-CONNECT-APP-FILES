const fs = require('fs');
let content = fs.readFileSync('src/pages/Profile/Profile.jsx', 'utf8');

const target = `            const requestData = {
                uid: user.uid,
                studentId: user.studentId || user.uid,
                studentName: user.fullName || 'User',
                studentEmail: user.email || '',
                reason: deletionReason,
                comments: deletionComments,
    });`;

const replacement = `            const requestData = {
                uid: user.uid,
                studentId: user.studentId || user.uid,
                studentName: user.fullName || 'User',
                studentEmail: user.email || '',
                reason: deletionReason,
                comments: deletionComments,
                status: 'pending',
                createdAt: serverTimestamp()
            };

            const docRef = await addDoc(collection(complaintsDb, 'deletion_requests'), requestData);
            
            setHasPendingDeletionRequest(true);
            setPendingRequestData({ id: docRef.id, ...requestData });
            setShowDeleteRequestModal(false);
            setShowPendingStatusModal(true);
            showToast('Deletion request submitted successfully.', 'success');
            if (notify) {
                notify('Account Deletion Requested', 'Your account deletion request has been submitted for administrator review.');
            }
        } catch (error) {
            console.error('Error submitting deletion request:', error);
            showToast('Failed to submit request. Please try again.', 'error');
        } finally {
            setIsSubmittingDeletion(false);
        }
    };

    const handleCancelDeletionRequest = async () => {
        setIsSubmittingDeletion(true);
        try {
            let docId = pendingRequestData?.id;
            
            if (!docId) {
                const q = query(
                    collection(complaintsDb, 'deletion_requests'),
                    where('uid', '==', user.uid),
                    where('status', '==', 'pending')
                );
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    docId = querySnapshot.docs[0].id;
                }
            }

            if (!docId) {
                showToast('Could not find the deletion request.', 'error');
                setIsSubmittingDeletion(false);
                return;
            }

            const startStep = pendingRequestData?.progressStep || 1;
            setRestoringState({ isRestoring: true, step: startStep, isComplete: false });

            await deleteDoc(doc(complaintsDb, 'deletion_requests', docId));
            
            const timePerStep = 6000 / startStep;
            for (let i = startStep - 1; i >= 0; i--) {
                await new Promise(resolve => setTimeout(resolve, timePerStep));
                setRestoringState(prev => ({ ...prev, step: i }));
            }
            
            await new Promise(resolve => setTimeout(resolve, 300));
            setRestoringState(prev => ({ ...prev, isComplete: true }));
            
            await new Promise(resolve => setTimeout(resolve, 2000));

            setRestoringState({ isRestoring: false, step: 0, isComplete: false });
            setHasPendingDeletionRequest(false);
            setPendingRequestData(null);
            setShowPendingStatusModal(false);
            showToast('Account successfully restored.', 'success');
            if (notify) {
                notify('Account Restored', 'Your account deletion request has been cancelled.');
            }
        } catch (error) {
            console.error('Error cancelling deletion request:', error);
            showToast('Failed to cancel request. Please try again.', 'error');
            setRestoringState({ isRestoring: false, step: 0, isComplete: false });
        } finally {
            setIsSubmittingDeletion(false);
        }
    };
    
    // Custom Dropdown States
    const [isCampusOpen, setIsCampusOpen] = useState(false);
    const campusRef = useRef(null);

    const campusOptions = [
        'RGUKT Nuzvid',
        'RGUKT RK Valley',
        'RGUKT Srikakulam',
        'RGUKT Ongole'
    ];

    // Password Update States
    const [passwords, setPasswords] = useState({
        current: '',
        new: '',
        confirm: ''
    });`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync('src/pages/Profile/Profile.jsx', content, 'utf8');
    console.log('Fixed Profile.jsx successfully');
} else {
    console.log('Target string not found');
}
