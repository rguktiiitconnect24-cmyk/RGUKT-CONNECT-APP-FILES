-- Supabase PostgreSQL Schema Migration
-- Generated from Firestore schema discovery

CREATE TABLE IF NOT EXISTS public."academic_modules" (
    "id" TEXT PRIMARY KEY,
    "createdAt" TEXT,
    "handwrittenNotesUrl" TEXT,
    "label" TEXT,
    "pdfUrl" TEXT,
    "unitId" TEXT,
    "videoUrl" TEXT,
    "_metadata_migrated_at" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public."academic_units" (
    "id" TEXT PRIMARY KEY,
    "additionalNotes" JSONB,
    "createdAt" TEXT,
    "label" TEXT,
    "pdfUrl" TEXT,
    "subjectId" TEXT,
    "videoUrl" TEXT,
    "_metadata_migrated_at" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public."announcements" (
    "id" TEXT PRIMARY KEY,
    "content" TEXT,
    "date" BIGINT,
    "firebaseId" TEXT,
    "inner_id" BIGINT,
    "title" TEXT,
    "_metadata_migrated_at" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public."app_config" (
    "id" TEXT PRIMARY KEY,
    "apkUrl" TEXT,
    "isMandatory" BOOLEAN,
    "latestVersionCode" BIGINT,
    "latestVersionName" TEXT,
    "updateMessage" TEXT,
    "updateTitle" TEXT,
    "updatedAt" TIMESTAMPTZ,
    "_metadata_migrated_at" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public."app_health" (
    "id" TEXT PRIMARY KEY,
    "appVersion" TEXT,
    "authError" BOOLEAN,
    "branch" TEXT,
    "campus" TEXT,
    "crashDetected" BOOLEAN,
    "crashLogs" TEXT,
    "device" TEXT,
    "email" TEXT,
    "fcmToken" TEXT,
    "firebaseConnectionError" BOOLEAN,
    "incompleteProfile" BOOLEAN,
    "inner_id" TEXT,
    "isConnected" BOOLEAN,
    "lastSeen" TIMESTAMPTZ,
    "name" TEXT,
    "networkType" TEXT,
    "platform" TEXT,
    "rollNo" TEXT,
    "syncDelay" BIGINT,
    "timetableSyncError" BOOLEAN,
    "_metadata_migrated_at" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public."attendance" (
    "id" TEXT PRIMARY KEY,
    "branch" TEXT,
    "date" TEXT,
    "facultyId" TEXT,
    "name" TEXT,
    "rollNo" TEXT,
    "section" TEXT,
    "status" TEXT,
    "studentId" TEXT,
    "subjectId" TEXT,
    "timestamp" TIMESTAMPTZ,
    "year" TEXT,
    "_metadata_migrated_at" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public."attendance_rates" (
    "id" TEXT PRIMARY KEY,
    "campus" TEXT,
    "className" TEXT,
    "consolidated" TEXT,
    "gender" TEXT,
    "group" TEXT,
    "name" TEXT,
    "studentId" TEXT,
    "totalConducted" BIGINT,
    "totalPresent" BIGINT,
    "updatedAt" TIMESTAMPTZ,
    "_metadata_migrated_at" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public."bookorders" (
    "id" TEXT PRIMARY KEY,
    "author" TEXT,
    "bookTitle" TEXT,
    "createdAt" TIMESTAMPTZ,
    "email" TEXT,
    "notes" TEXT,
    "quantity" BIGINT,
    "status" TEXT,
    "studentId" TEXT,
    "studentName" TEXT,
    "_metadata_migrated_at" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public."cgpa_records" (
    "id" TEXT PRIMARY KEY,
    "batch" TEXT,
    "cgpa" TEXT,
    "sgpa" TEXT,
    "subjects" JSONB,
    "yearSem" TEXT,
    "_metadata_migrated_at" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public."courses" (
    "id" TEXT PRIMARY KEY,
    "program" TEXT,
    "semester" TEXT,
    "subjects" JSONB,
    "_metadata_migrated_at" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public."deletion_requests" (
    "id" TEXT PRIMARY KEY,
    "comments" TEXT,
    "createdAt" TIMESTAMPTZ,
    "progressStep" BIGINT,
    "reason" TEXT,
    "resolvedAt" TIMESTAMPTZ,
    "resolvedBy" TEXT,
    "status" TEXT,
    "studentEmail" TEXT,
    "studentId" TEXT,
    "studentName" TEXT,
    "uid" TEXT,
    "_metadata_migrated_at" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public."faculties" (
    "id" TEXT PRIMARY KEY,
    "accountStatus" TEXT,
    "assignedCourse" TEXT,
    "assignedSemester" TEXT,
    "assignedSubject" TEXT,
    "createdAt" TEXT,
    "department" TEXT,
    "designation" TEXT,
    "dob" TEXT,
    "email" TEXT,
    "employeeType" TEXT,
    "experience" TEXT,
    "facultyId" TEXT,
    "forcePasswordChange" BOOLEAN,
    "fullName" TEXT,
    "gender" TEXT,
    "mobile" TEXT,
    "password" TEXT,
    "permissions" JSONB,
    "qualification" TEXT,
    "username" TEXT,
    "usernameCustomized" BOOLEAN,
    "_metadata_migrated_at" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public."feedbacks" (
    "id" TEXT PRIMARY KEY,
    "createdAt" TIMESTAMPTZ,
    "feedback" TEXT,
    "rating" BIGINT,
    "read" BOOLEAN,
    "studentEmail" TEXT,
    "studentId" TEXT,
    "studentName" TEXT,
    "_metadata_migrated_at" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public."notice_interactions" (
    "id" TEXT PRIMARY KEY,
    "bookmarked" BOOLEAN,
    "isRead" BOOLEAN,
    "noticeId" TEXT,
    "readAt" TIMESTAMPTZ,
    "userId" TEXT,
    "_metadata_migrated_at" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public."pdfs" (
    "id" TEXT PRIMARY KEY,
    "backendUrl" TEXT,
    "branch" TEXT,
    "downloadUrl" TEXT,
    "downloads" BIGINT,
    "embedUrl" TEXT,
    "fileName" TEXT,
    "gdFileId" TEXT,
    "mimeType" TEXT,
    "moduleName" TEXT,
    "program" TEXT,
    "publicViewUrl" TEXT,
    "semester" TEXT,
    "size" BIGINT,
    "status" TEXT,
    "subject" TEXT,
    "type" TEXT,
    "unit" TEXT,
    "uploadedDate" TIMESTAMPTZ,
    "views" BIGINT,
    "year" TEXT,
    "_metadata_migrated_at" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public."resources" (
    "id" TEXT PRIMARY KEY,
    "category" TEXT,
    "filePath" TEXT,
    "firebaseId" TEXT,
    "inner_id" BIGINT,
    "semester" TEXT,
    "timestamp" BIGINT,
    "title" TEXT,
    "unit" TEXT,
    "year" TEXT,
    "_metadata_migrated_at" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public."settings" (
    "id" TEXT PRIMARY KEY,
    "data" JSONB,
    "holidayDate" TEXT,
    "isVisible" BOOLEAN,
    "reason" TEXT,
    "schedules" JSONB,
    "timeline" JSONB,
    "updatedAt" BIGINT,
    "_metadata_migrated_at" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public."students_master" (
    "id" TEXT PRIMARY KEY,
    "branch" TEXT,
    "branchUpdatedAt" TEXT,
    "caste" TEXT,
    "cgpa" TEXT,
    "classSection" TEXT,
    "createdAt" TEXT,
    "currentClass" TEXT,
    "department" TEXT,
    "email" TEXT,
    "gender" TEXT,
    "inner_id" TEXT,
    "name" TEXT,
    "role" TEXT,
    "updatedAt" TEXT,
    "_metadata_migrated_at" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public."timetables" (
    "id" TEXT PRIMARY KEY,
    "_metadata_migrated_at" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public."update_history" (
    "id" TEXT PRIMARY KEY,
    "apk_url" TEXT,
    "app_version" TEXT,
    "force_update" BOOLEAN,
    "latest_version" BIGINT,
    "publishedBy" TEXT,
    "timestamp" TIMESTAMPTZ,
    "update_message" TEXT,
    "_metadata_migrated_at" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public."users" (
    "id" TEXT PRIMARY KEY,
    "address" TEXT,
    "adminId" TEXT,
    "avatar" TEXT,
    "bio" TEXT,
    "biometricAuth" BOOLEAN,
    "branch" TEXT,
    "campus" TEXT,
    "caste" TEXT,
    "cgpa" NUMERIC,
    "city" TEXT,
    "country" TEXT,
    "createdAt" TEXT,
    "createdBy" TEXT,
    "currentClass" TEXT,
    "department" TEXT,
    "designation" TEXT,
    "dob" TEXT,
    "edgeLightingColor" TEXT,
    "email" TEXT,
    "emailNotifs" BOOLEAN,
    "favoriteSemesters" JSONB,
    "fcmPlatform" TEXT,
    "fcmToken" TEXT,
    "fullName" TEXT,
    "gender" TEXT,
    "interests" TEXT,
    "language" TEXT,
    "lastLogin" TEXT,
    "loadingProfile" BOOLEAN,
    "loginPin" TEXT,
    "mailSent" BOOLEAN,
    "mobileNumber" TEXT,
    "password" TEXT,
    "permissions" JSONB,
    "phone" TEXT,
    "pin" TEXT,
    "pinGuardSettings" JSONB,
    "pincode" TEXT,
    "profession" TEXT,
    "profileCompleted" BOOLEAN,
    "rcId" TEXT,
    "role" TEXT,
    "room" TEXT,
    "securityAlerts" BOOLEAN,
    "state" TEXT,
    "status" TEXT,
    "studentId" TEXT,
    "targetDepartments" JSONB,
    "timezone" TEXT,
    "tokenUpdatedAt" TIMESTAMPTZ,
    "uid" TEXT,
    "updatedAt" TEXT,
    "username" TEXT,
    "_metadata_migrated_at" TIMESTAMPTZ DEFAULT NOW()
);

