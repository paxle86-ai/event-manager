// src/app/login/page.tsx
'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      // Đăng nhập thành công, điều hướng về trang chủ
      // Middleware sẽ xử lý việc chuyển đến trang phù hợp
      router.push('/');
      router.refresh(); // Quan trọng: refresh để server component load lại dữ liệu mới
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="p-8 sm:p-12 bg-white rounded-2xl shadow-xl w-full max-w-md border border-gray-100">
        <div className="flex justify-center mb-6">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-3 rounded-full">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
          </div>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold mb-8 text-center text-gray-800 tracking-tight">Admin & Staff Login</h1>
        <form onSubmit={handleLogin} className="space-y-6">
          {/* Input Email */}
          <div>
            <label htmlFor="email" className="block text-gray-700 mb-2 font-semibold">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-500 text-gray-900 placeholder-gray-500 transition-all"
              placeholder="Enter your email"
              required
            />
          </div>
          {/* Input Password */}
          <div>
            <label htmlFor="password" className="block text-gray-700 mb-2 font-semibold">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-500 text-gray-900 placeholder-gray-500 transition-all"
              placeholder="Enter your password"
              required
            />
          </div>
          {/* Nút Submit */}
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 font-bold text-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            Login
          </button>
          {error && <p className="text-red-500 pt-2 text-center font-semibold">{error}</p>}
        </form>
      </div>
    </div>
  );
}