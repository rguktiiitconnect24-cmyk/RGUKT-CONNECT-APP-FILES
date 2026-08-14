const notices = [
    { targetAudience: { targetAll: false, departments: ['CE'], classes: [], roles: [] } }
];

const testUser = { branch: '', currentClass: '', role: 'student' };

const eligibleNotices = [];
notices.forEach(notice => {
    const target = notice.targetAudience;
    if (!target) { eligibleNotices.push(notice); return; }

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

            const userShortBranch = getShortBranch(testUser.branch || testUser.department);
            
            const roleMatch = hasRoleFilter ? target.roles.includes(testUser.role) : true;
            const deptMatch = hasDeptFilter ? target.departments.includes(userShortBranch) : true;
            const classMatch = hasClassFilter ? target.classes.includes(testUser.currentClass) : true;

            isEligible = roleMatch && deptMatch && classMatch;
        }
    }
    if (isEligible) eligibleNotices.push(notice);
});
console.log("Empty user eligible:", eligibleNotices.length > 0);
