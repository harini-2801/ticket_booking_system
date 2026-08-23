'use client';

import React, { useEffect, useState } from 'react';
import { Ticket, Calendar, MapPin, Download, RefreshCw, XCircle, CheckCircle2, QrCode } from 'lucide-react';
import Link from 'next/link';

interface BookingSeat {
  id: string;
  price: number;
  showSeat: {
    seatTemplate: {
      row: string;
      number: number;
      category: string;
    };
  };
}

interface Booking {
  id: string;
  bookingRef: string;
  totalAmount: number;
  status: 'CONFIRMED' | 'CANCELLED';
  qrCodeUrl: string | null;
  createdAt: string;
  event: {
    title: string;
    date: string;
    posterUrl: string;
    venue: {
      name: string;
      location: string;
    };
  };
  seats: BookingSeat[];
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const res = await fetch('/api/bookings');
      const data = await res.json();
      setBookings(data.bookings || []);
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking? Released seats will be reallocated to customers on the waitlist.')) {
      return;
    }

    setCancellingId(bookingId);
    setMsg(null);

    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: 'POST',
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to cancel booking');
      }

      setMsg(data.message);
      await fetchBookings();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel booking');
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="border-b border-slate-800 pb-6">
        <h1 className="text-3xl font-extrabold text-white">My Booking History</h1>
        <p className="text-slate-400 text-sm mt-1">Manage your tickets, view QR codes, and track booking statuses.</p>
      </div>

      {msg && (
        <div className="bg-blue-950/80 border border-blue-800 text-blue-200 p-4 rounded-xl text-sm flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0" />
          <span>{msg}</span>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-48 bg-slate-900 border border-slate-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/50 rounded-2xl border border-slate-800 space-y-4">
          <Ticket className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-semibold text-white">No bookings yet</h3>
          <p className="text-slate-400 text-sm">Explore live movies and concerts to book your seats.</p>
          <Link
            href="/"
            className="inline-block bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-5 py-2.5 rounded-lg transition-colors"
          >
            Browse Events
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {bookings.map((booking) => {
            const isConfirmed = booking.status === 'CONFIRMED';

            return (
              <div
                key={booking.id}
                className={`bg-slate-900 border ${
                  isConfirmed ? 'border-slate-800' : 'border-red-900/50 opacity-75'
                } rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6 shadow-xl relative overflow-hidden`}
              >
                {/* Event Poster */}
                <div className="w-full md:w-44 h-44 rounded-xl bg-slate-800 overflow-hidden shrink-0">
                  <img
                    src={booking.event.posterUrl}
                    alt={booking.event.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Booking Info */}
                <div className="flex-1 space-y-3 w-full">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold bg-slate-950 px-3 py-1 rounded-md border border-slate-800 text-blue-400">
                      REF: {booking.bookingRef}
                    </span>
                    <span
                      className={`text-xs font-extrabold uppercase px-3 py-1 rounded-full border ${
                        isConfirmed
                          ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                          : 'bg-red-950 text-red-400 border-red-800'
                      }`}
                    >
                      {booking.status}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-white">{booking.event.title}</h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-400" />
                      <span>{new Date(booking.event.date).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      <span>{booking.event.venue.name}</span>
                    </div>
                  </div>

                  <div className="border-t border-slate-800 pt-3 flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-semibold">Booked Seats</p>
                      <p className="text-xs font-bold text-white">
                        {booking.seats
                          .map((s) => `Row ${s.showSeat.seatTemplate.row}-${s.showSeat.seatTemplate.number} (${s.showSeat.seatTemplate.category})`)
                          .join(', ')}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-semibold">Total Paid</p>
                      <p className="text-lg font-extrabold text-blue-400">${booking.totalAmount.toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                {/* QR Code Ticket */}
                {isConfirmed && booking.qrCodeUrl && (
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col items-center gap-2 shrink-0 w-full md:w-auto">
                    <img src={booking.qrCodeUrl} alt="QR Code Ticket" className="w-28 h-28 rounded-lg bg-white p-1" />
                    <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                      <QrCode className="w-3 h-3 text-blue-400" /> Scan Entry Ticket
                    </span>
                    <button
                      onClick={() => handleCancelBooking(booking.id)}
                      disabled={cancellingId === booking.id}
                      className="mt-2 text-xs font-semibold text-red-400 hover:text-red-300 hover:underline flex items-center gap-1"
                    >
                      {cancellingId === booking.id ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5" />
                      )}
                      Cancel Ticket
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
