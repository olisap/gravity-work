import React, { useState, useEffect } from 'react';
import { History, X, Trash2, ShieldAlert, CheckCircle, Clock } from 'lucide-react';

export default function AuditTrailModal({ onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAuditLogs = async () => {
      try {
        const token = localStorage.getItem('gravity_crm_token');
        const res = await fetch('/api/audit-trail', {
          headers: {
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          }
        });
        const data = await res.json();
        if (Array.isArray(data)) setLogs(data);
      } catch (err) {
        console.error('Failed to load audit trail:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAuditLogs();
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-3xl p-6 rounded-2xl border-slate-700 space-y-5 shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto scrollbar-none">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <span className="text-[10px] uppercase font-black text-indigo-400 tracking-wider flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5" /> Security & Compliance Log
            </span>
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-400" /> Audit Trail (Deleted Orders & System Log)
            </h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Logs Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3">Event Type</th>
                <th className="p-3">Reference / Order</th>
                <th className="p-3">Performed By</th>
                <th className="p-3">Date & Time</th>
                <th className="p-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {loading ? (
                <tr><td colSpan={5} className="text-center py-6 text-slate-500 italic font-sans">Loading audit log events...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-6 text-slate-500 italic font-sans">No deleted order records in audit log.</td></tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        log.action === 'ORDER_DELETED'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                      }`}>
                        {log.action?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-indigo-400">
                      {log.order_number || 'SYSTEM'}
                    </td>
                    <td className="p-3 font-sans text-slate-200">{log.performed_by}</td>
                    <td className="p-3 text-[11px] text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="p-3 font-sans text-slate-300">{log.details}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
