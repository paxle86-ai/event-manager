'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface QRCodeScannerProps {
    onScan: (result: string) => void;
    onError?: (error: string) => void;
    className?: string;
}

export default function QRCodeScanner({ onScan, onError, className = '' }: QRCodeScannerProps) {
    const scannerRef = useRef<HTMLDivElement>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [scanner, setScanner] = useState<Html5QrcodeScanner | null>(null);

    useEffect(() => {
        if (scannerRef.current && !scanner) {
            const html5QrcodeScanner = new Html5QrcodeScanner(
                "qr-reader",
                {
                    fps: 10,
                    qrbox: (viewfinderWidth, viewfinderHeight) => {
                        const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
                        const qrboxSize = Math.floor(minEdge * 0.8);
                        return {
                            width: qrboxSize,
                            height: qrboxSize,
                        };
                    },
                    aspectRatio: 1.0,
                    videoConstraints: {
                        facingMode: "environment"
                    }
                },
                false
            );

            html5QrcodeScanner.render(
                (decodedText) => {
                    onScan(decodedText);
                },
                (errorMessage) => {
                    // Ignore common, non-fatal errors
                    if (onError && !errorMessage.includes("No QR code found")) {
                        onError(errorMessage);
                    }
                }
            );

            setScanner(html5QrcodeScanner);
            setIsScanning(true);
        }

        return () => {
            if (scanner) {
                scanner.clear().catch(console.error);
                setIsScanning(false);
            }
        };
    }, [scanner, onScan, onError]);

    return (
        <div className={`${className}`}>
            <div id="qr-reader" ref={scannerRef}></div>
            {!isScanning && (
                <div className="text-center text-gray-500 mt-4">
                    <p>Initializing camera...</p>
                </div>
            )}
        </div>
    );
} 