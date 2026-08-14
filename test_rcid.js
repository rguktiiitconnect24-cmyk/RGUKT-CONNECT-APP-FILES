const generateRGUKTConnectID = (studentId) => {
    let yearPart = '';
    let randomPart = '';

    if (studentId) {
        // Extract digits from the student ID (e.g., R240456 -> 240456)
        const digits = studentId.replace(/\D/g, '');
        if (digits.length >= 2) {
            // Take the first 2 digits as the year (e.g., 24)
            yearPart = digits.substring(0, 2);
        }
    }

    if (yearPart) {
        // Append 4 random digits to make it a total of 6 digits after RC
        randomPart = Math.floor(1000 + Math.random() * 9000).toString();
    } else {
        // Fallback
        yearPart = '';
        randomPart = Math.floor(100000 + Math.random() * 900000).toString();
    }

    return `RC${yearPart}${randomPart}`;
};

console.log("Current ID for R240456:", generateRGUKTConnectID("R240456"));
console.log("Current ID for 240456:", generateRGUKTConnectID("240456"));
console.log("Current ID for R260123:", generateRGUKTConnectID("R260123"));
console.log("New User (no ID):", generateRGUKTConnectID(""));
