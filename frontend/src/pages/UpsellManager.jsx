import React from 'react';
import { Zap, CheckCircle2, TrendingUp, Phone, ShoppingBag, Send } from 'lucide-react';
import { AFRICAN_LOCATIONS } from '../data/africanLocations';

export default function UpsellManager({ selectedCountry }) {
  const currentCountryObj = AFRICAN_LOCATIONS.find(c => c.country === selectedCountry) || AFRICAN_LOCATIONS[0];
  const curr = currentCountryObj.currency;

  const mockUpsells = [
    {
      id: 'u1',
      type: 'Form Bump (Pre-Submit)',
      trigger: 'Insulated Stainless Steel Lunch Box',
      offer: 'Portable Electric USB Juicer Cup',
      offer_price: 7000,
      attach_rate: '28.5%',
      incremental_revenue: 21000
    },
    {
      id: 'u2',
      type: 'Confirmation Call Prompt',
      trigger: 'Cordless Rechargeable Spin Mop',
      offer: 'Insulated Stainless Steel Lunch Box',
      offer_price: 14000,
      attach_rate: '42.0%',
      incremental_revenue: 56000
    },
    {
      id: 'u3',
      type: 'Post-Delivery Automated Nudge (7 Days)',
      trigger: 'Any Delivered Order',
      offer: 'Smart Blood Pressure Monitor (20% Off)',
      offer_price: 18000,
      attach_rate: '15.2%',
      incremental_revenue: 36000
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400 fill-amber-400" /> Triple-Tier Upsell Engine
          </h2>
          <p className="text-xs text-slate-400">
            Form Bumps, Staff Confirmation Prompts, and Post-Delivery Automated Nudges
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-panel p-5 rounded-2xl border-amber-500/30 bg-amber-950/10">
          <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">Total Upsell Revenue</span>
          <h3 className="text-2xl font-extrabold text-slate-100 mt-1">{curr}113,000</h3>
          <p className="text-[10px] text-slate-400 mt-1">Incremental revenue from add-on offers</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border-indigo-500/30 bg-indigo-950/10">
          <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider block">Average Attach Rate</span>
          <h3 className="text-2xl font-extrabold text-slate-100 mt-1">31.9%</h3>
          <p className="text-[10px] text-slate-400 mt-1">Orders with accepted upsells</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border-emerald-500/30 bg-emerald-950/10">
          <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">Best Channel</span>
          <h3 className="text-2xl font-extrabold text-slate-100 mt-1">Confirmation Call</h3>
          <p className="text-[10px] text-slate-400 mt-1">42.0% conversion rate via phone script</p>
        </div>
      </div>

      {/* Upsell Offers List */}
      <div className="glass-panel p-5 rounded-2xl space-y-4">
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-amber-400" /> Active Upsell Campaigns
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3">Campaign Channel</th>
                <th className="p-3">Trigger Condition</th>
                <th className="p-3">Add-on Product Offer</th>
                <th className="p-3">Special Offer Price</th>
                <th className="p-3">Attach Rate</th>
                <th className="p-3 font-bold text-emerald-400">Added Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {mockUpsells.map(u => (
                <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-3 font-bold text-amber-300 flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 fill-amber-400" /> {u.type}
                  </td>
                  <td className="p-3 text-slate-300">{u.trigger}</td>
                  <td className="p-3 font-bold text-slate-200">{u.offer}</td>
                  <td className="p-3 font-bold text-indigo-400">{curr}{u.offer_price?.toLocaleString()}</td>
                  <td className="p-3 font-bold text-slate-300">{u.attach_rate}</td>
                  <td className="p-3 font-extrabold text-emerald-400">{curr}{u.incremental_revenue?.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
