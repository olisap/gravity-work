import React, { useState } from 'react';
import { Send, BellRing, Mail, CheckCircle2, MessageSquare, Play, Sparkles } from 'lucide-react';
import { AFRICAN_LOCATIONS } from '../data/africanLocations';

export default function MarketingHub({ type = 'whatsapp', selectedCountry }) {
  const [template, setTemplate] = useState(
    "Hi {{customer_name}}, your order #{{order_number}} for {{product_name}} is ready for dispatch! Please confirm your availability today."
  );
  const [broadcastLog, setBroadcastLog] = useState([
    { id: 1, channel: 'WhatsApp', recipient: 'Emeka Nwosu (+2348039988776)', status: 'Delivered', sentAt: '10 mins ago' },
    { id: 2, channel: 'SMS (Termii)', recipient: 'Fatima Abubakar (+2348021122334)', status: 'Sent', sentAt: '45 mins ago' },
    { id: 3, channel: 'Email (Brevo)', recipient: 'Kwame Mensah (kwame@ghana.com)', status: 'Opened', sentAt: '2 hours ago' }
  ]);

  const titles = {
    whatsapp: 'WhatsApp Direct Marketing & Notifications',
    sms: 'SMS Automated Messaging (Termii / Sandbox)',
    email: 'Email Receipt & Upsell Broadcasting (Brevo / Sandbox)'
  };

  const channelName = type.toUpperCase();

  const handleSendBroadcast = () => {
    setBroadcastLog(prev => [
      { id: Date.now(), channel: channelName, recipient: 'Broadcast Audience (54 Merchants)', status: 'Sent', sentAt: 'Just now' },
      ...prev
    ]);
    alert(`🚀 ${channelName} Broadcast sent to selected target segment!`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <h2 className="section-title">
            <Send className="w-5 h-5 text-indigo-400" /> {titles[type] || 'Marketing Automation'}
          </h2>
          <p className="section-subtitle">Automated multi-channel customer retention, delivery notifications, and broadcast messages</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Template Editor */}
        <div className="glass p-5 rounded-2xl border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" /> Message Template Editor
          </h3>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Message Content:</label>
            <textarea
              rows={4}
              value={template}
              onChange={e => setTemplate(e.target.value)}
              className="input text-xs"
            />
          </div>

          <div className="flex flex-wrap gap-1.5 text-[10px]">
            <span className="bg-slate-800 px-2 py-0.5 rounded text-indigo-300 font-mono">&#123;&#123;customer_name&#125;&#125;</span>
            <span className="bg-slate-800 px-2 py-0.5 rounded text-indigo-300 font-mono">&#123;&#123;order_number&#125;&#125;</span>
            <span className="bg-slate-800 px-2 py-0.5 rounded text-indigo-300 font-mono">&#123;&#123;product_name&#125;&#125;</span>
            <span className="bg-slate-800 px-2 py-0.5 rounded text-indigo-300 font-mono">&#123;&#123;total_amount&#125;&#125;</span>
          </div>

          <button onClick={handleSendBroadcast} className="w-full btn-primary py-2.5 text-xs">
            <Play className="w-3.5 h-3.5" /> Launch {channelName} Campaign
          </button>
        </div>

        {/* Live Broadcast Log */}
        <div className="glass p-5 rounded-2xl border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-slate-200">Broadcast Delivery Logs</h3>
          <div className="space-y-2">
            {broadcastLog.map(log => (
              <div key={log.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <p className="font-semibold text-slate-200">{log.recipient}</p>
                  <p className="text-[10px] text-slate-500">{log.channel} · {log.sentAt}</p>
                </div>
                <span className="badge badge-delivered">{log.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
