// src/app/page.tsx
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import ConcertImage from "@/components/ConcertImage";

export const revalidate = 0; // Luôn lấy dữ liệu mới

export default async function DashboardPage() {
  const cookieStore = cookies();
  const supabase = await createClient();

  // 1. Lấy thông tin user
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // Về lý thuyết middleware đã xử lý, nhưng đây là một lớp bảo vệ nữa
    return redirect('/login');
  }

  // 2. Lấy vai trò của user từ bảng profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const userRole = profile?.role;

  // 3. Lấy danh sách concerts
  const { data: concerts, error } = await supabase
    .from("concerts")
    .select(`
      concert_id,
      name,
      concert_date,
      image_url,
      venues ( name )
    `)
    .order("concert_date", { ascending: true });

  if (error) {
    return <p>Could not fetch concerts. Error: {error.message}</p>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="container mx-auto px-4 py-4 sm:py-8">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-xl p-6 sm:p-8 mb-6 sm:mb-8 text-white">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
            <div className="flex items-center">
              <div className="bg-white bg-opacity-20 p-2 sm:p-3 rounded-full mr-3 sm:mr-4">
                <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl sm:text-4xl font-bold">Concerts Dashboard</h1>
                <p className="text-blue-100 mt-1 text-sm sm:text-base">Manage your events and ticket sales</p>
              </div>
            </div>
            {/* Nút này chỉ hiển thị cho Admin */}
            {userRole === 'admin' && (
              <Link href="/concerts/new">
                <button className="bg-white text-blue-600 hover:bg-blue-50 font-bold py-2 sm:py-3 px-4 sm:px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm sm:text-base w-full sm:w-auto">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create New Concert
                </button>
              </Link>
            )}
          </div>
        </div>

        {/* Concerts Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {concerts.map((concert) => {
            // Logic nút bấm sẽ khác nhau tuỳ vai trò
            const actionButton = userRole === 'admin'
              ? (
                // Admin: View Details, Sửa, Ghi nhận bán vé
                <div className="flex flex-col sm:flex-row flex-wrap gap-2 mt-4 sm:mt-6">
                  <Link href={`/concerts/${concert.concert_id}`} className="w-full sm:w-auto">
                    <button className="bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm py-2 px-4 rounded-lg hover:from-green-600 hover:to-emerald-700 font-semibold transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 w-full sm:w-auto">
                      <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View Details
                    </button>
                  </Link>
                  <Link href={`/concerts/${concert.concert_id}/edit`} className="w-full sm:w-auto">
                    <button className="bg-gradient-to-r from-yellow-500 to-orange-600 text-white text-sm py-2 px-4 rounded-lg hover:from-yellow-600 hover:to-orange-700 font-semibold transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 w-full sm:w-auto">
                      <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </button>
                  </Link>
                  <Link href={`/sales/new?concertId=${concert.concert_id}`} className="w-full sm:w-auto">
                    <button className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm py-2 px-4 rounded-lg hover:from-blue-600 hover:to-indigo-700 font-semibold transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 w-full sm:w-auto">
                      <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                      </svg>
                      Record Sale
                    </button>
                  </Link>
                </div>
              )
              : (
                // Staff: View Details, Quét vé
                <div className="flex flex-col sm:flex-row flex-wrap gap-2 mt-4 sm:mt-6">
                  <Link href={`/concerts/${concert.concert_id}`} className="w-full sm:w-auto">
                    <button className="bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm py-2 px-4 rounded-lg hover:from-green-600 hover:to-emerald-700 font-semibold transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 w-full sm:w-auto">
                      <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View Details
                    </button>
                  </Link>
                  <Link href={`/checkin/${concert.concert_id}`} className="w-full sm:w-auto">
                    <button className="bg-gradient-to-r from-purple-500 to-pink-600 text-white py-2 px-4 rounded-lg hover:from-purple-600 hover:to-pink-700 font-semibold transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 w-full sm:w-auto">
                      <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V6a1 1 0 00-1-1H5a1 1 0 00-1 1v1a1 1 0 001 1zm12 0h2a1 1 0 001-1V6a1 1 0 00-1-1h-2a1 1 0 00-1 1v1a1 1 0 001 1zM5 20h2a1 1 0 001-1v-1a1 1 0 00-1-1H5a1 1 0 00-1 1v1a1 1 0 001 1z" />
                      </svg>
                      Scan Tickets
                    </button>
                  </Link>
                </div>
              );

            return (
              <div key={concert.concert_id} className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
                <div className="relative h-48 sm:h-56 w-full bg-gradient-to-br from-gray-100 to-gray-200">
                  <ConcertImage
                    imageUrl={concert.image_url}
                    concertName={concert.name}
                  />
                  <div className="absolute top-3 sm:top-4 right-3 sm:right-4">
                    <div className="bg-white bg-opacity-90 backdrop-blur-sm rounded-full px-2 sm:px-3 py-1 text-xs sm:text-sm font-semibold text-gray-700">
                      {new Date(concert.concert_date) > new Date() ? 'Upcoming' : 'Past'}
                    </div>
                  </div>
                </div>
                <div className="p-4 sm:p-6">
                  <div className="mb-4">
                    <h2 className="text-xl sm:text-2xl font-bold mb-3 text-gray-800 leading-tight line-clamp-2">{concert.name}</h2>
                    <div className="flex items-center text-gray-600 mb-2">
                      <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="font-medium text-base sm:text-lg">
                        {new Date(concert.concert_date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <p className="font-semibold text-sm sm:text-base">
                        {(concert.venues as any)?.name || 'Venue TBA'}
                      </p>
                    </div>
                  </div>
                  {/* Hiển thị nút hành động phù hợp */}
                  {actionButton}
                </div>
              </div>
            )
          })}
        </div>

        {/* Empty State */}
        {concerts.length === 0 && (
          <div className="text-center py-8 sm:py-16">
            <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-12 max-w-md mx-auto">
              <div className="bg-gray-100 w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <svg className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">No concerts yet</h3>
              <p className="text-gray-600 mb-4 sm:mb-6 text-sm sm:text-base">Get started by creating your first concert</p>
              {userRole === 'admin' && (
                <Link href="/concerts/new">
                  <button className="bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold py-2 sm:py-3 px-4 sm:px-6 rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm sm:text-base w-full sm:w-auto">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Create First Concert
                  </button>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}