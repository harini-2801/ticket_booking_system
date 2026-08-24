'use client';

import React, { useEffect, useState } from 'react';
import { Ticket, Calendar, MapPin, Download, RefreshCw, XCircle, CheckCircle2, QrCode, Utensils, Navigation } from 'lucide-react';
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

interface BookingAddon {
  id: string;
  quantity: number;
  price: number;
  foodAddon: {
    name: string;
    category: string;
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
    genre: string;
    venue: {
      name: string;
      location: string;
      address: string;
    };
    city: {
      name: string;
    } | null;
  };
  seats: BookingSeat[];
  addons: BookingAddon[];
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
    if (!confirm('Are you sure you want to cancel this booking? Released seats will be offered to customers on the waitlist.')) {
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
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="border-b border-slate-800 pb-6">
        <h1 className="text-3xl font-extrabold text-white flex items-center gap-2">
          <Ticket className="w-8 h-8 text-blue-500" /> Digital Ticket Wallet
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Access your digital passes, QR code tickets, F&B vouchers, and sync with your calendar.
        </p>
      </div>

      {msg && (
        <div className="bg-blue-950/80 border border-blue-800 text-blue-200 p-4 rounded-2xl text-sm flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0" />
          <span>{msg}</span>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-56 bg-slate-900 border border-slate-800 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/50 rounded-3xl border border-slate-800 space-y-4">
          <Ticket className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-semibold text-white">No tickets in your wallet</h3>
          <p className="text-slate-400 text-xs">Explore live events, movies, and concerts to book tickets.</p>
          <Link
            href="/"
            className="inline-block bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-colors"
          >
            Explore Events
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {bookings.map((booking) => {
            const isConfirmed = booking.status === 'CONFIRMED';
            const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              `${booking.event.venue.name}, ${booking.event.venue.location}`
            )}`;

            return (
              <div
                key={booking.id}
                className={`bg-slate-900 border ${
                  isConfirmed ? 'border-slate-800' : 'border-red-900/50 opacity-75'
                } rounded-3xl p-6 flex flex-col lg:flex-row items-center gap-6 shadow-2xl relative overflow-hidden`}
              >
                {/* Event Poster */}
                <div className="w-full lg:w-48 h-48 rounded-2xl bg-slate-950 overflow-hidden shrink-0">
                  <img
                    src={booking.event.posterUrl}
                    alt={booking.event.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Ticket Pass Details */}
                <div className="flex-1 space-y-3 w-full">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-mono font-bold bg-slate-950 px-3 py-1 rounded-lg border border-slate-800 text-blue-400">
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
                      <span>{new Date(booking.event.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      <span className="truncate">{booking.event.venue.name} ({booking.event.city?.name || booking.event.venue.location})</span>
                    </div>
                  </div>

                  {/* Seats & Addons Summary */}
                  <div className="border-t border-slate-800 pt-3 flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Booked Seats</p>
                      <p className="text-xs font-bold text-white">
                        {booking.seats
                          .map((s) => `Row ${s.showSeat.seatTemplate.row}-${s.showSeat.seatTemplate.number} (${s.showSeat.seatTemplate.category})`)
                          .join(', ')}
                      </p>
                    </div>

                    {booking.addons && booking.addons.length > 0 && (
                      <div>
                        <p className="text-[10px] text-amber-400 uppercase font-bold flex items-center gap-1">
                          <Utensils className="w-3 h-3" /> F&B Vouchers
                        </p>
                        <p className="text-xs font-semibold text-slate-200">
                          {booking.addons.map((a) => `${a.quantity}x ${a.foodAddon.name}`).join(', ')}
                        </p>
                      </div>
                    )}

                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Total Paid</p>
                      <p className="text-lg font-extrabold text-blue-400">${booking.totalAmount.toFixed(2)}</p>
                    </div>
                  </div>

                  {/* Actions: Add to Calendar & Get Directions */}
                  {isConfirmed && (
                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      <a
                        href={`/api/bookings/${booking.id}/calendar`}
                        className="bg-slate-950 hover:bg-slate-800 text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 rounded-xl border border-slate-800 transition-colors flex items-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5 text-blue-400" /> Add to Calendar (.ics)
                      </a>
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-slate-950 hover:bg-slate-800 text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 rounded-xl border border-slate-800 transition-colors flex items-center gap-1.5"
                      >
                        <Navigation className="w-3.5 h-3.5 text-emerald-400" /> Get Directions
                      </a>
                    </div>
                  )}
                </div>

                {/* QR Code Entry Pass */}
                {isConfirmed && booking.qrCodeUrl && (
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col items-center gap-2 shrink-0 w-full lg:w-auto">
                    <img src={booking.qrCodeUrl} alt="QR Code Ticket" className="w-28 h-28 rounded-xl bg-white p-1" />
                    <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                      <QrCode className="w-3 h-3 text-blue-400" /> Scan Entry Ticket
                    </span>
                    <button
                      onClick={() => handleCancelBooking(booking.id)}
                      disabled={cancellingId === booking.id}
                      className="mt-2 text-xs font-bold text-red-400 hover:text-red-300 hover:underline flex items-center gap-1"
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
