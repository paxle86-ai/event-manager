'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import NotificationPopup from './NotificationPopup';
import Link from 'next/link';
import QRCodeComponent from './QRCode';
import PrintableTicket from './PrintableTicket';
import html2canvas from 'html2canvas';

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

type SaleResult = {
    success: boolean;
    message: string;
    sale_id?: number;
    total_amount?: number;
    tickets?: Array<{
        ticket_id: string;
        ticket_number: number;
        ticket_type_name: string;
        purchase_id: number;
    }>;
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
    onFormSubmit: (data: SalesData) => Promise<SaleResult>;
}) {
    const router = useRouter();
    const [selectedConcertId, setSelectedConcertId] = useState<number | null>(initialConcertId ? parseInt(initialConcertId, 10) : null);
    const [customerName, setCustomerName] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [ticketTypes, setTicketTypes] = useState<TicketType[]>(initialTicketTypes || []);
    const [ticketPurchases, setTicketPurchases] = useState<TicketPurchase[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [saleResult, setSaleResult] = useState<SaleResult | null>(null);

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
        if (selectedConcertId && selectedConcertId > 0) {
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
        if (concertId) {
            fetchTicketTypes(concertId);
        }
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

    const calculateTotal = () => {
        return ticketPurchases.reduce((sum, purchase) => sum + purchase.total_price, 0);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedConcertId) {
            setNotification({
                type: 'error',
                message: 'Please select a concert'
            });
            return;
        }

        if (!customerName.trim()) {
            setNotification({
                type: 'error',
                message: 'Please enter customer name'
            });
            return;
        }

        if (ticketPurchases.length === 0) {
            setNotification({
                type: 'error',
                message: 'Please add at least one ticket type'
            });
            return;
        }

        // Validate that all purchases have valid ticket types
        const validPurchases = ticketPurchases.filter(purchase => purchase.quantity > 0);
        if (validPurchases.length === 0) {
            setNotification({
                type: 'error',
                message: 'Please select at least one ticket with quantity greater than 0'
            });
            return;
        }

        // Validate that all purchases have valid ticket types
        const validTicketPurchases = validPurchases.filter(purchase =>
            ticketTypes.some(tt => tt.type_id === purchase.type_id)
        );
        if (validTicketPurchases.length === 0) {
            setNotification({
                type: 'error',
                message: 'Please select valid ticket types for all purchases'
            });
            return;
        }

        const salesData: SalesData = {
            concert_id: selectedConcertId,
            customer_name: customerName,
            customer_email: customerEmail,
            customer_phone: customerPhone,
            ticket_purchases: validTicketPurchases.map(purchase => ({
                type_id: purchase.type_id,
                quantity: purchase.quantity,
                price_per_ticket: purchase.price_per_ticket
            }))
        };

        setIsSubmitting(true);
        setSaleResult(null);

        const result = await onFormSubmit(salesData);
        setSaleResult(result);

        if (result.success) {
            // Reset form for next sale, but keep customer info for email/print actions
            setTicketPurchases([]);
            setNotification({
                type: 'success',
                message: result.message
            });
        } else {
            setNotification({
                type: 'error',
                message: result.message
            });
        }

        setIsSubmitting(false);
    };

    // Get available ticket types for dropdown (excluding already selected ones)
    const getAvailableTicketTypes = (currentIndex: number) => {
        const currentPurchase = ticketPurchases[currentIndex];
        const selectedTypeIds = ticketPurchases
            .filter((_, i) => i !== currentIndex)
            .map(p => p.type_id);

        return ticketTypes.filter(tt =>
            tt.type_id === currentPurchase.type_id || !selectedTypeIds.includes(tt.type_id)
        );
    };

    const closeNotification = () => {
        setNotification(null);
    };

    const printTicket = (ticket: any) => {
        const concert = concerts.find(c => c.concert_id === selectedConcertId);
        if (!concert) return;

        const printableContent = `
      <html>
        <head>
          <title>Ticket - ${ticket.ticket_id}</title>
          <style>
            body { font-family: sans-serif; margin: 2rem; }
            .ticket { border: 2px solid #000; padding: 1.5rem; text-align: center; max-width: 400px; margin: auto; }
            h1 { font-size: 1.8rem; margin: 0; }
            h2 { font-size: 1.3rem; margin-top: 0.5rem; }
            p { margin: 0.5rem 0; }
            .qr-code { margin-top: 1rem; }
            .ticket-id { font-family: monospace; background: #eee; padding: 0.5rem; display: inline-block; margin-top: 1rem; }
          </style>
        </head>
        <body>
          <div class="ticket">
            <h1>${concert.name}</h1>
            <h2>${concert.venues.name}</h2>
            <p>${new Date(concert.concert_date).toLocaleString()}</p>
            <p><strong>${ticket.ticket_type_name}</strong></p>
            <div class="qr-code">
              <img src="https://api.qrserver.com/v1/create-qr-code/?data=${ticket.ticket_id}&size=200x200" alt="QR Code" />
            </div>
            <p class="ticket-id">${ticket.ticket_id}</p>
          </div>
        </body>
      </html>
    `;

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(printableContent);
            printWindow.document.close();
            printWindow.focus();
            // Delay print to allow QR code image to load
            setTimeout(() => {
                printWindow.print();
            }, 500);
        }
    };

    const saveTicketAsImage = async (ticket: any) => {
        const element = document.getElementById(`ticket-${ticket.ticket_id}`);
        if (!element) return;

        // Temporarily make the element visible to render it
        element.style.display = 'block';

        const canvas = await html2canvas(element, {
            scale: 2, // Higher scale for better quality
            useCORS: true,
            backgroundColor: '#ffffff'
        });

        // Hide it again
        element.style.display = 'none';

        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `ticket-${ticket.ticket_id}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8">
            {notification && <NotificationPopup type={notification.type} message={notification.message} onClose={closeNotification} isVisible={true} />}

            {/* Concert Selection */}
            <div className="mb-8 p-6 bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl shadow-inner border border-gray-200">
                <div className="flex items-center mb-4">
                    <div className="bg-blue-600 text-white p-3 rounded-full mr-4">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                    </div>
                    <label htmlFor="concert" className="text-xl sm:text-2xl font-bold text-gray-800">1. Select Concert</label>
                </div>
                <select
                    id="concert"
                    value={selectedConcertId || ''}
                    onChange={(e) => handleConcertChange(parseInt(e.target.value, 10))}
                    className="w-full border-2 border-blue-200 rounded-xl shadow-sm p-3 sm:p-4 text-base sm:text-lg text-gray-800 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 bg-white"
                >
                    <option value="">-- Select a Concert --</option>
                    {concerts.map((concert) => (
                        <option key={concert.concert_id} value={concert.concert_id}>
                            {concert.name} ({new Date(concert.concert_date).toLocaleDateString()}) - {concert.venues.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Customer Information */}
            <div className="mb-8 p-6 bg-gradient-to-br from-gray-50 to-green-50 rounded-xl shadow-inner border border-gray-200">
                <div className="flex items-center mb-4">
                    <div className="bg-green-600 text-white p-3 rounded-full mr-4">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-800">2. Customer Information</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label htmlFor="customerName" className="block text-base sm:text-lg font-semibold text-gray-700 mb-2">Customer Name *</label>
                        <input
                            id="customerName"
                            type="text"
                            value={customerName}
                            onChange={(e) => handleCustomerInfoChange('name', e.target.value)}
                            required
                            className="w-full border-2 border-green-200 rounded-xl shadow-sm p-3 sm:p-4 text-base sm:text-lg text-gray-800 focus:ring-4 focus:ring-green-100 focus:border-green-500 transition-all duration-200 bg-white"
                            placeholder="e.g., John Doe"
                        />
                    </div>
                    <div>
                        <label htmlFor="customerEmail" className="block text-base sm:text-lg font-semibold text-gray-700 mb-2">Email</label>
                        <input
                            id="customerEmail"
                            type="email"
                            value={customerEmail}
                            onChange={(e) => handleCustomerInfoChange('email', e.target.value)}
                            className="w-full border-2 border-green-200 rounded-xl shadow-sm p-3 sm:p-4 text-base sm:text-lg text-gray-800 focus:ring-4 focus:ring-green-100 focus:border-green-500 transition-all duration-200 bg-white"
                            placeholder="e.g., john@example.com"
                        />
                    </div>
                    <div>
                        <label htmlFor="customerPhone" className="block text-base sm:text-lg font-semibold text-gray-700 mb-2">Phone</label>
                        <input
                            id="customerPhone"
                            type="tel"
                            value={customerPhone}
                            onChange={(e) => handleCustomerInfoChange('phone', e.target.value)}
                            className="w-full border-2 border-green-200 rounded-xl shadow-sm p-3 sm:p-4 text-base sm:text-lg text-gray-800 focus:ring-4 focus:ring-green-100 focus:border-green-500 transition-all duration-200 bg-white"
                            placeholder="e.g., 123-456-7890"
                        />
                    </div>
                </div>
            </div>

            {/* Ticket Purchases */}
            <div className="mb-8 p-6 bg-gradient-to-br from-gray-50 to-purple-50 rounded-xl shadow-inner border border-gray-200">
                <div className="flex items-center mb-4">
                    <div className="bg-purple-600 text-white p-3 rounded-full mr-4">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-800">3. Ticket Selection</h2>
                </div>

                <div className="space-y-4">
                    {ticketPurchases.map((purchase, index) => (
                        <div key={index} className="bg-white p-4 rounded-lg shadow-md border border-gray-200 grid grid-cols-1 sm:grid-cols-5 gap-4 items-end">
                            {/* Ticket Type */}
                            <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Ticket Type (Avail: {purchase.available})</label>
                                <select
                                    value={purchase.type_id}
                                    onChange={(e) => handleTicketTypeChange(index, parseInt(e.target.value))}
                                    className="w-full border-gray-300 rounded-md shadow-sm p-2 text-base focus:ring-purple-500 focus:border-purple-500"
                                >
                                    {getAvailableTicketTypes(index).map((tt) => (
                                        <option key={tt.type_id} value={tt.type_id}>{tt.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Quantity */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                                <input
                                    type="number"
                                    min="1"
                                    max={purchase.available}
                                    value={purchase.quantity}
                                    onChange={(e) => handleTicketQuantityChange(index, parseInt(e.target.value))}
                                    className="w-full border-gray-300 rounded-md shadow-sm p-2 text-base focus:ring-purple-500 focus:border-purple-500"
                                />
                            </div>

                            {/* Price */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Price/Ticket</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={purchase.price_per_ticket}
                                    onChange={(e) => handleTicketPriceChange(index, parseFloat(e.target.value))}
                                    className="w-full border-gray-300 rounded-md shadow-sm p-2 text-base focus:ring-purple-500 focus:border-purple-500"
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-between">
                                <p className="text-lg font-bold text-purple-700">
                                    ${purchase.total_price.toFixed(2)}
                                </p>
                                <button type="button" onClick={() => removeTicketPurchase(index)} className="text-red-600 hover:text-red-800 p-2">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <button
                    type="button"
                    onClick={addTicketPurchase}
                    disabled={!selectedConcertId || ticketTypes.length === 0}
                    className="mt-6 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-semibold py-3 px-5 rounded-lg hover:from-purple-600 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                >
                    <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Add Ticket Type
                </button>
            </div>

            {/* Total */}
            <div className="mt-8 text-center">
                <div className="inline-block bg-gray-800 text-white rounded-xl shadow-2xl p-6">
                    <p className="text-lg sm:text-xl font-medium text-gray-300">Total Amount</p>
                    <p className="text-4xl sm:text-5xl font-bold tracking-tight">${calculateTotal().toFixed(2)}</p>
                </div>
            </div>

            {/* Submit */}
            <div className="mt-8 pt-8 border-t-2 border-dashed border-gray-200 text-center">
                <button
                    type="submit"
                    disabled={isSubmitting || ticketPurchases.length === 0}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-4 px-10 rounded-xl hover:from-green-600 hover:to-emerald-700 text-xl sm:text-2xl transition-all duration-200 shadow-xl hover:shadow-2xl transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                >
                    {isSubmitting ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Processing...
                        </>
                    ) : (
                        <>
                            <svg className="w-6 h-6 inline mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Complete Sale
                        </>
                    )}
                </button>
            </div>
        </form>
    );
} 