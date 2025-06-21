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
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
            <div className="container mx-auto px-4 py-4 sm:py-8">
                {/* Header */}
                <div className="bg-gradient-to-r from-yellow-600 to-orange-600 rounded-2xl shadow-xl p-6 sm:p-8 mb-6 sm:mb-8 text-white">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex items-center">
                            <div className="bg-white bg-opacity-20 p-2 sm:p-3 rounded-full mr-3 sm:mr-4">
                                <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-2xl sm:text-4xl font-bold">Edit Concert</h1>
                                <p className="text-yellow-100 mt-1 text-sm sm:text-base">Update concert information and ticket types</p>
                            </div>
                        </div>
                        <Link href="/" className="w-full sm:w-auto">
                            <button className="bg-white text-yellow-600 hover:bg-yellow-50 font-bold py-3 px-4 sm:px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 w-full sm:w-auto flex items-center justify-center">
                                <svg className="w-4 h-4 sm:w-5 sm:h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                                <span className="sm:inline">Back to Dashboard</span>
                            </button>
                        </Link>
                    </div>
                </div>

                <ConcertEditForm
                    concert={concert as any}
                    ticketTypes={ticketTypes || []}
                    venues={venues as Venue[] || []}
                    onFormSubmit={updateConcertAction}
                />
            </div>
        </div>
    );
} 