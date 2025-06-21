import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import DeleteVenueButton from "@/components/DeleteVenueButton";

export const revalidate = 0;

export default async function VenuesPage() {
    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return redirect('/login');

    // Check if user is admin
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'admin') {
        return redirect('/');
    }

    // Get all venues
    const { data: venues, error } = await supabase
        .from('venues')
        .select('*')
        .order('name');

    if (error) {
        return <p>Could not fetch venues. Error: {error.message}</p>;
    }

    async function addVenueAction(formData: FormData) {
        'use server';

        const supabase = await createClient();

        const name = formData.get('name') as string;
        const address = formData.get('address') as string;
        const capacity = parseInt(formData.get('capacity') as string, 10);

        if (!name.trim()) {
            return;
        }

        const { error } = await supabase
            .from('venues')
            .insert({
                name: name.trim(),
                address: address.trim() || null,
                capacity: capacity || null
            });

        if (error) {
            console.error('Failed to add venue:', error.message);
            return;
        }

        revalidatePath('/venues');
    }

    async function deleteVenueAction(formData: FormData) {
        'use server';

        const supabase = await createClient();
        const venueId = parseInt(formData.get('venue_id') as string, 10);

        if (!venueId) {
            console.error('No venue ID provided');
            return { success: false, message: 'No venue ID provided' };
        }

        // Check if venue is being used by any concerts
        const { data: concerts } = await supabase
            .from('concerts')
            .select('concert_id')
            .eq('venue_id', venueId)
            .limit(1);

        if (concerts && concerts.length > 0) {
            console.error('Cannot delete venue that is being used by concerts');
            return { success: false, message: 'Cannot delete venue that is being used by concerts' };
        }

        const { error } = await supabase
            .from('venues')
            .delete()
            .eq('venue_id', venueId);

        if (error) {
            console.error('Failed to delete venue:', error.message);
            return { success: false, message: `Failed to delete venue: ${error.message}` };
        }

        revalidatePath('/venues');
        return { success: true, message: 'Venue deleted successfully' };
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
            <div className="container mx-auto px-4 py-8">
                {/* Header Section */}
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-xl p-6 sm:p-8 mb-8 text-white">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex items-center">
                            <div className="bg-white bg-opacity-20 p-3 rounded-full mr-4">
                                <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-2xl sm:text-4xl font-bold">Venue Management</h1>
                                <p className="text-blue-100 mt-1 text-sm sm:text-base">Manage concert venues and locations</p>
                            </div>
                        </div>
                        <Link href="/" className="w-full sm:w-auto">
                            <button className="bg-white text-blue-600 hover:bg-blue-50 font-bold py-3 px-4 sm:px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 w-full sm:w-auto flex items-center justify-center">
                                <svg className="w-5 h-5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                                <span className="ml-2 sm:inline">Back to Dashboard</span>
                            </button>
                        </Link>
                    </div>
                </div>

                {/* Add Venue Form */}
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8 mb-8">
                    <div className="flex items-center mb-6">
                        <div className="bg-green-600 text-white p-2 sm:p-3 rounded-full mr-4">
                            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Add New Venue</h2>
                    </div>

                    <form action={addVenueAction} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label htmlFor="name" className="block text-base sm:text-lg font-semibold text-gray-700 mb-2 sm:mb-3">Venue Name *</label>
                            <input
                                type="text"
                                name="name"
                                required
                                className="w-full border-2 border-blue-200 rounded-xl shadow-sm p-3 sm:p-4 text-base sm:text-lg text-gray-800 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 bg-white"
                                placeholder="Enter venue name"
                            />
                        </div>
                        <div>
                            <label htmlFor="address" className="block text-base sm:text-lg font-semibold text-gray-700 mb-2 sm:mb-3">Address</label>
                            <input
                                type="text"
                                name="address"
                                className="w-full border-2 border-blue-200 rounded-xl shadow-sm p-3 sm:p-4 text-base sm:text-lg text-gray-800 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 bg-white"
                                placeholder="Enter venue address"
                            />
                        </div>
                        <div>
                            <label htmlFor="capacity" className="block text-base sm:text-lg font-semibold text-gray-700 mb-2 sm:mb-3">Capacity</label>
                            <input
                                type="number"
                                name="capacity"
                                min="1"
                                className="w-full border-2 border-blue-200 rounded-xl shadow-sm p-3 sm:p-4 text-base sm:text-lg text-gray-800 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 bg-white"
                                placeholder="Enter capacity"
                            />
                        </div>
                        <div className="md:col-span-3">
                            <button
                                type="submit"
                                className="bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-3 sm:py-4 px-6 sm:px-8 rounded-xl hover:from-green-600 hover:to-emerald-700 text-base sm:text-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 w-full sm:w-auto"
                            >
                                <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                Add Venue
                            </button>
                        </div>
                    </form>
                </div>

                {/* Venues List */}
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8">
                    <div className="flex items-center mb-6">
                        <div className="bg-purple-600 text-white p-2 sm:p-3 rounded-full mr-4">
                            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">All Venues</h2>
                    </div>

                    {venues.length === 0 ? (
                        <div className="text-center py-8 sm:py-12">
                            <div className="bg-gray-100 w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                                <svg className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                </svg>
                            </div>
                            <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">No venues yet</h3>
                            <p className="text-gray-600 text-sm sm:text-base">Add your first venue to get started</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {venues.map((venue) => (
                                <div key={venue.venue_id} className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all duration-200">
                                    <div className="flex justify-between items-start mb-4">
                                        <h3 className="text-xl font-bold text-gray-800">{venue.name}</h3>
                                        <DeleteVenueButton
                                            venueId={venue.venue_id}
                                            venueName={venue.name}
                                            onDelete={deleteVenueAction}
                                        />
                                    </div>

                                    {venue.address && (
                                        <div className="flex items-start text-gray-600 mb-3">
                                            <svg className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            </svg>
                                            <p className="text-sm leading-relaxed">{venue.address}</p>
                                        </div>
                                    )}

                                    {venue.capacity && (
                                        <div className="flex items-center text-gray-600">
                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                            </svg>
                                            <span className="text-sm font-semibold">Capacity: {venue.capacity.toLocaleString()}</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
} 