'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import NotificationPopup from './NotificationPopup';

export default function DeleteVenueButton({
    venueId,
    venueName,
    onDelete
}: {
    venueId: number;
    venueName: string;
    onDelete: (formData: FormData) => Promise<{ success: boolean; message: string }>;
}) {
    const [isConfirming, setIsConfirming] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [notification, setNotification] = useState<{
        message: string;
        type: 'success' | 'error';
        isVisible: boolean;
    } | null>(null);
    const router = useRouter();

    const handleDelete = async () => {
        if (!isConfirming) {
            setIsConfirming(true);
            return;
        }

        setIsDeleting(true);
        setNotification(null);

        try {
            const formData = new FormData();
            formData.append('venue_id', venueId.toString());
            const result = await onDelete(formData);

            if (result.success) {
                setNotification({
                    message: 'Venue deleted successfully!',
                    type: 'success',
                    isVisible: true
                });
                // Refresh the page to show updated venue list
                router.refresh();
            } else {
                setNotification({
                    message: result.message,
                    type: 'error',
                    isVisible: true
                });
                setIsConfirming(false);
            }
        } catch (error) {
            console.error('Error deleting venue:', error);
            setNotification({
                message: 'An error occurred while deleting the venue',
                type: 'error',
                isVisible: true
            });
            setIsConfirming(false);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleCancel = () => {
        setIsConfirming(false);
    };

    const closeNotification = () => {
        setNotification(null);
    };

    return (
        <>
            <div className="relative">
                {!isConfirming ? (
                    <button
                        type="button"
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                        title="Delete venue"
                    >
                        {isDeleting ? (
                            <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        )}
                    </button>
                ) : (
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="bg-red-600 text-white px-3 py-1 rounded text-sm font-semibold hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200"
                        >
                            {isDeleting ? 'Deleting...' : 'Confirm'}
                        </button>
                        <button
                            type="button"
                            onClick={handleCancel}
                            disabled={isDeleting}
                            className="bg-gray-500 text-white px-3 py-1 rounded text-sm font-semibold hover:bg-gray-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200"
                        >
                            Cancel
                        </button>
                    </div>
                )}
            </div>

            {notification && (
                <NotificationPopup
                    message={notification.message}
                    type={notification.type}
                    isVisible={notification.isVisible}
                    onClose={closeNotification}
                />
            )}
        </>
    );
} 