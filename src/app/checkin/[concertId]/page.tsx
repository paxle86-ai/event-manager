import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import CheckInForm from "@/components/CheckInForm";

export default async function CheckInPage({
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
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    // Only staff and admin can access check-in
    if (profile?.role !== 'admin' && profile?.role !== 'staff') {
        return redirect('/');
    }

    // Get concert details
    const { data: concert, error: concertError } = await supabase
        .from('concerts')
        .select(`
            concert_id,
            name,
            concert_date,
            venues (name)
        `)
        .eq('concert_id', concertId)
        .single();

    if (concertError || !concert) {
        return (
            <div className="container mx-auto p-8 text-center">
                <h1 className="text-2xl font-bold text-red-600">Concert not found</h1>
                <Link href="/" className="mt-4 inline-block bg-blue-600 text-white py-2 px-4 rounded-lg">
                    Back to Dashboard
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
            <div className="container mx-auto px-4 py-4 sm:py-8">
                {/* Header */}
                <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl shadow-xl p-6 sm:p-8 mb-6 sm:mb-8 text-white">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex items-center">
                            <div className="bg-white bg-opacity-20 p-2 sm:p-3 rounded-full mr-3 sm:mr-4">
                                <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-2xl sm:text-4xl font-bold">Ticket Check-In</h1>
                                <div className="mt-1 text-green-100 text-sm sm:text-base">
                                    <p>{concert.name}</p>
                                    <p>Venue: {(concert.venues as any)?.name || 'TBA'} • {new Date(concert.concert_date).toLocaleDateString()}</p>
                                </div>
                            </div>
                        </div>
                        <Link href="/" className="w-full sm:w-auto">
                            <button className="bg-white text-green-600 hover:bg-green-50 font-bold py-3 px-4 sm:px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 w-full sm:w-auto flex items-center justify-center">
                                <svg className="w-4 h-4 sm:w-5 sm:h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                                <span className="sm:inline">Back to Dashboard</span>
                            </button>
                        </Link>
                    </div>
                </div>

                {/* Check-In Form */}
                <CheckInForm concertId={concertId} concertName={concert.name} />
            </div>
        </div>
    );
} 