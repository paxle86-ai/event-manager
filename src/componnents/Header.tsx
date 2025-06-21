// src/components/Header.tsx
'use client'; // Đây là client component vì cần tương tác

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

// Nhận vào props là email của user
export default function Header({ userEmail }: { userEmail: string | undefined }) {
    const router = useRouter();
    const supabase = createClient();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.refresh(); // Tải lại trang để middleware đá về trang login
    };

    return (
        <header className="bg-gray-800 text-white p-4">
            <div className="container mx-auto flex justify-between items-center">
                <h1 className="text-xl font-bold">Concert-Ticket Admin</h1>
                <div className="flex items-center gap-4">
                    <span>{userEmail}</span>
                    <button
                        onClick={handleLogout}
                        className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded"
                    >
                        Logout
                    </button>
                </div>
            </div>
        </header>
    );
}