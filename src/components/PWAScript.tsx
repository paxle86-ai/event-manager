'use client';

import { useEffect } from 'react';

export default function PWAScript() {
    useEffect(() => {
        // Register service worker
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js')
                    .then((registration) => {
                        console.log('SW registered: ', registration);
                    })
                    .catch((registrationError) => {
                        console.log('SW registration failed: ', registrationError);
                    });
            });
        }

        // Handle PWA installation prompt
        let deferredPrompt: any;
        const installButton = document.getElementById('install-button');

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;

            // Show install button if it exists
            if (installButton) {
                installButton.style.display = 'block';
            }
        });

        // Handle install button click
        if (installButton) {
            installButton.addEventListener('click', async () => {
                if (deferredPrompt) {
                    deferredPrompt.prompt();
                    const { outcome } = await deferredPrompt.userChoice;
                    console.log(`User response to the install prompt: ${outcome}`);
                    deferredPrompt = null;
                    installButton.style.display = 'none';
                }
            });
        }

        // Handle app installed event
        window.addEventListener('appinstalled', () => {
            console.log('PWA was installed');
            if (installButton) {
                installButton.style.display = 'none';
            }
        });
    }, []);

    return null;
} 