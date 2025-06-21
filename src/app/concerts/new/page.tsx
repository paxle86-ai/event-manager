// src/app/concerts/new/page.tsx

import { createClient } from "../../../lib/supabase/server";
import { redirect } from "next/navigation";
import ConcertForm from "../../../components/ConcertForm";
import { type Venue } from "../../../lib/types";
import { revalidatePath } from "next/cache";
import Link from "next/link";

// Định nghĩa kiểu dữ liệu cho object mà action sẽ nhận
type ConcertFormData = {
    name: string;
    concert_date: string;
    venue_id: number;
    image_url: string;
    ticketTypes: { name: string; price: number; total_quantity: number }[];
};

export default async function NewConcertPage() {
    const supabase = await createClient();

    // 1. Kiểm tra quyền Admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return redirect('/login');
    }

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

    // 2. Lấy danh sách địa điểm để truyền vào form
    const { data: venues } = await supabase.from('venues').select('venue_id, name');

    // 3. Định nghĩa Server Action
    async function createConcertAction(data: ConcertFormData) {
        'use server';

        const supabase = await createClient();

        // Validate ticket types data
        if (!data.ticketTypes || data.ticketTypes.length === 0) {
            return { success: false, message: 'At least one ticket type is required' };
        }

        // Filter out empty ticket types
        const validTicketTypes = data.ticketTypes.filter(tt =>
            tt.name && tt.name.trim() !== '' &&
            tt.price > 0 &&
            tt.total_quantity > 0
        );

        if (validTicketTypes.length === 0) {
            return { success: false, message: 'At least one valid ticket type is required' };
        }

        // Create concert first
        const { data: newConcert, error: concertError } = await supabase
            .from('concerts')
            .insert({
                name: data.name,
                concert_date: data.concert_date,
                venue_id: data.venue_id,
                image_url: data.image_url
            })
            .select()
            .single();

        if (concertError) {
            console.error('Error creating concert:', concertError);
            return { success: false, message: `Failed to create concert: ${concertError.message}` };
        }

        // Create ticket types
        const ticketTypesToInsert = validTicketTypes.map(tt => ({
            name: tt.name.trim(),
            price: parseFloat(tt.price.toString()),
            total_quantity: parseInt(tt.total_quantity.toString()),
            concert_id: newConcert.concert_id
        }));

        const { error: ticketError } = await supabase
            .from('ticket_types')
            .insert(ticketTypesToInsert);

        if (ticketError) {
            console.error('Error creating ticket types:', ticketError);
            // Rollback: delete the concert if ticket creation fails
            await supabase.from('concerts').delete().eq('concert_id', newConcert.concert_id);
            return { success: false, message: `Failed to create ticket types: ${ticketError.message || 'Unknown error'}` };
        }

        // Xóa cache của trang chủ để nó load lại danh sách concert mới
        revalidatePath('/');

        console.log('Successfully created concert with ID:', newConcert.concert_id);
        return { success: true, message: `Concert created successfully! New Concert ID: ${newConcert.concert_id}` };
    }

    return (
        <div className="container mx-auto p-8 max-w-4xl">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-4xl font-bold text-gray-800">Create a New Concert</h1>
                <Link href="/" className="bg-gray-600 text-white py-3 px-6 rounded-lg hover:bg-gray-700 font-semibold text-lg transition-colors duration-200 shadow-md">
                    ← Back to Dashboard
                </Link>
            </div>
            <ConcertForm venues={venues as Venue[] || []} onFormSubmit={createConcertAction} />
        </div>
    );
}