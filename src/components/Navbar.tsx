'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Ticket, LogOut, LayoutDashboard, Building2, Calendar, MapPin, ChevronDown, Sparkles, Film, Music, Smile, Trophy, Drama, Utensils } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface City {
  id: string;
  name: string;
  state: string;
}

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [cities, setCities] = useState<City[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>('Mumbai');
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser();
    fetchCities();
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

  const fetchCities = async () => {
    try {
      const res = await fetch('/api/cities');
      const data = await res.json();
      setCities(data.cities || []);
    } catch (err) {
      console.error('Failed to fetch cities', err);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/');
    router.refresh();
  };

  const handleCitySelect = (cityName: string) => {
    setSelectedCity(cityName);
    setShowCityDropdown(false);
    // Dispatch custom event for city change across pages
    window.dispatchEvent(new CustomEvent('cityChanged', { detail: cityName }));
  };

  return (
    <header className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 text-white shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & City Selector */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="p-2 bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white rounded-xl shadow-lg group-hover:scale-105 transition-transform">
                <Ticket className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-xl tracking-tight text-white flex items-center gap-1">
                  District<span className="text-blue-400">Pass</span>
                </span>
                <span className="text-[9px] uppercase tracking-widest text-slate-400 font-semibold">Events & Nightlife</span>
              </div>
            </Link>

            {/* City Selector Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowCityDropdown(!showCityDropdown)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-200 transition-colors"
              >
                <MapPin className="w-3.5 h-3.5 text-blue-400" />
                <span>{selectedCity}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {showCityDropdown && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-2 z-50 space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">Popular Cities</p>
                  {cities.map((city) => (
                    <button
                      key={city.id}
                      onClick={() => handleCitySelect(city.name)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-between ${
                        selectedCity === city.name
                          ? 'bg-blue-600/20 text-blue-400 font-bold border border-blue-500/30'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <span>{city.name}</span>
                      <span className="text-[10px] text-slate-400">{city.state}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/"
              className={`text-sm font-medium transition-colors hover:text-blue-400 flex items-center gap-1.5 ${
                pathname === '/' ? 'text-blue-400 font-bold' : 'text-slate-300'
              }`}
            >
              <Calendar className="w-4 h-4" /> Explore Events
            </Link>

            {user && user.role === 'CUSTOMER' && (
              <Link
                href="/bookings"
                className={`text-sm font-medium transition-colors hover:text-blue-400 flex items-center gap-1.5 ${
                  pathname === '/bookings' ? 'text-blue-400 font-bold' : 'text-slate-300'
                }`}
              >
                <Ticket className="w-4 h-4" /> Ticket Wallet
              </Link>
            )}

            {user && (user.role === 'ORGANISER' || user.role === 'ADMIN') && (
              <Link
                href="/organiser"
                className={`text-sm font-medium transition-colors hover:text-blue-400 flex items-center gap-1.5 ${
                  pathname === '/organiser' ? 'text-blue-400 font-bold' : 'text-slate-300'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" /> Organiser Studio
              </Link>
            )}

            {user && user.role === 'ADMIN' && (
              <Link
                href="/admin"
                className={`text-sm font-medium transition-colors hover:text-blue-400 flex items-center gap-1.5 ${
                  pathname === '/admin' ? 'text-blue-400 font-bold' : 'text-slate-300'
                }`}
              >
                <Building2 className="w-4 h-4" /> Admin Venues
              </Link>
            )}
          </nav>

          {/* User Auth Profile */}
          <div className="flex items-center gap-4">
            {loading ? (
              <div className="w-20 h-8 bg-slate-900 animate-pulse rounded-lg" />
            ) : user ? (
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold text-white">{user.name}</p>
                  <span className="inline-block text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800">
                    {user.role}
                  </span>
                </div>

                <button
                  onClick={handleLogout}
                  title="Logout"
                  className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-900 rounded-xl transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="/login"
                  className="text-xs font-semibold text-slate-300 hover:text-white px-3.5 py-2 rounded-xl hover:bg-slate-900 transition-colors"
                >
                  Log In
                </Link>
                <Link
                  href="/register"
                  className="text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl shadow-lg transition-colors"
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
