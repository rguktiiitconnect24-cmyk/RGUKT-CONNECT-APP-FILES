import { Filesystem, Directory } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { FileOpener } from '@capacitor-community/file-opener';

const { NotificationProgress } = Capacitor.Plugins;

const PDF_CACHE_KEY = 'rgukt_cached_pdfs';
const ACTIVE_DOWNLOADS_KEY = 'rgukt_active_downloads';

// Global background download state managers
const activeDownloads = {};
const downloadListeners = {};
const globalListeners = new Set();

export const getActiveDownload = (pdfId) => {
    return activeDownloads[pdfId] || null;
};

export const subscribeToDownload = (pdfId, callback) => {
    if (!downloadListeners[pdfId]) {
        downloadListeners[pdfId] = new Set();
    }
    downloadListeners[pdfId].add(callback);
    // Send immediate current state
    if (activeDownloads[pdfId]) {
        callback(activeDownloads[pdfId]);
    }
};

export const unsubscribeFromDownload = (pdfId, callback) => {
    if (downloadListeners[pdfId]) {
        downloadListeners[pdfId].delete(callback);
    }
};

const notifySubscribers = (pdfId) => {
    if (downloadListeners[pdfId] && activeDownloads[pdfId]) {
        downloadListeners[pdfId].forEach(callback => callback(activeDownloads[pdfId]));
    }
    globalListeners.forEach(callback => callback({...activeDownloads}));
};

export const subscribeToAllDownloads = (callback) => {
    globalListeners.add(callback);
    callback({...activeDownloads});
};

export const unsubscribeFromAllDownloads = (callback) => {
    globalListeners.delete(callback);
};

const getNotificationId = (pdfId) => {
    let hash = 0;
    for (let i = 0; i < pdfId.length; i++) {
        hash = ((hash << 5) - hash) + pdfId.charCodeAt(i);
        hash |= 0;
    }
    // Return a positive integer to use as Android Notification ID
    return Math.abs(hash) || 1000;
};

const saveActiveDownloadsState = async () => {
    try {
        const toSave = {};
        for (const [key, val] of Object.entries(activeDownloads)) {
            if (val.state !== 'FINISHED') {
                toSave[key] = {
                    pdfId: key,
                    url: val.url,
                    fileName: val.fileName,
                    hierarchy: val.hierarchy,
                    routePath: val.routePath,
                    downloadedBytes: val.downloadedBytes,
                    totalBytes: val.totalBytes
                };
            }
        }
        await Preferences.set({ key: ACTIVE_DOWNLOADS_KEY, value: JSON.stringify(toSave) });
    } catch (e) { console.error("Error saving download state", e); }
};

export const resumeInterruptedDownloads = async () => {
    try {
        const { value } = await Preferences.get({ key: ACTIVE_DOWNLOADS_KEY });
        if (value) {
            const saved = JSON.parse(value);
            for (const [pdfId, data] of Object.entries(saved)) {
                if (!activeDownloads[pdfId] && data.url) {
                    console.log("Auto-resuming download on boot:", pdfId);
                    downloadPdfChunked(pdfId, data.url, data.fileName, data.hierarchy, data.routePath).catch(console.error);
                }
            }
        }
    } catch (e) {
        console.error("Failed to resume downloads:", e);
    }
};

/**
 * Normalizes a string for use as a folder/file name
 */
const sanitizeName = (name) => {
    if (!name) return 'Unknown';
    return name.replace(/[^a-zA-Z0-9.\-_\s]/g, '_').trim();
};

/**
 * Get all cached PDFs metadata
 */
export const getAllCachedPdfs = async () => {
    try {
        const { value } = await Preferences.get({ key: PDF_CACHE_KEY });
        return value ? JSON.parse(value) : {};
    } catch (e) {
        console.error('Error reading PDF cache metadata:', e);
        return {};
    }
};

/**
 * Check the status of a specific PDF
 * Returns: { status: 'NOT_DOWNLOADED' | 'DOWNLOADED' | 'UPDATE_AVAILABLE', localUri?: string, metadata?: object }
 */
export const checkPdfStatus = async (pdfId, currentUrl) => {
    const cache = await getAllCachedPdfs();
    const cachedData = cache[pdfId];

    if (!cachedData) {
        return { status: 'NOT_DOWNLOADED' };
    }

    try {
        // Verify file actually exists
        await Filesystem.stat({
            path: cachedData.localPath,
            directory: Directory.Documents
        });

        // Check if the URL has changed (rudimentary version check)
        if (cachedData.originalUrl !== currentUrl) {
            return { status: 'UPDATE_AVAILABLE', localUri: cachedData.localUri, metadata: cachedData };
        }

        return { status: 'DOWNLOADED', localUri: cachedData.localUri, metadata: cachedData };
    } catch (e) {
        // File doesn't exist on disk, remove from preferences
        await deletePdf(pdfId);
        return { status: 'NOT_DOWNLOADED' };
    }
};

/**
 * Downloads a PDF and saves it to the custom folder structure
 * Downloads a PDF and saves it to the custom folder structure
 * hierarchy: [department, semester, subject, unit]
 * Implements chunked downloading for resume support and stable monotonic progress.
 */
export const downloadPdfChunked = async (pdfId, url, fileName, hierarchy, routePath = "/downloads") => {
    if (activeDownloads[pdfId] && (activeDownloads[pdfId].state === 'DOWNLOADING' || activeDownloads[pdfId].state === 'RESUMING' || activeDownloads[pdfId].state === 'PAUSED_OFFLINE')) {
        console.log(`Download already active for ${pdfId}`);
        return; // Already downloading
    }

    activeDownloads[pdfId] = {
        state: 'DOWNLOADING',
        progress: 0,
        downloadedBytes: 0,
        totalBytes: 0,
        routePath: routePath,
        url: url,
        fileName: fileName,
        hierarchy: hierarchy
    };
    notifySubscribers(pdfId);
    saveActiveDownloadsState();

    const safeHierarchy = hierarchy.map(sanitizeName);
    const folderPath = ['RGUKT CONNECT', ...safeHierarchy].join('/');
    const safeFileName = sanitizeName(fileName);
    let ext = '.pdf';
    if (safeFileName.toLowerCase().endsWith('.pdf')) {
        ext = '';
    }
    const fullPath = `${folderPath}/${safeFileName}${ext}`;

    const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks to significantly speed up downloads on good networks
    let downloadedBytes = 0;
    let totalBytes = 0;

    // Ensure directory exists
    try {
        await Filesystem.mkdir({
            path: folderPath,
            directory: Directory.Documents,
            recursive: true
        });
    } catch (e) {
        // Directory already exists or error (ignore)
    }

    // Check if partial file exists
    try {
        const stat = await Filesystem.stat({ path: fullPath, directory: Directory.Documents });
        downloadedBytes = stat.size;
    } catch (e) {
        downloadedBytes = 0;
    }

    // Attempt to get total file size
    if (Capacitor.isNativePlatform()) {
        try {
            const headResponse = await CapacitorHttp.request({ method: 'HEAD', url });
            const cl = headResponse.headers['content-length'] || headResponse.headers['Content-Length'];
            if (cl) totalBytes = parseInt(cl, 10);
        } catch (e) { console.warn("HEAD request failed natively"); }
    } else {
        try {
            const headResponse = await fetch(url, { method: 'HEAD' });
            const cl = headResponse.headers.get('content-length');
            if (cl) totalBytes = parseInt(cl, 10);
        } catch (e) {
            try {
                const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
                const headResponse = await fetch(proxyUrl, { method: 'HEAD' });
                const cl = headResponse.headers.get('content-length');
                if (cl) totalBytes = parseInt(cl, 10);
            } catch (err) {}
        }
    }

    if (totalBytes && downloadedBytes >= totalBytes && totalBytes > 0) {
        activeDownloads[pdfId].downloadedBytes = totalBytes;
        activeDownloads[pdfId].totalBytes = totalBytes;
        activeDownloads[pdfId].progress = 100;
        activeDownloads[pdfId].state = 'FINISHED';
        notifySubscribers(pdfId);
        saveActiveDownloadsState();
        
        setTimeout(() => { delete activeDownloads[pdfId]; }, 3000);
        return await finalizeDownload(pdfId, url, fullPath, safeHierarchy, safeFileName + ext);
    }

    // Helper for notifications
    const notificationId = getNotificationId(pdfId);
    let lastNotifyTime = 0;
    let lastNotifyProgress = -1;

    const updateNotification = async (title, body, percent = 0, force = false, completed = false) => {
        if (!Capacitor.isNativePlatform() || !NotificationProgress) return;
        const now = Date.now();
        // Throttle updates to every 1.5 seconds unless forced
        if (!force && now - lastNotifyTime < 1500) return;
        lastNotifyTime = now;
        try {
            if (completed) {
                await NotificationProgress.showCompleted({ id: notificationId, title, text: body, route: routePath });
            } else {
                await NotificationProgress.showProgress({
                    id: notificationId,
                    title,
                    text: body,
                    progress: percent,
                    max: 100,
                    route: routePath
                });
            }
        } catch(e) {
            console.warn("Notification error:", e);
        }
    };

    const waitForNetwork = async () => {
        if (navigator.onLine) return;
        
        activeDownloads[pdfId].state = 'PAUSED_OFFLINE';
        notifySubscribers(pdfId);
        saveActiveDownloadsState();
        await updateNotification(`Download Paused`, `Waiting for connection: ${safeFileName}`, Math.max(0, lastNotifyProgress), true);
        
        return new Promise(resolve => {
            const listener = async () => {
                window.removeEventListener('online', listener);
                activeDownloads[pdfId].state = 'DOWNLOADING';
                notifySubscribers(pdfId);
                saveActiveDownloadsState();
                await updateNotification(`Resuming Download`, `${safeFileName}`, Math.max(0, lastNotifyProgress), true);
                resolve();
            };
            window.addEventListener('online', listener);
        });
    };

    activeDownloads[pdfId].state = 'DOWNLOADING';
    activeDownloads[pdfId].downloadedBytes = downloadedBytes;
    activeDownloads[pdfId].totalBytes = totalBytes;
    if (totalBytes > 0) activeDownloads[pdfId].progress = (downloadedBytes / totalBytes) * 100;
    notifySubscribers(pdfId);
    saveActiveDownloadsState();
    
    const initialPercent = totalBytes > 0 ? Math.round((downloadedBytes / totalBytes) * 100) : 0;
    await updateNotification(`Downloading PDF`, `${safeFileName}`, initialPercent, true);
    lastNotifyProgress = initialPercent;

    // Download loop
    while (!totalBytes || downloadedBytes < totalBytes) {
        await waitForNetwork();

        const endByte = totalBytes ? Math.min(downloadedBytes + CHUNK_SIZE - 1, totalBytes - 1) : downloadedBytes + CHUNK_SIZE - 1;
        const rangeHeader = `bytes=${downloadedBytes}-${endByte}`;
        let chunkBase64 = null;
        let isCompleteFile = false;

        try {
            if (Capacitor.isNativePlatform()) {
                const response = await CapacitorHttp.get({
                    url,
                    headers: { 'Range': rangeHeader },
                    responseType: 'blob'
                });
                
                if (response.status === 200 && downloadedBytes > 0) {
                    isCompleteFile = true;
                    await Filesystem.deleteFile({ path: fullPath, directory: Directory.Documents }).catch(()=>null);
                    downloadedBytes = 0;
                }
                if (response.status >= 400) throw new Error(`HTTP Error ${response.status}`);
                chunkBase64 = response.data;
                
                if (!totalBytes && response.headers['Content-Range']) {
                    const match = response.headers['Content-Range'].match(/\/(\d+)/);
                    if (match) totalBytes = parseInt(match[1], 10);
                }
            } else {
                let fetchUrl = url;
                let fetchHeaders = { 'Range': rangeHeader };
                let response = await fetch(fetchUrl, { headers: fetchHeaders }).catch(()=>null);
                
                if (!response || !response.ok) {
                    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
                    response = await fetch(proxyUrl, { headers: fetchHeaders }).catch(()=>null);
                }
                
                if (!response || !response.ok) throw new Error(`HTTP Error ${response?.status || 'Network Error'}`);
                
                if (response.status === 200 && downloadedBytes > 0) {
                    isCompleteFile = true;
                    await Filesystem.deleteFile({ path: fullPath, directory: Directory.Documents }).catch(()=>null);
                    downloadedBytes = 0;
                }

                if (!totalBytes && response.headers.get('Content-Range')) {
                    const match = response.headers.get('Content-Range').match(/\/(\d+)/);
                    if (match) totalBytes = parseInt(match[1], 10);
                }

                const blob = await response.blob();
                const reader = new FileReader();
                chunkBase64 = await new Promise((resolve, reject) => {
                    reader.onloadend = () => {
                        const res = reader.result;
                        resolve(res.includes(',') ? res.split(',')[1] : res);
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
            }

            if (!chunkBase64) throw new Error("Empty data chunk received");

            let decodedByteLength = Math.floor((chunkBase64.length * 3) / 4) - (chunkBase64.indexOf('=') > 0 ? (chunkBase64.length - chunkBase64.indexOf('=')) : 0);

            if (downloadedBytes === 0) {
                await Filesystem.writeFile({
                    path: fullPath,
                    data: chunkBase64,
                    directory: Directory.Documents
                });
            } else {
                await Filesystem.appendFile({
                    path: fullPath,
                    data: chunkBase64,
                    directory: Directory.Documents
                });
            }

            downloadedBytes += decodedByteLength;
            if (!totalBytes && decodedByteLength < CHUNK_SIZE) {
                totalBytes = downloadedBytes;
            }

            activeDownloads[pdfId].downloadedBytes = downloadedBytes;
            activeDownloads[pdfId].totalBytes = totalBytes;
            if (totalBytes > 0) activeDownloads[pdfId].progress = (downloadedBytes / totalBytes) * 100;
            notifySubscribers(pdfId);
            saveActiveDownloadsState();
            
            if (totalBytes > 0) {
                const percent = Math.round((downloadedBytes / totalBytes) * 100);
                if (percent > lastNotifyProgress + 2) { // update notification approx every 2% 
                    await updateNotification(`Downloading PDF`, `${safeFileName}`, percent);
                    lastNotifyProgress = percent;
                }
            }

            if (isCompleteFile) break; 
        } catch (e) {
            console.warn("Chunk download failed", e);
            if (!navigator.onLine) {
                continue; // Will pause in waitForNetwork next iteration
            } else {
                delete activeDownloads[pdfId]; // clean up state on actual error
                saveActiveDownloadsState();
                throw e; 
            }
        }
    }

    activeDownloads[pdfId].state = 'FINISHED';
    activeDownloads[pdfId].progress = 100;
    notifySubscribers(pdfId);
    saveActiveDownloadsState();

    setTimeout(() => { delete activeDownloads[pdfId]; }, 3000);

    await updateNotification(`Download Complete`, `${safeFileName} is ready for offline viewing.`, 100, true, true);
    return await finalizeDownload(pdfId, url, fullPath, safeHierarchy, safeFileName + ext);
};

const finalizeDownload = async (pdfId, url, fullPath, hierarchy, fileName) => {
    const stat = await Filesystem.stat({ path: fullPath, directory: Directory.Documents });
    const localUri = stat.uri;
    const cache = await getAllCachedPdfs();
    cache[pdfId] = {
        id: pdfId,
        name: fileName,
        originalUrl: url,
        localPath: fullPath,
        localUri: localUri, 
        hierarchy: hierarchy,
        downloadedAt: new Date().toISOString()
    };
    await Preferences.set({ key: PDF_CACHE_KEY, value: JSON.stringify(cache) });
    
    // Notify any listening components that a new PDF was downloaded
    window.dispatchEvent(new CustomEvent('pdfDownloaded', { detail: pdfId }));
    
    return { success: true, localUri: localUri, path: fullPath };
};
// Old downloadPdf mapping for backward compatibility if needed elsewhere
export const downloadPdf = downloadPdfChunked;

/**
 * Delete a downloaded PDF
 */
export const deletePdf = async (pdfId) => {
    const cache = await getAllCachedPdfs();
    const cachedData = cache[pdfId];

    if (cachedData) {
        try {
            await Filesystem.deleteFile({
                path: cachedData.localPath,
                directory: Directory.Documents
            });
        } catch (e) {
            console.error('Error deleting file from filesystem:', e);
        }

        delete cache[pdfId];
        await Preferences.set({
            key: PDF_CACHE_KEY,
            value: JSON.stringify(cache)
        });
    }
};

/**
 * Open the PDF
 */
export const openPdf = async (uri) => {
    // For native app, use FileOpener to show the 'Open With' popup
    if (Capacitor.isNativePlatform()) {
        try {
            await FileOpener.open({
                filePath: uri,
                contentType: 'application/pdf',
                openWithDefault: true // true allows Android to use the default viewer if set, or show the chooser otherwise
            });
        } catch (e) {
            console.error('Error opening file with FileOpener, falling back to window.open:', e);
            const url = Capacitor.convertFileSrc(uri);
            window.open(url, '_system');
        }
    } else {
        // Fallback for web
        window.open(uri, '_blank');
    }
};
