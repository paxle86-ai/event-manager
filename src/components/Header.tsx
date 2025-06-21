// src/components/Header.tsx
'use client'; // Đây là client component vì cần tương tác

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

// Nhận vào props là email của user
export default function Header({ userEmail }: { userEmail: string | undefined }) {
    const router = useRouter();
    const [userRole, setUserRole] = useState<string | null>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isSigningOut, setIsSigningOut] = useState(false);

    useEffect(() => {
        const fetchUserRole = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();
                setUserRole(profile?.role || null);
            }
        };
        fetchUserRole();
    }, []);

    const handleSignOut = async () => {
        try {
            setIsSigningOut(true);

            // Clear local state immediately
            setUserRole(null);
            setIsMenuOpen(false);

            const supabase = createClient();
            const { error } = await supabase.auth.signOut();

            if (error) {
                console.error('Error signing out:', error);
            }

            // Clear any cached data or local storage if needed
            localStorage.removeItem('supabase.auth.token');

            // Force immediate redirect to login page
            window.location.href = '/login';
        } catch (error) {
            console.error('Sign out error:', error);
            // Force redirect even if there's an error
            window.location.href = '/login';
        }
    };

    return (
        <header className="bg-gradient-to-r from-gray-800 to-gray-900 shadow-xl border-b border-gray-700">
            <div className="container mx-auto px-4 py-4">
                <div className="flex justify-between items-center">
                    {/* Logo and Title */}
                    <Link href="/" className="flex items-center group">
                        <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-2 rounded-lg mr-3 sm:mr-4 transition-transform duration-300 group-hover:scale-110">
                            <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                        </div>
                        <h1 className="text-xl sm:text-2xl font-bold text-white transition-colors duration-300 group-hover:text-blue-300">Event Manager</h1>
                    </Link>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center space-x-4">
                        {userRole === 'admin' && (
                            <a
                                href="/venues"
                                className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-lg hover:from-green-600 hover:to-emerald-700 font-semibold transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                            >
                                <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                </svg>
                                Manage Venues
                            </a>
                        )}
                        <div className="flex items-center text-gray-300">
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span className="font-medium">{userEmail}</span>
                        </div>
                        <button
                            onClick={handleSignOut}
                            disabled={isSigningOut}
                            className="bg-gradient-to-r from-red-500 to-pink-600 text-white px-4 py-2 rounded-lg hover:from-red-600 hover:to-pink-700 font-semibold transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSigningOut ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Signing Out...
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                    </svg>
                                    Sign Out
                                </>
                            )}
                        </button>
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="md:hidden">
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="text-white p-2 rounded-lg hover:bg-gray-700 transition-colors duration-200"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Mobile Menu */}
                {isMenuOpen && (
                    <div className="md:hidden mt-4 pb-4 border-t border-gray-700">
                        <div className="flex flex-col space-y-3 pt-4">
                            {userRole === 'admin' && (
                                <a
                                    href="/venues"
                                    className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-3 rounded-lg hover:from-green-600 hover:to-emerald-700 font-semibold transition-all duration-200 shadow-md text-center"
                                >
                                    <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    </svg>
                                    Manage Venues
                                </a>
                            )}
                            <div className="flex items-center justify-center text-gray-300 py-2">
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                <span className="font-medium text-sm">{userEmail}</span>
                            </div>
                            <button
                                onClick={handleSignOut}
                                disabled={isSigningOut}
                                className="bg-gradient-to-r from-red-500 to-pink-600 text-white px-4 py-3 rounded-lg hover:from-red-600 hover:to-pink-700 font-semibold transition-all duration-200 shadow-md w-full disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSigningOut ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Signing Out...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                        </svg>
                                        Sign Out
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
}