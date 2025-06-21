import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const concertId = searchParams.get('concertId');

        if (!concertId) {
            return NextResponse.json({ error: 'Concert ID is required' }, { status: 400 });
        }

        const supabase = await createClient();

        // Get ticket types for the concert
        const { data: ticketTypes, error } = await supabase
            .from('ticket_types')
            .select('*')
            .eq('concert_id', parseInt(concertId, 10))
            .order('price', { ascending: false });

        if (error) {
            console.error('Error fetching ticket types:', error);
            return NextResponse.json({ error: 'Failed to fetch ticket types' }, { status: 500 });
        }

        return NextResponse.json(ticketTypes);
    } catch (error) {
        console.error('Error in ticket-types API:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
} 