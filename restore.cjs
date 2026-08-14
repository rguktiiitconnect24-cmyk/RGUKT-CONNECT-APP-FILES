const fs = require('fs');

const missingLogic = `            if (cached) {
                setHolidayStatus(JSON.parse(cached));
                return;
            }
            try {
                // 1. Manual check from Firebase (Priority Override)
                const docSnap = await getDoc(doc(db, "settings", "timetable_status"));
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    if (data.holidayDate === todayStr) {
                        setHolidayStatus(data);
                        sessionStorage.setItem(cacheKey, JSON.stringify(data));
                        return;
                    }
                }

                // 2. Automatic check from Google Calendar
                const googleHoliday = await holidayService.getTodayHoliday();
                if (googleHoliday) {
                    const autoStatus = {
                        holidayDate: todayStr,
                        reason: googleHoliday.summary,
                        isAuto: true
                    };
                    setHolidayStatus(autoStatus);
                    sessionStorage.setItem(cacheKey, JSON.stringify(autoStatus));
                }
            } catch (error) {
                console.error("Error fetching holiday status:", error);
            }
        };

        fetchSchedule();
        fetchHolidayStatus();
    }, [user?.currentClass, user?.studentId]);

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDay = new Date().toLocaleDateString('en-US', { weekday: 'long' });

    // Sync to Widget Effect
    React.useEffect(() => {
        if (schedule && schedule !== 'NOT_FOUND' && Capacitor.isNativePlatform()) {
            const daySchedule = schedule[currentDay] || [];
            if (daySchedule.length > 0) {
                // Find current or next class based on time
                const now = new Date();
                const curHour = now.getHours();
                const curMin = now.getMinutes();
                const totalMin = curHour * 60 + curMin;

                // Time slots map to minutes from 00:00
                const slotsMin = [
                    { start: 510, end: 570, label: '08:30 AM - 09:30 AM' },
                    { start: 570, end: 630, label: '09:30 AM - 10:30 AM' },
                    { start: 640, end: 700, label: '10:40 AM - 11:40 AM' },
                    { start: 700, end: 760, label: '11:40 AM - 12:40 PM' },
                    { start: 820, end: 880, label: '01:40 PM - 02:40 PM' },
                    { start: 880, end: 940, label: '02:40 PM - 03:40 PM' },
                    { start: 950, end: 1010, label: '03:50 PM - 04:50 PM' }
                ];

                let currentIdx = slotsMin.findIndex(s => totalMin >= s.start && totalMin < s.end);
                let currentTopic = currentIdx !== -1 ? daySchedule[currentIdx] : 'No ongoing class';
                let currentTime = currentIdx !== -1 ? slotsMin[currentIdx].label : '---';
                
                // Find next
                let nextIdx = slotsMin.findIndex(s => totalMin < s.start);
                let nextTopic = nextIdx !== -1 ? daySchedule[nextIdx] : 'Finished for today';
                if (nextTopic !== 'Finished for today' && nextIdx !== -1) {
                    nextTopic = \`\${daySchedule[nextIdx]} @ \${slotsMin[nextIdx].label.split(' - ')[0]}\`;
                }

                syncScheduleToWidget({
                    topic: currentTopic === '-' || currentTopic === 'Free' ? 'Free Period' : currentTopic,
                    time: currentTime,
                    next: nextTopic === '-' || nextTopic === 'Free' ? 'Free Period' : nextTopic
                });
            }
        }
    }, [schedule, currentDay]);

    // Subject type detection
    const getSubjectClass = (subject) => {
        if (!subject || subject === 'Free' || subject === '-') return 'empty';
        if (subject.toLowerCase().includes('lunch')) return 'lunch';
        let hash = 0;
        for (let i = 0; i < subject.length; i++) {
            hash = subject.charCodeAt(i) + ((hash << 5) - hash);
        }
        const colors = ['purple', 'green', 'orange', 'blue', 'red', 'teal'];
        const color = colors[Math.abs(hash) % colors.length];
        return \`color-\${color}\`;
    };

    const timeSlots = [
        '08:30 AM - 09:30 AM',
        '09:30 AM - 10:30 AM',
        '10:40 AM - 11:40 AM',
        '11:40 AM - 12:40 PM',
        '01:40 PM - 02:40 PM',
        '02:40 PM - 03:40 PM',
        '03:50 PM - 04:50 PM'
    ];

    const handleDownloadPDF = async () => {
        console.log("TimeTable: handleDownloadPDF triggered");
        const filename = \`Timetable_\${user?.currentClass || 'Class'}.pdf\`;

        await startDownload(filename, async () => {
            console.log("TimeTable: downloadFn callback started");
            // Convert Logo to PNG
            const pngLogo = await svgToPng(LOGO_DATA_URI);
            // Generate Native Vector PDF
            const doc = await pdfService.generateTimetablePdf(schedule, user, pngLogo);
            
            if (Capacitor.isNativePlatform()) {
                const pdfBase64 = doc.output('datauristring').split(',')[1];
                await nativeFileService.savePdfToDownloads(filename, pdfBase64);
            } else {
                doc.save(filename);
            }
        });
    };

    const handleShareElementAsPDF = async (type) => {
        if (!Capacitor.isNativePlatform()) {
            return handleDownloadPDF();
        }

        const cls = user?.currentClass || 'Class';
        const filename = \`Timetable_\${cls.replace(/\\s+/g, '_')}.pdf\`;

        await startShare(filename, async () => {
            // Convert Logo to PNG
            const pngLogo = await svgToPng(LOGO_DATA_URI);
            // Generate Native Vector PDF
            const doc = await pdfService.generateTimetablePdf(schedule, user, pngLogo);
            const pdfBase64 = doc.output('datauristring').split(',')[1];

            const fileResult = await Filesystem.writeFile({
                path: filename,
                data: pdfBase64,
                directory: Directory.Cache
            });

            await CapacitorShare.share({
                title: 'Official Class Timetable',
                text: \`Sharing Timetable of \${user?.fullName || 'Student'}\`,
                url: fileResult.uri,
            });
        });
    };

    const handleShareLink = () => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(window.location.href);
            alert("App link copied to clipboard!");
        }
        setShowShareModal(false);
    };

    const handleShareWhatsApp = () => {
        const text = encodeURIComponent(\`Check out my Official Class Timetable on RGUKT Connect: \${window.location.href}\`);
        window.open(\`https://wa.me/?text=\${text}\`, '_blank');
        setShowShareModal(false);
    };

    const handleShareActionPdf = () => {
        setShowShareModal(false);
        handleShareElementAsPDF('timetable');
    };

    if (isLoading) return <LoadingTransition message="Time Table Loading" persistent />;

    return (
        <div className="timetable-page max-width-wrapper">
             
             <TimetableDashboardHeader 
                user={user} 
                currentDay={currentDay} 
                schedule={schedule} 
                onShare={() => setShowShareModal(true)}
                onDownload={handleDownloadPDF}
                onShowCalendar={() => setShowGoogleCalendar(true)}
             />

            <ShareModal 
                isOpen={showShareModal}
                onClose={() => setShowShareModal(false)}
                onShareLink={handleShareLink}
                onSharePdf={handleShareActionPdf}
                onShareWhatsApp={handleShareWhatsApp}
            />

            {!user?.currentClass && !schedule && (
                <div className="alert alert-warning">
                    <AlertCircle size={18} className="alert-icon" />
                    <p>
                        <strong>No Class Selected:</strong>`;

const content = fs.readFileSync('src/pages/TimeTable.jsx', 'utf8');
const lines = content.split('\n');

// 1. Remove duplicate imports (lines 1 to 16)
let fixed = lines.slice(16).join('\n');

// 2. Insert missing logic
const targetToReplace = `            if (cached) {
                setHolidayStatus(JSON.parse(cached));
                return;
            }
                    <p>
                        <strong>No Class Selected:</strong>`;
                        
fixed = fixed.replace(targetToReplace, missingLogic);

fs.writeFileSync('src/pages/TimeTable.jsx', fixed);
console.log('Fixed TimeTable.jsx successfully');
