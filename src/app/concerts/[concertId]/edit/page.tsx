import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import ConcertEditForm from "../../../../components/ConcertEditForm";
import { type Venue } from "@/lib/types";
import { revalidatePath } from "next/cache";
import Link from "next/link";

type ConcertFormData = {
    name: string;
    concert_date: string;
    venue_id: number;
    image_url: string;
    ticketTypes: { name: string; price: number; total_quantity: number }[];
};

export default async function EditConcertPage({
    params
}: {
    params: Promise<{ concertId: string }>
}) {
    const { concertId } = await params;
    const supabase = await createClient();

    // 1. Kiểm tra quyền Admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return redirect('/login');

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'admin') {
        return (
            <div className="container mx-auto p-8 text-center">
                <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
                <p>You do not have permission to view this page.</p>
            </div>
        );
    }

    // 2. Lấy thông tin concert
    const { data: concert, error: concertError } = await supabase
        .from('concerts')
        .select(`
            concert_id,
            name,
            concert_date,
            venue_id,
            image_url,
            venues (venue_id, name)
        `)
        .eq('concert_id', concertId)
        .single();

    if (concertError || !concert) {
        notFound();
    }

    // 3. Lấy danh sách ticket types của concert
    const { data: ticketTypes, error: ticketError } = await supabase
        .from('ticket_types')
        .select('*')
        .eq('concert_id', concertId)
        .order('name');

    if (ticketError) {
        console.error('Error fetching ticket types:', ticketError);
    }

    // 4. Lấy danh sách địa điểm
    const { data: venues } = await supabase.from('venues').select('venue_id, name');

    // 5. Server Action để update concert
    async function updateConcertAction(data: ConcertFormData) {
        'use server';

        const supabase = await createClient();

        // Validate ticket types data
        if (!data.ticketTypes || data.ticketTypes.length === 0) {
            return { success: false, message: 'At least one ticket type is required' };
        }

        const validTicketTypes = data.ticketTypes.filter(tt =>
            tt.name && tt.name.trim() !== '' &&
            tt.price > 0 &&
            tt.total_quantity > 0
        );

        if (validTicketTypes.length === 0) {
            return { success: false, message: 'At least one valid ticket type is required' };
        }

        // Update concert
        const { error: concertError } = await supabase
            .from('concerts')
            .update({
                name: data.name,
                concert_date: data.concert_date,
                venue_id: data.venue_id,
                image_url: data.image_url
            })
            .eq('concert_id', concertId);

        if (concertError) {
            console.error('Error updating concert:', concertError);
            return { success: false, message: `Failed to update concert: ${concertError.message}` };
        }

        // Delete existing ticket types
        const { error: deleteError } = await supabase
            .from('ticket_types')
            .delete()
            .eq('concert_id', concertId);

        if (deleteError) {
            console.error('Error deleting existing ticket types:', deleteError);
            return { success: false, message: `Failed to update ticket types: ${deleteError.message}` };
        }

        // Create new ticket types
        const ticketTypesToInsert = validTicketTypes.map(tt => ({
            name: tt.name.trim(),
            price: parseFloat(tt.price.toString()),
            total_quantity: parseInt(tt.total_quantity.toString()),
            concert_id: parseInt(concertId)
        }));

        const { error: ticketError } = await supabase
            .from('ticket_types')
            .insert(ticketTypesToInsert);

        if (ticketError) {
            console.error('Error creating ticket types:', ticketError);
            return { success: false, message: `Failed to create ticket types: ${ticketError.message || 'Unknown error'}` };
        }

        // Revalidate cache
        revalidatePath('/');
        revalidatePath(`/concerts/${concertId}/edit`);

        return { success: true, message: 'Concert updated successfully!' };
    }

    return (
        <div className="container mx-auto p-8 max-w-4xl">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-4xl font-bold text-gray-800">Edit Concert</h1>
                <Link href="/" className="bg-gray-600 text-white py-3 px-6 rounded-lg hover:bg-gray-700 font-semibold text-lg transition-colors duration-200 shadow-md">
                    ← Back to Dashboard
                </Link>
            </div>

            <ConcertEditForm
                concert={concert as any}
                ticketTypes={ticketTypes || []}
                venues={venues as Venue[] || []}
                onFormSubmit={updateConcertAction}
            />
        </div>
    );
} 