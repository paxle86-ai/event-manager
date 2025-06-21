// src/app/page.tsx
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

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
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Concerts Dashboard</h1>
        {/* Nút này chỉ hiển thị cho Admin */}
        {userRole === 'admin' && (
          <Link href="/concerts/new">
            <button className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded">
              + Create New Concert
            </button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {concerts.map((concert) => {
          // Logic nút bấm sẽ khác nhau tuỳ vai trò
          const actionButton = userRole === 'admin'
            ? (
              // Admin: Sửa, Ghi nhận bán vé
              <div className="flex gap-2 mt-4">
                <Link href={`/concerts/${concert.concert_id}/edit`}>
                  <button className="bg-yellow-500 text-white text-sm py-1 px-3 rounded hover:bg-yellow-600">Edit</button>
                </Link>
                <Link href={`/sales/new?concertId=${concert.concert_id}`}>
                  <button className="bg-blue-500 text-white text-sm py-1 px-3 rounded hover:bg-blue-600">Record Sale</button>
                </Link>
              </div>
            )
            : (
              // Staff: Quét vé
              <div className="mt-4">
                <Link href={`/checkin/${concert.concert_id}`}>
                  <button className="bg-purple-600 text-white py-2 px-4 rounded hover:bg-purple-700 w-full">Scan Tickets</button>
                </Link>
              </div>
            );

          return (
            <div key={concert.concert_id} className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col">
              <div className="relative h-56 w-full">
                <Image
                  src={concert.image_url || '/images/placeholder.jpg'}
                  alt={concert.name}
                  fill
                  style={{ objectFit: 'cover' }}
                />
              </div>
              <div className="p-6 flex-grow flex flex-col justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-2 text-gray-800">{concert.name}</h2>
                  <p className="text-gray-600 mb-2">
                    {new Date(concert.concert_date).toLocaleDateString('vi-VN', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                  <p className="text-gray-700 font-semibold">
                    Tại: {concert.venues?.name || 'N/A'}
                  </p>
                </div>
                {/* Hiển thị nút hành động phù hợp */}
                {actionButton}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
}