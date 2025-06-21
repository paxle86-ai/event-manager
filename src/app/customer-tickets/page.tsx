import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import CustomerTicketSearch from "@/components/CustomerTicketSearch";

export default async function CustomerTicketsPage() {
    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return redirect('/login');

    // Get user role
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    // Only staff and admin can access
    if (profile?.role !== 'admin' && profile?.role !== 'staff') {
        return redirect('/');
    }

    // Get all concerts for the search
    const { data: concerts, error: concertsError } = await supabase
        .from('concerts')
        .select(`
            concert_id,
            name,
            concert_date,
            venues (name)
        `)
        .order('concert_date', { ascending: true });

    if (concertsError) {
        console.error('Error fetching concerts:', concertsError);
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
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-2xl sm:text-4xl font-bold">Customer Ticket Search</h1>
                                <p className="text-blue-100 mt-1 text-sm sm:text-base">Find all tickets for a specific customer or concert</p>
                            </div>
                        </div>
                        <Link href="/" className="w-full sm:w-auto">
                            <button className="bg-white text-blue-600 hover:bg-blue-50 font-bold py-3 px-4 sm:px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 w-full sm:w-auto flex items-center justify-center">
                                <svg className="w-4 h-4 sm:w-5 sm:h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                                <span className="hidden sm:inline">Back to Dashboard</span>
                            </button>
                        </Link>
                    </div>
                </div>

                {/* Search Component */}
                <CustomerTicketSearch concerts={concerts as any || []} />
            </div>
        </div>
    );
} 