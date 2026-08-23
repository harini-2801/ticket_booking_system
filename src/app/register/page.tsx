'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Ticket, Lock, Mail, User, Shield, ArrowRight } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('CUSTOMER');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');

      router.push('/');
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12 space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex p-3 bg-blue-600/20 border border-blue-500/30 text-blue-400 rounded-2xl mb-2">
          <Ticket className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-extrabold text-white">Create an Account</h1>
        <p className="text-slate-400 text-sm">Join TicketPass to book tickets, hold seats, or host events.</p>
      </div>

      {errorMsg && (
        <div className="bg-red-950/80 border border-red-800 text-red-200 p-4 rounded-xl text-xs text-center font-medium">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleRegister} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4 text-xs">
        <div>
          <label className="block font-semibold text-slate-300 mb-1.5">Full Name</label>
          <div className="relative">
            <input
              type="text"
              required
              placeholder="Jane Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
            />
            <User className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
          </div>
        </div>

        <div>
          <label className="block font-semibold text-slate-300 mb-1.5">Email Address</label>
          <div className="relative">
            <input
              type="email"
              required
              placeholder="jane@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
            />
            <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
          </div>
        </div>

        <div>
          <label className="block font-semibold text-slate-300 mb-1.5">Password</label>
          <div className="relative">
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
            />
            <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
          </div>
        </div>

        <div>
          <label className="block font-semibold text-slate-300 mb-1.5">Account Role</label>
          <div className="grid grid-cols-3 gap-2">
            {['CUSTOMER', 'ORGANISER', 'ADMIN'].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`py-2 px-3 rounded-xl border font-bold transition-all text-center ${
                  role === r
                    ? 'bg-blue-600 border-blue-400 text-white shadow'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2 text-sm mt-2"
        >
          {loading ? 'Creating Account...' : 'Create Account'} <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      <p className="text-center text-xs text-slate-400">
        Already have an account?{' '}
        <Link href="/login" className="text-blue-400 font-semibold hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
