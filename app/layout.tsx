"use client"; // due to this i removed the metadata from here

import { Inter } from "next/font/google";
import { useState } from "react";

import "./globals.css";

import { Toaster } from "react-hot-toast";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { metadata } from "./metadata";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-gray-50 flex flex-col">
          <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

          {/* main content (sidebar on the left and content on right) */}
          <div className="flex flex-1">
            <Sidebar open={sidebarOpen} />
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
