'use client';

import React, { useEffect, useState } from 'react';
import { LayoutDashboard, Plus, DollarSign, Ticket, Calendar, RefreshCw, X, Utensils, Award } from 'lucide-react';

interface EventSummary {
  id: string;
  title: string;
  category: string;
  date: string;
  venueName: string;
  totalSeats: number;
  bookedSeatsCount: number;
  heldSeatsCount: number;
  availableSeatsCount: number;
  occupancyRate: string;
  totalRevenue: number;
  bookingsCount: number;
  waitlistCount: number;
}

interface Venue {
  id: string;
  name: string;
  location: string;
}

export default function OrganiserPage() {
  const [summary, setSummary] = useState<EventSummary[]>([]);
  const [stats, setStats] = useState({ totalEvents: 0, overallRevenue: 0, overallBookings: 0 });
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    description: '',
    category: 'MOVIE',
    genre: 'Sci-Fi',
    language: 'English',
    ageRestriction: 'All Ages',
    duration: '2h 30m',
    posterUrl: '',
    bannerUrl: '',
    venueId: '',
    date: '',
    priceStandard: '15',
    pricePremium: '25',
    priceVip: '40',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [sumRes, venueRes] = await Promise.all([
        fetch('/api/organiser/summary'),
        fetch('/api/venues'),
      ]);
      const sumData = await sumRes.json();
      const venueData = await venueRes.json();

      setSummary(sumData.events || []);
      setStats(sumData.stats || { totalEvents: 0, overallRevenue: 0, overallBookings: 0 });
      setVenues(venueData.venues || []);
      if (venueData.venues && venueData.venues.length > 0) {
        setFormData((prev) => ({ ...prev, venueId: venueData.venues[0].id }));
      }
    } catch (err) {
      console.error('Failed to load organiser data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          subtitle: formData.subtitle,
          description: formData.description,
          category: formData.category,
          genre: formData.genre,
          language: formData.language,
          ageRestriction: formData.ageRestriction,
          duration: formData.duration,
          posterUrl: formData.posterUrl,
          bannerUrl: formData.bannerUrl,
          venueId: formData.venueId,
          date: formData.date,
          prices: {
            STANDARD: parseFloat(formData.priceStandard),
            PREMIUM: parseFloat(formData.pricePremium),
            VIP: parseFloat(formData.priceVip),
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create event');

      setShowCreateModal(false);
      setFormData({
        title: '',
        subtitle: '',
        description: '',
        category: 'MOVIE',
        genre: 'Sci-Fi',
        language: 'English',
        ageRestriction: 'All Ages',
        duration: '2h 30m',
        posterUrl: '',
        bannerUrl: '',
        venueId: venues[0]?.id || '',
        date: '',
        priceStandard: '15',
        pricePremium: '25',
        priceVip: '40',
      });
      await fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error creating event');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-2">
            <LayoutDashboard className="w-7 h-7 text-blue-500" /> District Organiser Studio
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Manage multi-genre event listings, track ticket sales, occupancy, and total revenue analytics.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm px-5 py-2.5 rounded-2xl shadow-xl transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" /> Publish New Event Listing
        </button>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Sales Revenue</p>
            <h3 className="text-2xl font-extrabold text-emerald-400 mt-1">${stats.overallRevenue.toFixed(2)}</h3>
          </div>
          <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-2xl text-emerald-400">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Tickets Issued</p>
            <h3 className="text-2xl font-extrabold text-blue-400 mt-1">{stats.overallBookings}</h3>
          </div>
          <div className="p-3 bg-blue-950/60 border border-blue-800 rounded-2xl text-blue-400">
            <Ticket className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Active Published Events</p>
            <h3 className="text-2xl font-extrabold text-purple-400 mt-1">{stats.totalEvents}</h3>
          </div>
          <div className="p-3 bg-purple-950/60 border border-purple-800 rounded-2xl text-purple-400">
            <Calendar className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Event Summary Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-slate-800">
          <h3 className="text-lg font-bold text-white">Event Performance & Revenue Studio</h3>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" /> Loading analytics...
          </div>
        ) : summary.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <p>No event listings published yet.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-xs font-bold text-blue-400 hover:underline"
            >
              + Create your first District event
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <th className="p-4">Event Title</th>
                  <th className="p-4">Venue & Date</th>
                  <th className="p-4">Occupancy Rate</th>
                  <th className="p-4">Waitlist Queue</th>
                  <th className="p-4">Total Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-xs">
                {summary.map((event) => (
                  <tr key={event.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="p-4 font-bold text-white">
                      <div>{event.title}</div>
                      <span className="text-[10px] text-blue-400 font-bold uppercase">{event.category}</span>
                    </td>
                    <td className="p-4 text-slate-300">
                      <div>{event.venueName}</div>
                      <div className="text-[10px] text-slate-400">{new Date(event.date).toLocaleString()}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                          <div
                            className="bg-blue-500 h-full rounded-full"
                            style={{ width: `${event.occupancyRate}%` }}
                          />
                        </div>
                        <span className="font-bold text-slate-200">{event.occupancyRate}%</span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {event.bookedSeatsCount} / {event.totalSeats} seats
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-lg bg-amber-950/60 border border-amber-800 text-amber-300 font-bold">
                        {event.waitlistCount} in queue
                      </span>
                    </td>
                    <td className="p-4 font-extrabold text-emerald-400 text-sm">
                      ${event.totalRevenue.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE EVENT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-extrabold text-white">Publish District Event Listing</h3>

            {errorMsg && (
              <div className="p-3 bg-red-950 border border-red-800 text-red-200 rounded-xl text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateEvent} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Event Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dune: Part Two (IMAX 70mm)"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Subtitle / Tagline</label>
                <input
                  type="text"
                  placeholder="e.g. Experience Christopher Nolan's masterpiece"
                  value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  >
                    <option value="MOVIE">Movie</option>
                    <option value="CONCERT">Concert & Music</option>
                    <option value="COMEDY">Standup Comedy</option>
                    <option value="SPORTS">Sports Match</option>
                    <option value="THEATRE">Theatre & Stage</option>
                    <option value="FOOD_NIGHTLIFE">Food & Nightlife</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Venue</label>
                  <select
                    value={formData.venueId}
                    onChange={(e) => setFormData({ ...formData, venueId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  >
                    {venues.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.location})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Genre</label>
                  <input
                    type="text"
                    placeholder="Sci-Fi / Rock"
                    value={formData.genre}
                    onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Language</label>
                  <input
                    type="text"
                    placeholder="English / Hindi"
                    value={formData.language}
                    onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Age Restriction</label>
                  <select
                    value={formData.ageRestriction}
                    onChange={(e) => setFormData({ ...formData, ageRestriction: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white"
                  >
                    <option value="All Ages">All Ages</option>
                    <option value="13+">13+</option>
                    <option value="16+">16+</option>
                    <option value="18+">18+</option>
                    <option value="21+">21+</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Poster URL</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={formData.posterUrl}
                    onChange={(e) => setFormData({ ...formData, posterUrl: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div className="border-t border-slate-800 pt-4 space-y-3">
                <p className="font-bold text-slate-200">Per-Category Pricing ($)</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Standard</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.priceStandard}
                      onChange={(e) => setFormData({ ...formData, priceStandard: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Premium</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.pricePremium}
                      onChange={(e) => setFormData({ ...formData, pricePremium: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">VIP</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.priceVip}
                      onChange={(e) => setFormData({ ...formData, priceVip: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={creating}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-2xl shadow-xl transition-colors flex items-center justify-center gap-2"
              >
                {creating ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Publish Event Listing'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
