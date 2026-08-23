'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Ticket, LogOut, User as UserIcon, LayoutDashboard, Building2, Calendar, ShieldCheck } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser();
  }, [pathname]);

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      setUser(data.user);
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/');
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur border-b border-slate-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="p-2 bg-blue-600 group-hover:bg-blue-500 text-white rounded-lg transition-colors shadow-sm">
              <Ticket className="w-6 h-6" />
            </div>
            <span className="font-bold text-xl tracking-tight text-white">
              Ticket<span className="text-blue-400">Pass</span>
            </span>
          </Link>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/"
              className={`text-sm font-medium transition-colors hover:text-blue-400 flex items-center gap-1.5 ${
                pathname === '/' ? 'text-blue-400' : 'text-slate-300'
              }`}
            >
              <Calendar className="w-4 h-4" /> Browse Events
            </Link>

            {user && user.role === 'CUSTOMER' && (
              <Link
                href="/bookings"
                className={`text-sm font-medium transition-colors hover:text-blue-400 flex items-center gap-1.5 ${
                  pathname === '/bookings' ? 'text-blue-400' : 'text-slate-300'
                }`}
              >
                <Ticket className="w-4 h-4" /> My Bookings
              </Link>
            )}

            {user && (user.role === 'ORGANISER' || user.role === 'ADMIN') && (
              <Link
                href="/organiser"
                className={`text-sm font-medium transition-colors hover:text-blue-400 flex items-center gap-1.5 ${
                  pathname === '/organiser' ? 'text-blue-400' : 'text-slate-300'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" /> Organiser Dashboard
              </Link>
            )}

            {user && user.role === 'ADMIN' && (
              <Link
                href="/admin"
                className={`text-sm font-medium transition-colors hover:text-blue-400 flex items-center gap-1.5 ${
                  pathname === '/admin' ? 'text-blue-400' : 'text-slate-300'
                }`}
              >
                <Building2 className="w-4 h-4" /> Admin Venues
              </Link>
            )}
          </nav>

          {/* User Auth Profile */}
          <div className="flex items-center gap-4">
            {loading ? (
              <div className="w-20 h-8 bg-slate-800 animate-pulse rounded-lg" />
            ) : user ? (
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-slate-100">{user.name}</p>
                  <span className="inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-900/60 text-blue-300 border border-blue-700/50">
                    {user.role}
                  </span>
                </div>

                <button
                  onClick={handleLogout}
                  title="Logout"
                  className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="/login"
                  className="text-sm font-medium text-slate-300 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  Log In
                </Link>
                <Link
                  href="/register"
                  className="text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg shadow-sm transition-colors"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
