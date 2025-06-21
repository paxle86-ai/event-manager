'use client';

import QRCodeComponent from './QRCode';

interface Ticket {
    ticket_id: string;
    ticket_number: number;
    ticket_type_name: string;
    purchase_id: number;
    customer_name?: string;
    concert_name?: string;
    concert_date?: string;
    venue_name?: string;
}

interface PrintableTicketProps {
    ticket: Ticket;
    className?: string;
}

export default function PrintableTicket({ ticket, className = '' }: PrintableTicketProps) {
    return (
        <div className={`bg-white border-2 border-gray-300 rounded-lg p-6 max-w-sm mx-auto ${className}`}>
            {/* Header */}
            <div className="text-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">Event Ticket</h2>
                <div className="w-16 h-1 bg-gradient-to-r from-blue-500 to-purple-600 mx-auto mt-2"></div>
            </div>

            {/* Concert Information */}
            {ticket.concert_name && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 rounded-lg p-4 mb-4">
                    <div className="space-y-2">
                        <div className="text-center">
                            <h3 className="font-bold text-lg text-blue-900">{ticket.concert_name}</h3>
                        </div>
                        {ticket.venue_name && (
                            <div className="flex items-center justify-center text-blue-800">
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                </svg>
                                <span className="font-medium">{ticket.venue_name}</span>
                            </div>
                        )}
                        {ticket.concert_date && (
                            <div className="flex items-center justify-center text-blue-800">
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span className="font-medium">
                                    {new Date(ticket.concert_date).toLocaleDateString('en-US', {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                    })}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* QR Code */}
            <div className="flex justify-center mb-4">
                <QRCodeComponent
                    value={ticket.ticket_id}
                    size={150}
                    className="bg-white p-3 rounded-lg border border-gray-200"
                />
            </div>

            {/* Ticket Information */}
            <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-700">Ticket ID:</span>
                    <span className="font-mono text-gray-800">{ticket.ticket_id}</span>
                </div>

                <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-700">Ticket Type:</span>
                    <span className="text-gray-800">{ticket.ticket_type_name}</span>
                </div>

                <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-700">Ticket #:</span>
                    <span className="text-gray-800">{ticket.ticket_number}</span>
                </div>

                {ticket.customer_name && (
                    <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-700">Customer:</span>
                        <span className="text-gray-800">{ticket.customer_name}</span>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-gray-200 text-center">
                <p className="text-xs text-gray-600">
                    Scan QR code or enter Ticket ID for check-in
                </p>
                <p className="text-xs text-gray-500 mt-1">
                    Purchase ID: {ticket.purchase_id}
                </p>
            </div>
        </div>
    );
} 