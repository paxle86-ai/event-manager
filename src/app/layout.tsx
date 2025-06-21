// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "../componnents/Header";
import { createClient } from "../lib/supabase/server";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Concert Ticket Admin",
  description: "Internal management app for concert tickets",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Lấy session của người dùng trên server
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <html lang="en">
      <body className={inter.className}>
        {/* Chỉ hiển thị Header nếu user đã đăng nhập */}
        {user && <Header userEmail={user.email} />}
        <main>{children}</main>
      </body>
    </html>
  );
}