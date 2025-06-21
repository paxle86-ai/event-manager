'use client';

import QRCodeComponent from './QRCode';
import { useMediaQuery } from 'react-responsive';

export default function AdminTicketQRCode({ ticketId }: { ticketId: string }) {
    const isMobile = useMediaQuery({ query: '(max-width: 640px)' });
    const qrSize = isMobile ? 48 : 64;

    return (
        <QRCodeComponent
            value={ticketId}
            size={qrSize}
            className="bg-white p-1 rounded-md shadow-sm"
        />
    );
} 