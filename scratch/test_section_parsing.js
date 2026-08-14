const testCases = [
    { branch: 'ECE', cls: 'E2-ECE-A', expected: 'A' },
    { branch: 'ECE', cls: 'ECE A', expected: 'A' },
    { branch: 'ECE', cls: 'ECE-A', expected: 'A' },
    { branch: 'CE', cls: 'E3 CE-B', expected: 'B' },
    { branch: 'CSE(AI&ML)', cls: 'AIML', expected: 'AIML' },
    { branch: 'PUC', cls: 'F-04', expected: 'F04' },
    { branch: 'ME', cls: 'P2 ME C', expected: 'C' },
    { branch: 'MME', cls: 'SECTION D (MME)', expected: 'D' },
    { branch: 'CHE', cls: 'E1-CHE-A', expected: 'A' },
];

testCases.forEach(({ branch, cls, expected }) => {
    let rawBranch = branch.toUpperCase();
    let branchUpper = rawBranch;
    
    if (/CSE\(AI&ML\)|CSC\s*\(AI&ML\)|AIML/i.test(rawBranch)) branchUpper = 'CSE(AI&ML)';
    else if (/ECE|E\.C\.E|^ELECTRONICS/i.test(rawBranch)) branchUpper = 'ECE';
    else if (/CSE|C\.S\.E|^COMPUTER/i.test(rawBranch)) branchUpper = 'CSE';
    else if (/\bCE\b|C\.E|^CIVIL/i.test(rawBranch)) branchUpper = 'CE';
    else if (/\bME\b|M\.E|^MECH/i.test(rawBranch)) branchUpper = 'ME';
    else if (/MME|^METALLURGY/i.test(rawBranch)) branchUpper = 'MME';
    else if (/CHE|C\.H\.E|^CHEM/i.test(rawBranch)) branchUpper = 'CHE';
    else if (/EEE|E\.E\.E/i.test(rawBranch)) branchUpper = 'EEE';

    let section = cls;
    let cleanSection = section.toUpperCase();
    cleanSection = cleanSection.replace(/SECTION\s*[-_]?\s*/i, '');
    cleanSection = cleanSection.replace(/\b(E[1-4]|P(UC)?[- ]?[1-2])\b/gi, '');

    if (branchUpper && branchUpper !== 'CSE(AI&ML)') {
        const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        cleanSection = cleanSection.replace(new RegExp(escapeRegExp(branchUpper), 'ig'), '');
    }
    
    cleanSection = cleanSection.replace(/[^A-Z0-9]/ig, '').trim();

    if (['CSE(AI&ML)', 'CSC (AI&ML)', 'AIML'].includes(cleanSection.toUpperCase())) {
        cleanSection = 'AIML';
    }

    console.log(`Testing Class: '${cls}', Branch: '${branch}'`);
    console.log(`  -> Cleaned Section: '${cleanSection}', Expected: '${expected}'`);
    console.log(`  -> Status: ${cleanSection === expected ? '✅ PASS' : '❌ FAIL'}\n`);
});
