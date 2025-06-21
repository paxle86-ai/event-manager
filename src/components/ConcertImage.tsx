'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';

interface ConcertImageProps {
    imageUrl?: string | null;
    concertName: string;
    className?: string;
    fallbackImage?: string;
}

// Allowed hostnames from next.config.ts
const ALLOWED_HOSTNAMES = [
    'media.vov.vn',
    'images.unsplash.com',
    'picsum.photos',
    'via.placeholder.com',
    'cloudinary.com',
    'amazonaws.com'
];

// Default fallback image
const DEFAULT_FALLBACK = 'https://via.placeholder.com/400x300/f3f4f6/9ca3af?text=No+Image';

function isHostnameAllowed(url: string): boolean {
    try {
        const hostname = new URL(url).hostname;
        return ALLOWED_HOSTNAMES.some(allowed =>
            hostname === allowed || hostname.endsWith(`.${allowed}`)
        );
    } catch {
        return false;
    }
}

function isValidUrl(url: string): boolean {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

export default function ConcertImage({
    imageUrl,
    concertName,
    className = '',
    fallbackImage = DEFAULT_FALLBACK
}: ConcertImageProps) {
    const [imageError, setImageError] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [shouldShowImage, setShouldShowImage] = useState(false);
    const [currentImageUrl, setCurrentImageUrl] = useState<string>('');

    useEffect(() => {
        if (!imageUrl) {
            setShouldShowImage(false);
            setIsLoading(false);
            return;
        }

        if (!isValidUrl(imageUrl)) {
            setShouldShowImage(false);
            setIsLoading(false);
            return;
        }

        if (!isHostnameAllowed(imageUrl)) {
            setShouldShowImage(false);
            setIsLoading(false);
            return;
        }

        setShouldShowImage(true);
        setIsLoading(true);
        setImageError(false);
        setCurrentImageUrl(imageUrl);
    }, [imageUrl]);

    const handleImageLoad = () => {
        setIsLoading(false);
    };

    const handleImageError = () => {
        if (currentImageUrl === fallbackImage) {
            // If fallback also fails, show the placeholder
            setImageError(true);
            setIsLoading(false);
        } else {
            // Try fallback image
            setCurrentImageUrl(fallbackImage);
            setImageError(false);
            setIsLoading(true);
        }
    };

    // Skeleton loading state
    if (isLoading && shouldShowImage) {
        return (
            <div className={`relative bg-gray-200 animate-pulse ${className}`}>
                <div className="flex items-center justify-center h-full">
                    <div className="w-16 h-16 bg-gray-300 rounded-full animate-pulse"></div>
                </div>
            </div>
        );
    }

    // Error state or no valid image
    if (!shouldShowImage || imageError) {
        return (
            <div className={`relative bg-gradient-to-br from-gray-100 to-gray-200 ${className}`}>
                <div className="flex items-center justify-center h-full">
                    <div className="text-center text-gray-500">
                        <svg className="w-16 h-16 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                        </svg>
                        <p className="text-sm font-medium">{concertName}</p>
                        <p className="text-xs text-gray-400 mt-1">No Image Available</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`relative ${className}`}>
            <Image
                src={currentImageUrl}
                alt={concertName}
                fill
                style={{ objectFit: 'cover' }}
                onLoad={handleImageLoad}
                onError={handleImageError}
                className="transition-opacity duration-300"
            />
        </div>
    );
} 