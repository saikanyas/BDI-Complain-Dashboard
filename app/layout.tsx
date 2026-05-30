import type { Metadata } from "next";
import { Sarabun } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/sidebar";

const sarabun = Sarabun({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-sarabun",
});

export const metadata: Metadata = {
  title: "Complaint Intelligence · เทศบาลนครขอนแก่น",
  description: "Smart City Complaint Dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={sarabun.variable}>
      <body className="flex h-screen overflow-hidden bg-[#F0F4F8]">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1480px] mx-auto p-6 lg:p-8">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
