import React, { useState, useRef, useEffect } from 'react';
import {
  LayoutGrid, List, Phone, CheckCircle, XCircle, ArrowRight, AlertTriangle, Truck, Filter,
  Copy, MessageCircle, Calendar, Clock, ChevronDown, ChevronLeft, ChevronRight, UserCheck, Plus, Search, RotateCcw,
  Send, Mail, Loader2
} from 'lucide-react';
import { AFRICAN_LOCATIONS } from '../data/africanLocations';
import { copyOrderToClipboard } from '../utils/copyOrder';
import ScheduleModal from '../components/ScheduleModal';
import MarkDeliveredModal from '../components/MarkDeliveredModal';
import { apiUrl } from '../utils/apiUrl';

const ALL_SYSTEM_TABS = [
  { id: 'Pending', label: 'Pending' },
  { id: 'Cart Abandonment', label: 'Cart Abandonment' },
  { id: 'Audit Hold', label: 'Audit Hold' },
  { id: 'Awaiting', label: 'Awaiting' },
  { id: 'Scheduled', label: 'Scheduled' },
  { id: 'Confirmed', label: 'Confirmed' },
  { id: 'Shipped', label: 'Shipped' },
  { id: 'Delivered', label: 'Delivered' },
  { id: 'Paid', label: 'Paid' },
  { id: 'Cash Remitted', label: 'Cash Remitted' },
  { id: 'Cancelled', label: 'Cancelled' },
  { id: 'Failed', label: 'Failed' },
  { id: 'After-Sale Followup', label: 'After-Sale Followup' },
  { id: 'Returned', label: 'Returned' },
  { id: 'Deleted', label: 'Deleted' },
  { id: 'Banned', label: 'Banned' }
];

const BADGE_CLASS = {
  Draft: 'badge-draft',
  'Cart Abandonment': 'badge-pending',
  Pending: 'badge-pending',
  'Audit Hold': 'badge-awaiting',
  Awaiting: 'badge-awaiting',
  Scheduled: 'badge-scheduled',
  Confirmed: 'badge-scheduled',
  Shipped: 'badge-scheduled',
  Delivered: 'badge-delivered',
  Paid: 'badge-delivered',
  'Cash Remitted': 'badge-delivered',
  Cancelled: 'badge-cancelled',
  Failed: 'badge-cancelled',
  Returned: 'badge-cancelled',
  'After-Sale Followup': 'badge-pending',
  Deleted: 'badge-draft',
  Banned: 'badge-cancelled'
};

export default function OrdersPipeline({
  orders = [],
  selectedCountry,
  selectedState,
  onOpenConfirmationModal,
  onUpdateStatus
}) {
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' or 'table'
  const [activePipelineTab, setActivePipelineTab] = useState('Pending');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [schedulingOrder, setSchedulingOrder] = useState(null);
  const [deliveryModalOrder, setDeliveryModalOrder] = useState(null);
  const [deliveryModalMode, setDeliveryModalMode] = useState('delivered'); // 'delivered' or 'failed'
  const [sendingReminderId, setSendingReminderId] = useState(null);
  const [reminderToastMap, setReminderToastMap] = useState({}); // { [orderId]: { type, msg } }

  const handleSendRecovery = async (order) => {
    setSendingReminderId(order.id);
    setReminderToastMap(prev => ({ ...prev, [order.id]: null }));
    try {
      const token = localStorage.getItem('gravity_crm_token');
      const res = await fetch(apiUrl(`/api/orders/${order.id}/remind`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      if (res.ok) {
        const channels = [data.emailSent && 'Email', data.smsSent && 'SMS'].filter(Boolean).join(' & ') || 'Recovery';
        setReminderToastMap(prev => ({ ...prev, [order.id]: { type: 'success', msg: `${channels} sent!` } }));
      } else {
        setReminderToastMap(prev => ({ ...prev, [order.id]: { type: 'error', msg: data.error || 'Send failed' } }));
      }
    } catch {
      setReminderToastMap(prev => ({ ...prev, [order.id]: { type: 'error', msg: 'Network error' } }));
    } finally {
      setSendingReminderId(null);
      setTimeout(() => setReminderToastMap(prev => ({ ...prev, [order.id]: null })), 4000);
    }
  };

  // Dynamic tabs state (user can toggle / add tabs - Cart Abandonment included by default)
  const [visibleTabs, setVisibleTabs] = useState([
    'Pending', 'Cart Abandonment', 'Audit Hold', 'Awaiting', 'Scheduled', 'Confirmed', 'Shipped',
    'Delivered', 'Paid', 'Cash Remitted', 'Cancelled', 'Failed', 'After-Sale Followup', 'Returned'
  ]);
  const [showAddTabMenu, setShowAddTabMenu] = useState(false);

  // Delivery agents & Team members state
  const [agents, setAgents] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);

  const scrollContainerRef = useRef(null);

  const loc = AFRICAN_LOCATIONS.find(c => c.country === selectedCountry) || AFRICAN_LOCATIONS[0];
  const curr = loc.currency;

  useEffect(() => {
    const fetchAgentsAndTeam = async () => {
      try {
        const token = localStorage.getItem('gravity_crm_token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const [agRes, tmRes] = await Promise.all([
          fetch(apiUrl('/api/delivery-agents'), { headers }).then(r => r.ok ? r.json() : []).catch(() => []),
          fetch(apiUrl('/api/team'), { headers }).then(r => r.ok ? r.json() : []).catch(() => [])
        ]);
        if (Array.isArray(agRes)) setAgents(agRes);
        if (Array.isArray(tmRes)) setTeamMembers(tmRes);
      } catch (e) {
        console.error('Error fetching pipeline resources:', e);
      }
    };
    fetchAgentsAndTeam();
  }, []);

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  // Filter orders
  const filtered = orders.filter(o => {
    if (o.country && o.country !== selectedCountry) return false;
    if (selectedState && selectedState !== 'All Regions' && o.state !== selectedState) return false;

    // Payment status filter
    if (paymentStatusFilter !== 'All') {
      if (paymentStatusFilter === 'Paid' && o.payment_status !== 'Paid') return false;
      if (paymentStatusFilter === 'Unpaid' && o.payment_status === 'Paid') return false;
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        o.order_number?.toLowerCase().includes(q) ||
        o.customer_name?.toLowerCase().includes(q) ||
        o.customer_phone?.toLowerCase().includes(q) ||
        o.delivery_address?.toLowerCase().includes(q) ||
        o.state?.toLowerCase().includes(q);
      if (!match) return false;
    }

    return true;
  });

  // Count orders per status
  const getTabCount = (tabId) => {
    return filtered.filter(o => {
      if (tabId === 'Cart Abandonment') return o.status === 'Draft' || o.status === 'Cart Abandonment';
      return o.status === tabId;
    }).length;
  };

  const getWhatsAppUrl = (order) => {
    if (!order || !order.customer_phone) return '#';
    let cleanPhone = order.customer_phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = '234' + cleanPhone.slice(1);
    const itemName = order.items?.[0]?.name || 'Product Package';
    const msg = `Hello ${order.customer_name || 'Customer'}, reaching out from merchant store regarding your order #${order.order_number} for ${itemName} (${curr}${(order.total_amount || 0).toLocaleString()}). Please confirm if you are ready to receive delivery at ${order.delivery_address || ''}, ${order.state || ''}.`;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
  };

  const handleStageDropdownChange = (order, targetStage) => {
    if (targetStage === 'Scheduled') {
      setSchedulingOrder(order);
    } else if (targetStage === 'Delivered') {
      setDeliveryModalMode('delivered');
      setDeliveryModalOrder(order);
    } else if (targetStage === 'Failed') {
      setDeliveryModalMode('failed');
      setDeliveryModalOrder(order);
    } else {
      onUpdateStatus(order.id, targetStage);
    }
  };

  // Helper to extract parsed agent/details
  const getOrderMeta = (order) => {
    if (order.confirmation_call_notes && typeof order.confirmation_call_notes === 'string' && order.confirmation_call_notes.startsWith('{')) {
      try { return JSON.parse(order.confirmation_call_notes); } catch (e) {}
    }
    return {};
  };

  // Export search results as CSV
  const handleExportCSV = () => {
    const listToExport = filtered.filter(o => activePipelineTab === 'All' || o.status === activePipelineTab || (activePipelineTab === 'Cart Abandonment' && o.status === 'Draft'));
    if (listToExport.length === 0) {
      alert('No orders in this stage to export.');
      return;
    }
    const headers = ['Order Number', 'Date', 'Customer Name', 'Phone', 'Address', 'State', 'Amount', 'Status', 'Delivery Agent', 'Sales Rep'];
    const rows = listToExport.map(o => {
      const meta = getOrderMeta(o);
      return [
        o.order_number || '',
        o.created_at ? o.created_at.slice(0, 10) : '',
        `"${(o.customer_name || '').replace(/"/g, '""')}"`,
        `"${o.customer_phone || ''}"`,
        `"${(o.delivery_address || '').replace(/"/g, '""')}"`,
        o.state || '',
        o.total_amount || 0,
        o.status || '',
        `"${meta.delivery_agent_name || ''}"`,
        `"${meta.sales_rep_name || ''}"`
      ];
    });
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `orders_${activePipelineTab.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5 animate-fade-in text-slate-100">

      {/* Schedule Picker Modal */}
      {schedulingOrder && (
        <ScheduleModal
          order={schedulingOrder}
          onClose={() => setSchedulingOrder(null)}
          onConfirmSchedule={(orderId, status, scheduleData) => {
            onUpdateStatus(orderId, status, scheduleData.reminder_notes, scheduleData);
          }}
        />
      )}

      {/* Mark Delivered / Failed Modal */}
      {deliveryModalOrder && (
        <MarkDeliveredModal
          order={deliveryModalOrder}
          isOpen={!!deliveryModalOrder}
          mode={deliveryModalMode}
          agents={agents}
          teamMembers={teamMembers}
          currency={curr}
          onClose={() => setDeliveryModalOrder(null)}
          onSubmit={async (orderId, targetStatus, notes, scheduleData) => {
            await onUpdateStatus(orderId, targetStatus, notes, scheduleData);
          }}
        />
      )}

      {/* ── TOP FILTER & SEARCH BAR (Matches Top Tier CMS Style) ── */}
      <div className="bg-[#0f172a] border border-slate-800/90 rounded-2xl p-4 shadow-xl space-y-4">
        
        {/* Row 1: Payment Status & Action Buttons */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="w-full md:w-64">
            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1.5">
              Payment Status
            </label>
            <select
              value={paymentStatusFilter}
              onChange={e => setPaymentStatusFilter(e.target.value)}
              className="w-full bg-[#1e293b] border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="All">All</option>
              <option value="Paid">Paid</option>
              <option value="Unpaid">Unpaid</option>
            </select>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search orders, phone, customer..."
                className="w-full bg-[#1e293b] border border-slate-700 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              onClick={() => {}}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" /> Search
            </button>

            <button
              onClick={() => {
                setSearchQuery('');
                setPaymentStatusFilter('All');
              }}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
              title="Reset filters"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </button>

            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 text-indigo-400" /> Export Search Results
            </button>

            {/* View Mode Toggle */}
            <div className="flex bg-[#1e293b] p-1 rounded-xl border border-slate-700 gap-1 ml-auto">
              <button
                onClick={() => setViewMode('kanban')}
                className={`p-1.5 rounded-lg transition-colors ${viewMode === 'kanban' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                title="Kanban Board"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-colors ${viewMode === 'table' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                title="Table View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Matches counter indicator */}
        <div className="flex justify-end text-[10px] font-mono font-bold text-slate-500 tracking-wider uppercase">
          {getTabCount(activePipelineTab)} matches in {activePipelineTab}
        </div>

        {/* ── ROW 2: HORIZONTAL STATUS TABS (With Badges & Add Tab) ── */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none pt-2 border-t border-slate-800/80">
          {visibleTabs.map(tabId => {
            const count = getTabCount(tabId);
            const isActive = activePipelineTab === tabId;
            return (
              <button
                key={tabId}
                onClick={() => setActivePipelineTab(tabId)}
                className={`shrink-0 px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'bg-[#1e293b] hover:bg-slate-700 text-slate-300 border border-slate-800'
                }`}
              >
                <span>{tabId}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-md font-extrabold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}

          {/* Add Tab Dropdown */}
          <div className="relative shrink-0">
            <button
              onClick={() => setShowAddTabMenu(!showAddTabMenu)}
              className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-indigo-400" /> Add Tab
            </button>

            {showAddTabMenu && (
              <div className="absolute left-0 mt-2 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1.5 z-40 space-y-1">
                <p className="text-[10px] text-slate-400 uppercase font-bold px-2 py-1">Toggle Stage Tabs</p>
                {ALL_SYSTEM_TABS.map(tab => {
                  const isVisible = visibleTabs.includes(tab.id);
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        if (isVisible) {
                          if (visibleTabs.length > 1) setVisibleTabs(visibleTabs.filter(t => t !== tab.id));
                        } else {
                          setVisibleTabs([...visibleTabs, tab.id]);
                        }
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between hover:bg-slate-800 text-slate-200"
                    >
                      <span>{tab.label}</span>
                      <span className={`text-[10px] font-bold ${isVisible ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {isVisible ? '✓' : '+'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ── KANBAN VIEW ── */}
      {viewMode === 'kanban' && (
        <div className="relative">
          {/* Scroll Nav Controls */}
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-indigo-400" /> Pipeline Stage Board
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={scrollLeft}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                title="Scroll Left"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={scrollRight}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                title="Scroll Right"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div
            ref={scrollContainerRef}
            className="flex gap-3 overflow-x-auto pb-4 pt-1 px-1 snap-x scroll-smooth"
          >
            {visibleTabs.map(status => {
              const cols = filtered.filter(o => {
                if (status === 'Cart Abandonment') return o.status === 'Draft' || o.status === 'Cart Abandonment';
                return o.status === status;
              });

              return (
                <div
                  key={status}
                  className="bg-[#0f172a] border border-slate-800 rounded-2xl flex flex-col shrink-0 w-72 md:w-64 lg:w-72 snap-start shadow-lg"
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between px-3.5 py-3 border-b border-slate-800 bg-[#090d16] rounded-t-2xl">
                    <span className={`badge ${BADGE_CLASS[status] || 'badge-pending'}`}>
                      {status}
                    </span>
                    <span className="text-[11px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                      {cols.length}
                    </span>
                  </div>

                  {/* Order Cards Column */}
                  <div className="flex flex-col gap-2.5 p-2.5 overflow-y-auto scrollbar-none max-h-[70vh]">
                    {cols.length === 0 ? (
                      <p className="text-[11px] text-slate-500 text-center py-8 italic">No orders in this stage</p>
                    ) : (
                      cols.map(order => {
                        const meta = getOrderMeta(order);
                        return (
                          <div
                            key={order.id}
                            className="bg-[#1e293b]/90 hover:bg-[#1e293b] border border-slate-700/80 rounded-xl p-3 space-y-2.5 transition-all shadow-md group"
                          >
                            {order.is_duplicate_flagged && (
                              <div className="flex items-center gap-1 text-[10px] font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded-md">
                                <AlertTriangle className="w-3 h-3" /> Duplicate Flag
                              </div>
                            )}

                            {/* Ref & Amount */}
                            <div className="flex justify-between items-center gap-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-[11px] font-bold text-indigo-400">
                                  #{order.order_number}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => copyOrderToClipboard(order, curr)}
                                  title="Copy order details"
                                  className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white hover:bg-indigo-600 transition-colors"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                              </div>
                              <span className="text-xs font-extrabold text-emerald-400">
                                {curr}{order.total_amount?.toLocaleString()}
                              </span>
                            </div>

                            {/* Customer Info */}
                            <div>
                              <p className="text-xs font-bold text-slate-100 truncate">{order.customer_name}</p>
                              <p className="text-[10px] text-slate-400 truncate">{order.customer_phone}</p>
                              <p className="text-[10px] text-slate-500 truncate mt-0.5">
                                {order.delivery_address || 'Address pending'}, {order.state}
                              </p>
                            </div>

                            {/* Package / Items */}
                            <p className="text-[10px] text-slate-300 bg-slate-950/80 px-2 py-1 rounded-lg border border-slate-800/80 truncate">
                              {order.items?.[0]?.name || 'Product Item'}
                              {order.items?.length > 1 && ` +${order.items.length - 1} more`}
                            </p>

                            {/* Assigned Delivery Agent Badge */}
                            {meta.delivery_agent_name && (
                              <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-[10px] text-indigo-300 font-medium flex items-center justify-between">
                                <span className="flex items-center gap-1">
                                  <UserCheck className="w-3 h-3 text-indigo-400" /> Rider: {meta.delivery_agent_name}
                                </span>
                                {meta.delivery_fee ? (
                                  <span className="text-[9px] text-indigo-400 font-mono">Fee: {curr}{meta.delivery_fee}</span>
                                ) : null}
                              </div>
                            )}

                            {/* Failure Reason Badge if Failed */}
                            {meta.failure_reason && order.status === 'Failed' && (
                              <div className="p-1.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-[10px] text-rose-300 font-medium">
                                <span className="font-bold">Reason:</span> {meta.failure_reason}
                              </div>
                            )}

                            {/* Scheduled Delivery Date Badge */}
                            {order.scheduled_delivery_date && (
                              <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-300 font-medium flex items-center justify-between">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-amber-400" /> Delivery: {order.scheduled_delivery_date}
                                </span>
                                <span className="text-[9px] text-amber-400/80">{order.scheduled_delivery_time || ''}</span>
                              </div>
                            )}

                            {/* Quick Call & WhatsApp Quick Conversion Bar */}
                            <div className="grid grid-cols-2 gap-1.5 pt-1">
                              <a
                                href={`tel:${order.customer_phone}`}
                                className="py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white font-bold text-[10px] flex items-center justify-center gap-1 transition-colors border border-indigo-500/30"
                              >
                                <Phone className="w-3 h-3 text-indigo-400" /> Call
                              </a>
                              <a
                                href={getWhatsAppUrl(order)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white font-bold text-[10px] flex items-center justify-center gap-1 transition-colors border border-emerald-500/30"
                              >
                                <MessageCircle className="w-3 h-3 text-emerald-400" /> WhatsApp
                              </a>
                            </div>

                            {/* Cart Abandonment Recovery – Email & SMS */}
                            {(order.status === 'Draft' || order.status === 'Cart Abandonment') && (
                              <div className="pt-1 space-y-1.5">
                                {order.customer_email && (
                                  <p className="text-[10px] text-slate-400 flex items-center gap-1 truncate">
                                    <Mail className="w-3 h-3 text-amber-400 shrink-0" />
                                    <span className="truncate">{order.customer_email}</span>
                                  </p>
                                )}
                                {reminderToastMap[order.id] && (
                                  <p className={`text-[10px] font-bold flex items-center gap-1 ${
                                    reminderToastMap[order.id].type === 'success' ? 'text-emerald-400' : 'text-rose-400'
                                  }`}>
                                    {reminderToastMap[order.id].type === 'success'
                                      ? <CheckCircle className="w-3 h-3" />
                                      : <XCircle className="w-3 h-3" />}
                                    {reminderToastMap[order.id].msg}
                                  </p>
                                )}
                                <button
                                  onClick={() => handleSendRecovery(order)}
                                  disabled={sendingReminderId === order.id}
                                  className="w-full py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500 border border-amber-500/40 text-amber-300 hover:text-white font-bold text-[10px] flex items-center justify-center gap-1 transition-all disabled:opacity-60"
                                >
                                  {sendingReminderId === order.id
                                    ? <><Loader2 className="w-3 h-3 animate-spin" /> Sending...</>
                                    : <><Send className="w-3 h-3" /> Send Recovery</>
                                  }
                                </button>
                              </div>
                            )}

                            {/* Stage Selector Dropdown */}
                            <div className="pt-1">
                              <div className="relative">
                                <select
                                  value={order.status}
                                  onChange={e => handleStageDropdownChange(order, e.target.value)}
                                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-[10px] font-bold text-slate-200 cursor-pointer outline-none focus:border-indigo-500 appearance-none pr-6"
                                >
                                  {ALL_SYSTEM_TABS.map(s => (
                                    <option key={s.id} value={s.id} className="bg-slate-900 text-slate-200">
                                      Move to: {s.label}
                                    </option>
                                  ))}
                                </select>
                                <ChevronDown className="w-3 h-3 text-slate-500 absolute right-2 top-2.5 pointer-events-none" />
                              </div>
                            </div>

                            {/* Primary Workflow Actions */}
                            <div className="space-y-1.5 pt-1">
                              {order.status === 'Pending' && (
                                <button
                                  onClick={() => onOpenConfirmationModal(order)}
                                  className="w-full py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] flex items-center justify-center gap-1 transition-all"
                                >
                                  <Phone className="w-3 h-3" /> Call Script Desk
                                </button>
                              )}

                              {(order.status === 'Awaiting' || order.status === 'Confirmed') && (
                                <button
                                  onClick={() => setSchedulingOrder(order)}
                                  className="w-full py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] flex items-center justify-center gap-1 transition-all"
                                >
                                  <Calendar className="w-3 h-3" /> Schedule & Dispatch
                                </button>
                              )}

                              {(order.status === 'Scheduled' || order.status === 'Shipped' || order.status === 'Awaiting') && (
                                <div className="grid grid-cols-2 gap-1.5">
                                  <button
                                    onClick={() => {
                                      setDeliveryModalMode('delivered');
                                      setDeliveryModalOrder(order);
                                    }}
                                    className="py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] flex items-center justify-center gap-1 transition-all shadow-md shadow-emerald-600/30"
                                  >
                                    <CheckCircle className="w-3 h-3" /> Delivered
                                  </button>
                                  <button
                                    onClick={() => {
                                      setDeliveryModalMode('failed');
                                      setDeliveryModalOrder(order);
                                    }}
                                    className="py-1.5 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white font-bold text-[10px] flex items-center justify-center gap-1 transition-all"
                                  >
                                    <XCircle className="w-3 h-3" /> Failed
                                  </button>
                                </div>
                              )}
                            </div>

                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TABLE VIEW ── */}
      {viewMode === 'table' && (
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#090d16] border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
                  <th className="p-3.5">Order Ref</th>
                  <th className="p-3.5">Customer</th>
                  <th className="p-3.5">Location</th>
                  <th className="p-3.5">Item</th>
                  <th className="p-3.5">Amount</th>
                  <th className="p-3.5">Stage</th>
                  <th className="p-3.5">Delivery Agent</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-500 italic">
                      No orders match the current filters.
                    </td>
                  </tr>
                ) : (
                  filtered.map(o => {
                    const meta = getOrderMeta(o);
                    return (
                      <tr key={o.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3.5 font-mono font-bold text-indigo-400 flex items-center gap-1.5">
                          <span>#{o.order_number}</span>
                          <button
                            type="button"
                            onClick={() => copyOrderToClipboard(o, curr)}
                            title="Copy order details"
                            className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white hover:bg-indigo-600 transition-colors"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </td>
                        <td className="p-3.5">
                          <p className="font-semibold text-slate-200">{o.customer_name}</p>
                          <p className="text-[10px] text-slate-400">{o.customer_phone}</p>
                        </td>
                        <td className="p-3.5 text-slate-400">{o.state}, {o.country}</td>
                        <td className="p-3.5 text-slate-300 max-w-[160px] truncate">{o.items?.[0]?.name || '—'}</td>
                        <td className="p-3.5 font-bold text-emerald-400 font-mono">{curr}{o.total_amount?.toLocaleString()}</td>
                        <td className="p-3.5">
                          <select
                            value={o.status}
                            onChange={e => handleStageDropdownChange(o, e.target.value)}
                            className="bg-slate-900 border border-slate-700 text-slate-200 text-xs font-bold rounded-lg p-1.5 cursor-pointer outline-none focus:border-indigo-500"
                          >
                            {ALL_SYSTEM_TABS.map(s => (
                              <option key={s.id} value={s.id}>{s.label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-3.5">
                          {meta.delivery_agent_name ? (
                            <span className="text-indigo-400 font-semibold flex items-center gap-1">
                              <UserCheck className="w-3.5 h-3.5" /> {meta.delivery_agent_name}
                            </span>
                          ) : (
                            <span className="text-slate-500 italic text-[11px]">Unassigned</span>
                          )}
                        </td>
                        <td className="p-3.5 text-right space-x-1.5">
                          <button
                            onClick={() => {
                              setDeliveryModalMode('delivered');
                              setDeliveryModalOrder(o);
                            }}
                            className="px-2.5 py-1.5 bg-emerald-600/90 hover:bg-emerald-600 text-white rounded-lg font-bold text-[11px] shadow transition-all cursor-pointer"
                          >
                            Delivered
                          </button>
                          <button
                            onClick={() => {
                              setDeliveryModalMode('failed');
                              setDeliveryModalOrder(o);
                            }}
                            className="px-2.5 py-1.5 bg-rose-600/80 hover:bg-rose-600 text-white rounded-lg font-bold text-[11px] shadow transition-all cursor-pointer"
                          >
                            Failed
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
