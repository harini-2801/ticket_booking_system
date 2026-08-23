import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'TicketPass - Movie & Concert Ticket Booking Platform',
  description: 'Book seats with real-time seat maps, 10-minute hold TTL, waitlist auto-assignment, and instant QR tickets.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-slate-950">
      <body className={`${inter.className} flex flex-col min-h-screen text-slate-100 bg-slate-950`}>
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
        <footer className="border-t border-slate-800 bg-slate-900/50 py-6 mt-12 text-center text-sm text-slate-400">
          <p>© 2026 TicketPass System. All rights reserved. Concurrency & Waitlist Protected.</p>
        </footer>
      </body>
    </html>
  );
}
