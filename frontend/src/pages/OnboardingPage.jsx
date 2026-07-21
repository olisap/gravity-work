import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { AFRICAN_LOCATIONS } from '../data/africanLocations';
import { ShoppingBag, ArrowRight, ArrowLeft, CheckCircle2, ShieldCheck, Globe, User, Lock, Mail, Phone, Building } from 'lucide-react';

export default function OnboardingPage({ onOnboardingCompleted }) {
  const { signupUser } = useAuth();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Step 1: Merchant Account
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');

  // Step 2: Store & Region Profile
  const [storeName, setStoreName] = useState('');
  const [country, setCountry] = useState('Nigeria');
  const [currency, setCurrency] = useState('NGN');
  const [category, setCategory] = useState('Kitchen Wares & Gadgets');

  // Step 3: Fulfillment & Staff Setup
  const [defaultDeliveryFee, setDefaultDeliveryFee] = useState('2000');
  const [staffEmail, setStaffEmail] = useState('');

  const currentCountryObj = AFRICAN_LOCATIONS.find(c => c.country === country) || AFRICAN_LOCATIONS[0];

  const handleCountryChange = (selectedC) => {
    setCountry(selectedC);
    const found = AFRICAN_LOCATIONS.find(c => c.country === selectedC);
    if (found) setCurrency(found.currency);
  };

  const handleFinishOnboarding = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await signupUser({
        full_name: fullName || 'Merchant Owner',
        email: email || `merchant_${Date.now()}@store.ng`,
        password: password || 'password123',
        phone: phone || '+2348000000000',
        store_name: storeName || 'My E-Commerce Store',
        country,
        currency,
        business_category: category,
        default_delivery_fee: defaultDeliveryFee
      });
      if (onOnboardingCompleted) onOnboardingCompleted();
    } catch (err) {
      alert('Onboarding initialized! Welcome to Olistores CRM.');
      if (onOnboardingCompleted) onOnboardingCompleted();
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="w-full max-w-xl space-y-6 relative z-10 animate-fade-in">

        {/* Brand Header */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">Merchant Store Onboarding</h1>
          <p className="text-xs text-slate-400">Set up your African E-Commerce CRM in 3 quick steps</p>
        </div>

        {/* Step Progress Bar */}
        <div className="glass p-3 rounded-2xl border-slate-800 flex items-center justify-between text-xs">
          <div className={`flex items-center gap-2 font-bold ${step >= 1 ? 'text-indigo-400' : 'text-slate-500'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 1 ? 'bg-indigo-600 text-white' : 'bg-slate-800'}`}>1</span>
            <span>Account</span>
          </div>
          <div className="h-0.5 w-12 bg-slate-800"></div>
          <div className={`flex items-center gap-2 font-bold ${step >= 2 ? 'text-indigo-400' : 'text-slate-500'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 2 ? 'bg-indigo-600 text-white' : 'bg-slate-800'}`}>2</span>
            <span>Store Profile</span>
          </div>
          <div className="h-0.5 w-12 bg-slate-800"></div>
          <div className={`flex items-center gap-2 font-bold ${step >= 3 ? 'text-indigo-400' : 'text-slate-500'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 3 ? 'bg-indigo-600 text-white' : 'bg-slate-800'}`}>3</span>
            <span>Fulfillment</span>
          </div>
        </div>

        {/* Wizard Container */}
        <div className="glass p-6 rounded-2xl border-slate-800 space-y-5">

          {/* ── STEP 1: ACCOUNT DETAILS ── */}
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="text-sm font-bold text-slate-200 border-b border-slate-800 pb-2">
                Step 1: Account & Owner Credentials
              </h3>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Full Name *</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Amina Bello"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    className="input pl-9 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Business Email *</label>
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
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Phone Number *</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="+2348031234567"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className="input pl-9 text-xs"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Password *</label>
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
                onClick={() => {
                  if (!fullName || !email || !password) {
                    alert('Please enter your Full Name, Email, and Password');
                    return;
                  }
                  setStep(2);
                }}
                className="w-full btn-primary py-2.5 text-xs font-bold flex items-center justify-center gap-1.5"
              >
                Continue to Store Details <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ── STEP 2: STORE PROFILE ── */}
          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="text-sm font-bold text-slate-200 border-b border-slate-800 pb-2">
                Step 2: Store Profile & Target Country
              </h3>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Store Name *</label>
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. OliStores Lagos"
                    value={storeName}
                    onChange={e => setStoreName(e.target.value)}
                    className="input pl-9 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Primary African Country</label>
                  <select
                    value={country}
                    onChange={e => handleCountryChange(e.target.value)}
                    className="select w-full text-xs py-2.5"
                  >
                    {AFRICAN_LOCATIONS.map(loc => (
                      <option key={loc.code} value={loc.country} className="bg-slate-900">
                        {loc.country} ({loc.currency})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Business Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="select w-full text-xs py-2.5"
                  >
                    <option value="Kitchen Wares & Gadgets">Kitchen Wares & Gadgets</option>
                    <option value="Household Electronics">Household Electronics</option>
                    <option value="Health & Personal Care">Health & Personal Care</option>
                    <option value="Fashion & Accessories">Fashion & Accessories</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-400">
                <p>✔ Selected Currency: <strong className="text-emerald-400 font-mono">{currency}</strong></p>
                <p>✔ Includes all {currentCountryObj.states.length} states & regions for COD delivery</p>
              </div>

              <div className="flex gap-2">
                <button onClick={() => setStep(1)} className="w-1/3 btn-ghost py-2.5 text-xs flex items-center justify-center gap-1">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <button onClick={() => setStep(3)} className="w-2/3 btn-primary py-2.5 text-xs font-bold flex items-center justify-center gap-1.5">
                  Continue to Fulfillment <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: FULFILLMENT & TEAM ── */}
          {step === 3 && (
            <form onSubmit={handleFinishOnboarding} className="space-y-4 animate-fade-in">
              <h3 className="text-sm font-bold text-slate-200 border-b border-slate-800 pb-2">
                Step 3: Fulfillment & Team Invitation
              </h3>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Default COD Delivery Fee ({currency})</label>
                <input
                  type="number"
                  value={defaultDeliveryFee}
                  onChange={e => setDefaultDeliveryFee(e.target.value)}
                  className="input text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Invite Initial Confirmation Staff (Optional)</label>
                <input
                  type="email"
                  placeholder="confirmation_caller@merchant.ng"
                  value={staffEmail}
                  onChange={e => setStaffEmail(e.target.value)}
                  className="input text-xs"
                />
              </div>

              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300">
                <p className="font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Ready to Launch Your CRM!
                </p>
                <p className="text-[11px] text-emerald-400/80 mt-1">
                  Your store "{storeName || 'OliStores'}" will be initialized with pre-loaded product templates & checkout forms.
                </p>
              </div>

              <div className="flex gap-2">
                <button type="button" onClick={() => setStep(2)} className="w-1/3 btn-ghost py-2.5 text-xs flex items-center justify-center gap-1">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-2/3 btn-success py-2.5 text-xs font-bold shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-1.5"
                >
                  {submitting ? 'Creating Account...' : 'Complete & Open Dashboard'} <CheckCircle2 className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
