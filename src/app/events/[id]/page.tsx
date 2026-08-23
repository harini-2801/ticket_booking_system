'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Ticket, Clock, CheckCircle2, AlertCircle, ShieldAlert, Sparkles, User, RefreshCw, X, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface SeatTemplate {
  id: string;
  row: string;
  number: number;
  category: string;
}

interface ShowSeat {
  id: string;
  eventId: string;
  seatTemplateId: string;
  status: 'AVAILABLE' | 'HELD' | 'BOOKED';
  heldByUserId: string | null;
  holdExpiresAt: string | null;
  version: number;
  seatTemplate: SeatTemplate;
}

interface EventPricing {
  seatCategory: string;
  price: number;
}

interface EventDetail {
  id: string;
  title: string;
  description: string;
  category: string;
  posterUrl: string;
  date: string;
  venue: {
    name: string;
    location: string;
    totalRows: number;
    seatsPerRow: number;
  };
  pricings: EventPricing[];
}

function EventBookingContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const eventId = params.id as string;
  const waitlistParamId = searchParams.get('waitlistId');

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [showSeats, setShowSeats] = useState<ShowSeat[]>([]);
  const [categoryWaitlists, setCategoryWaitlists] = useState<Record<string, any>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [holdExpiresAt, setHoldExpiresAt] = useState<Date | null>(null);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number | null>(null);
  const [holdingLoading, setHoldingLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [joiningWaitlist, setJoiningWaitlist] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchEventData();
    const interval = setInterval(fetchEventData, 10000); // Polling every 10s for real-time seat status
    return () => clearInterval(interval);
  }, [eventId]);

  useEffect(() => {
    if (waitlistParamId && currentUserId) {
      handleClaimWaitlist(waitlistParamId);
    }
  }, [waitlistParamId, currentUserId]);

  // Countdown timer effect
  useEffect(() => {
    if (!holdExpiresAt) {
      setTimeLeftSeconds(null);
      return;
    }

    const updateTimer = () => {
      const diff = Math.max(0, Math.floor((holdExpiresAt.getTime() - Date.now()) / 1000));
      setTimeLeftSeconds(diff);

      if (diff === 0) {
        setHoldExpiresAt(null);
        setSelectedSeatIds([]);
        setErrorMsg('Your 10-minute seat hold has expired. Held seats have been released.');
        fetchEventData();
      }
    };

    updateTimer();
    timerRef.current = setInterval(updateTimer, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [holdExpiresAt]);

  const fetchEventData = async () => {
    try {
      const res = await fetch(`/api/events/${eventId}`);
      if (!res.ok) throw new Error('Event not found');
      const data = await res.json();
      setEvent(data.event);
      setShowSeats(data.showSeats || []);
      setCategoryWaitlists(data.categoryWaitlists || {});
      setCurrentUserId(data.currentUserId);

      // Check if user already has held seats
      if (data.currentUserId) {
        const userHeld = data.showSeats.filter(
          (s: ShowSeat) =>
            s.status === 'HELD' &&
            s.heldByUserId === data.currentUserId &&
            s.holdExpiresAt &&
            new Date(s.holdExpiresAt) > new Date()
        );

        if (userHeld.length > 0) {
          const heldIds = userHeld.map((s: ShowSeat) => s.id);
          setSelectedSeatIds(heldIds);
          // Set expiry from the latest held seat
          const expiresArr = userHeld.map((s: ShowSeat) => new Date(s.holdExpiresAt!).getTime());
          const maxExpiry = new Date(Math.max(...expiresArr));
          setHoldExpiresAt(maxExpiry);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load seat map');
    } finally {
      setLoading(false);
    }
  };

  const handleSeatClick = async (seat: ShowSeat) => {
    if (!currentUserId) {
      router.push(`/login?redirectTo=/events/${eventId}`);
      return;
    }

    if (seat.status === 'BOOKED') return;
    if (seat.status === 'HELD' && seat.heldByUserId !== currentUserId) return;

    setErrorMsg(null);
    let newSelected: string[];
    if (selectedSeatIds.includes(seat.id)) {
      newSelected = selectedSeatIds.filter((id) => id !== seat.id);
    } else {
      if (selectedSeatIds.length >= 6) {
        setErrorMsg('You can select a maximum of 6 seats per booking.');
        return;
      }
      newSelected = [...selectedSeatIds, seat.id];
    }

    setSelectedSeatIds(newSelected);

    // Automatically trigger hold API when seats are toggled
    if (newSelected.length > 0) {
      await acquireHold(newSelected);
    } else {
      await releaseHold(selectedSeatIds);
      setHoldExpiresAt(null);
    }
  };

  const acquireHold = async (seatIds: string[]) => {
    setHoldingLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/seats/hold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showSeatIds: seatIds }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Seat hold failed');
      }

      setHoldExpiresAt(new Date(data.holdExpiresAt));
      await fetchEventData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to hold selected seats due to concurrency conflict');
      await fetchEventData();
    } finally {
      setHoldingLoading(false);
    }
  };

  const releaseHold = async (seatIds: string[]) => {
    try {
      await fetch('/api/seats/release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showSeatIds: seatIds }),
      });
      setSelectedSeatIds([]);
      setHoldExpiresAt(null);
      await fetchEventData();
    } catch (err) {
      console.error('Failed to release hold:', err);
    }
  };

  const handleClaimWaitlist = async (waitlistId: string) => {
    try {
      const res = await fetch('/api/waitlist/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ waitlistId }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessNotice(`🎉 Waitlist offer claimed! ${data.seatName} is held for you.`);
        setSelectedSeatIds([data.showSeatId]);
        setHoldExpiresAt(new Date(data.expiresAt));
        await fetchEventData();
      } else {
        setErrorMsg(data.error);
      }
    } catch (err) {
      console.error('Error claiming waitlist offer:', err);
    }
  };

  const handleJoinWaitlist = async (seatCategory: string) => {
    if (!currentUserId) {
      router.push(`/login?redirectTo=/events/${eventId}`);
      return;
    }
    setJoiningWaitlist(seatCategory);
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, seatCategory }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessNotice(data.message);
        await fetchEventData();
      } else {
        setErrorMsg(data.error);
      }
    } catch (err) {
      setErrorMsg('Failed to join waitlist');
    } finally {
      setJoiningWaitlist(null);
    }
  };

  const handleConfirmBooking = async () => {
    if (selectedSeatIds.length === 0) return;
    setBookingLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          showSeatIds: selectedSeatIds,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Booking failed');
      }

      setShowCheckoutModal(false);
      router.push('/bookings?success=true');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to complete booking');
      setBookingLoading(false);
    }
  };

  if (loading || !event) {
    return (
      <div className="flex items-center justify-center py-24">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  // Price map
  const priceMap: Record<string, number> = {};
  event.pricings.forEach((p) => (priceMap[p.seatCategory] = p.price));

  // Compute selected seats summary
  const selectedSeats = showSeats.filter((s) => selectedSeatIds.includes(s.id));
  const totalPrice = selectedSeats.reduce((sum, s) => sum + (priceMap[s.seatTemplate.category] || 20), 0);

  // Group seats by row
  const rowsMap: Record<string, ShowSeat[]> = {};
  showSeats.forEach((seat) => {
    const row = seat.seatTemplate.row;
    if (!rowsMap[row]) rowsMap[row] = [];
    rowsMap[row].push(seat);
  });
  Object.keys(rowsMap).forEach((r) => rowsMap[r].sort((a, b) => a.seatTemplate.number - b.seatTemplate.number));

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-8 pb-24">
      {/* Top Header & Navigation Back */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Catalog
          </Link>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white">{event.title}</h1>
          <p className="text-slate-400 text-sm mt-1">
            {event.venue.name} • {new Date(event.date).toLocaleString()}
          </p>
        </div>

        {/* Categories Price Badges */}
        <div className="flex flex-wrap items-center gap-2">
          {event.pricings.map((p) => (
            <div
              key={p.seatCategory}
              className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2"
            >
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  p.seatCategory === 'VIP'
                    ? 'bg-amber-400'
                    : p.seatCategory === 'PREMIUM'
                    ? 'bg-purple-400'
                    : 'bg-emerald-400'
                }`}
              />
              <span className="text-slate-300">{p.seatCategory}:</span>
              <span className="text-white font-bold">${p.price.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Notifications / Alerts */}
      {errorMsg && (
        <div className="bg-red-950/80 border border-red-800 text-red-200 p-4 rounded-xl flex items-start gap-3 shadow-lg">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">{errorMsg}</div>
          <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successNotice && (
        <div className="bg-blue-950/80 border border-blue-800 text-blue-200 p-4 rounded-xl flex items-start gap-3 shadow-lg">
          <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">{successNotice}</div>
          <button onClick={() => setSuccessNotice(null)} className="text-blue-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Active Hold TTL Countdown Banner */}
      {timeLeftSeconds !== null && (
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 border border-blue-600/50 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg text-white animate-pulse">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Seats Held Temporary Reservation</p>
              <p className="text-xs text-blue-300">Complete checkout before hold expires to confirm ticket.</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-slate-950 px-4 py-2 rounded-lg border border-blue-500/40 text-center">
              <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold block">Time Remaining</span>
              <span className="text-2xl font-mono font-bold text-amber-400">{formatTimer(timeLeftSeconds)}</span>
            </div>
          </div>
        </div>
      )}

      {/* VISUAL SEAT MAP */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-10 shadow-2xl space-y-8 overflow-x-auto">
        {/* Screen / Stage Indicator */}
        <div className="w-full max-w-2xl mx-auto space-y-2">
          <div className="h-3 bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-600 rounded-full shadow-[0_0_20px_rgba(37,99,235,0.5)]" />
          <p className="text-center text-[11px] font-bold uppercase tracking-widest text-slate-500">
            STAGE / SCREEN THIS WAY
          </p>
        </div>

        {/* Seat Grid */}
        <div className="flex flex-col items-center gap-3 min-w-[500px]">
          {Object.entries(rowsMap).map(([rowLabel, seats]) => (
            <div key={rowLabel} className="flex items-center gap-3">
              <span className="w-6 text-center font-bold text-sm text-slate-400">{rowLabel}</span>
              <div className="flex items-center gap-2">
                {seats.map((seat) => {
                  const isUserHeld = seat.status === 'HELD' && seat.heldByUserId === currentUserId;
                  const isOtherHeld = seat.status === 'HELD' && seat.heldByUserId !== currentUserId;
                  const isBooked = seat.status === 'BOOKED';
                  const isSelected = selectedSeatIds.includes(seat.id);

                  let bgClass = 'bg-slate-800 border-slate-700 text-slate-300 hover:border-blue-500';

                  if (isBooked) {
                    bgClass = 'bg-red-950/60 border-red-800 text-red-600 cursor-not-allowed';
                  } else if (isOtherHeld) {
                    bgClass = 'bg-slate-800 border-slate-700 text-slate-600 cursor-not-allowed opacity-60';
                  } else if (isUserHeld || isSelected) {
                    bgClass = 'bg-blue-600 border-blue-400 text-white font-bold shadow-[0_0_10px_rgba(37,99,235,0.6)] animate-pulse';
                  } else if (seat.seatTemplate.category === 'VIP') {
                    bgClass = 'bg-amber-950/30 border-amber-600/60 text-amber-300 hover:bg-amber-600 hover:text-white';
                  } else if (seat.seatTemplate.category === 'PREMIUM') {
                    bgClass = 'bg-purple-950/30 border-purple-600/60 text-purple-300 hover:bg-purple-600 hover:text-white';
                  } else {
                    bgClass = 'bg-emerald-950/30 border-emerald-600/60 text-emerald-300 hover:bg-emerald-600 hover:text-white';
                  }

                  return (
                    <button
                      key={seat.id}
                      disabled={isBooked || isOtherHeld || holdingLoading}
                      onClick={() => handleSeatClick(seat)}
                      title={`Row ${seat.seatTemplate.row} Seat ${seat.seatTemplate.number} (${seat.seatTemplate.category}) - $${priceMap[seat.seatTemplate.category] || 20}`}
                      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg border text-xs font-semibold transition-all flex items-center justify-center ${bgClass}`}
                    >
                      {seat.seatTemplate.number}
                    </button>
                  );
                })}
              </div>
              <span className="w-6 text-center font-bold text-sm text-slate-400">{rowLabel}</span>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-6 pt-6 border-t border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-emerald-950/50 border border-emerald-500" />
            <span className="text-slate-300">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-600 border border-blue-400" />
            <span className="text-slate-300">Held by You (10m TTL)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-slate-800 border border-slate-700 opacity-60" />
            <span className="text-slate-400">Held by Other</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-950/60 border border-red-800" />
            <span className="text-slate-400">Booked</span>
          </div>
        </div>
      </div>

      {/* WAITLIST SECTION PER CATEGORY */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <h2 className="text-lg font-bold text-white">Waitlist & Automated Seat Reallocation</h2>
        </div>
        <p className="text-xs text-slate-400">
          If a seat category sells out, join the waitlist. When any booking is cancelled, seats are automatically offered to the top waitlist customer with a 10-minute claim window.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          {event.pricings.map((p) => {
            const categoryData = categoryWaitlists[p.seatCategory] || { count: 0, userWaitlisted: false };

            return (
              <div
                key={p.seatCategory}
                className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex items-center justify-between"
              >
                <div>
                  <h4 className="font-semibold text-sm text-white">{p.seatCategory} Category</h4>
                  <p className="text-xs text-slate-400">{categoryData.count} customers in queue</p>
                </div>
                {categoryData.userWaitlisted ? (
                  <span className="text-xs font-semibold bg-amber-950/80 text-amber-300 border border-amber-800 px-3 py-1.5 rounded-lg">
                    In Waitlist Queue
                  </span>
                ) : (
                  <button
                    onClick={() => handleJoinWaitlist(p.seatCategory)}
                    disabled={joiningWaitlist === p.seatCategory}
                    className="bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-semibold px-3 py-1.5 rounded-lg border border-slate-700 transition-colors"
                  >
                    {joiningWaitlist === p.seatCategory ? 'Joining...' : 'Join Waitlist'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* STICKY BOTTOM BAR FOR CHECKOUT */}
      {selectedSeatIds.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 border-t border-slate-800 p-4 backdrop-blur shadow-2xl">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Selected Seats</p>
                <p className="text-sm font-bold text-white">
                  {selectedSeats.map((s) => `Row ${s.seatTemplate.row}-${s.seatTemplate.number}`).join(', ')}
                </p>
              </div>
              <div className="h-8 w-px bg-slate-800 hidden sm:block" />
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Price</p>
                <p className="text-xl font-extrabold text-blue-400">${totalPrice.toFixed(2)}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={() => releaseHold(selectedSeatIds)}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition-colors"
              >
                Clear Selection
              </button>
              <button
                onClick={() => setShowCheckoutModal(true)}
                className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold shadow-lg transition-colors flex items-center justify-center gap-2"
              >
                <Ticket className="w-4 h-4" /> Proceed to Checkout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHECKOUT MODAL */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setShowCheckoutModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h3 className="text-xl font-extrabold text-white">Confirm Booking</h3>
              <p className="text-xs text-slate-400">Review your ticket summary and complete your purchase.</p>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Event:</span>
                <span className="font-semibold text-white">{event.title}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Venue:</span>
                <span className="font-semibold text-white">{event.venue.name}</span>
              </div>
              <div className="border-t border-slate-800 pt-2 flex justify-between text-xs">
                <span className="text-slate-400">Seats:</span>
                <span className="font-semibold text-blue-400">
                  {selectedSeats.map((s) => `R${s.seatTemplate.row}-${s.seatTemplate.number}`).join(', ')}
                </span>
              </div>
              <div className="border-t border-slate-800 pt-2 flex justify-between text-sm font-bold">
                <span className="text-slate-200">Total Payable:</span>
                <span className="text-blue-400">${totalPrice.toFixed(2)}</span>
              </div>
            </div>

            <div className="bg-blue-950/40 border border-blue-800/60 p-3 rounded-lg text-[11px] text-blue-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
              <span>A confirmation email with an embedded QR code ticket will be dispatched instantly.</span>
            </div>

            <button
              onClick={handleConfirmBooking}
              disabled={bookingLoading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2"
            >
              {bookingLoading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Ticket className="w-5 h-5" /> Confirm & Generate QR Ticket
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EventBookingPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-24 text-slate-400">Loading seat map...</div>}>
      <EventBookingContent />
    </Suspense>
  );
}
