'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import NotificationPopup from './NotificationPopup';
import QRCodeComponent from './QRCode';

type Concert = {
    concert_id: number;
    name: string;
    concert_date: string;
    venues: { name: string };
};

type CustomerTicket = {
    ticket_id: string;
    ticket_number: number;
    ticket_type_name: string;
    purchase_id: number;
    customer_name: string;
    concert_name: string;
    concert_date: string;
    venue_name: string;
    checked_in: boolean;
    checked_in_at?: string;
};

interface CustomerTicketSearchProps {
    concerts: Concert[];
}

export default function CustomerTicketSearch({ concerts }: CustomerTicketSearchProps) {
    const [searchType, setSearchType] = useState<'customer' | 'concert'>('customer');
    const [customerName, setCustomerName] = useState('');
    const [selectedConcertId, setSelectedConcertId] = useState<number | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [tickets, setTickets] = useState<CustomerTicket[]>([]);
    const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const supabase = createClient();

    const searchTickets = async () => {
        if (searchType === 'customer' && !customerName.trim()) {
            setNotification({
                type: 'error',
                message: 'Please enter a customer name'
            });
            return;
        }

        if (searchType === 'concert' && !selectedConcertId) {
            setNotification({
                type: 'error',
                message: 'Please select a concert'
            });
            return;
        }

        setIsSearching(true);
        setTickets([]);

        try {
            let query = supabase
                .from('unique_tickets')
                .select(`
                    ticket_id,
                    ticket_number,
                    ticket_purchases!inner(
                        ticket_types!inner(name),
                        sales!inner(
                            customer_name,
                            concerts!inner(
                                name,
                                concert_date,
                                venues!inner(name)
                            )
                        )
                    )
                `)
                .order('ticket_number');

            if (searchType === 'customer') {
                query = query.eq('ticket_purchases.sales.customer_name', customerName.trim());
            } else {
                query = query.eq('ticket_purchases.sales.concerts.concert_id', selectedConcertId);
            }

            const { data: ticketData, error } = await query;

            if (error) {
                console.error('Error searching tickets:', error);
                setNotification({
                    type: 'error',
                    message: 'Failed to search tickets'
                });
                return;
            }

            // Get check-in status for each ticket
            const ticketsWithCheckIn: CustomerTicket[] = [];

            for (const ticket of ticketData || []) {
                const ticketInfo = ticket.ticket_purchases as unknown as {
                    ticket_types: { name: string };
                    sales: {
                        customer_name: string;
                        concerts: {
                            name: string;
                            concert_date: string;
                            venues: { name: string };
                        };
                    };
                };

                // Check if ticket is checked in
                const { data: checkIn } = await supabase
                    .from('check_ins')
                    .select('checked_in_at')
                    .eq('ticket_id', ticket.ticket_id)
                    .single();

                ticketsWithCheckIn.push({
                    ticket_id: ticket.ticket_id,
                    ticket_number: ticket.ticket_number,
                    ticket_type_name: ticketInfo.ticket_types.name,
                    purchase_id: (ticket as any).purchase_id,
                    customer_name: ticketInfo.sales.customer_name,
                    concert_name: ticketInfo.sales.concerts.name,
                    concert_date: ticketInfo.sales.concerts.concert_date,
                    venue_name: ticketInfo.sales.concerts.venues.name,
                    checked_in: !!checkIn,
                    checked_in_at: checkIn?.checked_in_at
                });
            }

            setTickets(ticketsWithCheckIn);

            if (ticketsWithCheckIn.length === 0) {
                setNotification({
                    type: 'error',
                    message: searchType === 'customer'
                        ? `No tickets found for customer "${customerName}"`
                        : 'No tickets found for this concert'
                });
            } else {
                setNotification({
                    type: 'success',
                    message: `Found ${ticketsWithCheckIn.length} ticket(s)`
                });
            }

        } catch (error) {
            console.error('Search error:', error);
            setNotification({
                type: 'error',
                message: 'An error occurred during search'
            });
        } finally {
            setIsSearching(false);
        }
    };

    const clearSearch = () => {
        setCustomerName('');
        setSelectedConcertId(null);
        setTickets([]);
        setNotification(null);
    };

    return (
        <div className="space-y-6 sm:space-y-8">
            {/* Search Form */}
            <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 border border-gray-100">
                <div className="flex items-center mb-6">
                    <div className="bg-blue-100 p-3 rounded-full mr-4">
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Search Tickets</h2>
                </div>

                {/* Search Type Toggle */}
                <div className="flex bg-gray-100 rounded-full p-1 mb-6">
                    <button
                        onClick={() => setSearchType('customer')}
                        className={`flex-1 py-2 px-4 rounded-full font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${searchType === 'customer'
                            ? 'bg-white text-blue-600 shadow'
                            : 'text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        By Customer
                    </button>
                    <button
                        onClick={() => setSearchType('concert')}
                        className={`flex-1 py-2 px-4 rounded-full font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${searchType === 'concert'
                            ? 'bg-white text-blue-600 shadow'
                            : 'text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                        By Concert
                    </button>
                </div>

                {/* Search Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                    <div className="sm:col-span-2">
                        {searchType === 'customer' ? (
                            <div>
                                <label htmlFor="customerName" className="block text-base font-semibold text-gray-700 mb-2">Customer Name</label>
                                <input
                                    type="text"
                                    id="customerName"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    placeholder="Enter full customer name"
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-500 text-gray-900 placeholder-gray-500 transition-all"
                                />
                            </div>
                        ) : (
                            <div>
                                <label htmlFor="concert" className="block text-base font-semibold text-gray-700 mb-2">Select Concert</label>
                                <select
                                    id="concert"
                                    value={selectedConcertId || ''}
                                    onChange={(e) => setSelectedConcertId(parseInt(e.target.value) || null)}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-500 text-gray-900 transition-all"
                                >
                                    <option value="">-- Select a Concert --</option>
                                    {concerts.map((concert) => (
                                        <option key={concert.concert_id} value={concert.concert_id}>
                                            {concert.name} ({new Date(concert.concert_date).toLocaleDateString()})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Search Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            onClick={searchTickets}
                            disabled={isSearching}
                            className="w-full sm:w-auto flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-xl hover:from-blue-700 hover:to-purple-700 font-bold text-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50"
                        >
                            {isSearching ? 'Searching...' : 'Search'}
                        </button>
                        <button
                            onClick={clearSearch}
                            className="w-full sm:w-auto bg-gray-200 text-gray-700 py-3 px-4 rounded-xl hover:bg-gray-300 font-semibold transition-colors"
                        >
                            Clear
                        </button>
                    </div>
                </div>
            </div>

            {notification && <NotificationPopup type={notification.type} message={notification.message} onClose={() => setNotification(null)} isVisible={true} />}

            {/* Search Results */}
            {tickets.length > 0 && (
                <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 mt-8 border border-gray-100">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-6">Search Results ({tickets.length})</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {tickets.map((ticket) => (
                            <div key={ticket.ticket_id} className="bg-gray-50 rounded-xl shadow-lg border border-gray-200 p-5 relative">
                                <div className={`absolute top-3 right-3 px-2.5 py-1 text-xs font-bold text-white rounded-full ${ticket.checked_in ? 'bg-green-500' : 'bg-yellow-500'
                                    }`}>
                                    {ticket.checked_in ? 'CHECKED-IN' : 'NOT CHECKED-IN'}
                                </div>

                                <div className="text-center mb-4">
                                    <h3 className="text-lg font-bold text-gray-800 truncate">{ticket.concert_name}</h3>
                                    <p className="text-sm text-gray-500">{new Date(ticket.concert_date).toLocaleString()}</p>
                                </div>

                                <div className="flex justify-center my-4">
                                    <QRCodeComponent value={ticket.ticket_id} size={140} className="bg-white p-2 rounded-lg" />
                                </div>
                                <div className="font-mono text-xs bg-gray-200 px-3 py-1.5 rounded-full inline-block text-gray-800 text-center w-full truncate">
                                    {ticket.ticket_id}
                                </div>

                                <div className="mt-4 pt-4 border-t border-dashed">
                                    <div className="space-y-2 text-sm">
                                        <div>
                                            <span className="font-semibold text-gray-800">Customer:</span>
                                            <p className="text-gray-600 truncate">{ticket.customer_name}</p>
                                        </div>
                                        <div>
                                            <span className="font-semibold text-gray-800">Ticket Type:</span>
                                            <p className="text-gray-600">{ticket.ticket_type_name}</p>
                                        </div>
                                        {ticket.checked_in_at && (
                                            <div>
                                                <span className="font-semibold text-gray-800">Checked-in At:</span>
                                                <p className="text-gray-600">{new Date(ticket.checked_in_at).toLocaleString()}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
} 