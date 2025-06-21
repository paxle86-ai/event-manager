'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import NotificationPopup from './NotificationPopup';

type SalesData = {
    concert_id: number;
    customer_name: string;
    customer_email?: string;
    customer_phone?: string;
    ticket_purchases: {
        type_id: number;
        quantity: number;
        price_per_ticket: number;
    }[];
};

type Concert = {
    concert_id: number;
    name: string;
    concert_date: string;
    venues: { name: string };
};

type TicketType = {
    type_id: number;
    name: string;
    price: number;
    total_quantity: number;
    concert_id: number;
};

type TicketPurchase = {
    type_id: number;
    quantity: number;
    price_per_ticket: number;
    total_price: number;
    ticket_type_name: string;
    available: number;
};

export default function SalesForm({
    concerts,
    ticketTypes: initialTicketTypes,
    selectedConcertId: initialConcertId,
    onFormSubmit
}: {
    concerts: Concert[];
    ticketTypes?: TicketType[];
    selectedConcertId?: string;
    onFormSubmit: (data: SalesData) => Promise<{ success: boolean; message: string }>;
}) {
    const router = useRouter();
    const [selectedConcertId, setSelectedConcertId] = useState<number>(initialConcertId ? parseInt(initialConcertId, 10) : 0);
    const [ticketTypes, setTicketTypes] = useState<TicketType[]>(initialTicketTypes || []);
    const [customerName, setCustomerName] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [ticketPurchases, setTicketPurchases] = useState<TicketPurchase[]>([]);
    const [notification, setNotification] = useState<{
        message: string;
        type: 'success' | 'error';
        isVisible: boolean;
    } | null>(null);

    // Update ticket types when props change
    useEffect(() => {
        if (initialTicketTypes) {
            setTicketTypes(initialTicketTypes);
        }
    }, [initialTicketTypes]);

    // Update selected concert when props change
    useEffect(() => {
        if (initialConcertId) {
            setSelectedConcertId(parseInt(initialConcertId, 10));
        }
    }, [initialConcertId]);

    // Update URL when concert selection changes
    useEffect(() => {
        if (selectedConcertId > 0) {
            router.push(`/sales/new?concertId=${selectedConcertId}`);
            // Fetch ticket types for the selected concert
            fetchTicketTypes(selectedConcertId);
        } else {
            router.push('/sales/new');
            setTicketTypes([]);
        }
    }, [selectedConcertId, router]);

    // Fetch ticket types for a concert
    const fetchTicketTypes = async (concertId: number) => {
        try {
            const response = await fetch(`/api/ticket-types?concertId=${concertId}`);
            if (response.ok) {
                const data = await response.json();
                setTicketTypes(data);
            } else {
                console.error('Failed to fetch ticket types');
                setTicketTypes([]);
            }
        } catch (error) {
            console.error('Error fetching ticket types:', error);
            setTicketTypes([]);
        }
    };

    const handleConcertChange = (concertId: number) => {
        setSelectedConcertId(concertId);
        setTicketPurchases([]); // Reset ticket purchases when concert changes
    };

    const handleCustomerInfoChange = (field: string, value: string) => {
        if (field === 'name') {
            setCustomerName(value);
        } else if (field === 'email') {
            setCustomerEmail(value);
        } else if (field === 'phone') {
            setCustomerPhone(value);
        }
    };

    const addTicketPurchase = () => {
        if (ticketTypes.length === 0) return;

        // Find first available ticket type that hasn't been added yet
        const availableTicketTypes = ticketTypes.filter(tt =>
            !ticketPurchases.some(tp => tp.type_id === tt.type_id)
        );

        if (availableTicketTypes.length > 0) {
            const ticketType = availableTicketTypes[0];
            setTicketPurchases(prev => [...prev, {
                type_id: ticketType.type_id,
                quantity: 1,
                price_per_ticket: ticketType.price,
                total_price: ticketType.price,
                ticket_type_name: ticketType.name,
                available: ticketType.total_quantity
            }]);
        }
    };

    const removeTicketPurchase = (index: number) => {
        setTicketPurchases(prev => prev.filter((_, i) => i !== index));
    };

    const handleTicketTypeChange = (index: number, ticketTypeId: number) => {
        const ticketType = ticketTypes.find(tt => tt.type_id === ticketTypeId);
        if (!ticketType) return;

        setTicketPurchases(prev => prev.map((purchase, i) =>
            i === index
                ? {
                    ...purchase,
                    type_id: ticketType.type_id,
                    price_per_ticket: ticketType.price,
                    total_price: purchase.quantity * ticketType.price,
                    ticket_type_name: ticketType.name,
                    available: ticketType.total_quantity
                }
                : purchase
        ));
    };

    const handleTicketQuantityChange = (index: number, quantity: number) => {
        setTicketPurchases(prev => prev.map((purchase, i) =>
            i === index
                ? {
                    ...purchase,
                    quantity: Math.max(0, Math.min(quantity, purchase.available)),
                    total_price: Math.max(0, Math.min(quantity, purchase.available)) * purchase.price_per_ticket
                }
                : purchase
        ));
    };

    const handleTicketPriceChange = (index: number, price: number) => {
        setTicketPurchases(prev => prev.map((purchase, i) =>
            i === index
                ? {
                    ...purchase,
                    price_per_ticket: price,
                    total_price: purchase.quantity * price
                }
                : purchase
        ));
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (ticketPurchases.length === 0) {
            setNotification({
                message: 'Please add at least one ticket type',
                type: 'error',
                isVisible: true
            });
            return;
        }

        // Filter out tickets with quantity 0
        const validPurchases = ticketPurchases.filter(purchase => purchase.quantity > 0);

        if (validPurchases.length === 0) {
            setNotification({
                message: 'Please select at least one ticket with quantity greater than 0',
                type: 'error',
                isVisible: true
            });
            return;
        }

        // Filter out tickets with invalid ticket_type_id
        const validTicketPurchases = validPurchases.filter(purchase => purchase.type_id > 0);

        if (validTicketPurchases.length === 0) {
            setNotification({
                message: 'Please select valid ticket types for all purchases',
                type: 'error',
                isVisible: true
            });
            return;
        }

        const salesData: SalesData = {
            concert_id: selectedConcertId,
            customer_name: customerName,
            customer_email: customerEmail,
            customer_phone: customerPhone,
            ticket_purchases: validTicketPurchases.map(p => ({
                type_id: p.type_id,
                quantity: p.quantity,
                price_per_ticket: p.price_per_ticket
            }))
        };

        const result = await onFormSubmit(salesData);
        setNotification({
            message: result.message,
            type: result.success ? 'success' : 'error',
            isVisible: true
        });

        if (result.success) {
            // Reset form on success
            setCustomerName('');
            setCustomerEmail('');
            setCustomerPhone('');
            setTicketPurchases([]);
        }
    };

    const calculateTotal = () => {
        return ticketPurchases.reduce((sum, purchase) => {
            return sum + (purchase.quantity * purchase.price_per_ticket);
        }, 0);
    };

    // Get available ticket types for dropdown (excluding already selected ones)
    const getAvailableTicketTypes = (currentIndex: number) => {
        return ticketTypes.filter(tt =>
            !ticketPurchases.some((tp, index) =>
                index !== currentIndex && tp.type_id === tt.type_id
            )
        );
    };

    const closeNotification = () => {
        setNotification(null);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
            {/* Concert Selection */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-xl border border-blue-100 p-6 sm:p-8">
                <div className="flex items-center mb-4 sm:mb-6">
                    <div className="bg-blue-600 text-white p-2 sm:p-3 rounded-full mr-3 sm:mr-4">
                        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">Select Concert</h2>
                </div>
                <div>
                    <label htmlFor="concert" className="block text-base sm:text-lg font-semibold text-gray-700 mb-2 sm:mb-3">Concert *</label>
                    <select
                        id="concert"
                        value={selectedConcertId}
                        onChange={(e) => handleConcertChange(parseInt(e.target.value))}
                        required
                        className="w-full border-2 border-blue-200 rounded-xl shadow-sm p-3 sm:p-4 text-base sm:text-lg text-gray-800 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 bg-white [&>option]:text-base [&>option]:py-2"
                    >
                        <option value="" className="text-base py-2">Select a concert</option>
                        {concerts.map(concert => (
                            <option key={concert.concert_id} value={concert.concert_id} className="text-base py-2">
                                {concert.name} - {new Date(concert.concert_date).toLocaleDateString()}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Customer Information */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl shadow-xl border border-green-100 p-6 sm:p-8">
                <div className="flex items-center mb-4 sm:mb-6">
                    <div className="bg-green-600 text-white p-2 sm:p-3 rounded-full mr-3 sm:mr-4">
                        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">Customer Information</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    <div>
                        <label htmlFor="customer_name" className="block text-base sm:text-lg font-semibold text-gray-700 mb-2 sm:mb-3">Customer Name *</label>
                        <input
                            type="text"
                            id="customer_name"
                            value={customerName}
                            onChange={(e) => handleCustomerInfoChange('name', e.target.value)}
                            required
                            className="w-full border-2 border-green-200 rounded-xl shadow-sm p-3 sm:p-4 text-base sm:text-lg text-gray-800 focus:ring-4 focus:ring-green-100 focus:border-green-500 transition-all duration-200 bg-white"
                            placeholder="Enter customer name"
                        />
                    </div>
                    <div>
                        <label htmlFor="customer_email" className="block text-base sm:text-lg font-semibold text-gray-700 mb-2 sm:mb-3">Email</label>
                        <input
                            type="email"
                            id="customer_email"
                            value={customerEmail}
                            onChange={(e) => handleCustomerInfoChange('email', e.target.value)}
                            className="w-full border-2 border-green-200 rounded-xl shadow-sm p-3 sm:p-4 text-base sm:text-lg text-gray-800 focus:ring-4 focus:ring-green-100 focus:border-green-500 transition-all duration-200 bg-white"
                            placeholder="Enter email address"
                        />
                    </div>
                    <div className="sm:col-span-2 lg:col-span-1">
                        <label htmlFor="customer_phone" className="block text-base sm:text-lg font-semibold text-gray-700 mb-2 sm:mb-3">Phone</label>
                        <input
                            type="tel"
                            id="customer_phone"
                            value={customerPhone}
                            onChange={(e) => handleCustomerInfoChange('phone', e.target.value)}
                            className="w-full border-2 border-green-200 rounded-xl shadow-sm p-3 sm:p-4 text-base sm:text-lg text-gray-800 focus:ring-4 focus:ring-green-100 focus:border-green-500 transition-all duration-200 bg-white"
                            placeholder="Enter phone number"
                        />
                    </div>
                </div>
            </div>

            {/* Ticket Selection */}
            {selectedConcertId > 0 && ticketTypes.length > 0 && (
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl shadow-xl border border-purple-100 p-6 sm:p-8">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6 space-y-4 sm:space-y-0">
                        <div className="flex items-center">
                            <div className="bg-purple-600 text-white p-2 sm:p-3 rounded-full mr-3 sm:mr-4">
                                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                                </svg>
                            </div>
                            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">Select Tickets</h2>
                        </div>
                        <button
                            type="button"
                            onClick={addTicketPurchase}
                            className="bg-purple-600 text-white py-2 sm:py-3 px-4 sm:px-6 rounded-xl hover:bg-purple-700 font-semibold text-base sm:text-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 w-full sm:w-auto"
                        >
                            <svg className="w-4 h-4 sm:w-5 sm:h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            Add Ticket Type
                        </button>
                    </div>

                    <div className="space-y-4 sm:space-y-6">
                        {ticketPurchases.map((purchase, index) => (
                            <div key={index} className="bg-white rounded-xl shadow-lg border border-purple-200 p-4 sm:p-6 hover:shadow-xl transition-all duration-200">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
                                    <div className="sm:col-span-2 lg:col-span-1">
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Ticket Type</label>
                                        <select
                                            value={purchase.type_id}
                                            onChange={(e) => handleTicketTypeChange(index, parseInt(e.target.value))}
                                            required
                                            className="w-full border-2 border-purple-200 rounded-lg shadow-sm p-3 text-gray-800 focus:ring-4 focus:ring-purple-100 focus:border-purple-500 transition-all duration-200 [&>option]:text-base [&>option]:py-2"
                                        >
                                            <option value="" className="text-base py-2">Select ticket type</option>
                                            {ticketTypes.map(type => (
                                                <option key={type.type_id} value={type.type_id} className="text-base py-2">
                                                    {type.name} - ${type.price}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Quantity</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max={purchase.available}
                                            value={purchase.quantity}
                                            onChange={(e) => handleTicketQuantityChange(index, parseInt(e.target.value))}
                                            className="w-full border-2 border-purple-200 rounded-lg shadow-sm p-3 text-gray-800 focus:ring-4 focus:ring-purple-100 focus:border-purple-500 transition-all duration-200"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Price per Ticket</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-base sm:text-lg font-medium">$</span>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={purchase.price_per_ticket}
                                                onChange={(e) => handleTicketPriceChange(index, parseFloat(e.target.value))}
                                                className="w-full border-2 border-purple-200 rounded-lg shadow-sm p-3 pl-8 text-gray-800 focus:ring-4 focus:ring-purple-100 focus:border-purple-500 transition-all duration-200"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Total</label>
                                        <div className="bg-gray-100 border-2 border-gray-200 rounded-lg p-3 text-gray-800 font-semibold">
                                            ${purchase.total_price.toFixed(2)}
                                        </div>
                                    </div>
                                    <div className="flex items-end">
                                        <button
                                            type="button"
                                            onClick={() => removeTicketPurchase(index)}
                                            className="w-full bg-red-500 text-white py-3 px-4 rounded-lg hover:bg-red-600 font-semibold transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
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

                    {/* Total */}
                    <div className="mt-6 sm:mt-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-4 sm:p-6 text-white">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl sm:text-2xl font-bold">Total Amount</h3>
                            <div className="text-2xl sm:text-3xl font-bold">${calculateTotal().toFixed(2)}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Submit Button */}
            <div className="text-center">
                <button
                    type="submit"
                    disabled={!selectedConcertId || calculateTotal() === 0}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-4 sm:py-6 px-8 sm:px-12 rounded-2xl hover:from-green-600 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-xl sm:text-2xl transition-all duration-200 shadow-2xl hover:shadow-3xl transform hover:-translate-y-1 w-full sm:w-auto"
                >
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 inline mr-2 sm:mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                    Record Sale
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