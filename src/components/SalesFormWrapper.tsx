'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SalesForm from './SalesForm';

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

export default function SalesFormWrapper({
    concerts,
    initialTicketTypes,
    initialConcertId,
    onFormSubmit
}: {
    concerts: Concert[];
    initialTicketTypes: TicketType[];
    initialConcertId?: string;
    onFormSubmit: (data: SalesData) => Promise<{ success: boolean; message: string }>;
}) {
    const router = useRouter();
    const [selectedConcertId, setSelectedConcertId] = useState<string>(initialConcertId || '');
    const [ticketTypes, setTicketTypes] = useState<TicketType[]>(initialTicketTypes);

    // Fetch ticket types when concert changes
    const fetchTicketTypes = async (concertId: string) => {
        if (!concertId) {
            setTicketTypes([]);
            return;
        }

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

    // Handle concert selection
    const handleConcertChange = async (concertId: string) => {
        setSelectedConcertId(concertId);
        await fetchTicketTypes(concertId);
    };

    // Update URL when concert selection changes
    useEffect(() => {
        if (selectedConcertId) {
            router.push(`/sales/new?concertId=${selectedConcertId}`);
        } else {
            router.push('/sales/new');
        }
    }, [selectedConcertId, router]);

    return (
        <SalesForm
            concerts={concerts}
            ticketTypes={ticketTypes}
            selectedConcertId={selectedConcertId}
            onFormSubmit={onFormSubmit}
        />
    );
} 