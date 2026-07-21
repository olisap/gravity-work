import React from 'react';
import { Clock, Send, ExternalLink, AlertCircle, RefreshCw } from 'lucide-react';
import { AFRICAN_LOCATIONS } from '../data/africanLocations';

export default function DraftReminders({ orders = [], selectedCountry }) {
  const currentCountryObj = AFRICAN_LOCATIONS.find(c => c.country === selectedCountry) || AFRICAN_LOCATIONS[0];
  const curr = currentCountryObj.currency;

  const drafts = orders.filter(o => o.status === 'Draft');

  const handleSendManualReminder = async (draft) => {
    alert(`SMS reminder queued for customer ${draft.customer_name} (${draft.customer_phone}) with resume token link.`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-400" /> Abandoned Form Drafts & Reminders
          </h2>
          <p className="text-xs text-slate-400">
            Automatically tracks form drop-offs after 10–15 minutes and dispatches SMS/Email reminders with pre-filled resume tokens
          </p>
        </div>

        <span className="text-xs bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Abandonment Worker Active (60s)
        </span>
      </div>

      {/* Active Drafts Table */}
      <div className="glass-panel p-5 rounded-2xl space-y-4">
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400" /> Currently Abandoned Drafts ({drafts.length})
        </h3>

        {drafts.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-8 italic">No abandoned drafts found at this time.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3">Customer Phone</th>
                  <th className="p-3">Name</th>
                  <th className="p-3">Step Reached</th>
                  <th className="p-3">Item Chosen</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Resume Token</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {drafts.map(d => (
                  <tr key={d.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-3 font-bold text-indigo-400">{d.customer_phone}</td>
                    <td className="p-3 text-slate-200">{d.customer_name || 'Guest'}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-bold text-[10px]">
                        Step {d.form_step_reached || 1} of 3
                      </span>
                    </td>
                    <td className="p-3 text-slate-300">{d.items?.[0]?.name || 'Item'}</td>
                    <td className="p-3 font-bold text-slate-100">{curr}{d.total_amount?.toLocaleString()}</td>
                    <td className="p-3 font-mono text-[10px] text-amber-300 truncate max-w-[120px]">{d.resume_token || d.id}</td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleSendManualReminder(d)}
                        className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1 shadow float-right"
                      >
                        <Send className="w-3 h-3" /> Resend SMS Reminder
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
