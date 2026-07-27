import React, { useState, useEffect } from 'react';
import { Zap, CheckCircle2, TrendingUp, Phone, ShoppingBag, Send, Plus } from 'lucide-react';
import { AFRICAN_LOCATIONS } from '../data/africanLocations';
import { useAuth } from '../context/AuthContext';

export default function UpsellManager({ selectedCountry, onNavigateToFormBuilder }) {
  const { user } = useAuth();
  const currentCountryObj = AFRICAN_LOCATIONS.find(c => c.country === selectedCountry) || AFRICAN_LOCATIONS[0];
  const curr = currentCountryObj.currency;

  const [upsellData, setUpsellData] = useState({
    total_upsell_revenue: 0,
    average_attach_rate: '0%',
    best_channel: 'Confirmation Call',
    campaigns: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUpsellData = async () => {
      try {
        const token = localStorage.getItem('gravity_crm_token');
        const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};
        const storeId = user?.store_id || user?.id || '';
        const res = await fetch(`/api/upsell?store_id=${storeId}`, { headers: authHeaders });
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.campaigns)) {
            setUpsellData(data);
          }
        }
      } catch (err) {
        console.error('Error fetching upsell data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUpsellData();
  }, [user]);

  const campaigns = upsellData.campaigns || [];

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
        {onNavigateToFormBuilder && (
          <button
            onClick={onNavigateToFormBuilder}
            className="btn-primary py-2 px-4 text-xs font-bold flex items-center gap-1.5 self-start md:self-auto"
          >
            <Plus className="w-4 h-4" /> Create Upsell Form
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-panel p-5 rounded-2xl border-amber-500/30 bg-amber-950/10">
          <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">Total Upsell Revenue</span>
          <h3 className="text-2xl font-extrabold text-slate-100 mt-1">{curr}{upsellData.total_upsell_revenue?.toLocaleString() || '0'}</h3>
          <p className="text-[10px] text-slate-400 mt-1">Incremental revenue from add-on offers</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border-indigo-500/30 bg-indigo-950/10">
          <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider block">Average Attach Rate</span>
          <h3 className="text-2xl font-extrabold text-slate-100 mt-1">{upsellData.average_attach_rate || '0%'}</h3>
          <p className="text-[10px] text-slate-400 mt-1">Orders with accepted upsells</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border-emerald-500/30 bg-emerald-950/10">
          <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">Best Channel</span>
          <h3 className="text-2xl font-extrabold text-slate-100 mt-1">{upsellData.best_channel || 'Confirmation Call'}</h3>
          <p className="text-[10px] text-slate-400 mt-1">42.0% conversion rate via phone script</p>
        </div>
      </div>

      {/* Upsell Offers List */}
      <div className="glass-panel p-5 rounded-2xl space-y-4">
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-amber-400" /> Active Store Upsell Campaigns
        </h3>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400 animate-pulse">Loading store upsell campaigns...</div>
          ) : campaigns.length === 0 ? (
            <div className="p-8 text-center space-y-3 bg-slate-950/40 rounded-xl border border-slate-800">
              <Zap className="w-8 h-8 text-amber-400/50 mx-auto" />
              <p className="text-xs text-slate-300 font-semibold">No active upsell campaigns found for your store.</p>
              <p className="text-[11px] text-slate-500">Enable 1-Click Upsell Bumps when editing your checkout forms in Form Builder to start boosting average order values.</p>
              {onNavigateToFormBuilder && (
                <button onClick={onNavigateToFormBuilder} className="btn-primary py-2 px-4 text-xs font-bold inline-flex items-center gap-1">
                  Configure Upsell in Form Builder
                </button>
              )}
            </div>
          ) : (
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
                {campaigns.map(u => (
                  <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-3 font-bold text-amber-300 flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5 fill-amber-400" /> {u.type}
                    </td>
                    <td className="p-3 text-slate-300 font-medium">{u.trigger}</td>
                    <td className="p-3 font-bold text-slate-200">{u.offer}</td>
                    <td className="p-3 font-bold text-indigo-400">{curr}{Number(u.offer_price)?.toLocaleString()}</td>
                    <td className="p-3 font-bold text-slate-300">{u.attach_rate}</td>
                    <td className="p-3 font-extrabold text-emerald-400">{curr}{Number(u.incremental_revenue)?.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
