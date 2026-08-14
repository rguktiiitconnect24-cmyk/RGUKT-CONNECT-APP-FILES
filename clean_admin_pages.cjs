const fs = require('fs');
const path = require('path');

const pagesDir = 'c:/Users/bilij/Documents/projects/iiit/admin-panel/src/pages';

const toDelete = [
    'Dashboard',
    'Faculty',
    'NoticeBoard',
    'AccountInactive.css',
    'AccountInactive.jsx',
    'AttendanceDetail.css',
    'AttendanceDetail.jsx',
    'AttendanceList.css',
    'AttendanceList.jsx',
    'ComplaintDetail.css',
    'ComplaintDetail.jsx',
    'ComplaintHistory.css',
    'ComplaintHistory.jsx',
    'Complaints-mobile.css',
    'Complaints.css',
    'Complaints.jsx',
    'CourseCard.css',
    'CourseCard.jsx',
    'Courses.jsx',
    'CoursesDesign.css',
    'CourseSemesters.jsx',
    'CourseSubjects.css',
    'CourseSubjects.jsx',
    'SubjectUnits.css',
    'SubjectUnits.jsx',
    'UnitContent.css',
    'UnitContent.jsx',
    'ModuleContent.jsx',
    'Exams.css',
    'Exams.jsx',
    'TimeTable.css',
    'TimeTable.jsx',
    'Register.css',
    'Register.jsx'
];

toDelete.forEach(item => {
    const itemPath = path.join(pagesDir, item);
    if (fs.existsSync(itemPath)) {
        if (fs.lstatSync(itemPath).isDirectory()) {
            fs.rmSync(itemPath, { recursive: true, force: true });
        } else {
            fs.unlinkSync(itemPath);
        }
    }
});

console.log('Cleaned up admin-panel pages');
