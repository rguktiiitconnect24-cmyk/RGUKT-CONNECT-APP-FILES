import { collection, doc, addDoc, getDoc, getDocs, updateDoc, deleteDoc, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../config/firebase';

const NOTICES_COLLECTION = 'notices';
const INTERACTIONS_COLLECTION = 'notice_interactions';

export const noticeService = {
    // ---------------------------------------------------------
    // Admin / Faculty Operations
    // ---------------------------------------------------------
    
    /**
     * Creates a new notice.
     */
    async createNotice(noticeData, attachments = []) {
        try {
            // 1. Upload attachments first if any
            const uploadedFiles = await this._uploadAttachments(attachments);
            
            const noticePayload = {
                ...noticeData,
                attachments: uploadedFiles,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                publishedAt: noticeData.status === 'published' ? serverTimestamp() : null,
                viewCount: 0,
                readCount: 0
            };

            const docRef = await addDoc(collection(db, NOTICES_COLLECTION), noticePayload);
            return { id: docRef.id, ...noticePayload };
        } catch (error) {
            console.error("Error creating notice:", error);
            throw error;
        }
    },

    /**
     * Updates an existing notice.
     */
    async updateNotice(noticeId, updateData, newAttachments = []) {
        try {
            let uploadedFiles = [];
            if (newAttachments.length > 0) {
                uploadedFiles = await this._uploadAttachments(newAttachments);
            }

            const noticeRef = doc(db, NOTICES_COLLECTION, noticeId);
            const payload = {
                ...updateData,
                updatedAt: serverTimestamp()
            };

            // If we have new attachments, merge them or replace them depending on logic.
            // For simplicity, assuming updateData.attachments contains the old ones being kept.
            if (uploadedFiles.length > 0) {
                payload.attachments = [...(updateData.attachments || []), ...uploadedFiles];
            }

            await updateDoc(noticeRef, payload);
            return { id: noticeId, ...payload };
        } catch (error) {
            console.error("Error updating notice:", error);
            throw error;
        }
    },

    /**
     * Deletes a notice and its attachments.
     */
    async deleteNotice(noticeId, attachments = []) {
        try {
            // Delete attachments from storage
            for (const file of attachments) {
                if (file.storagePath) {
                    const fileRef = ref(storage, file.storagePath);
                    await deleteObject(fileRef).catch(e => console.warn("Could not delete file:", e));
                }
            }

            // Delete the document
            await deleteDoc(doc(db, NOTICES_COLLECTION, noticeId));
            
            // Note: Should ideally delete all interactions for this notice via a Cloud Function
        } catch (error) {
            console.error("Error deleting notice:", error);
            throw error;
        }
    },

    /**
     * Fetches all notices (for Admin dashboard).
     */
    async getAllNotices() {
        try {
            const q = query(collection(db, NOTICES_COLLECTION), orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("Error fetching all notices:", error);
            return [];
        }
    },

    // ---------------------------------------------------------
    // Student Operations
    // ---------------------------------------------------------

    /**
     * Fetches eligible notices for a specific student based on their profile.
     */
    async getEligibleNotices(user) {
        if (!user) return [];
        
        try {
            // In a real production app with massive scale, this logic might run on a Cloud Function.
            // Here, we fetch published, non-expired notices and filter client-side for complex array matching.
            
            const now = new Date();
            const noticesRef = collection(db, NOTICES_COLLECTION);
            
            // Query: We fetch by createdAt to avoid needing a composite index.
            // We will filter status === 'published' client-side.
            const q = query(
                noticesRef, 
                orderBy('createdAt', 'desc')
            );
            
            const snapshot = await getDocs(q);
            let eligibleNotices = [];

            snapshot.forEach(docSnap => {
                const notice = { id: docSnap.id, ...docSnap.data() };
                
                if (notice.status !== 'published') return;

                // Check Expiry
                if (notice.expiryDate) {
                    const expiry = notice.expiryDate.toDate ? notice.expiryDate.toDate() : new Date(notice.expiryDate);
                    if (expiry < now) return; // Expired
                }

                // Check Target Audience Eligibility
                const target = notice.targetAudience;
                if (!target) {
                    eligibleNotices.push(notice); // If no target defined, assume global
                    return;
                }

                let isEligible = false;

                if (target.targetAll) {
                    isEligible = true;
                } else {
                    const hasRoleFilter = target.roles && target.roles.length > 0;
                    const hasDeptFilter = target.departments && target.departments.length > 0;
                    const hasClassFilter = target.classes && target.classes.length > 0;

                    if (hasRoleFilter || hasDeptFilter || hasClassFilter) {
                        const getShortBranch = (branchStr) => {
                            if (!branchStr) return '';
                            const b = branchStr.toUpperCase();
                            if (/CSE\(AI&ML\)|CSC \(AI&ML\)|AIML/i.test(b)) return 'CSE(AI&ML)';
                            if (/ECE|E\.C\.E|ELECTRONICS/i.test(b)) return 'ECE';
                            if (/CSE|C\.S\.E|COMPUTER/i.test(b)) return 'CSE';
                            if (/CIVIL|CE|C\.E/i.test(b)) return 'CE';
                            if (/MECH|M\.E|ME/i.test(b)) return 'ME';
                            if (/MME|METALLURGY/i.test(b)) return 'MME';
                            if (/CHEM|CHE|C\.H\.E/i.test(b)) return 'CHE';
                            if (/EEE|E\.E\.E/i.test(b)) return 'EEE';
                            return branchStr;
                        };

                        const userShortBranch = getShortBranch(user.branch || user.department);

                        const roleMatch = hasRoleFilter ? target.roles.includes(user.role) : true;
                        const deptMatch = hasDeptFilter ? target.departments.includes(userShortBranch) : true;
                        
                        // Check classes using exact match
                        // Treat 'AIML' and 'CSE(AI&ML)' as synonymous for classes
                        const classMatch = hasClassFilter ? target.classes.some(tc => {
                            const c1 = tc.toUpperCase();
                            const c2 = (user.currentClass || '').toUpperCase();
                            if ((c1 === 'AIML' || c1 === 'CSE(AI&ML)') && (c2 === 'AIML' || c2 === 'CSE(AI&ML)')) return true;
                            return c1 === c2;
                        }) : true;

                        isEligible = roleMatch && deptMatch && classMatch;
                    }
                }

                if (isEligible) {
                    eligibleNotices.push(notice);
                }
            });

            return eligibleNotices;
        } catch (error) {
            console.error("Error fetching eligible notices:", error);
            return [];
        }
    },

    /**
     * Gets a single notice by ID.
     */
    async getNoticeById(noticeId) {
        try {
            const docRef = doc(db, NOTICES_COLLECTION, noticeId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return { id: docSnap.id, ...docSnap.data() };
            }
            return null;
        } catch (error) {
            console.error("Error fetching notice:", error);
            throw error;
        }
    },

    /**
     * Gets the user's interactions (read receipts, bookmarks) for a list of notices.
     */
    async getUserInteractions(userId) {
        try {
            const q = query(collection(db, INTERACTIONS_COLLECTION), where('userId', '==', userId));
            const snapshot = await getDocs(q);
            const interactions = {};
            snapshot.forEach(doc => {
                const data = doc.data();
                interactions[data.noticeId] = data;
            });
            return interactions; // Returns a map: { noticeId: { isRead, bookmarked } }
        } catch (error) {
            console.error("Error fetching interactions:", error);
            return {};
        }
    },

    /**
     * Marks a notice as read by the user.
     */
    async markAsRead(noticeId, userId) {
        try {
            // We use a composite ID for uniqueness: userId_noticeId
            const interactionId = `${userId}_${noticeId}`;
            const interactionRef = doc(db, INTERACTIONS_COLLECTION, interactionId);
            
            const docSnap = await getDoc(interactionRef);
            
            if (!docSnap.exists()) {
                // Create interaction
                await addDoc(collection(db, INTERACTIONS_COLLECTION), { // Or use setDoc with fixed ID
                    userId,
                    noticeId,
                    isRead: true,
                    readAt: serverTimestamp(),
                    bookmarked: false
                });

                // Increment readCount in the notice document
                // This is a simple approximation. For strict concurrency, use a transaction.
                const noticeRef = doc(db, NOTICES_COLLECTION, noticeId);
                const noticeSnap = await getDoc(noticeRef);
                if (noticeSnap.exists()) {
                    await updateDoc(noticeRef, {
                        readCount: (noticeSnap.data().readCount || 0) + 1
                    });
                }
            } else if (!docSnap.data().isRead) {
                // Update to read
                await updateDoc(interactionRef, {
                    isRead: true,
                    readAt: serverTimestamp()
                });
            }
        } catch (error) {
            console.error("Error marking as read:", error);
        }
    },

    /**
     * Toggles bookmark status.
     */
    async toggleBookmark(noticeId, userId, currentStatus) {
        try {
            const interactionId = `${userId}_${noticeId}`;
            const interactionRef = doc(db, INTERACTIONS_COLLECTION, interactionId);
            
            const docSnap = await getDoc(interactionRef);
            if (!docSnap.exists()) {
                await addDoc(collection(db, INTERACTIONS_COLLECTION), {
                    userId,
                    noticeId,
                    isRead: false,
                    bookmarked: !currentStatus
                });
            } else {
                await updateDoc(interactionRef, {
                    bookmarked: !currentStatus
                });
            }
            return !currentStatus;
        } catch (error) {
            console.error("Error toggling bookmark:", error);
            throw error;
        }
    },

    /**
     * Increments the total view count for a notice.
     */
    async incrementViewCount(noticeId) {
        try {
            const noticeRef = doc(db, NOTICES_COLLECTION, noticeId);
            const noticeSnap = await getDoc(noticeRef);
            if (noticeSnap.exists()) {
                await updateDoc(noticeRef, {
                    viewCount: (noticeSnap.data().viewCount || 0) + 1
                });
            }
        } catch (error) {
            console.error("Error incrementing view count:", error);
        }
    },

    // ---------------------------------------------------------
    // Helper Methods
    // ---------------------------------------------------------

    async _uploadAttachments(files) {
        const uploadedFiles = [];
        for (const fileObj of files) {
            if (fileObj.file) { // It's a new file to upload
                const file = fileObj.file;
                const timestamp = new Date().getTime();
                const storagePath = `notices/${timestamp}_${file.name}`;
                const fileRef = ref(storage, storagePath);
                
                const snapshot = await uploadBytes(fileRef, file);
                const downloadURL = await getDownloadURL(snapshot.ref);
                
                uploadedFiles.push({
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    url: downloadURL,
                    storagePath: storagePath
                });
            } else {
                // It's an existing file, just keep it
                uploadedFiles.push(fileObj);
            }
        }
        return uploadedFiles;
    }
};
