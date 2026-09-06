import React from 'react';
import { Clock, Send, AlertCircle, Copy, Mail, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { AFRICAN_LOCATIONS } from '../data/africanLocations';
import { copyOrderToClipboard } from '../utils/copyOrder';
import { apiUrl } from '../utils/apiUrl';

export default function DraftReminders({ orders = [], selectedCountry }) {
  const currentCountryObj = AFRICAN_LOCATIONS.find(c => c.country === selectedCountry) || AFRICAN_LOCATIONS[0];
  const curr = currentCountryObj.currency;

  const drafts = orders.filter(o => o.status === 'Draft');
  const [sendingId, setSendingId] = React.useState(null);
  const [toastMap, setToastMap] = React.useState({}); // { [draftId]: { type: 'success'|'error', msg: string } }

  const handleSendManualReminder = async (draft) => {
    setSendingId(draft.id);
    setToastMap(prev => ({ ...prev, [draft.id]: null }));
    try {
      const token = localStorage.getItem('gravity_crm_token');
      const res = await fetch(apiUrl(`/api/orders/${draft.id}/remind`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      if (res.ok) {
        const channels = [data.emailSent && 'Email', data.smsSent && 'SMS'].filter(Boolean).join(' & ') || 'reminder';
        setToastMap(prev => ({ ...prev, [draft.id]: { type: 'success', msg: `${channels} sent!` } }));
      } else {
        setToastMap(prev => ({ ...prev, [draft.id]: { type: 'error', msg: data.error || 'Failed to send' } }));
      }
    } catch (err) {
      setToastMap(prev => ({ ...prev, [draft.id]: { type: 'error', msg: 'Network error' } }));
    } finally {
      setSendingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="section-title">
            <Clock className="w-5 h-5 text-amber-400" /> Abandoned Form Drafts &amp; Reminders
          </h2>
          <p className="section-subtitle">
            Tracks form drop-offs after 15 minutes. Triggers <strong>Brevo Email</strong> and/or SMS recovery automatically.
          </p>
        </div>

        <span className="badge badge-pending">
          Abandonment Worker Active
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
                  <th className="p-3">Customer</th>
                  <th className="p-3">Contact</th>
                  <th className="p-3">Step</th>
                  <th className="p-3">Item</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Resume Token</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {drafts.map(d => {
                  const toast = toastMap[d.id];
                  return (
                    <tr key={d.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-3">
                        <p className="font-semibold text-slate-200">{d.customer_name || 'Guest'}</p>
                        <button
                          type="button"
                          onClick={() => copyOrderToClipboard(d, curr)}
                          title="Copy draft details"
                          className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white hover:bg-amber-600 transition-colors mt-0.5"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </td>
                      <td className="p-3">
                        <p className="font-bold text-indigo-400 text-[11px]">{d.customer_phone || '—'}</p>
                        {d.customer_email && (
                          <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Mail className="w-3 h-3 text-amber-400" />
                            <span className="truncate max-w-[120px]">{d.customer_email}</span>
                          </p>
                        )}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-bold text-[10px]">
                          Step {d.form_step_reached || 1} of 3
                        </span>
                      </td>
                      <td className="p-3 text-slate-300">{d.items?.[0]?.name || 'Item'}</td>
                      <td className="p-3 font-bold text-slate-100">{curr}{d.total_amount?.toLocaleString()}</td>
                      <td className="p-3 font-mono text-[10px] text-amber-300 truncate max-w-[120px]">{d.resume_token || d.id}</td>
                      <td className="p-3 text-right">
                        <div className="flex flex-col items-end gap-1.5">
                          {toast && (
                            <span className={`text-[10px] font-bold flex items-center gap-1 ${
                              toast.type === 'success' ? 'text-emerald-400' : 'text-rose-400'
                            }`}>
                              {toast.type === 'success' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                              {toast.msg}
                            </span>
                          )}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => copyOrderToClipboard(d, curr)}
                              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs inline-flex items-center gap-1 border border-slate-700"
                            >
                              <Copy className="w-3 h-3 text-amber-400" /> Copy
                            </button>
                            <button
                              onClick={() => handleSendManualReminder(d)}
                              disabled={sendingId === d.id}
                              className="btn-primary py-1.5 px-3 text-xs inline-flex items-center gap-1"
                            >
                              {sendingId === d.id
                                ? <><Loader2 className="w-3 h-3 animate-spin" /> Sending...</>
                                : <><Send className="w-3 h-3" /> Send Recovery</>
                              }
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
