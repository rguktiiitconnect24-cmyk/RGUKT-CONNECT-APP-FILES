import { 
    collection, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    doc, 
    getDocs, 
    getDoc, 
    query, 
    where, 
    orderBy,
    serverTimestamp,
    increment
} from 'firebase/firestore';
import { db } from '../config/firebase';

const COLLECTION_NAME = 'pdfs';

export const pdfService = {
    /**
     * Save PDF metadata to Firestore after a successful Google Drive upload
     */
    async uploadPdfMetadata(pdfData) {
        try {
            const docRef = await addDoc(collection(db, COLLECTION_NAME), {
                ...pdfData,
                uploadedDate: serverTimestamp(),
                downloads: 0,
                views: 0,
                status: 'active'
            });
            return { success: true, id: docRef.id };
        } catch (error) {
            console.error('Error adding document: ', error);
            throw new Error('Failed to save PDF metadata: ' + error.message);
        }
    },

    /**
     * Fetch PDFs with optional filters
     */
    async fetchPdfs(filters = {}) {
        try {
            let q = collection(db, COLLECTION_NAME);
            const queryConstraints = [];

            if (filters.branch) queryConstraints.push(where('branch', '==', filters.branch));
            if (filters.semester) queryConstraints.push(where('semester', '==', filters.semester));
            if (filters.subject) queryConstraints.push(where('subject', '==', filters.subject));
            
            // Note: If combining 'where' and 'orderBy' on different fields, Firestore requires a composite index.
            queryConstraints.push(orderBy('uploadedDate', 'desc'));

            if (queryConstraints.length > 0) {
                q = query(q, ...queryConstraints);
            }

            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error fetching PDFs: ', error);
            throw new Error('Failed to fetch PDFs: ' + error.message);
        }
    },

    /**
     * Get a single PDF by ID
     */
    async getPdfById(id) {
        try {
            const docRef = doc(db, COLLECTION_NAME, id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return { id: docSnap.id, ...docSnap.data() };
            }
            return null;
        } catch (error) {
            console.error('Error fetching PDF: ', error);
            throw new Error('Failed to fetch PDF details: ' + error.message);
        }
    },

    /**
     * Increment download count
     */
    async incrementDownloadCount(id) {
        try {
            const docRef = doc(db, COLLECTION_NAME, id);
            await updateDoc(docRef, {
                downloads: increment(1)
            });
            return true;
        } catch (error) {
            console.error('Error updating download count: ', error);
            return false;
        }
    },
    
    /**
     * Increment view count
     */
    async incrementViewCount(id) {
        try {
            const docRef = doc(db, COLLECTION_NAME, id);
            await updateDoc(docRef, {
                views: increment(1)
            });
            return true;
        } catch (error) {
            console.error('Error updating view count: ', error);
            return false;
        }
    },

    /**
     * Update PDF metadata
     */
    async updatePdfMetadata(id, updateData) {
        try {
            const docRef = doc(db, COLLECTION_NAME, id);
            await updateDoc(docRef, updateData);
            return true;
        } catch (error) {
            console.error('Error updating document: ', error);
            throw new Error('Failed to update PDF metadata: ' + error.message);
        }
    },

    /**
     * Delete PDF metadata
     */
    async deletePdfMetadata(id) {
        try {
            const docRef = doc(db, COLLECTION_NAME, id);
            await deleteDoc(docRef);
            return true;
        } catch (error) {
            console.error('Error deleting document: ', error);
            throw new Error('Failed to delete PDF metadata: ' + error.message);
        }
    },

    /**
     * Generates a native vector PDF for the student profile report.
     * This provides selectable text and perfect quality.
     */
    async generateStudentProfilePdf(formData, user, logoUri, avatarUri) {
        const { jsPDF } = await import('jspdf');
        
        // Create PDF in A4 format
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
            compress: true
        });

        const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
        const margin = 15;
        const contentWidth = pageWidth - (margin * 2);

        // --- BACKGROUND / ACCENTS ---
        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        
        // Header Primary Bar
        doc.setFillColor(30, 58, 138); 
        doc.rect(0, 0, pageWidth, 4, 'F');

        // --- SUBTLE WATERMARK (SAFE) ---
        try {
            doc.setTextColor(245, 247, 250);
            doc.setFontSize(40);
            doc.setFont('helvetica', 'bold');
            if (typeof doc.saveGraphicsState === 'function') {
                doc.saveGraphicsState();
                doc.text('OFFICIAL RECORD', pageWidth / 2, pageHeight / 2, { align: 'center', angle: 45 });
                doc.restoreGraphicsState();
            } else {
                // Fallback for older jsPDF versions
                doc.text('OFFICIAL RECORD', pageWidth / 2, pageHeight / 2, null, 45);
            }
        } catch (e) {
            console.warn('Failed to add watermark to PDF:', e);
        }

        // --- HEADER ---
        let currentY = 15;
        
        // Logo
        if (logoUri) {
            try {
                doc.addImage(logoUri, 'PNG', margin, currentY, 18, 18);
            } catch (e) {
                console.warn('Failed to add logo to PDF:', e);
            }
        }

        // Brand Name & System Info
        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.text('RGUKT CONNECT', margin + 22, currentY + 7);
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 116, 139);
        doc.text('OFFICIAL ACADEMIC RECORD SYSTEM', margin + 22, currentY + 12);

        // Generation Date
        const dateStr = new Date().toLocaleDateString('en-IN', { 
            day: '2-digit', month: 'short', year: 'numeric', 
            hour: '2-digit', minute: '2-digit' 
        });
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text(`Generated: ${dateStr}`, pageWidth - margin, currentY + 7, { align: 'right' });

        currentY += 22;

        // --- TITLE STRIP ---
        doc.setFillColor(30, 58, 138); // Premium Dark Indigo
        doc.roundedRect(margin, currentY, contentWidth, 12, 3, 3, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('STUDENT PROFILE REPORT', pageWidth / 2, currentY + 8, { align: 'center' });

        currentY += 20;

        // --- HERO SECTION ---
        // Profile Photo
        if (avatarUri) {
            try {
                // Draw image directly without border
                doc.addImage(avatarUri, 'JPEG', margin, currentY, 32, 40);
            } catch (e) {
                console.warn('Failed to add avatar to PDF:', e);
            }
        }

        // Student Basic Info
        const infoX = margin + 38;
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(17);
        doc.setFont('helvetica', 'bold');
        doc.text(formData.fullName?.toUpperCase() || 'STUDENT NAME', infoX, currentY + 10);
        
        doc.setFontSize(10);
        doc.setTextColor(71, 85, 105);
        doc.setFont('helvetica', 'bold');
        doc.text(`Student ID: ${formData.studentId || 'N/A'}`, infoX, currentY + 17);
        
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.text(`${formData.department || 'Academic Branch'}`, infoX, currentY + 23);
        doc.text(`RGUKT RK Valley Campus`, infoX, currentY + 28);

        // Status Badge
        doc.setFillColor(220, 252, 231); // green-100
        doc.roundedRect(infoX, currentY + 32, 25, 6, 2, 2, 'F');
        doc.setTextColor(22, 101, 52); // green-800
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text('ACTIVE STUDENT', infoX + 12.5, currentY + 36.2, { align: 'center' });

        currentY += 50;

        // --- INFORMATION CARDS ---
        const drawCard = (title, fields, y, themeColor, bgTheme) => {
            // Section Banner (Smooth Rounded)
            doc.setFillColor(bgTheme[0], bgTheme[1], bgTheme[2]);
            doc.roundedRect(margin, y - 4, contentWidth, 8, 2, 2, 'F');
            
            // Left Accent Bar (Smooth Rounded)
            doc.setFillColor(themeColor[0], themeColor[1], themeColor[2]);
            doc.roundedRect(margin, y - 4, 4, 8, 2, 2, 'F');

            // Card Title
            doc.setTextColor(themeColor[0], themeColor[1], themeColor[2]);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text(title.toUpperCase(), margin + 7, y + 1.5);

            let fieldX = margin + 2;
            let fieldY = y + 12;
            const colWidth = contentWidth / 2;

            // Column Separator
            doc.setDrawColor(241, 245, 249);
            doc.setLineWidth(0.5);
            doc.line(margin + colWidth - 5, y + 8, margin + colWidth - 5, y + (13 * Math.ceil(fields.length / 2)) + 4);

            fields.forEach((field, index) => {
                if (index > 0 && index % 2 === 0) {
                    fieldX = margin + 2;
                    fieldY += 13;
                } else if (index % 2 !== 0) {
                    fieldX = margin + colWidth + 2;
                }

                doc.setFontSize(7.5);
                doc.setTextColor(themeColor[0], themeColor[1], themeColor[2]); // Theme colored labels
                doc.setFont('helvetica', 'bold');
                doc.text(field.label.toUpperCase(), fieldX, fieldY);
                
                doc.setFontSize(9.5);
                doc.setTextColor(15, 23, 42); // Very dark slate for high contrast values
                doc.setFont('helvetica', 'normal');
                doc.text(String(field.value || 'N/A'), fieldX, fieldY + 5);
            });

            return 13 * (Math.ceil(fields.length / 2)) + 14; // Slightly increased height for padding
        };

        // Academic Info Card - Sky Blue Theme
        const admissionYear = formData.studentId?.match(/[a-zA-Z](\d{2})/)?.[1] ? `20${formData.studentId.match(/[a-zA-Z](\d{2})/)[1]}` : '2024';
        
        currentY += drawCard('Academic & Identity Information', [
            { label: 'Full Name', value: formData.fullName },
            { label: 'Student ID', value: formData.studentId },
            { label: 'RC ID', value: formData.rcId },
            { label: 'Branch / Dept', value: formData.department },
            { label: 'Current Class', value: formData.currentClass },
            { label: 'Campus', value: formData.campus },
            { label: 'Admission Year', value: admissionYear },
            { label: 'Course', value: 'B.Tech' }
        ], currentY, [2, 132, 199], [224, 242, 254]);

        currentY += 8;

        // Contact Info Card - Emerald Theme
        currentY += drawCard('Contact & Account Details', [
            { label: 'Phone Number', value: formData.phone ? `+91 ${formData.phone}` : 'N/A' },
            { label: 'Email Address', value: formData.email },
            { label: 'Language', value: formData.language },
            { label: 'Timezone', value: formData.timezone },
            { label: 'User Role', value: user?.role || 'Student' },
            { label: 'Date of Birth', value: user?.dob },
            { label: 'Account Created', value: user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A' },
            { label: 'Last Active', value: new Date().toLocaleDateString() }
        ], currentY, [5, 150, 105], [209, 250, 229]);

        currentY += 8;

        // Bio Section - Purple Theme
        if (formData.bio) {
            doc.setFillColor(243, 232, 255); // purple-100
            doc.roundedRect(margin, currentY - 4, contentWidth, 8, 2, 2, 'F');
            
            doc.setFillColor(147, 51, 234); // purple-600
            doc.roundedRect(margin, currentY - 4, 4, 8, 2, 2, 'F');

            doc.setTextColor(147, 51, 234);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text('STUDENT STATEMENT / BIO', margin + 7, currentY + 1.5);
            
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8.5);
            doc.setTextColor(51, 65, 85);
            const splitBio = doc.splitTextToSize(formData.bio, contentWidth - 4);
            doc.text(splitBio, margin + 2, currentY + 11);
        }

        // --- FOOTER ---
        const footerY = pageHeight - 12;
        doc.setDrawColor(226, 232, 240);
        doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);
        
        doc.setFontSize(6.5);
        doc.setTextColor(148, 163, 184);
        doc.text('RGUKT CONNECT - OFFICIAL DIGITAL STUDENT RECORD', margin, footerY);
        doc.text('Page 01 of 01', pageWidth - margin, footerY, { align: 'right' });
        
        doc.setFontSize(5.5);
        doc.text('This is an electronically generated document. No physical signature required.', pageWidth / 2, footerY + 4, { align: 'center' });

        return doc;
    },

    /**
     * Generate native vector PDF for timetable
     * @param {Object} schedule 
     * @param {Object} user 
     * @param {String} logoDataUri - base64 png
     * @returns {jsPDF} doc
     */
    async generateTimetablePdf(schedule, user, logoDataUri) {
        const { jsPDF } = await import('jspdf');
        
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });

        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        
        // --- BACKGROUND / ACCENTS ---
        try {
            doc.setFillColor(255, 255, 255);
            doc.rect(0, 0, pageWidth, pageHeight, 'F');
            
            // Header Primary Bar
            doc.setFillColor(30, 58, 138); 
            doc.rect(0, 0, pageWidth, 4, 'F');

            // --- SUBTLE WATERMARK (SAFE) ---
            doc.setTextColor(245, 247, 250);
            doc.setFontSize(40);
            doc.setFont('helvetica', 'bold');
            doc.text("RGUKT CONNECT", pageWidth / 2, pageHeight / 2 + 10, {
                align: 'center',
                angle: 30
            });
        } catch (e) {
            console.error("Watermark/Background error", e);
        }
        
        // --- HEADER LOGO ---
        if (logoDataUri && logoDataUri.length > 50) {
            try {
                doc.addImage(logoDataUri, 'PNG', 12, 10, 16, 16);
            } catch(e) { console.error("Logo error", e); }
        }

        // --- BRANDING HEADER ---
        doc.setTextColor(30, 58, 138);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text("RGUKT CONNECT", 32, 18);
        
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text("OFFICIAL ACADEMIC PORTAL", 32, 22.5);

        // --- TITLE ---
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        const className = user?.currentClass || 'Class';
        doc.text(`Official Class Timetable: ${className}`, pageWidth - 14, 18, { align: 'right' });
        
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text("Spring 2026 Academic Semester", pageWidth - 14, 23, { align: 'right' });

        // --- GRID CONFIG ---
        const marginX = 14;
        const startY = 35;
        const rowHeight = 17;
        
        const dayColWidth = 24;
        const lunchColWidth = 12;
        const availableWidth = pageWidth - (marginX * 2);
        const slotWidth = (availableWidth - dayColWidth - lunchColWidth) / 7;
        
        const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        
        const columns = [
            { id: 'day', width: dayColWidth, label: 'DAY' },
            { id: 's0', idx: 0, width: slotWidth, p: 'P1', time: '08:30 - 09:30' },
            { id: 's1', idx: 1, width: slotWidth, p: 'P2', time: '09:30 - 10:30' },
            { id: 's2', idx: 2, width: slotWidth, p: 'P3', time: '10:40 - 11:40' },
            { id: 's3', idx: 3, width: slotWidth, p: 'P4', time: '11:40 - 12:40' },
            { id: 'lunch', width: lunchColWidth, label: 'LUNCH' },
            { id: 's4', idx: 4, width: slotWidth, p: 'P5', time: '01:40 - 02:40' },
            { id: 's5', idx: 5, width: slotWidth, p: 'P6', time: '02:40 - 03:40' },
            { id: 's6', idx: 6, width: slotWidth, p: 'P7', time: '03:50 - 04:50' }
        ];

        // Header Row Background - Premium Dark Indigo
        doc.setFillColor(30, 58, 138); 
        doc.rect(marginX, startY, availableWidth, rowHeight, 'F');
        
        let headerX = marginX;
        columns.forEach((col) => {
            doc.setTextColor(255, 255, 255);
            if (col.id === 'day' || col.id === 'lunch') {
                doc.setFontSize(8);
                doc.setFont('helvetica', 'bold');
                doc.text(col.label, headerX + (col.width/2), startY + (rowHeight/2), { align: 'center', baseline: 'middle' });
            } else {
                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                doc.text(col.p, headerX + (col.width/2), startY + (rowHeight/2) - 2.5, { align: 'center', baseline: 'middle' });
                
                doc.setFontSize(6.5);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(191, 219, 254); // blue-200 for subtle time text
                doc.text(col.time, headerX + (col.width/2), startY + (rowHeight/2) + 3.5, { align: 'center', baseline: 'middle' });
            }
            headerX += col.width;
        });

        // Grid Rows
        doc.setFontSize(7);
        let currentY = startY + rowHeight;
        const lunchStart = marginX + dayColWidth + (slotWidth * 4);
        
        days.forEach((day, dIdx) => {
            // Alternating Row Background
            if (dIdx % 2 === 1) {
                doc.setFillColor(248, 250, 252);
                doc.rect(marginX, currentY, availableWidth, rowHeight, 'F');
            }
            
            // Lunch Column Shading - Match UI Amber
            doc.setFillColor(254, 243, 199); // amber-100
            doc.rect(lunchStart, currentY, lunchColWidth, rowHeight, 'F');
            
            // Top border of row
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.3);
            doc.line(marginX, currentY, marginX + availableWidth, currentY);
            
            // Leftmost vertical line
            doc.line(marginX, currentY, marginX, currentY + rowHeight);
            
            // Vertical line after DAY
            doc.line(marginX + dayColWidth, currentY, marginX + dayColWidth, currentY + rowHeight);
            
            // Day Label
            doc.setTextColor(15, 23, 42);
            doc.setFont('helvetica', 'bold');
            doc.text(day.toUpperCase(), marginX + (dayColWidth/2), currentY + (rowHeight/2), { align: 'center', baseline: 'middle' });
            
            // Subject cells rendering logic
            const daySchedule = schedule?.[day] || [];
            
            const renderBlocks = (startIdx, endIdx, offsetX) => {
                const blocks = [];
                for (let i = startIdx; i < endIdx; i++) {
                    if (daySchedule[i] === '\u200B') continue;
                    let colSpan = 1;
                    while (i + colSpan < endIdx && daySchedule[i + colSpan] === '\u200B') {
                        colSpan++;
                    }
                    blocks.push({ idx: i, colSpan, subject: daySchedule[i] });
                }
                
                blocks.forEach(block => {
                    const localIdx = block.idx >= 4 ? block.idx - 4 : block.idx;
                    const startX = offsetX + (localIdx * slotWidth);
                    const blockWidth = slotWidth * block.colSpan;
                    
                    let subject = block.subject || "-";
                    const isSubject = subject !== "-" && subject !== "Free";
                    
                    if (isSubject) {
                        let hash = 0;
                        for (let i = 0; i < subject.length; i++) {
                            hash = subject.charCodeAt(i) + ((hash << 5) - hash);
                        }
                        // Stronger, punchier colors (200 bg, 900 text, 400 border)
                        const colors = [
                            { bg: [233, 213, 255], text: [88, 28, 135], border: [192, 132, 252] }, // purple
                            { bg: [187, 247, 208], text: [20, 83, 45], border: [74, 222, 128] },  // green
                            { bg: [254, 215, 170], text: [124, 45, 18], border: [251, 146, 60] },  // orange
                            { bg: [191, 219, 254], text: [30, 58, 138], border: [96, 165, 250] },  // blue
                            { bg: [254, 202, 202], text: [127, 29, 29], border: [248, 113, 113] },  // red
                            { bg: [153, 246, 228], text: [19, 78, 74], border: [45, 212, 191] }    // teal
                        ];
                        const colorScheme = colors[Math.abs(hash) % colors.length];
                        
                        const padX = 2.5;
                        const padY = 2.5;
                        doc.setFillColor(colorScheme.bg[0], colorScheme.bg[1], colorScheme.bg[2]);
                        doc.setDrawColor(colorScheme.border[0], colorScheme.border[1], colorScheme.border[2]);
                        doc.setLineWidth(0.4);
                        doc.roundedRect(startX + padX, currentY + padY, blockWidth - (padX * 2), rowHeight - (padY * 2), 2, 2, 'FD');
                        
                        doc.setTextColor(colorScheme.text[0], colorScheme.text[1], colorScheme.text[2]);
                        doc.setFont('helvetica', 'bold');
                        
                        const maxChars = 18 + ((block.colSpan - 1) * 15);
                        if (subject.length > maxChars) {
                            subject = subject.substring(0, maxChars - 3) + "...";
                        }
                        doc.text(subject, startX + (blockWidth/2), currentY + (rowHeight/2), { align: 'center', baseline: 'middle' });
                    }
                    
                    // Draw vertical border at the end of this block
                    doc.setDrawColor(226, 232, 240);
                    doc.setLineWidth(0.3);
                    const endX = startX + blockWidth;
                    doc.line(endX, currentY, endX, currentY + rowHeight);
                });
            };
            
            // Render P1 to P4
            renderBlocks(0, 4, marginX + dayColWidth);
            
            // Draw vertical line after Lunch
            doc.line(lunchStart + lunchColWidth, currentY, lunchStart + lunchColWidth, currentY + rowHeight);
            
            // Render P5 to P7
            renderBlocks(4, 7, lunchStart + lunchColWidth);
            
            currentY += rowHeight;
        });

        // Bottom Grid Line
        doc.setDrawColor(226, 232, 240);
        doc.line(marginX, currentY, marginX + availableWidth, currentY);

        // Fix: Draw LUNCH text properly rotated 90 degrees with precise coordinate placement
        try {
            const totalGridHeight = rowHeight * days.length;
            const lunchCenterY = startY + rowHeight + (totalGridHeight / 2);
            const lunchCenterX = lunchStart + (lunchColWidth / 2);
            
            doc.setTextColor(180, 83, 9); // amber-700
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            
            if (typeof doc.saveGraphicsState === 'function') {
                // Precise coordinate offset to rotate around bottom-left anchor perfectly into center
                doc.text("LUNCH", lunchCenterX + 1.5, lunchCenterY + 6.5, { angle: 90 });
            } else {
                doc.text("LUNCH", lunchCenterX, lunchCenterY, { align: 'center' });
            }
        } catch(e) { console.error(e); }

        // --- FOOTER ---
        const footerY = pageHeight - 12;
        doc.setDrawColor(226, 232, 240);
        doc.line(marginX, footerY - 4, pageWidth - marginX, footerY - 4);
        
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(6);
        doc.setFont('helvetica', 'normal');
        
        doc.text("Generated by RGUKT Connect Digital Ecosystem", marginX, footerY + 2);
        
        const timestamp = new Date().toLocaleString();
        doc.text(`Generated on: ${timestamp}`, pageWidth - marginX, footerY + 2, { align: 'right' });
        
        doc.text('This is a system-generated document and does not require a physical signature.', pageWidth / 2, footerY + 2, { align: 'center' });

        return doc;
    },

    /**
     * Generates a native vector PDF for the Academic Report (CGPA).
     */
    async generateAcademicReportPdf(cgpaRecord, user, logoUri, avatarUri) {
        const { jsPDF } = await import('jspdf');
        const autoTableModule = await import('jspdf-autotable');
        const autoTable = autoTableModule.default ? autoTableModule.default : autoTableModule;

        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
            compress: true
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 15;
        const contentWidth = pageWidth - (margin * 2);

        const getGradePoints = (grade) => {
            const g = (grade || '').toUpperCase();
            if (g === 'EX') return 10;
            if (g === 'A') return 9;
            if (g === 'B') return 8;
            if (g === 'C') return 7;
            if (g === 'D') return 6;
            if (g === 'E') return 5;
            return 0;
        };

        const drawHeaderAndFooter = (pageNumber, totalPages) => {
            doc.setFillColor(255, 255, 255);
            doc.rect(0, 0, pageWidth, pageHeight, 'F');
            
            doc.setFillColor(30, 58, 138); 
            doc.rect(0, 0, pageWidth, 4, 'F');

            try {
                doc.setTextColor(245, 247, 250);
                doc.setFontSize(40);
                doc.setFont('helvetica', 'bold');
                if (typeof doc.saveGraphicsState === 'function') {
                    doc.saveGraphicsState();
                    doc.text('OFFICIAL RECORD', pageWidth / 2, pageHeight / 2, { align: 'center', angle: 45 });
                    doc.restoreGraphicsState();
                } else {
                    doc.text('OFFICIAL RECORD', pageWidth / 2, pageHeight / 2, null, 45);
                }
            } catch (e) {
                console.warn('Failed to add watermark to PDF (page 2+):', e);
            }

            let currentY = 15;
            
            if (logoUri) {
                try { 
                    doc.addImage(logoUri, 'PNG', margin, currentY, 18, 18); 
                } catch (e) {
                    console.warn('Failed to add logo to PDF (page 2+):', e);
                }
            }

            doc.setTextColor(30, 41, 59);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(18);
            doc.text('RGUKT CONNECT', margin + 22, currentY + 7);
            
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(100, 116, 139);
            doc.text('OFFICIAL ACADEMIC RECORD SYSTEM', margin + 22, currentY + 12);

            const dateStr = new Date().toLocaleDateString('en-IN', { 
                day: '2-digit', month: 'short', year: 'numeric', 
                hour: '2-digit', minute: '2-digit' 
            });
            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            doc.text(`Generated: ${dateStr}`, pageWidth - margin, currentY + 7, { align: 'right' });

            currentY += 22;

            const footerY = pageHeight - 15;
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.3);
            doc.line(margin, footerY, pageWidth - margin, footerY);
            
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(148, 163, 184);
            doc.text('This is an electronically generated academic report. No physical signature required.', pageWidth / 2, footerY + 5, { align: 'center' });
            
            if (totalPages) {
                doc.text(`Page ${pageNumber} of ${totalPages}`, pageWidth - margin, footerY + 5, { align: 'right' });
            }
            
            return currentY;
        };

        const drawStudentInfo = (currentY, avatarUri, user, cgpaRecord, semCgpa, semSgpa, isFirstPage) => {
            doc.setFillColor(241, 245, 249);
            doc.rect(margin, currentY, contentWidth, 12, 'F');
            doc.setTextColor(30, 58, 138);
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('ACADEMIC PERFORMANCE REPORT', pageWidth / 2, currentY + 8, { align: 'center' });

            currentY += 20;

            let photoWidth = 32;
            let photoHeight = 40;
            let photoX = pageWidth - margin - photoWidth;
            let photoY = currentY;
            
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.3);
            doc.rect(photoX, photoY, photoWidth, photoHeight, 'D');
            
            const photoSource = avatarUri || user?.photoURL;
            if (photoSource) {
                try { 
                    const format = photoSource.startsWith('data:image/png') ? 'PNG' : 'JPEG';
                    doc.addImage(photoSource, format, photoX + 0.5, photoY + 0.5, photoWidth - 1, photoHeight - 1); 
                } catch (e) {
                    console.error("Failed to add avatar to PDF", e);
                }
            }

            doc.setFontSize(14);
            doc.setTextColor(15, 23, 42);
            doc.setFont('helvetica', 'bold');
            doc.text(user?.fullName?.toUpperCase() || 'STUDENT NAME', margin, currentY + 8);

            doc.setFontSize(10);
            doc.setTextColor(71, 85, 105);
            doc.setFont('helvetica', 'bold');
            doc.text(`Student ID: ${user?.studentId || cgpaRecord.studentId || 'N/A'}`, margin, currentY + 16);
            
            doc.setFont('helvetica', 'normal');
            doc.text(`Cumulative GPA: `, margin, currentY + 24);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(30, 58, 138);
            doc.text(`${semCgpa || cgpaRecord.cgpa || '0.00'}`, margin + 35, currentY + 24);

            doc.setFont('helvetica', 'normal');
            doc.setTextColor(71, 85, 105);
            doc.text(`Semester SGPA: `, margin, currentY + 32);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(30, 58, 138);
            doc.text(`${semSgpa || cgpaRecord.sgpa || '0.00'}`, margin + 33, currentY + 32);

            return currentY + 60;
        };

        let currentGroup = 'PUC-1 (Sem-1)';
        const groupedSubjects = { 
            'PUC-1 (Sem-1)': [], 
            'PUC-1 (Sem-2)': [], 
            'PUC-2 (Sem-1)': [], 
            'PUC-2 (Sem-2)': [] 
        };
        
        if (cgpaRecord.subjects) {
            cgpaRecord.subjects.forEach(s => {
                if (s.semester) {
                    if (s.semester === 'P1S1') currentGroup = 'PUC-1 (Sem-1)';
                    else if (s.semester === 'P1S2') currentGroup = 'PUC-1 (Sem-2)';
                    else if (s.semester === 'P2S1') currentGroup = 'PUC-2 (Sem-1)';
                    else if (s.semester === 'P2S2') currentGroup = 'PUC-2 (Sem-2)';
                } else {
                    const name = (s.subject || '').toUpperCase().trim();
                    const match = name.match(/-(I|II|III|IV)$/);
                    if (match) {
                        const numeral = match[1];
                        if (numeral === 'I') currentGroup = 'PUC-1 (Sem-1)';
                        else if (numeral === 'II') currentGroup = 'PUC-1 (Sem-2)';
                        else if (numeral === 'III') currentGroup = 'PUC-2 (Sem-1)';
                        else if (numeral === 'IV') currentGroup = 'PUC-2 (Sem-2)';
                    }
                }
                groupedSubjects[currentGroup].push(s);
            });
        }

        const validGroups = ['PUC-1 (Sem-1)', 'PUC-1 (Sem-2)', 'PUC-2 (Sem-1)', 'PUC-2 (Sem-2)'].filter(g => groupedSubjects[g].length > 0);
        
        if (validGroups.length === 0) {
            let currentY = drawHeaderAndFooter(1, 1);
            drawStudentInfo(currentY, avatarUri, user, cgpaRecord, cgpaRecord.cgpa, cgpaRecord.sgpa, true);
            return doc;
        }

        let cumulativeCredits = 0;
        let cumulativePoints = 0;

        validGroups.forEach((groupName, index) => {
            if (index > 0) {
                doc.addPage();
            }

            const groupSubjects = groupedSubjects[groupName];
            
            const firstSubject = groupSubjects[0];
            const semSgpa = firstSubject && firstSubject.sgpa ? parseFloat(firstSubject.sgpa).toFixed(2) : '0.00';
            const semCgpa = firstSubject && firstSubject.cgpa ? parseFloat(firstSubject.cgpa).toFixed(2) : '0.00';

            let currentY = drawHeaderAndFooter(index + 1, validGroups.length);
            currentY = drawStudentInfo(currentY, avatarUri, user, cgpaRecord, semCgpa, semSgpa, index === 0);

            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(30, 58, 138);
            doc.text(`${groupName} Subjects`, margin, currentY);
            currentY += 4;

            const tableData = groupSubjects.map((s, i) => [
                (i + 1).toString(),
                s.subject || '-',
                s.credits || '-',
                s.internal || '-',
                s.grade || '-',
                s.grp || '-',
                s.status || '-'
            ]);

            autoTable(doc, {
                startY: currentY,
                head: [['#', 'Subject Name', 'Credits', 'Internal', 'Grade', 'CGPA', 'Status']],
                body: tableData,
                theme: 'grid',
                headStyles: {
                    fillColor: [30, 58, 138],
                    textColor: 255,
                    fontStyle: 'bold',
                    fontSize: 9
                },
                bodyStyles: {
                    fontSize: 8,
                    textColor: [71, 85, 105]
                },
                alternateRowStyles: {
                    fillColor: [248, 250, 252]
                },
                columnStyles: {
                    0: { cellWidth: 10 },
                    2: { cellWidth: 15, halign: 'center' },
                    3: { cellWidth: 18, halign: 'center' },
                    4: { cellWidth: 15, halign: 'center' },
                    5: { cellWidth: 15, halign: 'center' },
                    6: { cellWidth: 18, halign: 'center' }
                },
                margin: { left: margin, right: margin }
            });

            const finalY = doc.lastAutoTable.finalY;
            
            // Calculate total credits for display
            let totalSemCredits = 0;
            groupSubjects.forEach(s => {
                totalSemCredits += parseInt(s.credits) || 0;
            });

            // Draw a professional summary row attached to the table
            doc.setFillColor(248, 250, 252); // slate-50
            doc.setDrawColor(226, 232, 240); // slate-200
            doc.rect(margin, finalY, contentWidth, 8, 'FD');
            
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(51, 65, 85); // slate-700
            
            doc.text(`Total Credits: ${totalSemCredits}`, margin + 5, finalY + 5.5);
            doc.text(`Semester SGPA: ${semSgpa}`, pageWidth / 2, finalY + 5.5, { align: 'center' });
            doc.text(`Cumulative CGPA: ${semCgpa}`, pageWidth - margin - 5, finalY + 5.5, { align: 'right' });
        });

        return doc;
    }

};
