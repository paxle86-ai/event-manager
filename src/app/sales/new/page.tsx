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

        const allTickets: Array<{
            ticket_id: string;
            ticket_number: number;
            ticket_type_name: string;
            purchase_id: number;
        }> = [];

        // Insert ticket purchases
        for (const purchase of ticketPurchases) {
            const { data: ticketPurchase, error: purchaseError } = await supabase
                .from('ticket_purchases')
                .insert({
                    sale_id: sale.sale_id,
                    type_id: purchase.type_id,
                    quantity: purchase.quantity,
                    price_per_ticket: purchase.price_per_ticket,
                    total_price: purchase.total_price
                })
                .select()
                .single();

            if (purchaseError) {
                console.error('Error creating ticket purchase:', purchaseError);
                return { success: false, message: `Failed to create ticket purchase: ${purchaseError.message}` };
            }

            // Create unique tickets for this purchase
            const { error: uniqueTicketsError } = await supabase
                .rpc('create_unique_tickets_for_purchase', {
                    purchase_id_param: ticketPurchase.purchase_id
                });

            if (uniqueTicketsError) {
                console.error('Error creating unique tickets:', uniqueTicketsError);
                return { success: false, message: `Failed to create unique tickets: ${uniqueTicketsError.message}` };
            }

            // Get the created tickets
            const { data: tickets, error: ticketsError } = await supabase
                .from('unique_tickets')
                .select(`
                    ticket_id,
                    ticket_number,
                    ticket_purchases!inner(
                        ticket_types!inner(name)
                    )
                `)
                .eq('purchase_id', ticketPurchase.purchase_id)
                .order('ticket_number');

            if (ticketsError) {
                console.error('Error fetching tickets:', ticketsError);
            } else if (tickets) {
                // Add tickets to the result
                tickets.forEach(ticket => {
                    const ticketData = ticket.ticket_purchases as unknown as {
                        ticket_types: { name: string };
                    };
                    allTickets.push({
                        ticket_id: ticket.ticket_id,
                        ticket_number: ticket.ticket_number,
                        ticket_type_name: ticketData.ticket_types.name,
                        purchase_id: ticketPurchase.purchase_id
                    });
                });
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
            message: `Sale recorded successfully! Sale ID: ${sale.sale_id}, Total: $${totalAmount.toFixed(2)}`,
            sale_id: sale.sale_id,
            total_amount: totalAmount,
            tickets: allTickets
        };
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
            <div className="container mx-auto px-4 py-4 sm:py-8">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-xl p-6 sm:p-8 mb-6 sm:mb-8 text-white">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex items-center">
                            <div className="bg-white bg-opacity-20 p-2 sm:p-3 rounded-full mr-3 sm:mr-4">
                                <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-2xl sm:text-4xl font-bold">Record Ticket Sale</h1>
                                <p className="text-blue-100 mt-1 text-sm sm:text-base">Process ticket sales and generate unique tickets</p>
                            </div>
                        </div>
                        <Link href="/" className="w-full sm:w-auto">
                            <button className="bg-white text-blue-600 hover:bg-blue-50 font-bold py-3 px-4 sm:px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 w-full sm:w-auto flex items-center justify-center">
                                <svg className="w-4 h-4 sm:w-5 sm:h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                                <span className="sm:inline">Back to Dashboard</span>
                            </button>
                        </Link>
                    </div>
                </div>

                <SalesFormWrapper
                    concerts={concerts as any}
                    initialTicketTypes={ticketTypes}
                    initialConcertId={params.concertId}
                    onFormSubmit={createSaleAction}
                />
            </div>
        </div>
    );
}