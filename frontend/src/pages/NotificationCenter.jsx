import React from 'react';
import { BellRing, Smartphone, Mail, CheckCircle2, ShieldCheck, Send } from 'lucide-react';

export default function NotificationCenter() {
  const mockTemplates = [
    { name: 'draft_reminder', channel: 'SMS', trigger: '15m Draft Inactivity', body: 'Hi {{customer_name}}, finish your order for {{product_name}} here: {{resume_link}}' },
    { name: 'order_confirmed_receipt', channel: 'SMS', trigger: 'Order status -> Awaiting', body: 'Hi {{customer_name}}, order {{order_number}} is confirmed for delivery. Total: ₦{{total_amount}} COD.' },
    { name: 'order_delivered_receipt', channel: 'SMS', trigger: 'Order status -> Delivered', body: 'Thank you {{customer_name}}! Order {{order_number}} delivered. Paid: ₦{{total_amount}}.' },
    { name: 'post_delivery_upsell', channel: 'SMS', trigger: '7 Days Post-Delivery', body: 'Hi {{customer_name}}, enjoy 20% off {{offer_product_name}} today! Link: {{offer_link}}' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <BellRing className="w-5 h-5 text-indigo-400" /> Notification Service (SMS + Email)
          </h2>
          <p className="text-xs text-slate-400">
            Internal service handling transactional delivery receipts, draft reminders, and post-delivery nudges
          </p>
        </div>
      </div>

      {/* Provider Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-panel p-5 rounded-2xl border-emerald-500/30 bg-emerald-950/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm">Termii SMS Provider (Nigeria / Africa)</h3>
              <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Sandbox / API Ready
              </span>
            </div>
          </div>
          <span className="text-xs font-bold text-slate-300 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
            Transactional Tier
          </span>
        </div>

        <div className="glass-panel p-5 rounded-2xl border-indigo-500/30 bg-indigo-950/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm">Brevo Transactional Email</h3>
              <span className="text-[10px] text-indigo-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Sandbox / API Ready
              </span>
            </div>
          </div>
          <span className="text-xs font-bold text-slate-300 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
            SMTP Active
          </span>
        </div>
      </div>

      {/* Templates List */}
      <div className="glass-panel p-5 rounded-2xl space-y-4">
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-indigo-400" /> Active Notification Templates
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mockTemplates.map(t => (
            <div key={t.name} className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-mono text-xs font-bold text-indigo-400">{t.name}</span>
                <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-bold uppercase">{t.channel}</span>
              </div>
              <p className="text-[11px] text-slate-400">Trigger: <strong className="text-slate-200">{t.trigger}</strong></p>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300">
                "{t.body}"
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
