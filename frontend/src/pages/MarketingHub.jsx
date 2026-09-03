import React, { useState } from 'react';
import { Send, Mail, MessageSquare, Play, Sparkles, Smartphone, CheckCircle, ShieldCheck } from 'lucide-react';

export default function MarketingHub({ selectedCountry }) {
  const [activeSegment, setActiveSegment] = useState('whatsapp');
  const [sending, setSending] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const [template, setTemplate] = useState(
    "Hi {{customer_name}}, your order #{{order_number}} for {{product_name}} is ready for dispatch! Please confirm your availability today."
  );

  const [broadcastLog, setBroadcastLog] = useState([
    { id: 1, channel: 'WhatsApp', recipient: 'Emeka Nwosu (+2348039988776)', status: 'Delivered', sentAt: '10 mins ago' },
    { id: 2, channel: 'SMS', recipient: 'Fatima Abubakar (+2348021122334)', status: 'Sent', sentAt: '45 mins ago' },
    { id: 3, channel: 'Email', recipient: 'Kwame Mensah (kwame@ghana.com)', status: 'Opened', sentAt: '2 hours ago' }
  ]);

  const mockTemplates = [
    { name: 'draft_reminder', trigger: '15m Draft Inactivity', body: 'Hi {{customer_name}}, finish your order for {{product_name}} here: {{resume_link}}' },
    { name: 'order_confirmed_receipt', trigger: 'Order status -> Awaiting', body: 'Hi {{customer_name}}, order {{order_number}} is confirmed for delivery. Total: ₦{{total_amount}} COD.' },
    { name: 'order_delivered_receipt', trigger: 'Order status -> Delivered', body: 'Thank you {{customer_name}}! Order {{order_number}} delivered. Paid: ₦{{total_amount}}.' },
    { name: 'post_delivery_upsell', trigger: '7 Days Post-Delivery', body: 'Hi {{customer_name}}, enjoy 20% off {{offer_product_name}} today! Link: {{offer_link}}' }
  ];

  const handleSendBroadcast = () => {
    setSending(true);
    setSuccessMsg('');
    setTimeout(() => {
      setBroadcastLog(prev => [
        { id: Date.now(), channel: activeSegment.toUpperCase(), recipient: 'Broadcast Audience (54 Merchants)', status: 'Sent', sentAt: 'Just now' },
        ...prev
      ]);
      setSending(false);
      setSuccessMsg(`${activeSegment.toUpperCase()} Broadcast sent successfully!`);
      setTimeout(() => setSuccessMsg(''), 3000);
    }, 800);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <div>
          <h2 className="section-title">
            <Send className="w-5 h-5" style={{ color: 'var(--brand)' }} />
            Marketing & Notifications
          </h2>
          <p className="section-subtitle">Automated multi-channel customer retention and broadcast messaging.</p>
        </div>
      </div>

      <div className="segment-toggle w-fit">
        <button
          className={`segment-btn${activeSegment === 'whatsapp' ? ' active' : ''}`}
          onClick={() => setActiveSegment('whatsapp')}
        >
          <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
        </button>
        <button
          className={`segment-btn${activeSegment === 'sms' ? ' active' : ''}`}
          onClick={() => setActiveSegment('sms')}
        >
          <Smartphone className="w-3.5 h-3.5" /> SMS
        </button>
        <button
          className={`segment-btn${activeSegment === 'email' ? ' active' : ''}`}
          onClick={() => setActiveSegment('email')}
        >
          <Mail className="w-3.5 h-3.5" /> Email
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Template Editor */}
        <div className="glass p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" /> Broadcast Composer
            </h3>
            <span className="badge badge-pending">Active: {activeSegment.toUpperCase()}</span>
          </div>

          <div>
            <label className="text-label text-slate-400 block mb-1">Message Content</label>
            <textarea
              rows={5}
              value={template}
              onChange={e => setTemplate(e.target.value)}
              className="input resize-none"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            <span className="badge bg-slate-800 text-indigo-300 font-mono">&#123;&#123;customer_name&#125;&#125;</span>
            <span className="badge bg-slate-800 text-indigo-300 font-mono">&#123;&#123;order_number&#125;&#125;</span>
            <span className="badge bg-slate-800 text-indigo-300 font-mono">&#123;&#123;product_name&#125;&#125;</span>
            <span className="badge bg-slate-800 text-indigo-300 font-mono">&#123;&#123;total_amount&#125;&#125;</span>
          </div>

          <button onClick={handleSendBroadcast} disabled={sending} className="w-full btn-primary py-2.5">
            {sending ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending...</> : <><Play className="w-4 h-4" /> Launch Campaign</>}
          </button>

          {successMsg && (
            <div className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-3 py-2 rounded-xl flex items-center gap-2 animate-fade-in">
              <CheckCircle className="w-4 h-4" /> {successMsg}
            </div>
          )}
        </div>

        {/* Live Broadcast Log */}
        <div className="glass p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-200">Delivery Logs</h3>
          <div className="space-y-2">
            {broadcastLog.filter(l => l.channel.toLowerCase() === activeSegment).length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6 italic">No recent {activeSegment.toUpperCase()} logs found.</p>
            ) : (
              broadcastLog.filter(l => l.channel.toLowerCase() === activeSegment).map(log => (
                <div key={log.id} className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs hover-lift">
                  <div>
                    <p className="font-semibold text-slate-200">{log.recipient}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{log.channel} · {log.sentAt}</p>
                  </div>
                  <span className="badge badge-delivered">{log.status}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Automated Templates - Moved here from NotificationCenter */}
      <div className="glass p-5 space-y-4 mt-6">
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" style={{ color: 'var(--brand)' }} /> Automated System Templates ({activeSegment.toUpperCase()})
        </h3>
        <p className="text-xs text-slate-400">These templates trigger automatically based on store events. Edit them in Settings.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mockTemplates.map(t => (
            <div key={t.name} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 hover-lift">
              <div className="flex justify-between items-start">
                <span className="font-mono text-xs font-bold" style={{ color: '#a5b4fc' }}>{t.name}</span>
              </div>
              <p className="text-[11px] text-slate-400">Trigger: <strong className="text-slate-200">{t.trigger}</strong></p>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300">
                "{t.body}"
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
