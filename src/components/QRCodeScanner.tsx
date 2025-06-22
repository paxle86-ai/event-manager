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

    const startScanner = () => {
        if (scannerRef.current) {
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
                    if (
                        onError &&
                        !errorMessage.includes("No QR code found") &&
                        !errorMessage.includes("No barcode or QR code detected") &&
                        !errorMessage.includes("NotFoundException") &&
                        !errorMessage.includes("Z: No MultiFormat Readers")
                    ) {
                        onError(errorMessage);
                    }
                }
            );

            setScanner(html5QrcodeScanner);
            setIsScanning(true);
        }
    };

    useEffect(() => {
        return () => {
            if (scanner) {
                scanner.clear().catch(console.error);
                setIsScanning(false);
            }
        };
    }, [scanner]);

    return (
        <div className={`${className}`}>
            <div id="qr-reader" ref={scannerRef}></div>

            {!isScanning && (
                <div className="text-center p-4">
                    <button
                        onClick={startScanner}
                        className="bg-green-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-700 transition-all duration-200 shadow-md"
                    >
                        <svg className="w-6 h-6 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V6a1 1 0 00-1-1H5a1 1 0 00-1 1v1a1 1 0 001 1zm12 0h2a1 1 0 001-1V6a1 1 0 00-1-1h-2a1 1 0 00-1 1v1a1 1 0 001 1zM5 20h2a1 1 0 001-1v-1a1 1 0 00-1-1H5a1 1 0 00-1 1v1a1 1 0 001 1z" /></svg>
                        Start Scanner
                    </button>
                    <p className="text-gray-500 mt-3 text-sm">Tap to activate the camera.</p>
                </div>
            )}
        </div>
    );
} 