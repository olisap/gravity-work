import React, { useState } from 'react';
import { CheckCircle2, Clock, ShoppingBag, Award, TrendingUp, BarChart2, Calendar } from 'lucide-react';
import { AFRICAN_LOCATIONS } from '../data/africanLocations';

const STATUS_META = {
  Delivered:  { badge: 'badge-delivered',  bar: 'bg-emerald-500' },
  Scheduled:  { badge: 'badge-scheduled',  bar: 'bg-indigo-500'  },
  Awaiting:   { badge: 'badge-awaiting',   bar: 'bg-cyan-500'    },
  Pending:    { badge: 'badge-pending',    bar: 'bg-amber-500'   },
  Cancelled:  { badge: 'badge-cancelled',  bar: 'bg-rose-500'    },
  Draft:      { badge: 'badge-draft',      bar: 'bg-slate-500'   },
};

export default function Dashboard({ selectedCountry, selectedState, orders = [] }) {
  const [period, setPeriod] = useState('this_week');

  const loc = AFRICAN_LOCATIONS.find(c => c.country === selectedCountry) || AFRICAN_LOCATIONS[0];
  const curr = loc.currency;

  const filtered = orders.filter(o => {
    if (selectedCountry && o.country && o.country !== selectedCountry) return false;
    if (selectedState && selectedState !== 'All Regions' && o.state !== selectedState) return false;
    return true;
  });

  const active      = filtered.filter(o => o.status !== 'Draft' && o.status !== 'Cancelled');
  const delivered   = filtered.filter(o => o.status === 'Delivered');
  const pipeline    = filtered.filter(o => ['Awaiting','Scheduled'].includes(o.status));

  const totalAmt    = active.reduce((s, o)   => s + (o.total_amount || 0), 0);
  const revenue     = delivered.reduce((s, o) => s + (o.total_amount || 0), 0);
  const expected    = pipeline.reduce((s, o)  => s + (o.total_amount || 0), 0);
  const fulfillRate = (active.length + filtered.filter(o => o.status === 'Draft').length) > 0
    ? ((delivered.length / (filtered.length || 1)) * 100).toFixed(1)
    : '0.0';

  const statuses = ['Delivered','Scheduled','Awaiting','Pending','Cancelled','Draft'];
  const breakdown = statuses.map(st => {
    const rows = filtered.filter(o => o.status === st);
    const amt  = rows.reduce((s, o) => s + (o.total_amount || 0), 0);
    const pct  = totalAmt > 0 ? ((amt / totalAmt) * 100).toFixed(1) : '0.0';
    return { status: st, count: rows.length, amount: amt, pct };
  });

  const kpis = [
    {
      label: 'Recognized Revenue',
      sub: 'Delivered & COD collected',
      value: `${curr}${revenue.toLocaleString()}`,
      icon: CheckCircle2,
      accent: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/25',
    },
    {
      label: 'Expected Revenue',
      sub: 'Awaiting + Scheduled dispatches',
      value: `${curr}${expected.toLocaleString()}`,
      icon: Clock,
      accent: 'text-indigo-400',
      bg: 'bg-indigo-500/10',
      border: 'border-indigo-500/25',
    },
    {
      label: 'Total Order Amount',
      sub: `${active.length} active orders in pipeline`,
      value: `${curr}${totalAmt.toLocaleString()}`,
      icon: ShoppingBag,
      accent: 'text-slate-400',
      bg: 'bg-slate-700/20',
      border: 'border-slate-700/40',
    },
    {
      label: 'Fulfilment Rate',
      sub: 'Delivered vs total submissions',
      value: `${fulfillRate}%`,
      icon: Award,
      accent: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/25',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
        <div>
          <h2 className="section-title">
            <TrendingUp className="w-5 h-5 text-indigo-400" />
            Executive Revenue Dashboard
          </h2>
          <p className="section-subtitle">
            Live sales performance for&nbsp;
            <span className="text-emerald-400 font-semibold">{selectedCountry}</span>
            &nbsp;·&nbsp;{selectedState}
          </p>
        </div>
        <div className="flex items-center gap-1 glass p-1 rounded-xl self-start sm:self-auto">
          {['this_week','last_week'].map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                period === p ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Calendar className="w-3 h-3" />
              {p === 'this_week' ? 'This Week' : 'Last Week'}
            </button>
          ))}
        </div>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map(({ label, sub, value, icon: Icon, accent, bg, border }) => (
          <div key={label} className={`glass-hover kpi-card border ${border} ${bg}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className={`text-[11px] font-bold uppercase tracking-wider ${accent}`}>{label}</p>
                <p className="text-2xl font-extrabold text-slate-100 mt-1 tracking-tight">{value}</p>
                <p className="text-[11px] text-slate-500 mt-1 truncate">{sub}</p>
              </div>
              <div className={`shrink-0 p-2.5 rounded-xl ${bg} border ${border}`}>
                <Icon className={`w-5 h-5 ${accent}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Pipeline Breakdown ── */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-800/60">
          <BarChart2 className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide">Pipeline Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Orders</th>
                <th>Total Amount</th>
                <th className="w-48">% of Pipeline</th>
              </tr>
            </thead>
            <tbody>
              {breakdown.map(row => (
                <tr key={row.status}>
                  <td>
                    <span className={`badge ${STATUS_META[row.status]?.badge || 'badge-draft'}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="font-semibold text-slate-300">
                    {row.count} {row.count === 1 ? 'order' : 'orders'}
                  </td>
                  <td className="font-bold text-slate-100">
                    {curr}{row.amount.toLocaleString()}
                  </td>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${STATUS_META[row.status]?.bar || 'bg-slate-500'}`}
                          style={{ width: `${Math.min(100, parseFloat(row.pct))}%` }}
                        />
                      </div>
                      <span className="text-slate-500 font-mono text-[11px] w-9 text-right">{row.pct}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
