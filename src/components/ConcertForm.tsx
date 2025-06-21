// src/components/ConcertForm.tsx

'use client';

import { useState } from 'react';
import { type Venue } from '@/lib/types';
import NotificationPopup from './NotificationPopup';

// Định nghĩa kiểu dữ liệu cho object mà form sẽ gửi đi
type ConcertFormData = {
    name: string;
    concert_date: string;
    venue_id: number;
    image_url: string;
    ticketTypes: { name: string; price: number; total_quantity: number }[];
};

// Default ticket types
const DEFAULT_TICKET_TYPES = [
    { name: 'Premium', price: '500', total_quantity: '100' },
    { name: 'VIP', price: '350', total_quantity: '200' },
    { name: 'Gold', price: '280', total_quantity: '300' },
    { name: 'Silver', price: '240', total_quantity: '400' },
    { name: 'Standard A', price: '200', total_quantity: '500' },
    { name: 'Standard B', price: '160', total_quantity: '600' },
    { name: 'Standard C', price: '120', total_quantity: '700' }
];

// Component nhận vào một action và danh sách địa điểm
export default function ConcertForm({
    venues,
    onFormSubmit
}: {
    venues: Venue[];
    onFormSubmit: (data: ConcertFormData) => Promise<{ success: boolean; message: string }>;
}) {
    const [ticketTypes, setTicketTypes] = useState(DEFAULT_TICKET_TYPES);
    const [notification, setNotification] = useState<{
        message: string;
        type: 'success' | 'error';
        isVisible: boolean;
    } | null>(null);

    const addTicketType = () => {
        setTicketTypes([...ticketTypes, { name: '', price: '', total_quantity: '' }]);
    };

    const removeTicketType = (index: number) => {
        if (ticketTypes.length > 1) {
            setTicketTypes(ticketTypes.filter((_, i) => i !== index));
        }
    };

    const handleTicketTypeChange = (index: number, field: string, value: string) => {
        const newTicketTypes = [...ticketTypes];
        newTicketTypes[index] = { ...newTicketTypes[index], [field]: value };
        setTicketTypes(newTicketTypes);
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        const concertData: ConcertFormData = {
            name: formData.get('name') as string,
            concert_date: formData.get('concert_date') as string,
            venue_id: parseInt(formData.get('venue_id') as string, 10),
            image_url: formData.get('image_url') as string,
            ticketTypes: ticketTypes.map(tt => ({
                name: tt.name,
                price: parseFloat(tt.price) || 0,
                total_quantity: parseInt(tt.total_quantity) || 0
            }))
        };

        const result = await onFormSubmit(concertData);
        setNotification({
            message: result.message,
            type: result.success ? 'success' : 'error',
            isVisible: true
        });
    };

    const closeNotification = () => {
        setNotification(null);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
            {/* Concert Information Section */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-xl border border-blue-100 p-6 sm:p-8">
                <div className="flex items-center mb-4 sm:mb-6">
                    <div className="bg-blue-600 text-white p-2 sm:p-3 rounded-full mr-3 sm:mr-4">
                        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">Concert Information</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
                    <div>
                        <label htmlFor="name" className="block text-base sm:text-lg font-semibold text-gray-700 mb-2 sm:mb-3">Concert Name *</label>
                        <input
                            type="text"
                            name="name"
                            required
                            className="w-full border-2 border-blue-200 rounded-xl shadow-sm p-3 sm:p-4 text-base sm:text-lg text-gray-800 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 bg-white"
                            placeholder="Enter concert name"
                        />
                    </div>
                    <div>
                        <label htmlFor="concert_date" className="block text-base sm:text-lg font-semibold text-gray-700 mb-2 sm:mb-3">Date & Time *</label>
                        <input
                            type="datetime-local"
                            name="concert_date"
                            required
                            className="w-full border-2 border-blue-200 rounded-xl shadow-sm p-3 sm:p-4 text-base sm:text-lg text-gray-800 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 bg-white"
                        />
                    </div>
                    <div>
                        <label htmlFor="venue_id" className="block text-base sm:text-lg font-semibold text-gray-700 mb-2 sm:mb-3">Venue *</label>
                        <select
                            name="venue_id"
                            required
                            className="w-full border-2 border-blue-200 rounded-xl shadow-sm p-3 sm:p-4 text-base sm:text-lg text-gray-800 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 bg-white [&>option]:text-base [&>option]:py-2"
                        >
                            <option value="" className="text-base py-2">Select a venue</option>
                            {venues.map(venue => (
                                <option key={venue.venue_id} value={venue.venue_id} className="text-base py-2">
                                    {venue.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="image_url" className="block text-base sm:text-lg font-semibold text-gray-700 mb-2 sm:mb-3">Image URL</label>
                        <input
                            type="url"
                            name="image_url"
                            className="w-full border-2 border-blue-200 rounded-xl shadow-sm p-3 sm:p-4 text-base sm:text-lg text-gray-800 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 bg-white"
                            placeholder="https://example.com/image.jpg"
                        />
                    </div>
                </div>
            </div>

            {/* Ticket Types Section */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl shadow-xl border border-purple-100 p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6 space-y-4 sm:space-y-0">
                    <div className="flex items-center">
                        <div className="bg-purple-600 text-white p-2 sm:p-3 rounded-full mr-3 sm:mr-4">
                            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">Ticket Types</h2>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            type="button"
                            onClick={() => setTicketTypes(DEFAULT_TICKET_TYPES)}
                            className="bg-green-600 text-white py-2 sm:py-3 px-4 sm:px-6 rounded-xl hover:bg-green-700 font-semibold text-base sm:text-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 w-full sm:w-auto"
                        >
                            <svg className="w-4 h-4 sm:w-5 sm:h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Reset to Defaults
                        </button>
                        <button
                            type="button"
                            onClick={addTicketType}
                            className="bg-purple-600 text-white py-2 sm:py-3 px-4 sm:px-6 rounded-xl hover:bg-purple-700 font-semibold text-base sm:text-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 w-full sm:w-auto"
                        >
                            <svg className="w-4 h-4 sm:w-5 sm:h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            Add Custom Type
                        </button>
                    </div>
                </div>

                <div className="space-y-4 sm:space-y-6">
                    {ticketTypes.map((ticket, index) => (
                        <div key={index} className="bg-white rounded-xl shadow-lg border border-purple-200 p-4 sm:p-6 hover:shadow-xl transition-all duration-200">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                                <div className="sm:col-span-2 lg:col-span-1">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Type Name</label>
                                    <input
                                        type="text"
                                        placeholder="VIP, General, etc."
                                        value={ticket.name}
                                        onChange={e => handleTicketTypeChange(index, 'name', e.target.value)}
                                        required
                                        className="w-full border-2 border-purple-200 rounded-lg shadow-sm p-3 text-gray-800 focus:ring-4 focus:ring-purple-100 focus:border-purple-500 transition-all duration-200"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Price</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-base sm:text-lg font-medium">$</span>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            placeholder="0.00"
                                            value={ticket.price}
                                            onChange={e => handleTicketTypeChange(index, 'price', e.target.value)}
                                            required
                                            className="w-full border-2 border-purple-200 rounded-lg shadow-sm p-3 pl-8 text-gray-800 focus:ring-4 focus:ring-purple-100 focus:border-purple-500 transition-all duration-200"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Quantity</label>
                                    <input
                                        type="number"
                                        min="0"
                                        placeholder="0"
                                        value={ticket.total_quantity}
                                        onChange={e => handleTicketTypeChange(index, 'total_quantity', e.target.value)}
                                        required
                                        className="w-full border-2 border-purple-200 rounded-lg shadow-sm p-3 text-gray-800 focus:ring-4 focus:ring-purple-100 focus:border-purple-500 transition-all duration-200"
                                    />
                                </div>
                                <div className="flex items-end">
                                    <button
                                        type="button"
                                        onClick={() => removeTicketType(index)}
                                        disabled={ticketTypes.length === 1}
                                        className="w-full bg-red-500 text-white py-3 px-4 rounded-lg hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                                    >
                                        <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        Remove
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Submit Button */}
            <div className="text-center">
                <button
                    type="submit"
                    className="bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-4 sm:py-6 px-8 sm:px-12 rounded-2xl hover:from-green-600 hover:to-emerald-700 text-xl sm:text-2xl transition-all duration-200 shadow-2xl hover:shadow-3xl transform hover:-translate-y-1 w-full sm:w-auto"
                >
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 inline mr-2 sm:mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Create Concert
                </button>
            </div>

            {/* Message Display */}
            {notification && (
                <NotificationPopup
                    message={notification.message}
                    type={notification.type}
                    isVisible={notification.isVisible}
                    onClose={closeNotification}
                />
            )}
        </form>
    );
}