'use client';

import { useState, useEffect } from 'react';

export default function PWAInstallButton() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showInstallButton, setShowInstallButton] = useState(false);

    useEffect(() => {
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setShowInstallButton(true);
        };

        window.addEventListener('beforeinstallprompt', handler);

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            console.log('User accepted the install prompt');
        } else {
            console.log('User dismissed the install prompt');
        }

        setDeferredPrompt(null);
        setShowInstallButton(false);
    };

    if (!showInstallButton) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-4 max-w-sm mx-auto">
                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-2 rounded-lg mr-3">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <div>
                            <p className="font-semibold text-gray-800 text-sm">Install Event Manager</p>
                            <p className="text-gray-600 text-xs">Add to home screen for quick access</p>
                        </div>
                    </div>
                    <div className="flex space-x-2">
                        <button
                            onClick={() => setShowInstallButton(false)}
                            className="text-gray-400 hover:text-gray-600 p-1"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        <button
                            onClick={handleInstallClick}
                            className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-3 py-1 rounded-lg text-sm font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-200"
                        >
                            Install
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
} 