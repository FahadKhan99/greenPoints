"use client"; // due to this i removed the metadata from here

import { Inter } from "next/font/google";
import { useState, useEffect } from "react";

import "./globals.css";

import { toast, Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [totalEarning, setTotalEarning] = useState(0);

  // useEffect(() => {

  // })

  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-gray-50 flex flex-col">
          {/* header */}

          {/* main content (sidebar on the left and content on right) */}
          <div className="flex flex-1">
            {/* sidebar */}
            <main className="flex-1 p-4 lg:p-8 ml-0 lg:ml-64 transition-all duration-300">
              {children}
            </main>
          </div>
        </div>

        <Toaster />
      </body>
    </html>
  );
}
