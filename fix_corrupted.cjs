const fs = require('fs');

let tt = fs.readFileSync('src/pages/TimeTable.jsx', 'utf8');
const brokenTt = tt.substring(tt.indexOf('const toggleSection = (sectionId) => {'), tt.indexOf('if (cls) {'));

const fixedTt = `const toggleSection = (sectionId) => {
        setExpandedSections(prev => 
            prev.includes(sectionId) 
                ? prev.filter(s => s !== sectionId) 
                : [...prev, sectionId]
        );
    };

    React.useEffect(() => {
        const fetchSchedule = async () => {
            let cls = user?.currentClass || '';

            const cacheKey = \`timetable_full_\${cls || user?.studentId || 'unknown'}\`;
            const cached = sessionStorage.getItem(cacheKey);
            if (cached && JSON.parse(cached) !== 'NOT_FOUND') {
                setSchedule(JSON.parse(cached));
                setIsLoading(false);
                return;
            }

            if (!cls && user?.studentId) {
                try {
                    const docSnap = await getDoc(doc(db, "students_master", user.studentId.toUpperCase().replace(/^RGUKT-/i, '')));
                    if (docSnap.exists()) {
                        const raw = docSnap.data();
                        cls = raw.classSection || raw.currentClass || '';
                        if (cls === 'AIML' || cls === 'CSC (AI&ML)') cls = 'CSE(AI&ML)';
                        `;

tt = tt.replace(brokenTt, fixedTt);
fs.writeFileSync('src/pages/TimeTable.jsx', tt);

let dash = fs.readFileSync('src/pages/Dashboard/Dashboard.jsx', 'utf8');
const brokenDash = dash.substring(dash.indexOf('    React.useEffect(() => {\n        const fetchEvents'), dash.indexOf('} catch (e) {\n                    console.error("Proactive dashboard fetch failed:", e);'));

const fixedDash = `    React.useEffect(() => {
        const fetchEvents = () => {
            const saved = localStorage.getItem('student_calendar_events');
            const events = saved ? JSON.parse(saved) : [];
            const todayStr = new Date().toISOString().split('T')[0];
            setTodayEvents(events.filter(e => e.date === todayStr));
        };
        fetchEvents();
        window.addEventListener('storage', fetchEvents);
        return () => window.removeEventListener('storage', fetchEvents);
    }, [user?.uid]);

    React.useEffect(() => {
        const fetchTodaySchedule = async () => {
            if (!user?.uid) return;
            setIsTableLoading(true);
            const cacheKey = \`dashboard_schedule_\${user.uid}_\${currentDay}\`;
            const cached = sessionStorage.getItem(cacheKey);
            if (cached && JSON.parse(cached) !== null && JSON.parse(cached) !== 'NOT_FOUND') {
                setTodaySchedule(JSON.parse(cached));
                setIsTableLoading(false);
                return;
            }

            let cls = user?.currentClass || '';

            if (!cls && user?.studentId) {
                try {
                    const docSnap = await getDoc(doc(db, "students_master", user.studentId.toUpperCase().replace(/^RGUKT-/i, '')));
                    if (docSnap.exists()) {
                        const raw = docSnap.data();
                        cls = raw.classSection || raw.currentClass || '';
                    }
                `;

dash = dash.replace(brokenDash, fixedDash);
fs.writeFileSync('src/pages/Dashboard/Dashboard.jsx', dash);

console.log("Fixed!");
