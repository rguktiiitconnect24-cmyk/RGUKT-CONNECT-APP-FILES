import { Filesystem, Directory } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { FileOpener } from '@capacitor-community/file-opener';

const PDF_CACHE_KEY = 'rgukt_cached_pdfs';

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
 * hierarchy: [department, semester, subject, unit]
 */
export const downloadPdf = async (pdfId, url, fileName, hierarchy) => {
    try {
        // 1. Build the path: RGUKT CONNECT/AI&ML/Sem1/Python/Unit1/file.pdf
        const safeHierarchy = hierarchy.map(sanitizeName);
        const folderPath = ['RGUKT CONNECT', ...safeHierarchy].join('/');
        const safeFileName = sanitizeName(fileName);
        let ext = '.pdf';
        if (safeFileName.toLowerCase().endsWith('.pdf')) {
            ext = '';
        }
        const fullPath = `${folderPath}/${safeFileName}${ext}`;

        // 2 & 3 & 4. Download and save the file
        let localUri = '';

        if (Capacitor.isNativePlatform()) {
            // Native: Bypass WebView CORS entirely using CapacitorHttp core plugin
            const response = await CapacitorHttp.get({
                url,
                responseType: 'blob'
            });
            
            // On native, CapacitorHttp with responseType 'blob' returns a base64 string in response.data
            let base64Data = response.data;
            
            const writeResult = await Filesystem.writeFile({
                path: fullPath,
                data: base64Data,
                directory: Directory.Documents,
                recursive: true
            });
            localUri = writeResult.uri;
        } else {
            // Web: Use fetch with proxy fallback
            let response;
            try {
                response = await fetch(url);
                if (!response.ok) throw new Error('Network response was not ok');
            } catch (fetchError) {
                console.warn('Direct fetch failed, trying CORS proxy...', fetchError);
                const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
                response = await fetch(proxyUrl);
                if (!response.ok) throw new Error('Proxy network response was not ok');
            }
            
            const blob = await response.blob();

            // Convert Blob to Base64
            const reader = new FileReader();
            const base64Promise = new Promise((resolve, reject) => {
                reader.onloadend = () => {
                    const b64 = reader.result.split(',')[1];
                    resolve(b64);
                };
                reader.onerror = reject;
            });
            reader.readAsDataURL(blob);
            const base64Data = await base64Promise;

            // Capacitor Filesystem's writeFile with recursive: true handles creating parent directories
            const writeResult = await Filesystem.writeFile({
                path: fullPath,
                data: base64Data,
                directory: Directory.Documents,
                recursive: true
            });
            localUri = writeResult.uri;
        }

        // 5. Save metadata
        const cache = await getAllCachedPdfs();
        cache[pdfId] = {
            id: pdfId,
            name: `${safeFileName}${ext}`,
            originalUrl: url,
            localPath: fullPath,
            localUri: localUri, 
            hierarchy: safeHierarchy,
            downloadedAt: new Date().toISOString()
        };

        await Preferences.set({
            key: PDF_CACHE_KEY,
            value: JSON.stringify(cache)
        });

        return { success: true, localUri: localUri, path: fullPath };
    } catch (error) {
        console.error('Error downloading PDF:', error);
        throw error;
    }
};

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
