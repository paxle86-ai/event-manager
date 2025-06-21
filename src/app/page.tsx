// src/app/page.tsx
import { createClient } from "@/lib/supabase/server";
import Image from "next/image";
import Link from "next/link";

// Cấu hình để Next.js không cache trang này quá lâu, giúp dữ liệu luôn mới
export const revalidate = 0;

export default async function HomePage() {
  // 1. Tạo Supabase server client
  const supabase = await createClient();

  // 2. Viết câu truy vấn để lấy dữ liệu
  // Chúng ta cần JOIN với bảng Venues để lấy tên địa điểm
  const { data: concerts, error } = await supabase
    .from("concerts")
    .select(`
      concert_id,
      name,
      concert_date,
      image_url,
      venues (
        name
      )
    `)
    .order("concert_date", { ascending: true }); // Sắp xếp theo ngày diễn ra

  if (error) {
    console.error("Error fetching concerts:", error);
    return <p>Could not fetch concerts. Please try again later.</p>;
  }
  console.log(concerts);

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8 text-center">Upcoming Concerts</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {concerts.map((concert) => (
          <Link href={`/concerts/${concert.concert_id}`} key={concert.concert_id}>
            <div className="bg-white rounded-lg shadow-lg overflow-hidden transform hover:scale-105 transition-transform duration-300 cursor-pointer">
              <div className="relative h-56 w-full">
                <Image
                  src={concert.image_url || '/images/placeholder.jpg'}
                  alt={concert.name}
                  fill
                  style={{ objectFit: 'cover' }}
                  priority={true}
                />
              </div>
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-2 text-gray-800">{concert.name}</h2>
                <p className="text-gray-600 mb-2">
                  {new Date(concert.concert_date).toLocaleDateString('vi-VN', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
                {/* Supabase trả về kết quả JOIN dưới dạng một object hoặc array */}
                <p className="text-gray-700 font-semibold">
                  Tại: {concert.venues?.name || 'Chưa xác định'}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}