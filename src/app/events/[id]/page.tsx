'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Ticket, Clock, CheckCircle2, AlertCircle, Sparkles, X, ArrowLeft, Utensils, Plus, Minus, ShieldCheck, MapPin, Calendar, Users, Star } from 'lucide-react';
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

interface FoodAddon {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  imageUrl: string;
}

interface Performer {
  id: string;
  name: string;
  role: string;
  avatarUrl: string;
}

interface EventDetail {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  category: string;
  genre: string;
  language: string;
  ageRestriction: string;
  duration: string;
  posterUrl: string;
  bannerUrl: string;
  date: string;
  city: { name: string } | null;
  venue: {
    name: string;
    location: string;
    address: string;
    totalRows: number;
    seatsPerRow: number;
  };
  pricings: EventPricing[];
  performers: { performer: Performer }[];
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
  const [foodAddons, setFoodAddons] = useState<FoodAddon[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Selected State
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [selectedAddons, setSelectedAddons] = useState<Record<string, number>>({});
  const [holdExpiresAt, setHoldExpiresAt] = useState<Date | null>(null);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number | null>(null);
  const [holdingLoading, setHoldingLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showFoodModal, setShowFoodModal] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [joiningWaitlist, setJoiningWaitlist] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchEventData();
    const interval = setInterval(fetchEventData, 10000);
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
      setFoodAddons(data.foodAddons || []);
      setCurrentUserId(data.currentUserId);

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

  const handleAddonQuantity = (addonId: string, delta: number) => {
    const current = selectedAddons[addonId] || 0;
    const next = Math.max(0, current + delta);
    setSelectedAddons({ ...selectedAddons, [addonId]: next });
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

    // Format selected addons array
    const addonsPayload = Object.entries(selectedAddons)
      .filter(([_, qty]) => qty > 0)
      .map(([addonId, quantity]) => ({ addonId, quantity }));

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          showSeatIds: selectedSeatIds,
          selectedAddons: addonsPayload,
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
      <div className="flex items-center justify-center py-24 text-slate-400">
        Loading District Event Experience...
      </div>
    );
  }

  const priceMap: Record<string, number> = {};
  event.pricings.forEach((p) => (priceMap[p.seatCategory] = p.price));

  const selectedSeats = showSeats.filter((s) => selectedSeatIds.includes(s.id));
  const ticketTotal = selectedSeats.reduce((sum, s) => sum + (priceMap[s.seatTemplate.category] || 20), 0);

  // F&B Addons Total Calculation
  const addonsTotal = Object.entries(selectedAddons).reduce((sum, [addonId, qty]) => {
    const item = foodAddons.find((f) => f.id === addonId);
    return sum + (item ? item.price * qty : 0);
  }, 0);

  const grandTotal = ticketTotal + addonsTotal;

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
    <div className="space-y-8 pb-32">
      {/* Back Navigation */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to District Events
      </Link>

      {/* Hero Header */}
      <div className="relative rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-10 shadow-2xl overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-20">
          <img src={event.bannerUrl || event.posterUrl} alt={event.title} className="w-full h-full object-cover blur-sm" />
        </div>

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          <div className="md:col-span-3 max-w-xs mx-auto md:mx-0">
            <img src={event.posterUrl} alt={event.title} className="w-full rounded-2xl shadow-xl border border-slate-700 aspect-[3/4] object-cover" />
          </div>

          <div className="md:col-span-9 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-blue-600/20 text-blue-400 border border-blue-500/30 text-xs font-bold px-3 py-1 rounded-full uppercase">
                {event.category}
              </span>
              <span className="bg-slate-800 text-slate-300 text-xs font-semibold px-3 py-1 rounded-full border border-slate-700">
                {event.genre}
              </span>
              <span className="bg-amber-950 text-amber-300 text-xs font-bold px-2.5 py-1 rounded-full border border-amber-800">
                {event.ageRestriction}
              </span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold text-white">{event.title}</h1>
            <p className="text-slate-300 text-sm sm:text-base">{event.subtitle || event.description}</p>

            {/* Performers Avatars */}
            {event.performers && event.performers.length > 0 && (
              <div className="flex items-center gap-3 pt-2">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Featured Artists:</span>
                <div className="flex items-center gap-3">
                  {event.performers.map((p) => (
                    <div key={p.performer.id} className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-full border border-slate-800">
                      <img src={p.performer.avatarUrl} alt={p.performer.name} className="w-6 h-6 rounded-full object-cover" />
                      <span className="text-xs font-bold text-white">{p.performer.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-2 border-t border-slate-800/80">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-blue-400" />
                <span>{new Date(event.date).toLocaleString([], { dateStyle: 'full', timeStyle: 'short' })}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span>{event.venue.name} ({event.venue.location})</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
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

      {/* 10-Min Hold TTL Timer Banner */}
      {timeLeftSeconds !== null && (
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 border border-blue-600/50 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl text-white animate-pulse">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Seats Held Temporary Reservation</p>
              <p className="text-xs text-blue-300">Complete checkout before 10-minute hold expires.</p>
            </div>
          </div>
          <div className="bg-slate-950 px-5 py-2 rounded-xl border border-blue-500/40 text-center">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Hold Expiry</span>
            <span className="text-2xl font-mono font-extrabold text-amber-400">{formatTimer(timeLeftSeconds)}</span>
          </div>
        </div>
      )}

      {/* VISUAL SEAT MAP */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8 overflow-x-auto">
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

      {/* FOOD & BEVERAGE ADDONS SECTION */}
      {foodAddons.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Utensils className="w-6 h-6 text-amber-400" />
              <div>
                <h2 className="text-xl font-bold text-white">Food & Beverage Combos</h2>
                <p className="text-xs text-slate-400">Add popcorn, snacks, sodas, or VIP Lounge passes to your booking.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {foodAddons.map((addon) => {
              const qty = selectedAddons[addon.id] || 0;

              return (
                <div
                  key={addon.id}
                  className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex items-center gap-4 hover:border-slate-700 transition-colors"
                >
                  <img src={addon.imageUrl} alt={addon.name} className="w-16 h-16 rounded-xl object-cover shrink-0" />
                  <div className="flex-1 space-y-1">
                    <h4 className="font-bold text-xs text-white leading-snug">{addon.name}</h4>
                    <p className="text-[10px] text-slate-400 line-clamp-1">{addon.description}</p>
                    <p className="text-xs font-extrabold text-blue-400">${addon.price.toFixed(2)}</p>
                  </div>

                  {/* Quantity Counter */}
                  <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
                    <button
                      onClick={() => handleAddonQuantity(addon.id, -1)}
                      className="p-1 text-slate-400 hover:text-white"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-bold text-white w-4 text-center">{qty}</span>
                    <button
                      onClick={() => handleAddonQuantity(addon.id, 1)}
                      className="p-1 text-slate-400 hover:text-white"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* WAITLIST SECTION */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <h2 className="text-lg font-bold text-white">Waitlist & Automated Seat Reallocation</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {event.pricings.map((p) => {
            const categoryData = categoryWaitlists[p.seatCategory] || { count: 0, userWaitlisted: false };

            return (
              <div
                key={p.seatCategory}
                className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex items-center justify-between"
              >
                <div>
                  <h4 className="font-bold text-sm text-white">{p.seatCategory} Category</h4>
                  <p className="text-xs text-slate-400">{categoryData.count} customers in queue</p>
                </div>
                {categoryData.userWaitlisted ? (
                  <span className="text-xs font-bold bg-amber-950/80 text-amber-300 border border-amber-800 px-3 py-1.5 rounded-xl">
                    In Waitlist Queue
                  </span>
                ) : (
                  <button
                    onClick={() => handleJoinWaitlist(p.seatCategory)}
                    disabled={joiningWaitlist === p.seatCategory}
                    className="bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-bold px-3 py-1.5 rounded-xl border border-slate-700 transition-colors"
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
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 border-t border-slate-800 p-4 backdrop-blur shadow-2xl">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-6">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Selected Seats</p>
                <p className="text-xs font-bold text-white">
                  {selectedSeats.map((s) => `Row ${s.seatTemplate.row}-${s.seatTemplate.number}`).join(', ')}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">F&B Addons Total</p>
                <p className="text-xs font-bold text-amber-400">${addonsTotal.toFixed(2)}</p>
              </div>
              <div className="h-8 w-px bg-slate-800 hidden sm:block" />
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Grand Total</p>
                <p className="text-xl font-extrabold text-blue-400">${grandTotal.toFixed(2)}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={() => releaseHold(selectedSeatIds)}
                className="px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:text-white text-xs font-semibold"
              >
                Clear Seats
              </button>
              <button
                onClick={() => setShowCheckoutModal(true)}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold shadow-lg transition-colors flex items-center justify-center gap-2"
              >
                <Ticket className="w-4 h-4" /> Proceed to Checkout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHECKOUT SUMMARY MODAL */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setShowCheckoutModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h3 className="text-xl font-extrabold text-white">District Pass Order Summary</h3>
              <p className="text-xs text-slate-400">Review your ticket seats & Food/Beverage add-ons.</p>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Event:</span>
                <span className="font-bold text-white">{event.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Venue:</span>
                <span className="font-semibold text-white">{event.venue.name}</span>
              </div>
              <div className="border-t border-slate-800 pt-2 flex justify-between">
                <span className="text-slate-400">Seats Subtotal:</span>
                <span className="font-bold text-blue-400">${ticketTotal.toFixed(2)}</span>
              </div>

              {/* Addons List */}
              {addonsTotal > 0 && (
                <div className="border-t border-slate-800 pt-2 space-y-1">
                  <span className="text-slate-400 block font-semibold">F&B Addons:</span>
                  {Object.entries(selectedAddons).map(([addonId, qty]) => {
                    if (qty <= 0) return null;
                    const item = foodAddons.find((f) => f.id === addonId);
                    if (!item) return null;
                    return (
                      <div key={addonId} className="flex justify-between text-[11px] text-slate-300">
                        <span>{qty}x {item.name}</span>
                        <span>${(item.price * qty).toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="border-t border-slate-800 pt-3 flex justify-between text-base font-extrabold">
                <span className="text-white">Total Payable:</span>
                <span className="text-blue-400">${grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={handleConfirmBooking}
              disabled={bookingLoading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-2xl shadow-xl transition-colors flex items-center justify-center gap-2"
            >
              {bookingLoading ? 'Processing Ticket & QR...' : 'Confirm Order & Issue Digital Ticket'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EventBookingPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-24 text-slate-400">Loading District Event...</div>}>
      <EventBookingContent />
    </Suspense>
  );
}
