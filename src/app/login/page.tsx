'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Ticket, Lock, Mail, ArrowRight } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      router.push(redirectTo);
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('password123');
  };

  return (
    <div className="max-w-md mx-auto py-12 space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex p-3 bg-blue-600/20 border border-blue-500/30 text-blue-400 rounded-2xl mb-2">
          <Ticket className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-extrabold text-white">Welcome Back</h1>
        <p className="text-slate-400 text-sm">Log in to manage bookings, hold seats, or host events.</p>
      </div>

      {errorMsg && (
        <div className="bg-red-950/80 border border-red-800 text-red-200 p-4 rounded-xl text-xs text-center font-medium">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleLogin} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email Address</label>
          <div className="relative">
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
            />
            <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password</label>
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

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2 text-sm"
        >
          {loading ? 'Logging in...' : 'Sign In'} <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      {/* Demo Quick Logins */}
      <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl space-y-3">
        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider text-center">Quick Demo Account Autofill</p>
        <div className="grid grid-cols-3 gap-2 text-xs font-semibold">
          <button
            type="button"
            onClick={() => handleDemoLogin('customer@demo.com')}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-blue-300 rounded-lg text-center border border-slate-700"
          >
            Customer
          </button>
          <button
            type="button"
            onClick={() => handleDemoLogin('organiser@demo.com')}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-purple-300 rounded-lg text-center border border-slate-700"
          >
            Organiser
          </button>
          <button
            type="button"
            onClick={() => handleDemoLogin('admin@demo.com')}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg text-center border border-slate-700"
          >
            Admin
          </button>
        </div>
      </div>

      <p className="text-center text-xs text-slate-400">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="text-blue-400 font-semibold hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-slate-400">Loading login...</div>}>
      <LoginForm />
    </Suspense>
  );
}
