'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface QRCodeGeneratorProps {
    purchaseId: number;
    quantity: number;
    customerName: string;
    ticketTypeName: string;
}

interface UniqueTicket {
    ticket_id: string;
    ticket_number: number;
}

export default function QRCodeGenerator({ purchaseId, quantity, customerName, ticketTypeName }: QRCodeGeneratorProps) {
    const [selectedTicket, setSelectedTicket] = useState<UniqueTicket | null>(null);
    const [uniqueTickets, setUniqueTickets] = useState<UniqueTicket[]>([]);
    const [loading, setLoading] = useState(true);

    const supabase = createClient();

    // Fetch unique tickets for this purchase
    useEffect(() => {
        const fetchUniqueTickets = async () => {
            try {
                const { data: tickets, error } = await supabase
                    .from('unique_tickets')
                    .select('ticket_id, ticket_number')
                    .eq('purchase_id', purchaseId)
                    .order('ticket_number');

                if (error) {
                    console.error('Error fetching unique tickets:', error);
                    return;
                }

                setUniqueTickets(tickets || []);
                if (tickets && tickets.length > 0) {
                    setSelectedTicket(tickets[0]);
                }
            } catch (error) {
                console.error('Error:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchUniqueTickets();
    }, [purchaseId, supabase]);

    const generateQRCode = (ticketId: string) => {
        // Simple QR code generation using a free API
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(ticketId)}`;
        return qrUrl;
    };

    if (loading) {
        return (
            <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
                <div className="flex items-center mb-6">
                    <div className="bg-blue-100 p-2 rounded-full mr-3">
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V6a1 1 0 00-1-1H5a1 1 0 00-1 1v1a1 1 0 001 1zm12 0h2a1 1 0 001-1V6a1 1 0 00-1-1h-2a1 1 0 00-1 1v1a1 1 0 001 1zM5 20h2a1 1 0 001-1v-1a1 1 0 00-1-1H5a1 1 0 00-1 1v1a1 1 0 001 1z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800">QR Code Generator</h2>
                </div>
                <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading tickets...</p>
                </div>
            </div>
        );
    }

    if (uniqueTickets.length === 0) {
        return (
            <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
                <div className="flex items-center mb-6">
                    <div className="bg-blue-100 p-2 rounded-full mr-3">
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V6a1 1 0 00-1-1H5a1 1 0 00-1 1v1a1 1 0 001 1zm12 0h2a1 1 0 001-1V6a1 1 0 00-1-1h-2a1 1 0 00-1 1v1a1 1 0 001 1zM5 20h2a1 1 0 001-1v-1a1 1 0 00-1-1H5a1 1 0 00-1 1v1a1 1 0 001 1z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800">QR Code Generator</h2>
                </div>
                <div className="text-center py-8">
                    <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-gray-500">No unique tickets found for this purchase</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
            <div className="flex items-center mb-6">
                <div className="bg-blue-100 p-2 rounded-full mr-3">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V6a1 1 0 00-1-1H5a1 1 0 00-1 1v1a1 1 0 001 1zm12 0h2a1 1 0 001-1V6a1 1 0 00-1-1h-2a1 1 0 00-1 1v1a1 1 0 001 1zM5 20h2a1 1 0 001-1v-1a1 1 0 00-1-1H5a1 1 0 00-1 1v1a1 1 0 001 1z" />
                    </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800">QR Code Generator</h2>
            </div>

            <div className="space-y-6">
                {/* Ticket Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-800 mb-2">Ticket Information</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="text-gray-600">Customer:</span>
                            <p className="font-medium">{customerName}</p>
                        </div>
                        <div>
                            <span className="text-gray-600">Ticket Type:</span>
                            <p className="font-medium">{ticketTypeName}</p>
                        </div>
                        <div>
                            <span className="text-gray-600">Purchase ID:</span>
                            <p className="font-medium">{purchaseId}</p>
                        </div>
                        <div>
                            <span className="text-gray-600">Total Tickets:</span>
                            <p className="font-medium">{uniqueTickets.length}</p>
                        </div>
                    </div>
                </div>

                {/* Ticket Selection */}
                <div>
                    <label htmlFor="ticketSelect" className="block text-sm font-medium text-gray-700 mb-2">
                        Select Ticket
                    </label>
                    <select
                        id="ticketSelect"
                        value={selectedTicket?.ticket_id || ''}
                        onChange={(e) => {
                            const ticket = uniqueTickets.find(t => t.ticket_id === e.target.value);
                            setSelectedTicket(ticket || null);
                        }}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    >
                        {uniqueTickets.map((ticket) => (
                            <option key={ticket.ticket_id} value={ticket.ticket_id}>
                                Ticket {ticket.ticket_number} - {ticket.ticket_id}
                            </option>
                        ))}
                    </select>
                </div>

                {/* QR Code Display */}
                {selectedTicket && (
                    <div className="text-center">
                        <div className="bg-white border-2 border-gray-200 rounded-lg p-4 inline-block">
                            <img
                                src={generateQRCode(selectedTicket.ticket_id)}
                                alt={`QR Code for ticket ${selectedTicket.ticket_id}`}
                                className="w-48 h-48"
                            />
                        </div>
                        <p className="mt-4 text-sm text-gray-600">
                            Ticket ID: <code className="bg-gray-100 px-2 py-1 rounded font-mono">{selectedTicket.ticket_id}</code>
                        </p>
                        <p className="mt-2 text-xs text-gray-500">
                            Use this QR code to test the check-in system
                        </p>
                    </div>
                )}

                {/* Instructions */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-800 mb-2">How to Test:</h4>
                    <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                        <li>Go to the check-in page for this concert</li>
                        <li>Switch to "Manual Input" mode</li>
                        <li>Enter the ticket ID shown above: <code className="bg-blue-100 px-1 rounded font-mono">{selectedTicket?.ticket_id}</code></li>
                        <li>Click "Check In Ticket"</li>
                        <li>Try scanning the same ticket again to test duplicate prevention</li>
                    </ol>
                </div>
            </div>
        </div>
    );
} 