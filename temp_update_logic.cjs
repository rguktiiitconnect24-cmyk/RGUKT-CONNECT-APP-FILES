const fs = require('fs');
let code = fs.readFileSync('src/pages/TimeTable.jsx', 'utf8');

const oldDownload = `    const handleDownloadPDF = async () => {
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
    };`;

const newDownload = `    const handleDownloadPDF = async () => {
        console.log("TimeTable: handleDownloadPDF triggered (Preview Mode)");
        const filename = \`Timetable_\${user?.currentClass || 'Class'}.pdf\`;
        setTimetableDownloadStatus('loading');
        
        try {
            const pngLogo = await svgToPng(LOGO_DATA_URI);
            const doc = await pdfService.generateTimetablePdf(schedule, user, pngLogo);
            const pdfDataUri = doc.output('datauristring');
            
            setPreviewPdfData(pdfDataUri);
            setPreviewFilename(filename);
            setShowPdfPreview(true);
        } catch (error) {
            console.error("Error generating PDF preview:", error);
        } finally {
            setTimetableDownloadStatus('done');
            setTimeout(() => setTimetableDownloadStatus('idle'), 2000);
        }
    };

    const handleConfirmDownload = async () => {
        if (!previewPdfData) return;
        
        await startDownload(previewFilename, async () => {
            if (Capacitor.isNativePlatform()) {
                const pdfBase64 = previewPdfData.split(',')[1];
                await nativeFileService.savePdfToDownloads(previewFilename, pdfBase64);
            } else {
                const a = document.createElement("a");
                a.href = previewPdfData;
                a.download = previewFilename;
                a.click();
            }
        });
    };

    const handleConfirmShare = async () => {
        if (!previewPdfData) return;
        
        if (!Capacitor.isNativePlatform()) {
            return handleConfirmDownload();
        }

        await startShare(previewFilename, async () => {
            const pdfBase64 = previewPdfData.split(',')[1];
            const fileResult = await Filesystem.writeFile({
                path: previewFilename,
                data: pdfBase64,
                directory: Directory.Cache,
            });
            await CapacitorShare.share({
                title: 'Share Time Table',
                text: 'Here is my time table from RGUKT Connect.',
                url: fileResult.uri,
                dialogTitle: 'Share Time Table PDF',
            });
        });
    };`;

const oldShare = `    const handleShareElementAsPDF = async (type) => {
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
                title: 'Share Time Table',
                text: 'Here is my time table from RGUKT Connect.',
                url: fileResult.uri,
                dialogTitle: 'Share Time Table PDF'
            });
        });
    };`;

const newShare = `    const handleShareElementAsPDF = async (type) => {
        return handleDownloadPDF(); // Route share to the preview modal
    };`;

code = code.replace(oldDownload, newDownload);
code = code.replace(oldShare, newShare);

const oldModalRender = `                document.body
            )}

            {/* Google Calendar Popup Modal */}`;

const newModalRender = `                document.body
            )}

            <PdfPreviewModal
                isOpen={showPdfPreview}
                onClose={() => setShowPdfPreview(false)}
                pdfDataUri={previewPdfData}
                onDownload={handleConfirmDownload}
                onShare={handleConfirmShare}
                title="Time Table Preview"
            />

            {/* Google Calendar Popup Modal */}`;

code = code.replace(oldModalRender, newModalRender);

fs.writeFileSync('src/pages/TimeTable.jsx', code);
console.log('Update complete!');
