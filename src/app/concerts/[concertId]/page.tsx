import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import ConcertSalesChart from "@/components/ConcertSalesChart";

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
        .single();

    if (concertError || !concert) {
        return (
            <div className="container mx-auto p-8 text-center">
                <h1 className="text-2xl font-bold text-red-600">Concert not found</h1>
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

    return (
        <div className="container mx-auto p-8 max-w-6xl">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-4xl font-bold text-gray-800">Concert Details</h1>
                <Link href="/" className="bg-gray-600 text-white py-3 px-6 rounded-lg hover:bg-gray-700 font-semibold text-lg transition-colors duration-200 shadow-md">
                    ← Back to Dashboard
                </Link>
            </div>

            {/* Concert Info */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 mb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <h2 className="text-3xl font-bold text-gray-800 mb-4">{concert.name}</h2>
                        <div className="space-y-3 text-lg">
                            <p className="text-gray-700"><span className="font-semibold text-gray-800">Date:</span> {new Date(concert.concert_date).toLocaleDateString()}</p>
                            <p className="text-gray-700"><span className="font-semibold text-gray-800">Time:</span> {new Date(concert.concert_date).toLocaleTimeString()}</p>
                            <p className="text-gray-700"><span className="font-semibold text-gray-800">Venue:</span> {venue.name}</p>
                            {venue.address && (
                                <p className="text-gray-700"><span className="font-semibold text-gray-800">Address:</span> {venue.address}</p>
                            )}
                        </div>
                    </div>
                    {concert.image_url && (
                        <div className="flex justify-center">
                            <img
                                src={concert.image_url}
                                alt={concert.name}
                                className="max-w-full h-64 object-cover rounded-lg shadow-md"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Sales Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
                    <h3 className="text-lg font-semibold text-blue-900 mb-2">Total Tickets</h3>
                    <p className="text-3xl font-bold text-blue-700">{totalTickets}</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                    <h3 className="text-lg font-semibold text-green-900 mb-2">Tickets Sold</h3>
                    <p className="text-3xl font-bold text-green-700">{totalSold}</p>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
                    <h3 className="text-lg font-semibold text-yellow-900 mb-2">Sold %</h3>
                    <p className="text-3xl font-bold text-yellow-700">{soldPercentage.toFixed(1)}%</p>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-6 text-center">
                    <h3 className="text-lg font-semibold text-purple-900 mb-2">Revenue</h3>
                    <p className="text-3xl font-bold text-purple-700">${totalRevenue.toFixed(2)}</p>
                </div>
            </div>

            {/* Chart */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Ticket Sales by Type</h2>
                <ConcertSalesChart data={salesData} />
            </div>

            {/* Detailed Ticket Types Table */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Ticket Type Details</h2>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-300">
                                <th className="text-left py-3 px-4 font-semibold text-gray-800">Ticket Type</th>
                                <th className="text-right py-3 px-4 font-semibold text-gray-800">Price</th>
                                <th className="text-right py-3 px-4 font-semibold text-gray-800">Total Quantity</th>
                                <th className="text-right py-3 px-4 font-semibold text-gray-800">Sold</th>
                                <th className="text-right py-3 px-4 font-semibold text-gray-800">Remaining</th>
                                <th className="text-right py-3 px-4 font-semibold text-gray-800">Revenue</th>
                            </tr>
                        </thead>
                        <tbody>
                            {salesData.map((item, index) => (
                                <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                                    <td className="py-3 px-4 font-medium text-gray-800">{item.ticketType}</td>
                                    <td className="py-3 px-4 text-right text-gray-800 font-semibold">${item.price}</td>
                                    <td className="py-3 px-4 text-right text-gray-800">{item.totalQuantity}</td>
                                    <td className="py-3 px-4 text-right text-green-700 font-semibold">{item.sold}</td>
                                    <td className="py-3 px-4 text-right text-gray-700">{item.remaining}</td>
                                    <td className="py-3 px-4 text-right text-purple-700 font-semibold">${item.revenue.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
} 