/**
 * Google Apps Script for PDF Upload System - CHE Department
 * 
 * Deployment Instructions:
 * 1. Go to script.google.com and create a new project.
 * 2. Paste this code.
 * 3. Click Deploy -> New Deployment.
 * 4. Type: Web App
 * 5. Execute as: Me
 * 6. Who has access: Anyone
 * 7. Copy the Web App URL and update it in your React application (src/config/driveBackends.js) for 'che'.
 */

// Root Folder Name
const ROOT_FOLDER_NAME = "Student PDFs";

// Handle POST requests
function doPost(e) {
  try {
    // 1. Check Payload
    if (!e || !e.postData || !e.postData.contents) {
      return createJsonResponse({ status: "error", message: "No data received." });
    }

    let payload;
    try {
      payload = JSON.parse(e.postData.contents);
    } catch(err) {
      return createJsonResponse({ status: "error", message: "Invalid JSON payload." });
    }
    
    const action = payload.action || 'upload'; // default to upload for backward compatibility
    
    if (action === 'upload') {
      return handleUpload(payload);
    } else if (action === 'delete') {
      return handleDelete(payload);
    } else if (action === 'replace') {
      return handleReplace(payload);
    } else if (action === 'download') {
      return handleDownload(payload);
    } else {
      return createJsonResponse({ status: "error", message: "Unknown action: " + action });
    }
    
  } catch (error) {
    return createJsonResponse({ status: "error", message: error.toString() });
  }
}

function handleUpload(payload) {
  const base64Data = payload.fileBase64;
  const fileName = payload.fileName;
  const branch = payload.branch || 'Unknown';
  const year = payload.year || 'Unknown';
  const semester = payload.semester || 'Unknown';
  const subject = payload.subject || 'Unknown';
  
  if (!base64Data || !fileName) {
    return createJsonResponse({ status: "error", message: "Missing required fields for upload." });
  }

  // Strict Validation for CHE Department
  if (branch.toLowerCase() !== 'che') {
    return createJsonResponse({ status: "error", message: "Unauthorized section. This backend is strictly reserved for Chemical Engineering (CHE)." });
  }
  
  // 2. Decode Base64
  const data = Utilities.base64Decode(base64Data);
  const blob = Utilities.newBlob(data, payload.mimeType || "application/pdf", fileName);
  
  // 3. Create or Get Folder Hierarchy
  const targetFolder = getOrCreateFolderHierarchy([ROOT_FOLDER_NAME, branch, year, semester, subject]);
  
  // 4. Create File in Folder
  const file = targetFolder.createFile(blob);
  
  // 5. Set Permissions to Anyone with link can view
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  
  // 6. Return response
  return createJsonResponse({
    status: "success",
    fileId: file.getId(),
    fileName: file.getName(),
    fileUrl: file.getUrl(), // public view URL
    embedUrl: generateEmbedUrl(file.getId()),
    downloadUrl: generateDownloadUrl(file.getId()),
    size: file.getSize(),
    mimeType: file.getMimeType(),
    uploadedAt: new Date().toISOString()
  });
}

function handleDelete(payload) {
  const gdFileId = payload.gdFileId;
  if (!gdFileId) {
    return createJsonResponse({ status: "error", message: "Missing gdFileId for delete." });
  }
  
  try {
    const file = DriveApp.getFileById(gdFileId);
    file.setTrashed(true);
    return createJsonResponse({ status: "success", message: "File deleted successfully." });
  } catch(err) {
    return createJsonResponse({ status: "error", message: "Failed to delete file: " + err.toString() });
  }
}

function handleReplace(payload) {
  const gdFileId = payload.gdFileId;
  const base64Data = payload.fileBase64;
  const fileName = payload.fileName;
  
  if (!gdFileId || !base64Data || !fileName) {
    return createJsonResponse({ status: "error", message: "Missing required fields for replace." });
  }
  
  try {
    // We create a new file and trash the old one, because updating file content via DriveApp 
    // requires Advanced Drive Service. Creating a new one is cleaner.
    const oldFile = DriveApp.getFileById(gdFileId);
    const parentFolders = oldFile.getParents();
    let targetFolder = DriveApp.getRootFolder();
    if (parentFolders.hasNext()) {
      targetFolder = parentFolders.next();
    }
    
    // Create new file
    const data = Utilities.base64Decode(base64Data);
    const blob = Utilities.newBlob(data, payload.mimeType || "application/pdf", fileName);
    const newFile = targetFolder.createFile(blob);
    newFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    // Trash old file
    oldFile.setTrashed(true);
    
    return createJsonResponse({
      status: "success",
      fileId: newFile.getId(),
      fileName: newFile.getName(),
      fileUrl: newFile.getUrl(),
      embedUrl: generateEmbedUrl(newFile.getId()),
      downloadUrl: generateDownloadUrl(newFile.getId()),
      size: newFile.getSize(),
      mimeType: newFile.getMimeType(),
      uploadedAt: new Date().toISOString()
    });
  } catch(err) {
    return createJsonResponse({ status: "error", message: "Failed to replace file: " + err.toString() });
  }
}

function handleDownload(payload) {
  const gdFileId = payload.gdFileId;
  if (!gdFileId) {
    return createJsonResponse({ status: "error", message: "Missing gdFileId for download." });
  }
  
  try {
    const file = DriveApp.getFileById(gdFileId);
    const blob = file.getBlob();
    const base64Data = Utilities.base64Encode(blob.getBytes());
    
    return createJsonResponse({
      status: "success",
      fileName: file.getName(),
      mimeType: file.getMimeType(),
      base64: base64Data
    });
  } catch(err) {
    return createJsonResponse({ status: "error", message: "Failed to download file: " + err.toString() });
  }
}

function generateEmbedUrl(fileId) {
  return "https://drive.google.com/file/d/" + fileId + "/preview";
}

function generateDownloadUrl(fileId) {
  return "https://drive.google.com/uc?export=download&id=" + fileId;
}

// Handle GET requests
function doGet(e) {
  return createJsonResponse({ status: "success", message: "PDF API is active. Use POST for operations." });
}

// Helper to return JSON responses
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// Helper to navigate or create nested folders
function getOrCreateFolderHierarchy(folderNames) {
  let parentFolder = DriveApp.getRootFolder();
  
  for (let i = 0; i < folderNames.length; i++) {
    let folderName = folderNames[i];
    let folders = parentFolder.getFoldersByName(folderName);
    
    if (folders.hasNext()) {
      parentFolder = folders.next();
    } else {
      parentFolder = parentFolder.createFolder(folderName);
    }
  }
  
  return parentFolder;
}
