'use client';

import { useState, useRef, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import NotificationPopup from './NotificationPopup';
import QRCodeScanner from './QRCodeScanner';

interface CheckInFormProps {
    concertId: string;
    concertName: string;
}

interface TicketInfo {
    purchase_id: number;
    sale_id: number;
    customer_name: string;
    ticket_type_name: string;
    quantity: number;
    price_per_ticket: number;
    total_price: number;
    checked_in_count: number;
    ticket_id: string;
    ticket_number: string;
}

interface CheckInResult {
    success: boolean;
    message: string;
    ticketInfo?: TicketInfo;
}

export default function CheckInForm({ concertId, concertName }: CheckInFormProps) {
    const [scanMode, setScanMode] = useState<'qr' | 'manual'>('qr');
    const [manualInput, setManualInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [recentCheckIns, setRecentCheckIns] = useState<CheckInResult[]>([]);

    const supabase = createClient();

    // Process ticket check-in
    const processCheckIn = async (ticketId: string): Promise<CheckInResult> => {
        try {
            // Validate ticket ID format (12 characters, alphanumeric)
            if (!ticketId || ticketId.length !== 12 || !/^[A-Z0-9]{12}$/.test(ticketId)) {
                return {
                    success: false,
                    message: 'Invalid ticket ID format. Must be 12 characters (A-Z, 0-9)'
                };
            }

            // Get ticket information
            const { data: ticketInfo, error: ticketError } = await supabase
                .from('unique_tickets')
                .select(`
                    ticket_id,
                    purchase_id,
                    ticket_number,
                    ticket_purchases!inner(
                        sale_id,
                        quantity,
                        price_per_ticket,
                        total_price,
                        sales!inner(
                            concert_id,
                            customer_name
                        ),
                        ticket_types!inner(
                            name
                        )
                    )
                `)
                .eq('ticket_id', ticketId)
                .eq('ticket_purchases.sales.concert_id', concertId)
                .single();

            if (ticketError || !ticketInfo) {
                return {
                    success: false,
                    message: 'Ticket not found for this concert'
                };
            }

            // Type the nested objects properly
            const purchaseData = ticketInfo.ticket_purchases as unknown as {
                sale_id: number;
                quantity: number;
                price_per_ticket: number;
                total_price: number;
                sales: { concert_id: number; customer_name: string };
                ticket_types: { name: string };
            };

            // Check if already checked in
            const { data: existingCheckIn } = await supabase
                .from('check_ins')
                .select('check_in_id')
                .eq('ticket_id', ticketId)
                .single();

            if (existingCheckIn) {
                return {
                    success: false,
                    message: 'Ticket already checked in'
                };
            }

            // Get current user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                return {
                    success: false,
                    message: 'Authentication required'
                };
            }

            // Perform check-in
            const { error: checkInError } = await supabase
                .from('check_ins')
                .insert({
                    ticket_id: ticketId,
                    checked_in_by: user.id,
                    notes: `Checked in for ${concertName}`
                });

            if (checkInError) {
                return {
                    success: false,
                    message: 'Failed to check in ticket'
                };
            }

            // Get check-in count for this purchase
            const { data: checkInCount } = await supabase
                .from('check_ins')
                .select('check_in_id')
                .eq('ticket_id', ticketId);

            return {
                success: true,
                message: `Successfully checked in ticket ${ticketInfo.ticket_id}`,
                ticketInfo: {
                    purchase_id: ticketInfo.purchase_id,
                    sale_id: purchaseData.sale_id,
                    customer_name: purchaseData.sales.customer_name,
                    ticket_type_name: purchaseData.ticket_types.name,
                    quantity: purchaseData.quantity,
                    price_per_ticket: purchaseData.price_per_ticket,
                    total_price: purchaseData.total_price,
                    checked_in_count: checkInCount?.length || 0,
                    ticket_id: ticketInfo.ticket_id,
                    ticket_number: ticketInfo.ticket_number,
                }
            };

        } catch (error) {
            console.error('Check-in error:', error);
            return {
                success: false,
                message: 'An error occurred during check-in'
            };
        }
    };

    // Handle manual input submission
    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualInput.trim()) return;

        setIsProcessing(true);
        const result = await processCheckIn(manualInput.trim());

        setNotification({
            type: result.success ? 'success' : 'error',
            message: result.message
        });

        if (result.success) {
            setRecentCheckIns(prev => [result, ...prev.slice(0, 4)]);
            setManualInput('');
        }

        setIsProcessing(false);
    };

    // Handle QR code scan (simulated)
    const handleQRScan = async (ticketId: string) => {
        setIsProcessing(true);
        const result = await processCheckIn(ticketId);

        setNotification({
            type: result.success ? 'success' : 'error',
            message: result.message
        });

        if (result.success) {
            setRecentCheckIns(prev => [result, ...prev.slice(0, 4)]);
        }

        setIsProcessing(false);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            {/* Left Column: Scanner and Input */}
            <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 border border-gray-100">
                {/* Mode Toggle */}
                <div className="flex bg-gray-100 rounded-full p-1 mb-6">
                    <button
                        onClick={() => setScanMode('qr')}
                        className={`flex-1 py-2 px-4 rounded-full font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${scanMode === 'qr'
                            ? 'bg-white text-green-600 shadow'
                            : 'text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V6a1 1 0 00-1-1H5a1 1 0 00-1 1v1a1 1 0 001 1zm12 0h2a1 1 0 001-1V6a1 1 0 00-1-1h-2a1 1 0 00-1 1v1a1 1 0 001 1zM5 20h2a1 1 0 001-1v-1a1 1 0 00-1-1H5a1 1 0 00-1 1v1a1 1 0 001 1z" /></svg>
                        Scan QR
                    </button>
                    <button
                        onClick={() => setScanMode('manual')}
                        className={`flex-1 py-2 px-4 rounded-full font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${scanMode === 'manual'
                            ? 'bg-white text-blue-600 shadow'
                            : 'text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        Manual Input
                    </button>
                </div>

                {scanMode === 'qr' ? (
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 text-center mb-4">Scan Ticket QR Code</h2>
                        <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-square max-w-sm mx-auto shadow-lg">
                            <QRCodeScanner
                                onScan={handleQRScan}
                                onError={(error) => {
                                    console.error('QR Scanner error:', error);
                                    setNotification({ type: 'error', message: 'QR Scanner Error: ' + error });
                                }}
                            />
                        </div>
                        {isProcessing && (
                            <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
                                <div className="text-center">
                                    <svg className="animate-spin h-8 w-8 text-green-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <p className="mt-2 font-semibold text-green-700">Processing...</p>
                                </div>
                            </div>
                        )}
                        <p className="text-center text-gray-500 mt-4 text-sm">Position the QR code inside the frame.</p>
                    </div>
                ) : (
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 text-center mb-4">Enter Ticket ID Manually</h2>
                        <form onSubmit={handleManualSubmit} className="space-y-4">
                            <input
                                type="text"
                                value={manualInput}
                                onChange={(e) => setManualInput(e.target.value.toUpperCase())}
                                placeholder="Enter 12-character Ticket ID"
                                maxLength={12}
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl shadow-sm text-center font-mono text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-500 transition-all"
                            />
                            <button
                                type="submit"
                                disabled={isProcessing || manualInput.length !== 12}
                                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 font-bold text-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isProcessing ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Checking...
                                    </>
                                ) : 'Check In Ticket'}
                            </button>
                        </form>
                    </div>
                )}
            </div>

            {/* Right Column: Recent Check-ins */}
            <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 border border-gray-100">
                <div className="flex items-center mb-6">
                    <div className="bg-blue-100 p-3 rounded-full mr-4">
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800">Recent Check-ins</h2>
                </div>
                {notification && <NotificationPopup type={notification.type} message={notification.message} onClose={() => setNotification(null)} isVisible={true} />}

                {recentCheckIns.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">No check-ins yet</h3>
                        <p className="text-gray-600">Scan a ticket to get started</p>
                    </div>
                ) : (
                    <ul className="space-y-4">
                        {recentCheckIns.map((result, index) => (
                            <li
                                key={index}
                                className={`p-4 rounded-lg shadow-md transition-all duration-300 ${result.success
                                    ? 'bg-green-50 border-l-4 border-green-500'
                                    : 'bg-red-50 border-l-4 border-red-500'
                                    }`}
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                                    <p className={`font-bold text-lg ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                                        {result.success ? 'Success' : 'Failed'}
                                    </p>
                                    <p className="text-xs text-gray-500 font-mono">{new Date().toLocaleTimeString()}</p>
                                </div>
                                <p className="text-sm text-gray-700 mt-1">{result.message}</p>
                                {result.ticketInfo && (
                                    <div className="mt-3 pt-3 border-t border-dashed">
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                            <div>
                                                <span className="font-semibold text-gray-800">Customer:</span>
                                                <p className="text-gray-600">{result.ticketInfo.customer_name}</p>
                                            </div>
                                            <div>
                                                <span className="font-semibold text-gray-800">Type:</span>
                                                <p className="text-gray-600">{result.ticketInfo.ticket_type_name}</p>
                                            </div>
                                            <div>
                                                <span className="font-semibold text-gray-800">Ticket ID:</span>
                                                <p className="text-gray-600 font-mono text-xs">{result.ticketInfo.ticket_id}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
} 