import { Capacitor } from '@capacitor/core';
import { BarcodeScanner, BarcodeFormat, LensFacing } from '@capacitor-mlkit/barcode-scanning';
import { Html5Qrcode } from "html5-qrcode";

export interface ScanResult {
    hasContent: boolean;
    content?: string;
    error?: string;
}

export const startScan = async (
    html5QrCodeRef: React.MutableRefObject<Html5Qrcode | null>, 
    elementId: string,
    onSuccess: (code: string) => void,
    onError: (error: string) => void
) => {
    if (Capacitor.isNativePlatform()) {
        try {
            // Check permissions
            const status = await BarcodeScanner.checkPermissions();
            if (status.camera !== 'granted') {
                const request = await BarcodeScanner.requestPermissions();
                if (request.camera !== 'granted') {
                    onError("Camera permission denied");
                    return;
                }
            }

            // On Android/iOS, this opens a native full-screen scanner overlay
            // It's faster and more accurate
            const { barcodes } = await BarcodeScanner.scan({
                formats: [BarcodeFormat.Ean13, BarcodeFormat.Ean8, BarcodeFormat.UpcA, BarcodeFormat.UpcE],
            });

            if (barcodes.length > 0) {
                onSuccess(barcodes[0].rawValue);
            }
        } catch (err: any) {
            // User cancelled or error
            if (!err.message.includes('canceled')) {
                console.error(err);
                onError(err.message || "Scan failed");
            }
        }
    } else {
        // Web Fallback
        try {
            const scanner = new Html5Qrcode(elementId);
            html5QrCodeRef.current = scanner;
            await scanner.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: { width: 250, height: 250 } },
                (decodedText) => onSuccess(decodedText),
                () => {} // Ignore frame errors
            );
        } catch (err: any) {
            console.error(err);
            onError("Failed to start web scanner");
        }
    }
};

export const stopScan = async (html5QrCodeRef: React.MutableRefObject<Html5Qrcode | null>) => {
    if (Capacitor.isNativePlatform()) {
        // No stop needed for single-shot scan usually, but if we used startScan() listener:
        // await BarcodeScanner.stopScan();
        // The ML Kit 'scan' method is a Promise that resolves on scan, so 'stop' isn't standard unless we use startScan listener.
        // However, if the user cancels the native modal, the promise rejects.
    } else {
        if (html5QrCodeRef.current) {
            try {
                await html5QrCodeRef.current.stop();
                html5QrCodeRef.current.clear();
            } catch (e) {
                console.warn("Error stopping web scanner", e);
            }
            html5QrCodeRef.current = null;
        }
    }
};

