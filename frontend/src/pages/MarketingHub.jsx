import React, { useState, useEffect, useMemo } from 'react';
import { 
  Send, Mail, MessageSquare, Play, Sparkles, Smartphone, CheckCircle, 
  ShieldCheck, Users, ExternalLink, QrCode, UserCheck, Calendar, Package, 
  Repeat, Search, Filter, MessageCircle
} from 'lucide-react';
import { apiUrl } from '../utils/apiUrl';
import WhatsAppGatewayCard from '../components/WhatsAppGatewayCard';

export default function MarketingHub({ selectedCountry, orders = [], products = [] }) {
  const [activeSegment, setActiveSegment] = useState('whatsapp');
  
  // Targeting Controls
  const [targetMode, setTargetMode] = useState('segment'); // 'segment' | 'single'
  const [selectedSingleOrderId, setSelectedSingleOrderId] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  
  // Segment Multi-Filters
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending' | 'delivered'
  const [productFilter, setProductFilter] = useState('all'); // 'all' | product_id or product_name
  const [timeFilter, setTimeFilter] = useState('all'); // 'all' | 'today' | '7days' | '30days'
  const [customerTypeFilter, setCustomerTypeFilter] = useState('all'); // 'all' | 'first_time' | 'repeat'

  const [sending, setSending] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [showGatewayConfig, setShowGatewayConfig] = useState(false);
  const [gatewayStatus, setGatewayStatus] = useState(null);

  const [template, setTemplate] = useState(
    "Hi {{customer_name}}, your order #{{order_number}} for {{product_name}} is ready for dispatch! Total: ₦{{total_amount}} (Pay on Delivery). Please confirm your availability today."
  );

  const [broadcastLog, setBroadcastLog] = useState([]);

  // Fetch real notification logs
  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const token = localStorage.getItem('gravity_crm_token');
      const res = await fetch(apiUrl('/api/notification-logs'), {
        headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setBroadcastLog(data.map(item => ({
            id: item.id,
            channel: (item.channel || 'SMS').toUpperCase(),
            recipient: item.recipient || 'Customer',
            status: item.status === 'sent_sandbox' ? 'Sent (Sandbox)' : (item.status === 'sent' ? 'Delivered' : item.status || 'Sent'),
            sentAt: item.created_at ? new Date(item.created_at).toLocaleString() : 'Recently'
          })));
        }
      }
    } catch (e) {
      console.error('Failed to load notification logs:', e);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Compute Customer Order Frequency map to detect First-Time vs Repeat clients
  const customerOrderCount = useMemo(() => {
    const counts = {};
    for (const order of orders) {
      if (order && order.customer_phone && order.status !== 'Draft') {
        const phone = order.customer_phone.replace(/[^0-9]/g, '');
        counts[phone] = (counts[phone] || 0) + 1;
      }
    }
    return counts;
  }, [orders]);

  // Compute dynamic target audience based on all active criteria
  const targetAudience = useMemo(() => {
    const validOrders = orders.filter(o => o && o.customer_phone && o.status !== 'Draft');

    // 1. Single Client Mode
    if (targetMode === 'single') {
      if (!selectedSingleOrderId) {
        // Default to first valid order if available
        return validOrders.slice(0, 1);
      }
      return validOrders.filter(o => o.id === selectedSingleOrderId);
    }

    // 2. Segment Mode with Multi-Filters
    let filtered = validOrders;

    // Filter A: Order Pipeline Status
    if (statusFilter === 'pending') {
      filtered = filtered.filter(o => ['Pending', 'Scheduled', 'Awaiting'].includes(o.status));
    } else if (statusFilter === 'delivered') {
      filtered = filtered.filter(o => o.status === 'Delivered');
    }

    // Filter B: Product Purchased
    if (productFilter !== 'all') {
      filtered = filtered.filter(o => {
        const matchesMain = o.product_name && o.product_name.toLowerCase().includes(productFilter.toLowerCase());
        const matchesItems = o.items && o.items.some(i => 
          i.product_id === productFilter || 
          (i.name && i.name.toLowerCase().includes(productFilter.toLowerCase()))
        );
        return matchesMain || matchesItems;
      });
    }

    // Filter C: Time Window Filter
    if (timeFilter !== 'all') {
      const now = Date.now();
      filtered = filtered.filter(o => {
        const orderTime = new Date(o.created_at).getTime();
        const diffHours = (now - orderTime) / (1000 * 3600);
        if (timeFilter === 'today') return diffHours <= 24;
        if (timeFilter === '7days') return diffHours <= (24 * 7);
        if (timeFilter === '30days') return diffHours <= (24 * 30);
        return true;
      });
    }

    // Filter D: Repeat vs First-Time Clients
    if (customerTypeFilter === 'first_time') {
      filtered = filtered.filter(o => {
        const phone = o.customer_phone.replace(/[^0-9]/g, '');
        return (customerOrderCount[phone] || 1) === 1;
      });
    } else if (customerTypeFilter === 'repeat') {
      filtered = filtered.filter(o => {
        const phone = o.customer_phone.replace(/[^0-9]/g, '');
        return (customerOrderCount[phone] || 0) >= 2;
      });
    }

    // Deduplicate unique buyers by phone number
    const seen = new Set();
    const uniqueList = [];
    for (const order of filtered) {
      const phone = order.customer_phone.replace(/[^0-9]/g, '');
      if (!seen.has(phone)) {
        seen.add(phone);
        uniqueList.push(order);
      }
    }

    return uniqueList;
  }, [orders, targetMode, selectedSingleOrderId, statusFilter, productFilter, timeFilter, customerTypeFilter, customerOrderCount]);

  // Personalized preview for the primary target customer
  const sampleCustomer = targetAudience[0] || null;
  const renderedSampleMessage = useMemo(() => {
    if (!sampleCustomer) return template;
    const itemsSummary = (sampleCustomer.items && sampleCustomer.items.length > 0)
      ? sampleCustomer.items.map(i => `${i.quantity || 1}x ${i.name || i.product_name}`).join(', ')
      : (sampleCustomer.product_name || 'Your Ordered Item');

    return template
      .replace(/{{customer_name}}/g, sampleCustomer.customer_name || 'Valued Customer')
      .replace(/{{order_number}}/g, sampleCustomer.order_number || '')
      .replace(/{{product_name}}/g, itemsSummary)
      .replace(/{{total_amount}}/g, Number(sampleCustomer.total_amount || 0).toLocaleString());
  }, [template, sampleCustomer]);

  const insertVariable = (varName) => {
    setTemplate(prev => prev + ' ' + varName);
  };

  // Direct 1-Click WhatsApp URL for single client preview
  const directWhatsAppUrl = useMemo(() => {
    if (!sampleCustomer || !sampleCustomer.customer_phone) return null;
    let clean = sampleCustomer.customer_phone.replace(/[^0-9]/g, '');
    if (clean.startsWith('0')) clean = '234' + clean.slice(1);
    return `https://wa.me/${clean}?text=${encodeURIComponent(renderedSampleMessage)}`;
  }, [sampleCustomer, renderedSampleMessage]);

  const handleSendBroadcast = async () => {
    if (targetAudience.length === 0) {
      setErrorMsg('No customer orders found matching the selected filter criteria.');
      setTimeout(() => setErrorMsg(''), 4000);
      return;
    }

    setSending(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const token = localStorage.getItem('gravity_crm_token');
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      };

      if (activeSegment === 'whatsapp') {
        let sentCount = 0;
        let failCount = 0;
        for (const customer of targetAudience) {
          const itemsSummary = (customer.items && customer.items.length > 0)
            ? customer.items.map(i => `${i.quantity || 1}x ${i.name || i.product_name}`).join(', ')
            : (customer.product_name || 'Your Ordered Item');

          const personalizedText = template
            .replace(/{{customer_name}}/g, customer.customer_name || 'Customer')
            .replace(/{{order_number}}/g, customer.order_number || '')
            .replace(/{{product_name}}/g, itemsSummary)
            .replace(/{{total_amount}}/g, Number(customer.total_amount || 0).toLocaleString());

          const res = await fetch(apiUrl('/api/whatsapp/test'), {
            method: 'POST',
            headers,
            body: JSON.stringify({
              phone: customer.customer_phone,
              message: personalizedText
            })
          });

          if (res.ok) sentCount++;
          else failCount++;
        }

        if (sentCount > 0) {
          setSuccessMsg(`🚀 WhatsApp message successfully sent to ${sentCount} recipient${sentCount > 1 ? 's' : ''} from your linked phone!`);
        } else {
          setErrorMsg('Failed to dispatch via WhatsApp Gateway. Please verify your phone is linked in settings.');
        }
      } else {
        // SMS Sandbox broadcast simulation per user rule
        setSuccessMsg(`🚀 ${activeSegment.toUpperCase()} Broadcast simulated in Sandbox mode (${targetAudience.length} customer recipient${targetAudience.length > 1 ? 's' : ''})!`);
      }

      await fetchLogs();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      console.error('Error launching campaign:', err);
      setErrorMsg('Failed to dispatch broadcast. Check backend connection.');
      setTimeout(() => setErrorMsg(''), 4000);
    } finally {
      setSending(false);
    }
  };

  const candidateOrdersForSingle = useMemo(() => {
    return orders.filter(o => o && o.customer_phone && o.status !== 'Draft');
  }, [orders]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <div>
          <h2 className="section-title">
            <Send className="w-5 h-5" style={{ color: 'var(--brand)' }} />
            Marketing & Customer Notifications Hub
          </h2>
          <p className="section-subtitle">Multi-channel customer retention, automated dispatch receipts, and precision targeting.</p>
        </div>

        <button
          onClick={() => setShowGatewayConfig(v => !v)}
          className="btn-secondary text-xs flex items-center gap-2 self-start sm:self-auto border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10"
        >
          <QrCode className="w-3.5 h-3.5 text-emerald-400" />
          {showGatewayConfig ? 'Close Gateway QR Panel' : 'WhatsApp Phone Gateway (Link Status)'}
        </button>
      </div>

      {/* Collapsible WhatsApp Gateway Manager */}
      {showGatewayConfig && (
        <WhatsAppGatewayCard onStatusChange={setGatewayStatus} />
      )}

      {/* Target Mode Toggle & Channel Selector */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Channel Selector */}
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
            <Smartphone className="w-3.5 h-3.5" /> SMS (Sandbox)
          </button>
          <button
            className={`segment-btn${activeSegment === 'email' ? ' active' : ''}`}
            onClick={() => setActiveSegment('email')}
          >
            <Mail className="w-3.5 h-3.5" /> Email
          </button>
        </div>

        {/* Target Audience Mode: Segment vs Single Client */}
        <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setTargetMode('segment')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
              targetMode === 'segment' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" /> Filtered Customer Segment
          </button>
          <button
            onClick={() => setTargetMode('single')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
              targetMode === 'single' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" /> Single Specific Client
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Targeting Filters & Message Composer */}
        <div className="glass p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" /> Precision Targeting Controls
            </h3>
            <span className="badge badge-pending">Channel: {activeSegment.toUpperCase()}</span>
          </div>

          {/* TARGETING CRITERIA CONTROLS */}
          {targetMode === 'single' ? (
            /* Mode 1: Single Client Target */
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-emerald-400" /> Select Specific Client
              </label>

              <select
                value={selectedSingleOrderId || (candidateOrdersForSingle[0]?.id || '')}
                onChange={e => setSelectedSingleOrderId(e.target.value)}
                className="input text-xs py-2"
              >
                {candidateOrdersForSingle.length === 0 ? (
                  <option value="">No client orders available</option>
                ) : (
                  candidateOrdersForSingle.map(ord => (
                    <option key={ord.id} value={ord.id}>
                      {ord.customer_name} ({ord.customer_phone}) — Order #{ord.order_number} [₦{Number(ord.total_amount || 0).toLocaleString()}]
                    </option>
                  ))
                )}
              </select>

              {sampleCustomer && (
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Buyer Name:</span>
                    <strong className="text-slate-200">{sampleCustomer.customer_name}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Phone:</span>
                    <strong className="text-emerald-400">{sampleCustomer.customer_phone}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Order:</span>
                    <span className="text-slate-300">#{sampleCustomer.order_number} ({sampleCustomer.status})</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Mode 2: Multi-Filter Segment Target */
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-indigo-400" /> Audience Segmentation Filters
                </label>
                <span className="badge badge-delivered font-mono font-bold">
                  {targetAudience.length} Matching Buyer{targetAudience.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* 1. Status Filter */}
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Order Pipeline Status</label>
                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="input text-xs py-1.5"
                  >
                    <option value="all">All Statuses ({orders.filter(o => o.status !== 'Draft').length})</option>
                    <option value="pending">Pending & Scheduled ({orders.filter(o => ['Pending', 'Scheduled', 'Awaiting'].includes(o.status)).length})</option>
                    <option value="delivered">Delivered & Completed ({orders.filter(o => o.status === 'Delivered').length})</option>
                  </select>
                </div>

                {/* 2. Product Bought Filter */}
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Product Purchased</label>
                  <select
                    value={productFilter}
                    onChange={e => setProductFilter(e.target.value)}
                    className="input text-xs py-1.5"
                  >
                    <option value="all">Any Product in Store</option>
                    {products.map(p => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>

                {/* 3. Time Window Filter */}
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Order Time Window</label>
                  <select
                    value={timeFilter}
                    onChange={e => setTimeFilter(e.target.value)}
                    className="input text-xs py-1.5"
                  >
                    <option value="all">All Time History</option>
                    <option value="today">Placed Today (Last 24 Hours)</option>
                    <option value="7days">Last 7 Days</option>
                    <option value="30days">Last 30 Days</option>
                  </select>
                </div>

                {/* 4. Customer Relationship Filter */}
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Customer Relationship</label>
                  <select
                    value={customerTypeFilter}
                    onChange={e => setCustomerTypeFilter(e.target.value)}
                    className="input text-xs py-1.5"
                  >
                    <option value="all">All Buyers (New + Repeat)</option>
                    <option value="first_time">First-Time Buyers (1 Order)</option>
                    <option value="repeat">Repeat Customers (2+ Orders)</option>
                  </select>
                </div>
              </div>

              {targetAudience.length > 0 ? (
                <div className="text-[11px] text-slate-400 truncate pt-1 border-t border-slate-800">
                  Targeted Recipients: <strong className="text-slate-200">{targetAudience.map(c => `${c.customer_name} (${c.customer_phone})`).slice(0, 3).join(', ')}</strong>
                  {targetAudience.length > 3 && ` +${targetAudience.length - 3} more`}
                </div>
              ) : (
                <p className="text-[11px] text-amber-400 italic pt-1 border-t border-slate-800">
                  No orders match this specific combination of filters.
                </p>
              )}
            </div>
          )}

          {/* Message Composer */}
          <div>
            <label className="text-label text-slate-400 block mb-1">Message Content (With Macro Tags)</label>
            <textarea
              rows={4}
              value={template}
              onChange={e => setTemplate(e.target.value)}
              className="input resize-none text-xs"
            />
          </div>

          {/* Macro Tags */}
          <div className="space-y-1.5">
            <p className="text-[10px] text-slate-400">Click a variable tag to insert into template:</p>
            <div className="flex flex-wrap gap-1.5">
              {['{{customer_name}}', '{{order_number}}', '{{product_name}}', '{{total_amount}}'].map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => insertVariable(tag)}
                  className="badge bg-slate-800 hover:bg-slate-700 text-indigo-300 font-mono text-[10px] transition-colors cursor-pointer"
                  title="Click to insert"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Live Preview Box */}
          {sampleCustomer && (
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Live Preview (For {sampleCustomer.customer_name}):</span>
              <p className="text-xs text-slate-200 font-mono whitespace-pre-wrap leading-relaxed">
                "{renderedSampleMessage}"
              </p>
            </div>
          )}

          {/* Dispatch Action Buttons */}
          <div className="space-y-2 pt-1">
            <button
              onClick={handleSendBroadcast}
              disabled={sending || targetAudience.length === 0}
              className="w-full btn-primary py-2.5 text-xs flex items-center justify-center gap-2"
            >
              {sending ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Dispatching via Gateway...</>
              ) : (
                <><Play className="w-4 h-4" /> Send to {targetAudience.length} Recipient{targetAudience.length !== 1 ? 's' : ''}</>
              )}
            </button>

            {/* If single client mode, also offer direct 1-click wa.me link as backup */}
            {targetMode === 'single' && directWhatsAppUrl && activeSegment === 'whatsapp' && (
              <a
                href={directWhatsAppUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full btn-secondary py-2 text-xs flex items-center justify-center gap-2 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10"
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                Or Open in WhatsApp Web / App (1-Click Direct Chat)
              </a>
            )}
          </div>

          {successMsg && (
            <div className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-3 py-2 rounded-xl flex items-center gap-2 animate-fade-in">
              <CheckCircle className="w-4 h-4 shrink-0" /> {successMsg}
            </div>
          )}

          {errorMsg && (
            <div className="text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/25 px-3 py-2 rounded-xl flex items-center gap-2 animate-fade-in">
              <span>⚠️ {errorMsg}</span>
            </div>
          )}
        </div>

        {/* Right Column: Live Delivery Logs & Trigger Templates */}
        <div className="glass p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200">Delivery Telemetry Logs</h3>
            <button
              onClick={fetchLogs}
              className="text-[11px] text-indigo-400 hover:text-indigo-300 underline"
            >
              Refresh History
            </button>
          </div>

          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
            {loadingLogs ? (
              <p className="text-xs text-slate-500 text-center py-6 italic">Loading delivery logs...</p>
            ) : broadcastLog.filter(l => l.channel.toLowerCase() === activeSegment).length === 0 ? (
              <div className="text-center py-8 space-y-1">
                <p className="text-xs text-slate-400 italic">No recent {activeSegment.toUpperCase()} logs found.</p>
                <p className="text-[11px] text-slate-500">Order receipts and broadcasts sent to buyers will be tracked here.</p>
              </div>
            ) : (
              broadcastLog.filter(l => l.channel.toLowerCase() === activeSegment).map(log => (
                <div key={log.id} className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs hover-lift">
                  <div className="min-w-0 pr-2">
                    <p className="font-semibold text-slate-200 truncate">{log.recipient}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{log.channel} · {log.sentAt}</p>
                  </div>
                  <span className={`badge shrink-0 ${log.status.toLowerCase().includes('delivered') || log.status.toLowerCase().includes('sent') ? 'badge-delivered' : 'badge-pending'}`}>
                    {log.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
