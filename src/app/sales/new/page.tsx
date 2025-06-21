// src/app/sales/new/page.tsx

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SalesFormWrapper from "../../../components/SalesFormWrapper";
import { revalidatePath } from "next/cache";
import Link from "next/link";

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

type TicketType = {
    type_id: number;
    name: string;
    price: number;
    total_quantity: number;
    concert_id: number;
};

export default async function NewSalePage({
    searchParams
}: {
    searchParams: Promise<{ concertId?: string }>
}) {
    const supabase = await createClient();
    const params = await searchParams;

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

    // 2. Lấy danh sách concerts (chỉ những concert sắp diễn ra)
    const { data: concerts, error: concertsError } = await supabase
        .from('concerts')
        .select(`
            concert_id,
            name,
            concert_date,
            venues (name)
        `)
        .gte('concert_date', new Date().toISOString())
        .order('concert_date', { ascending: true });

    if (concertsError) {
        console.error('Error fetching concerts:', concertsError);
    }

    // 3. Lấy ticket types cho concert được chọn (nếu có)
    let ticketTypes = [];
    if (params.concertId) {
        const { data: ticketTypesData, error: ticketTypesError } = await supabase
            .from('ticket_types')
            .select('*')
            .eq('concert_id', parseInt(params.concertId, 10))
            .order('price', { ascending: false });

        if (!ticketTypesError) {
            ticketTypes = ticketTypesData || [];
        }
    }

    // 4. Server Action để tạo sale
    async function createSaleAction(data: SalesData) {
        'use server';

        const supabase = await createClient();

        // Validate data
        if (!data.customer_name || data.ticket_purchases.length === 0) {
            return { success: false, message: 'Please enter customer name and select at least one ticket type' };
        }

        // Calculate total amount
        const totalAmount = data.ticket_purchases.reduce((sum, purchase) => {
            return sum + (purchase.quantity * purchase.price_per_ticket);
        }, 0);

        // Create sale record
        const { data: sale, error: saleError } = await supabase
            .from('sales')
            .insert({
                concert_id: data.concert_id,
                customer_name: data.customer_name,
                customer_email: data.customer_email,
                customer_phone: data.customer_phone || null,
                total_amount: totalAmount,
                sale_date: new Date().toISOString()
            })
            .select()
            .single();

        if (saleError) {
            console.error('Error creating sale:', saleError);
            console.error('Sale data being inserted:', {
                concert_id: data.concert_id,
                customer_name: data.customer_name,
                customer_email: data.customer_email,
                customer_phone: data.customer_phone || null,
                total_amount: totalAmount,
                sale_date: new Date().toISOString()
            });
            return { success: false, message: `Failed to create sale: ${saleError.message || 'Unknown error'}` };
        }

        // Create ticket purchase records
        const ticketPurchases = data.ticket_purchases.map(purchase => ({
            sale_id: sale.sale_id,
            type_id: purchase.type_id,
            quantity: purchase.quantity,
            price_per_ticket: purchase.price_per_ticket,
            total_price: purchase.quantity * purchase.price_per_ticket
        }));

        // Insert ticket purchases
        for (const purchase of ticketPurchases) {
            const { error: purchaseError } = await supabase
                .from('ticket_purchases')
                .insert({
                    sale_id: sale.sale_id,
                    type_id: purchase.type_id,
                    quantity: purchase.quantity,
                    price_per_ticket: purchase.price_per_ticket,
                    total_price: purchase.total_price
                });

            if (purchaseError) {
                console.error('Error creating ticket purchase:', purchaseError);
                return { success: false, message: `Failed to create ticket purchase: ${purchaseError.message}` };
            }

            // Update ticket type quantity
            const { data: currentTicket } = await supabase
                .from('ticket_types')
                .select('total_quantity')
                .eq('type_id', purchase.type_id)
                .single();

            if (currentTicket) {
                const newQuantity = currentTicket.total_quantity - purchase.quantity;
                const { error: updateError } = await supabase
                    .from('ticket_types')
                    .update({ total_quantity: newQuantity })
                    .eq('type_id', purchase.type_id);

                if (updateError) {
                    console.error('Error updating ticket type quantity:', updateError);
                    return { success: false, message: `Failed to update ticket type quantity: ${updateError.message}` };
                }
            }
        }

        // Revalidate cache
        revalidatePath('/');

        return {
            success: true,
            message: `Sale recorded successfully! Sale ID: ${sale.sale_id}, Total: $${totalAmount.toFixed(2)}`
        };
    }

    return (
        <div className="container mx-auto p-8 max-w-4xl">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-4xl font-bold text-gray-800">Record Ticket Sale</h1>
                <Link href="/" className="bg-gray-600 text-white py-3 px-6 rounded-lg hover:bg-gray-700 font-semibold text-lg transition-colors duration-200 shadow-md">
                    ← Back to Dashboard
                </Link>
            </div>

            <SalesFormWrapper
                concerts={concerts as any}
                initialTicketTypes={ticketTypes}
                initialConcertId={params.concertId}
                onFormSubmit={createSaleAction}
            />
        </div>
    );
}