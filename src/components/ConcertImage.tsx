'use client';

import Image from 'next/image';
import { useState } from 'react';

interface ConcertImageProps {
    imageUrl?: string | null;
    concertName: string;
}

export default function ConcertImage({ imageUrl, concertName }: ConcertImageProps) {
    const [imageError, setImageError] = useState(false);

    if (!imageUrl || imageError) {
        return (
            <div className="flex items-center justify-center h-full bg-gray-200">
                <div className="text-center text-gray-500">
                    <svg className="w-16 h-16 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm">No Image</p>
                </div>
            </div>
        );
    }

    return (
        <Image
            src={imageUrl}
            alt={concertName}
            fill
            style={{ objectFit: 'cover' }}
            onError={() => setImageError(true)}
        />
    );
} 