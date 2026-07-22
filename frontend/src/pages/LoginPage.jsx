import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, ShieldCheck, ArrowRight, Sparkles, UserCheck } from 'lucide-react';

export default function LoginPage({ onNavigateToOnboarding }) {
  const { loginUser, switchDemoRole } = useAuth();
  const [email, setEmail] = useState('owner@merchant.ng');
  const [password, setPassword] = useState('password123');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);
    try {
      await loginUser(email, password);
    } catch (err) {
      setErrorMsg(err.message || 'Login failed. Check your email & password.');
    }
    setSubmitting(false);
  };

  const demoProfiles = [
    { name: 'Amina Bello', email: 'owner@merchant.ng', role: 'owner', label: 'Owner / Admin', badge: 'Full Access', id: '8d39ba92-0b9b-440e-ae12-7fc9fc05a605', store_id: '00000000-0000-0000-0000-784637855674' },
    { name: 'Chidi Okafor', email: 'chidi@merchant.ng', role: 'confirmation_staff', label: 'Confirmation Caller', badge: 'Orders & Calls', id: '9b4b165b-3de7-46c4-8fac-400f5571cf7f', store_id: '00000000-0000-0000-0000-784637855674' },
    { name: 'Babajide Adeleke', email: 'logistics@merchant.ng', role: 'logistics', label: 'Logistics Rider', badge: 'Deliveries', id: '5215da9d-b7da-4a3c-ae4a-d5b72929b8fa', store_id: '00000000-0000-0000-0000-784637855674' },
  ];

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md space-y-6 relative z-10 animate-fade-in">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 p-2 mx-auto flex items-center justify-center shadow-xl shadow-indigo-600/20">
            <img src="/logo.png" alt="Gravity CRM" className="w-full h-full object-contain" onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/60?text=CRM'; }} />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">Olistores CRM</h1>
          <p className="text-xs text-slate-400">Sign in to your merchant portal or switch demo profiles</p>
        </div>

        {/* Login Card */}
        <div className="glass p-6 rounded-2xl border-slate-800 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-semibold text-center">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Business Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="owner@merchant.ng"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="input pl-9 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input pl-9 text-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full btn-primary py-3 text-sm font-bold shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
            >
              {submitting ? 'Signing in...' : 'Sign In to Dashboard'} <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Switchers */}
          <div className="border-t border-slate-800/80 pt-4 space-y-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">
              ⚡ 1-Click Quick Demo Sign In
            </p>
            <div className="space-y-1.5">
              {demoProfiles.map((p) => (
                <button
                  key={p.email}
                  onClick={() => {
                    setEmail(p.email);
                    setPassword('password123');
                    switchDemoRole(p.role, p.email, p.name, p.id, p.store_id);
                  }}
                  className="w-full bg-slate-950/80 hover:bg-slate-800 border border-slate-800 p-2.5 rounded-xl flex items-center justify-between text-xs transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                    <div className="text-left">
                      <p className="font-semibold text-slate-200">{p.name}</p>
                      <p className="text-[10px] text-slate-500">{p.label}</p>
                    </div>
                  </div>
                  <span className="badge badge-scheduled text-[10px]">{p.badge}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Create New Account Button */}
        <div className="text-center">
          <p className="text-xs text-slate-400">
            Don't have a store account yet?{' '}
            <button
              onClick={onNavigateToOnboarding}
              className="text-indigo-400 font-bold hover:underline"
            >
              Start Merchant Onboarding →
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
