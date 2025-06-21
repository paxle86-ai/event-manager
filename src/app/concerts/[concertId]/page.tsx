import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import ConcertSalesChart from "@/components/ConcertSalesChart";
import ConcertImage from "@/components/ConcertImage";
import AdminTicketQRCode from "@/components/AdminTicketQRCode";

export default async function ConcertDetailsPage({
    params
}: {
    params: Promise<{ concertId: string }>
}) {
    const { concertId } = await params;
    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return redirect('/login');

    // Get user role
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

    const isAdmin = profile?.role === 'admin';

    // Get concert details
    const { data: concert, error: concertError } = await supabase
        .from('concerts')
        .select(`
            concert_id,
            name,
            concert_date,
            image_url,
            venues (name, address)
        `)
        .eq('concert_id', concertId)
        .maybeSingle();

    if (concertError) {
        console.error('Error fetching concert:', concertError);
        return (
            <div className="container mx-auto p-8 text-center">
                <h1 className="text-2xl font-bold text-red-600">Error loading concert</h1>
                <p className="text-gray-600 mt-2">Please try again later.</p>
            </div>
        );
    }

    if (!concert) {
        return (
            <div className="container mx-auto p-8 text-center">
                <h1 className="text-2xl font-bold text-red-600">Concert not found</h1>
                <p className="text-gray-600 mt-2">The concert you're looking for doesn't exist.</p>
            </div>
        );
    }

    // Type the venue properly
    const venue = concert.venues as unknown as { name: string; address?: string };

    // Get ticket types with sales data
    const { data: ticketTypes, error: ticketTypesError } = await supabase
        .from('ticket_types')
        .select(`
            type_id,
            name,
            price,
            total_quantity,
            concert_id
        `)
        .eq('concert_id', concertId)
        .order('name');

    if (ticketTypesError) {
        console.error('Error fetching ticket types:', ticketTypesError);
    }

    // Get sales data for each ticket type
    const salesData = [];
    if (ticketTypes) {
        for (const ticketType of ticketTypes) {
            const { data: soldTickets } = await supabase
                .from('ticket_purchases')
                .select('quantity')
                .eq('type_id', ticketType.type_id);

            const totalSold = soldTickets?.reduce((sum, purchase) => sum + purchase.quantity, 0) || 0;
            const remaining = ticketType.total_quantity - totalSold;

            salesData.push({
                ticketType: ticketType.name,
                totalQuantity: ticketType.total_quantity,
                sold: totalSold,
                remaining: remaining,
                price: ticketType.price,
                revenue: totalSold * ticketType.price
            });
        }
    }

    // Calculate overall statistics
    const totalTickets = salesData.reduce((sum, item) => sum + item.totalQuantity, 0);
    const totalSold = salesData.reduce((sum, item) => sum + item.sold, 0);
    const totalRevenue = salesData.reduce((sum, item) => sum + item.revenue, 0);
    const soldPercentage = totalTickets > 0 ? (totalSold / totalTickets) * 100 : 0;

    // Get all ticket sales data for admin view
    let allTicketSales: any[] = [];
    if (isAdmin) {
        // First get all sales for this concert
        const { data: sales, error: salesError } = await supabase
            .from('sales')
            .select(`
                sale_id,
                customer_name,
                customer_email,
                customer_phone,
                sale_date
            `)
            .eq('concert_id', concertId)
            .order('sale_date', { ascending: false });

        if (salesError) {
            console.error('Error fetching sales:', salesError);
        } else if (sales) {
            // For each sale, get the ticket purchases and unique tickets
            for (const sale of sales) {
                const { data: purchases, error: purchasesError } = await supabase
                    .from('ticket_purchases')
                    .select(`
                        purchase_id,
                        quantity,
                        price_per_ticket,
                        total_price,
                        ticket_types!inner(
                            name
                        )
                    `)
                    .eq('sale_id', sale.sale_id);

                if (purchasesError) {
                    console.error('Error fetching purchases:', purchasesError);
                    continue;
                }

                if (purchases) {
                    for (const purchase of purchases) {
                        const ticketType = purchase.ticket_types as unknown as { name: string };
                        const { data: uniqueTickets, error: ticketsError } = await supabase
                            .from('unique_tickets')
                            .select(`
                                ticket_id,
                                ticket_number
                            `)
                            .eq('purchase_id', purchase.purchase_id)
                            .order('ticket_number');

                        if (ticketsError) {
                            console.error('Error fetching unique tickets:', ticketsError);
                            continue;
                        }

                        if (uniqueTickets) {
                            for (const ticket of uniqueTickets) {
                                allTicketSales.push({
                                    ticket_id: ticket.ticket_id,
                                    ticket_number: ticket.ticket_number,
                                    customer_name: sale.customer_name,
                                    customer_email: sale.customer_email,
                                    customer_phone: sale.customer_phone,
                                    ticket_type: ticketType.name,
                                    quantity: purchase.quantity,
                                    price_per_ticket: purchase.price_per_ticket,
                                    sale_date: sale.sale_date
                                });
                            }
                        }
                    }
                }
            }
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
            <div className="container mx-auto px-4 py-4 sm:py-8">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-xl p-6 sm:p-8 mb-6 sm:mb-8 text-white">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex items-center">
                            <div className="bg-white bg-opacity-20 p-2 sm:p-3 rounded-full mr-3 sm:mr-4">
                                <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-2xl sm:text-4xl font-bold">Concert Details</h1>
                                <p className="text-blue-100 mt-1 text-sm sm:text-base">View concert information and sales data</p>
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

                {/* Concert Info */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 sm:p-8 mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                        <div>
                            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4">{concert.name}</h2>
                            <div className="space-y-3 text-base sm:text-lg">
                                <p className="text-gray-700"><span className="font-semibold text-gray-800">Date:</span> {new Date(concert.concert_date).toLocaleDateString()}</p>
                                <p className="text-gray-700"><span className="font-semibold text-gray-800">Time:</span> {new Date(concert.concert_date).toLocaleTimeString()}</p>
                                <p className="text-gray-700"><span className="font-semibold text-gray-800">Venue:</span> {venue.name}</p>
                                {venue.address && (
                                    <p className="text-gray-700"><span className="font-semibold text-gray-800">Address:</span> {venue.address}</p>
                                )}
                            </div>
                        </div>
                        <div className="flex justify-center items-center">
                            <div className="relative w-full h-48 sm:h-64">
                                <ConcertImage
                                    imageUrl={concert.image_url}
                                    concertName={concert.name}
                                    className="w-full h-full rounded-lg shadow-md object-cover"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sales Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-8">
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 sm:p-6 text-center">
                        <h3 className="text-sm sm:text-lg font-semibold text-blue-900 mb-2">Total Tickets</h3>
                        <p className="text-2xl sm:text-3xl font-bold text-blue-700">{totalTickets}</p>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 sm:p-6 text-center">
                        <h3 className="text-sm sm:text-lg font-semibold text-green-900 mb-2">Tickets Sold</h3>
                        <p className="text-2xl sm:text-3xl font-bold text-green-700">{totalSold}</p>
                    </div>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 sm:p-6 text-center">
                        <h3 className="text-sm sm:text-lg font-semibold text-yellow-900 mb-2">Sold %</h3>
                        <p className="text-2xl sm:text-3xl font-bold text-yellow-700">{soldPercentage.toFixed(1)}%</p>
                    </div>
                    <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 sm:p-6 text-center">
                        <h3 className="text-sm sm:text-lg font-semibold text-purple-900 mb-2">Revenue</h3>
                        <p className="text-2xl sm:text-3xl font-bold text-purple-700">${totalRevenue.toFixed(2)}</p>
                    </div>
                </div>

                {/* Chart */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 sm:p-8 mb-8">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-6">Ticket Sales by Type</h2>
                    <ConcertSalesChart data={salesData} />
                </div>

                {/* Detailed Ticket Types Table */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 sm:p-8">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-6">Ticket Type Details</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm sm:text-base">
                            <thead>
                                <tr className="border-b border-gray-300">
                                    <th className="text-left py-3 px-2 sm:px-4 font-semibold text-gray-800">Ticket Type</th>
                                    <th className="text-right py-3 px-2 sm:px-4 font-semibold text-gray-800">Price</th>
                                    <th className="text-right py-3 px-2 sm:px-4 font-semibold text-gray-800 whitespace-nowrap">Total Qty</th>
                                    <th className="text-right py-3 px-2 sm:px-4 font-semibold text-gray-800">Sold</th>
                                    <th className="text-right py-3 px-2 sm:px-4 font-semibold text-gray-800">Rem.</th>
                                    <th className="text-right py-3 px-2 sm:px-4 font-semibold text-gray-800">Revenue</th>
                                </tr>
                            </thead>
                            <tbody>
                                {salesData.map((item, index) => (
                                    <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                                        <td className="py-3 px-2 sm:px-4 font-medium text-gray-800">{item.ticketType}</td>
                                        <td className="py-3 px-2 sm:px-4 text-right text-gray-800 font-semibold">${item.price}</td>
                                        <td className="py-3 px-2 sm:px-4 text-right text-gray-800">{item.totalQuantity}</td>
                                        <td className="py-3 px-2 sm:px-4 text-right text-green-700 font-semibold">{item.sold}</td>
                                        <td className="py-3 px-2 sm:px-4 text-right text-gray-700">{item.remaining}</td>
                                        <td className="py-3 px-2 sm:px-4 text-right text-purple-700 font-semibold">${item.revenue.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Admin: All Ticket Sales View */}
                {isAdmin && allTicketSales.length > 0 && (
                    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 sm:p-8 mt-8">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-2">
                            <h2 className="text-xl sm:text-2xl font-bold text-gray-800">All Ticket Sales</h2>
                            <div className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                                Total Tickets: {allTicketSales.length}
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-xs sm:text-base">
                                <thead>
                                    <tr className="border-b border-gray-300 bg-gray-50">
                                        <th className="py-3 px-2 sm:px-4 font-semibold text-gray-800 text-center">QR</th>
                                        <th className="py-3 px-2 sm:px-4 font-semibold text-gray-800 text-left">Ticket ID</th>
                                        <th className="py-3 px-2 sm:px-4 font-semibold text-gray-800 text-left">Customer</th>
                                        <th className="py-3 px-2 sm:px-4 font-semibold text-gray-800 text-left">Email</th>
                                        <th className="py-3 px-2 sm:px-4 font-semibold text-gray-800 text-left">Phone</th>
                                        <th className="py-3 px-2 sm:px-4 font-semibold text-gray-800 text-left">Type</th>
                                        <th className="py-3 px-2 sm:px-4 font-semibold text-gray-800 text-center">#</th>
                                        <th className="py-3 px-2 sm:px-4 font-semibold text-gray-800 text-right">Price</th>
                                        <th className="py-3 px-2 sm:px-4 font-semibold text-gray-800 text-right whitespace-nowrap">Sale Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {allTicketSales.map((ticket, index) => {
                                        return (
                                            <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                                                <td className="py-2 px-1 sm:px-2 text-center">
                                                    <AdminTicketQRCode ticketId={ticket.ticket_id} />
                                                </td>
                                                <td className="py-3 px-2 sm:px-4">
                                                    <div className="font-mono bg-gray-100 px-2 py-1 rounded text-gray-800 whitespace-nowrap">
                                                        {ticket.ticket_id}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-2 sm:px-4 font-medium text-gray-800">{ticket.customer_name}</td>
                                                <td className="py-3 px-2 sm:px-4 text-gray-700 truncate" style={{ maxWidth: '150px' }}>{ticket.customer_email || '-'}</td>
                                                <td className="py-3 px-2 sm:px-4 text-gray-700">{ticket.customer_phone || '-'}</td>
                                                <td className="py-3 px-2 sm:px-4 text-gray-800">{ticket.ticket_type}</td>
                                                <td className="py-3 px-2 sm:px-4 text-center text-gray-700">{ticket.ticket_number} of {ticket.quantity}</td>
                                                <td className="py-3 px-2 sm:px-4 text-right text-gray-800 font-semibold">${ticket.price_per_ticket}</td>
                                                <td className="py-3 px-2 sm:px-4 text-right text-gray-700">{new Date(ticket.sale_date).toLocaleDateString()}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Summary Stats */}
                        <div className="mt-6 pt-6 border-t border-gray-200">
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                                    <h4 className="text-sm font-semibold text-blue-900 mb-1">Total Sold</h4>
                                    <p className="text-xl sm:text-2xl font-bold text-blue-700">{allTicketSales.length}</p>
                                </div>
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                                    <h4 className="text-sm font-semibold text-green-900 mb-1">Customers</h4>
                                    <p className="text-xl sm:text-2xl font-bold text-green-700">
                                        {new Set(allTicketSales.map(ticket => ticket.customer_name)).size}
                                    </p>
                                </div>
                                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
                                    <h4 className="text-sm font-semibold text-purple-900 mb-1">Total Revenue</h4>
                                    <p className="text-xl sm:text-2xl font-bold text-purple-700">
                                        ${allTicketSales.reduce((sum, ticket) => sum + ticket.price_per_ticket, 0).toFixed(2)}
                                    </p>
                                </div>
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                                    <h4 className="text-sm font-semibold text-yellow-900 mb-1">Avg. Price</h4>
                                    <p className="text-xl sm:text-2xl font-bold text-yellow-700">
                                        ${(allTicketSales.reduce((sum, ticket) => sum + ticket.price_per_ticket, 0) / (allTicketSales.length || 1)).toFixed(2)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
} 