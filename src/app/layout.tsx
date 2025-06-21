// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "../components/Header";
import { createClient } from "../lib/supabase/server";
import PWAScript from "../components/PWAScript";
import PWAInstallButton from "../components/PWAInstallButton";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Event Manager",
  description: "Concert ticket management and sales tracking app",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Event Manager"
  },
  formatDetection: {
    telephone: false
  },
  icons: {
    icon: [
      { url: "/icons/icon-192x192.svg", sizes: "192x192", type: "image/svg+xml" }
    ],
    apple: [
      { url: "/icons/icon-192x192.svg", sizes: "192x192", type: "image/svg+xml" }
    ]
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#3b82f6"
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
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Event Manager" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.svg" />
      </head>
      <body className={inter.className}>
        {/* Chỉ hiển thị Header nếu user đã đăng nhập */}
        {user && <Header userEmail={user.email} />}
        <main className="min-h-screen bg-gray-50">{children}</main>
        <PWAScript />
        <PWAInstallButton />
      </body>
    </html>
  );
}