'use client';

import React, { useEffect, useState } from 'react';
import { Building2, Plus, RefreshCw, Layers, CheckCircle2, AlertCircle } from 'lucide-react';

interface Venue {
  id: string;
  name: string;
  location: string;
  totalRows: number;
  seatsPerRow: number;
  _count: {
    seats: number;
    events: number;
  };
}

export default function AdminPage() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [totalRows, setTotalRows] = useState(6);
  const [seatsPerRow, setSeatsPerRow] = useState(10);

  useEffect(() => {
    fetchVenues();
  }, []);

  const fetchVenues = async () => {
    try {
      const res = await fetch('/api/venues');
      const data = await res.json();
      setVenues(data.venues || []);
    } catch (err) {
      console.error('Failed to load venues:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVenue = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setMsg(null);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/venues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          location,
          totalRows,
          seatsPerRow,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create venue');

      setMsg(`Venue "${name}" created with ${totalRows * seatsPerRow} seat templates!`);
      setName('');
      setLocation('');
      await fetchVenues();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error creating venue');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="border-b border-slate-800 pb-6">
        <h1 className="text-3xl font-extrabold text-white flex items-center gap-2">
          <Building2 className="w-7 h-7 text-blue-500" /> Admin Venue Management
        </h1>
        <p className="text-slate-400 text-sm mt-1">Configure venues, seat layouts, and seat category templates (VIP, Premium, Standard).</p>
      </div>

      {msg && (
        <div className="bg-emerald-950/80 border border-emerald-800 text-emerald-200 p-4 rounded-xl text-sm flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{msg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-950/80 border border-red-800 text-red-200 p-4 rounded-xl text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Create Venue Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Plus className="w-5 h-5 text-blue-400" /> Create New Venue & Seat Grid
        </h3>

        <form onSubmit={handleCreateVenue} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Venue Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Grand IMAX Cinema"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Location / Address</label>
            <input
              type="text"
              required
              placeholder="e.g. Downtown Hall 1, New York"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Total Rows (A, B, C...)</label>
            <input
              type="number"
              min="1"
              max="20"
              required
              value={totalRows}
              onChange={(e) => setTotalRows(parseInt(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Seats Per Row (1, 2, 3...)</label>
            <input
              type="number"
              min="1"
              max="30"
              required
              value={seatsPerRow}
              onChange={(e) => setSeatsPerRow(parseInt(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
            />
          </div>

          <div className="sm:col-span-2 pt-2">
            <button
              type="submit"
              disabled={creating}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2"
            >
              {creating ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Generate Venue & Seat Grid'}
            </button>
          </div>
        </form>
      </div>

      {/* Existing Venues */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Layers className="w-5 h-5 text-blue-400" /> Configured Venues ({venues.length})
        </h3>

        {loading ? (
          <p className="text-sm text-slate-400">Loading venues...</p>
        ) : venues.length === 0 ? (
          <p className="text-sm text-slate-400">No venues created yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {venues.map((venue) => (
              <div key={venue.id} className="bg-slate-950 border border-slate-800 p-5 rounded-xl space-y-2">
                <h4 className="font-bold text-base text-white">{venue.name}</h4>
                <p className="text-xs text-slate-400">{venue.location}</p>
                <div className="flex items-center gap-4 text-xs font-semibold text-blue-400 pt-2 border-t border-slate-900">
                  <span>{venue.totalRows} Rows × {venue.seatsPerRow} Columns</span>
                  <span>({venue._count.seats} Seats)</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
