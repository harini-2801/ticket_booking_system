'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Film, Music, Smile, Trophy, Drama, Utensils, MapPin, Calendar, Search, Ticket, Sparkles, Star, ChevronRight, Clock, ShieldCheck } from 'lucide-react';

interface EventPricing {
  seatCategory: string;
  price: number;
}

interface Performer {
  id: string;
  name: string;
  role: string;
  avatarUrl: string;
}

interface Event {
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
  isFeatured: boolean;
  city: {
    name: string;
  } | null;
  venue: {
    name: string;
    location: string;
  };
  pricings: EventPricing[];
  performers: { performer: Performer }[];
}

export default function HomePage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>('ALL');
  const [selectedCity, setSelectedCity] = useState<string>('Mumbai');
  const [dateRange, setDateRange] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');

  useEffect(() => {
    // Listen to Navbar city change event
    const handleCityChange = (e: any) => {
      if (e.detail) setSelectedCity(e.detail);
    };
    window.addEventListener('cityChanged', handleCityChange);
    return () => window.removeEventListener('cityChanged', handleCityChange);
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [category, selectedCity, dateRange]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      let url = `/api/events?category=${category}&city=${encodeURIComponent(selectedCity)}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (dateRange !== 'ALL') url += `&dateRange=${dateRange}`;

      const res = await fetch(url);
      const data = await res.json();
      setEvents(data.events || []);
    } catch (err) {
      console.error('Failed to load events', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchEvents();
  };

  const categoriesList = [
    { id: 'ALL', label: 'All Events', icon: Sparkles },
    { id: 'MOVIE', label: 'Movies', icon: Film },
    { id: 'CONCERT', label: 'Concerts & Music', icon: Music },
    { id: 'COMEDY', label: 'Standup Comedy', icon: Smile },
    { id: 'SPORTS', label: 'Sports Matches', icon: Trophy },
    { id: 'THEATRE', label: 'Theatre & Stage', icon: Drama },
    { id: 'FOOD_NIGHTLIFE', label: 'Food & Nightlife', icon: Utensils },
  ];

  const featuredEvents = events.filter((e) => e.isFeatured);
  const heroEvent = featuredEvents[0] || events[0];

  return (
    <div className="space-y-10 pb-16">
      {/* Featured Hero Banner */}
      {heroEvent && (
        <section className="relative overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl">
          <div className="absolute inset-0 z-0">
            <img
              src={heroEvent.bannerUrl || heroEvent.posterUrl}
              alt={heroEvent.title}
              className="w-full h-full object-cover opacity-30 blur-sm scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent" />
          </div>

          <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-8 p-8 sm:p-12 items-center">
            {/* Poster */}
            <div className="md:col-span-4 max-w-xs mx-auto md:mx-0">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-700 aspect-[3/4]">
                <img src={heroEvent.posterUrl} alt={heroEvent.title} className="w-full h-full object-cover" />
                <div className="absolute top-3 left-3 bg-blue-600 text-white font-bold text-xs px-3 py-1 rounded-full uppercase tracking-wider shadow">
                  FEATURED
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="md:col-span-8 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-semibold px-3 py-1 rounded-full">
                  {heroEvent.genre}
                </span>
                <span className="bg-slate-800 text-slate-300 text-xs font-semibold px-3 py-1 rounded-full border border-slate-700">
                  {heroEvent.language}
                </span>
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold px-2.5 py-1 rounded-full">
                  {heroEvent.ageRestriction}
                </span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
                {heroEvent.title}
              </h1>
              <p className="text-slate-300 text-base sm:text-lg line-clamp-2">{heroEvent.subtitle || heroEvent.description}</p>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-2">
                <div className="flex items-center gap-1.5 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800">
                  <Calendar className="w-4 h-4 text-blue-400" />
                  <span>{new Date(heroEvent.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span>{heroEvent.venue.name} ({heroEvent.city?.name})</span>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span>{heroEvent.duration}</span>
                </div>
              </div>

              <div className="pt-4 flex flex-wrap items-center gap-4">
                <Link
                  href={`/events/${heroEvent.id}`}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-xl shadow-lg transition-all flex items-center gap-2 text-sm hover:scale-105"
                >
                  <Ticket className="w-5 h-5" /> Select Seats & Book Tickets
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Category Pills Navigation */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-400" /> Explore in {selectedCity}
          </h2>

          {/* Search Box */}
          <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-72">
            <input
              type="text"
              placeholder="Search movies, artists, venues..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </form>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categoriesList.map((cat) => {
            const Icon = cat.icon;
            const isActive = category === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 font-bold scale-105'
                    : 'bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-blue-400'}`} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Date Quick Filters */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 font-semibold mr-1">Date:</span>
          {['ALL', 'today', 'tomorrow', 'weekend'].map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-3 py-1 rounded-lg font-semibold uppercase tracking-wider text-[10px] transition-colors ${
                dateRange === range
                  ? 'bg-slate-800 text-blue-400 border border-blue-600/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {range === 'ALL' ? 'Any Date' : range}
            </button>
          ))}
        </div>
      </div>

      {/* Events Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-96 bg-slate-900 rounded-2xl animate-pulse border border-slate-800" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/50 rounded-3xl border border-slate-800 space-y-3">
          <Ticket className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-semibold text-white">No events found in {selectedCity}</h3>
          <p className="text-slate-400 text-xs">Try selecting a different category, city, or clearing your search filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {events.map((event) => {
            const minPrice =
              event.pricings && event.pricings.length > 0
                ? Math.min(...event.pricings.map((p) => p.price))
                : 15;

            return (
              <div
                key={event.id}
                className="group flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 hover:shadow-2xl transition-all duration-300"
              >
                {/* Poster Container */}
                <div className="relative aspect-[3/4] w-full overflow-hidden bg-slate-950">
                  <img
                    src={event.posterUrl}
                    alt={event.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                    <span className="bg-slate-950/80 backdrop-blur px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-blue-400 border border-slate-700">
                      {event.category}
                    </span>
                    <span className="bg-amber-950/80 backdrop-blur px-2 py-0.5 rounded-full text-[9px] font-bold text-amber-300 border border-amber-800/60 text-center">
                      {event.ageRestriction}
                    </span>
                  </div>

                  <div className="absolute bottom-3 left-3 right-3 bg-slate-950/80 backdrop-blur p-2 rounded-xl border border-slate-800 flex items-center justify-between text-xs text-slate-300">
                    <span className="font-semibold text-white truncate">{event.genre}</span>
                    <span className="text-[10px] text-slate-400">{event.language}</span>
                  </div>
                </div>

                {/* Details */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-1">
                      {event.title}
                    </h3>
                    <p className="text-slate-400 text-xs line-clamp-2">{event.subtitle || event.description}</p>
                  </div>

                  {/* Performers Avatars */}
                  {event.performers && event.performers.length > 0 && (
                    <div className="flex items-center gap-2 pt-1">
                      <div className="flex -space-x-2 overflow-hidden">
                        {event.performers.map((p) => (
                          <img
                            key={p.performer.id}
                            src={p.performer.avatarUrl}
                            alt={p.performer.name}
                            className="inline-block h-6 w-6 rounded-full ring-2 ring-slate-900 object-cover"
                          />
                        ))}
                      </div>
                      <span className="text-[10px] text-slate-400 truncate">
                        {event.performers.map((p) => p.performer.name).join(', ')}
                      </span>
                    </div>
                  )}

                  <div className="space-y-1.5 pt-2 border-t border-slate-800 text-xs text-slate-300">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span className="truncate">
                        {new Date(event.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{event.venue.name}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-800/60">
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold block">From</span>
                      <span className="text-base font-extrabold text-white">${minPrice.toFixed(2)}</span>
                    </div>
                    <Link
                      href={`/events/${event.id}`}
                      className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow transition-colors flex items-center gap-1"
                    >
                      Book Tickets <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
