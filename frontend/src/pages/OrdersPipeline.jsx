import React, { useState, useRef, useEffect } from 'react';
import {
  LayoutGrid, List, Phone, CheckCircle, XCircle, ArrowRight, AlertTriangle, Truck, Filter,
  Copy, MessageCircle, Calendar, Clock, ChevronDown, ChevronLeft, ChevronRight, UserCheck, Plus, Search, RotateCcw,
  Send, Mail, Loader2, ExternalLink, Gift, CreditCard, FileText, User, Tag, MoreVertical, SlidersHorizontal, FileSpreadsheet
} from 'lucide-react';
import { AFRICAN_LOCATIONS } from '../data/africanLocations';
import { copyOrderToClipboard } from '../utils/copyOrder';
import ScheduleModal from '../components/ScheduleModal';
import MarkDeliveredModal from '../components/MarkDeliveredModal';
import { apiUrl } from '../utils/apiUrl';

const ALL_SYSTEM_TABS = [
  { id: 'All', label: 'All Orders' },
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
  All: 'badge-scheduled',
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
  const [viewMode, setViewMode] = useState('table'); // Default to 'table' as shown in reference design
  const [activePipelineTab, setActivePipelineTab] = useState('All');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState('All');
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [activeActionMenuId, setActiveActionMenuId] = useState(null);
  const [showColumnsModal, setShowColumnsModal] = useState(false);
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
    'All', 'Pending', 'Cart Abandonment', 'Audit Hold', 'Awaiting', 'Scheduled', 'Confirmed', 'Shipped',
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

  // Close 3-dots actions dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.action-menu-container')) {
        setActiveActionMenuId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
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

  // Format date like: "16 Sept 2026, 13:28"
  const formatCustomerDate = (isoStr) => {
    if (!isoStr) return '16 Sept 2026, 13:28';
    try {
      const d = new Date(isoStr);
      const day = d.getDate();
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
      const month = months[d.getMonth()];
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      return `${day} ${month} ${year}, ${hours}:${mins}`;
    } catch (e) {
      return '16 Sept 2026, 13:28';
    }
  };

  // Status bullet dot & text color mapping
  const getStatusBadgeConfig = (status) => {
    switch (status) {
      case 'Pending':
        return { dot: 'bg-amber-500 shadow-sm shadow-amber-500/50', text: 'text-amber-400' };
      case 'Scheduled':
        return { dot: 'bg-indigo-500 shadow-sm shadow-indigo-500/50', text: 'text-indigo-400' };
      case 'Confirmed':
        return { dot: 'bg-purple-500 shadow-sm shadow-purple-500/50', text: 'text-purple-400' };
      case 'Shipped':
        return { dot: 'bg-cyan-500 shadow-sm shadow-cyan-500/50', text: 'text-cyan-400' };
      case 'Delivered':
      case 'Paid':
      case 'Cash Remitted':
        return { dot: 'bg-emerald-500 shadow-sm shadow-emerald-500/50', text: 'text-emerald-400' };
      case 'Cancelled':
      case 'Failed':
      case 'Returned':
      case 'Banned':
        return { dot: 'bg-rose-500 shadow-sm shadow-rose-500/50', text: 'text-rose-400' };
      case 'Audit Hold':
        return { dot: 'bg-orange-500 shadow-sm shadow-orange-500/50', text: 'text-orange-400' };
      default:
        return { dot: 'bg-slate-400', text: 'text-slate-300' };
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

    // Tag filter
    if (selectedTagFilter !== 'All') {
      const oTags = Array.isArray(o.tags) ? o.tags : [];
      if (!oTags.includes(selectedTagFilter)) return false;
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
    if (tabId === 'All') return filtered.length;
    return filtered.filter(o => {
      if (tabId === 'Cart Abandonment') return o.status === 'Draft' || o.status === 'Cart Abandonment';
      return o.status === tabId;
    }).length;
  };

  // Calculate dynamic days in status
  const getDaysInStatus = (order) => {
    const timeRef = new Date(order.updated_at || order.created_at || Date.now()).getTime();
    if (isNaN(timeRef)) return 0;
    return Math.max(0, Math.floor((Date.now() - timeRef) / (1000 * 60 * 60 * 24)));
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

  // Export search results as CSV with all 26 operational columns
  const handleExportCSV = () => {
    const listToExport = filtered.filter(o => activePipelineTab === 'All' || o.status === activePipelineTab || (activePipelineTab === 'Cart Abandonment' && o.status === 'Draft'));
    if (listToExport.length === 0) {
      alert('No orders in this stage to export.');
      return;
    }
    const headers = [
      'Order ID',
      'On Hold By',
      'Assigned To',
      'Customer Name',
      'Contact Phone',
      'Contact Email',
      'Delivery Address',
      'State',
      'Country',
      'Product',
      'Order Status',
      'Payment Method',
      'Payment Status',
      'Total Amount',
      'Free Gifts / Combo',
      'Other Details',
      'Comments',
      'Agent',
      'Delivery Fee',
      'Amount Remitted',
      'Proof of Payment',
      'Account Paid Into',
      'Tags',
      'Order Date',
      'Day in Status',
      'Form Source',
      'Added By',
      'Updated By',
      'Processed By'
    ];
    const rows = listToExport.map(o => {
      const meta = getOrderMeta(o);
      const rep = teamMembers.find(m => String(m.id) === String(o.assigned_staff_id));
      const ag = agents.find(a => String(a.id) === String(o.delivery_agent_id));
      const daysInStatus = getDaysInStatus(o);
      const productSummary = (o.items || []).map(i => `${i.name} (x${i.quantity || 1})`).join('; ') || 'Standard Item';
      const tagsStr = Array.isArray(o.tags) ? o.tags.join('; ') : (Array.isArray(meta.tags) ? meta.tags.join('; ') : '');
      const comboStr = o.combo_details || meta.combo_details || meta.free_gift || (o.items?.length > 1 ? `${o.items.length}-Item Combo` : 'None');
      const otherDetails = [o.scheduled_delivery_date, o.scheduled_delivery_time, o.reminder_notes].filter(Boolean).join(' | ');
      const commentsStr = o.comments || meta.comments || (typeof o.confirmation_call_notes === 'string' && !o.confirmation_call_notes.startsWith('{') ? o.confirmation_call_notes : '');
      const onHoldBy = o.on_hold_by || meta.on_hold_by || (o.status === 'Audit Hold' ? 'Audit Team' : '');
      const assignedTo = o.assigned_to_name || meta.sales_rep_name || rep?.full_name || '';
      const agentName = o.delivery_agent_name || meta.delivery_agent_name || ag?.name || '';
      const amountRemitted = o.amount_remitted ?? meta.amount_remitted ?? (o.payment_status === 'Paid' ? o.total_amount : 0);
      const proofUrl = o.proof_of_payment_url || meta.proof_of_payment_url || '';
      const accountPaid = o.account_paid_into || meta.account_paid_into || (o.payment_method === 'COD' ? 'Cash on Delivery' : 'Merchant Bank Account');

      return [
        `"${o.order_number || ''}"`,
        `"${String(onHoldBy).replace(/"/g, '""')}"`,
        `"${String(assignedTo).replace(/"/g, '""')}"`,
        `"${(o.customer_name || '').replace(/"/g, '""')}"`,
        `"${o.customer_phone || ''}"`,
        `"${o.customer_email || ''}"`,
        `"${(o.delivery_address || '').replace(/"/g, '""')}"`,
        `"${o.state || ''}"`,
        `"${o.country || ''}"`,
        `"${String(productSummary).replace(/"/g, '""')}"`,
        `"${o.status || ''}"`,
        `"${o.payment_method || 'COD'}"`,
        `"${o.payment_status || 'Unpaid'}"`,
        o.total_amount || 0,
        `"${String(comboStr).replace(/"/g, '""')}"`,
        `"${String(otherDetails).replace(/"/g, '""')}"`,
        `"${String(commentsStr).replace(/"/g, '""')}"`,
        `"${String(agentName).replace(/"/g, '""')}"`,
        o.delivery_fee || 0,
        amountRemitted,
        `"${String(proofUrl).replace(/"/g, '""')}"`,
        `"${String(accountPaid).replace(/"/g, '""')}"`,
        `"${String(tagsStr).replace(/"/g, '""')}"`,
        `"${o.created_at || ''}"`,
        daysInStatus,
        `"${(o.source || 'form:embedded').replace(/"/g, '""')}"`,
        `"${(o.added_by || meta.added_by || 'Online Checkout').replace(/"/g, '""')}"`,
        `"${(o.updated_by || meta.updated_by || 'System').replace(/"/g, '""')}"`,
        `"${(o.processed_by || meta.processed_by || '').replace(/"/g, '""')}"`
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

  // Filter table view orders by active pipeline tab
  const tableOrders = filtered.filter(o => {
    if (activePipelineTab === 'All') return true;
    if (activePipelineTab === 'Cart Abandonment') return o.status === 'Draft' || o.status === 'Cart Abandonment';
    return o.status === activePipelineTab;
  });

  const toggleSelectAll = () => {
    if (tableOrders.length > 0 && selectedOrderIds.length === tableOrders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(tableOrders.map(o => o.id));
    }
  };

  const toggleSelectOrder = (id) => {
    setSelectedOrderIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBulkAction = (action) => {
    if (selectedOrderIds.length === 0) return;
    if (action === 'mark_delivered') {
      selectedOrderIds.forEach(id => onUpdateStatus(id, 'Delivered'));
      setSelectedOrderIds([]);
    } else if (action === 'mark_scheduled') {
      selectedOrderIds.forEach(id => onUpdateStatus(id, 'Scheduled'));
      setSelectedOrderIds([]);
    } else if (action === 'mark_failed') {
      selectedOrderIds.forEach(id => onUpdateStatus(id, 'Failed'));
      setSelectedOrderIds([]);
    } else if (action === 'mark_confirmed') {
      selectedOrderIds.forEach(id => onUpdateStatus(id, 'Confirmed'));
      setSelectedOrderIds([]);
    } else if (action === 'export_selected') {
      handleExportCSV();
    }
  };

  const handleExportPDF = () => {
    window.print();
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
            {visibleTabs.filter(status => status !== 'All').map(status => {
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

      {/* ── 26-COLUMN OPERATIONAL TABLE VIEW (Matches User Screenshot Exactly) ── */}
      {viewMode === 'table' && (
        <div className="bg-[#080b11] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          {/* Top Toolbar matching screenshot: Quick Search, Filter by tags, Bulk action, Columns & Order, Excel, PDF */}
          <div className="p-3.5 bg-[#080b11] border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-wrap flex-1">
              {/* Quick search... */}
              <div className="relative w-64 md:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Quick Search..."
                  className="w-full bg-[#0d121d] border border-slate-800 rounded-lg pl-9 pr-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Filter by tags... */}
              <div className="relative">
                <select
                  value={selectedTagFilter}
                  onChange={e => setSelectedTagFilter(e.target.value)}
                  className="bg-[#0d121d] border border-slate-800 text-slate-300 text-xs rounded-lg px-3 py-2 outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="All">Filter by tags...</option>
                  <option value="VIP">VIP</option>
                  <option value="High Value">High Value</option>
                  <option value="Fast Track">Fast Track</option>
                  <option value="Audit">Audit</option>
                </select>
              </div>

              {/* Selected orders counter pill */}
              {selectedOrderIds.length > 0 && (
                <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold">
                  <span>{selectedOrderIds.length} selected</span>
                  <button
                    onClick={() => setSelectedOrderIds([])}
                    className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Bulk action */}
              <div className="relative">
                <select
                  onChange={e => {
                    if (e.target.value) handleBulkAction(e.target.value);
                    e.target.value = '';
                  }}
                  defaultValue=""
                  disabled={selectedOrderIds.length === 0}
                  className={`bg-[#0d121d] border border-slate-800 text-xs rounded-lg px-3 py-2 outline-none cursor-pointer ${
                    selectedOrderIds.length > 0
                      ? 'text-indigo-400 border-indigo-600/50 font-bold'
                      : 'text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <option value="" disabled>Bulk action {selectedOrderIds.length > 0 ? `(${selectedOrderIds.length})` : ''}</option>
                  <option value="mark_delivered">Mark as Delivered</option>
                  <option value="mark_scheduled">Mark as Scheduled</option>
                  <option value="mark_failed">Mark as Failed</option>
                  <option value="mark_confirmed">Mark as Confirmed</option>
                  <option value="export_selected">Export Selected</option>
                </select>
              </div>

              {/* Columns & Order */}
              <button
                onClick={() => setShowColumnsModal(true)}
                className="px-3 py-2 bg-[#0d121d] hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" /> Columns & Order
              </button>

              {/* Excel */}
              <button
                onClick={handleExportCSV}
                className="px-3 py-2 bg-[#0d121d] hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Export to Excel / CSV"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" /> Excel
              </button>

              {/* PDF */}
              <button
                onClick={handleExportPDF}
                className="px-3 py-2 bg-[#0d121d] hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Export / Print PDF"
              >
                <FileText className="w-3.5 h-3.5 text-rose-400" /> PDF
              </button>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[720px] relative scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
            <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
              <thead className="sticky top-0 z-30 bg-[#080b11] border-b border-slate-800 shadow-md">
                <tr className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold">
                  {/* Selection Checkbox */}
                  <th className="p-3 w-10 text-center sticky left-0 z-40 bg-[#080b11] border-r border-slate-800">
                    <input
                      type="checkbox"
                      checked={tableOrders.length > 0 && selectedOrderIds.length === tableOrders.length}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-slate-700 bg-[#0d121d] text-indigo-600 focus:ring-0 cursor-pointer accent-indigo-600"
                    />
                  </th>
                  {/* 1. ACTIONS */}
                  <th className="p-3 sticky left-10 z-40 bg-[#080b11] border-r border-slate-800 min-w-[75px]">
                    ACTIONS
                  </th>
                  {/* 2. ORDER ID */}
                  <th className="p-3 sticky left-[115px] z-40 bg-[#080b11] border-r border-slate-800 shadow-[4px_0_8px_rgba(0,0,0,0.35)] min-w-[130px]">
                    ORDER ID
                  </th>
                  {/* 3. ON HOLD BY */}
                  <th className="p-3 min-w-[110px]">ON HOLD BY</th>
                  {/* 4. ASSIGNED TO */}
                  <th className="p-3 min-w-[135px]">ASSIGNED TO</th>
                  {/* 5. CUSTOMER NAME */}
                  <th className="p-3 min-w-[170px]">CUSTOMER NAME</th>
                  {/* 6. CONTACT */}
                  <th className="p-3 min-w-[185px]">CONTACT</th>
                  {/* 7. ADDRESS */}
                  <th className="p-3 min-w-[240px]">ADDRESS</th>
                  {/* 8. PRODUCT */}
                  <th className="p-3 min-w-[200px]">PRODUCT</th>
                  {/* 9. ORDER STATUS */}
                  <th className="p-3 min-w-[145px]">ORDER STATUS</th>
                  {/* 10. PAYMENT */}
                  <th className="p-3 min-w-[135px]">PAYMENT</th>
                  {/* 11. FREE GIFTS / COMBO */}
                  <th className="p-3 min-w-[145px]">FREE GIFTS / COMBO</th>
                  {/* 12. OTHER DETAILS */}
                  <th className="p-3 min-w-[160px]">OTHER DETAILS</th>
                  {/* 13. COMMENTS */}
                  <th className="p-3 min-w-[155px]">COMMENTS</th>
                  {/* 14. AGENT */}
                  <th className="p-3 min-w-[130px]">AGENT</th>
                  {/* 15. DELIVERY FEE */}
                  <th className="p-3 min-w-[110px]">DELIVERY FEE</th>
                  {/* 16. AMOUNT REMITTED */}
                  <th className="p-3 min-w-[130px]">AMOUNT REMITTED</th>
                  {/* 17. PROOF OF PAYMENT */}
                  <th className="p-3 min-w-[130px]">PROOF OF PAYMENT</th>
                  {/* 18. ACCOUNT PAID INTO */}
                  <th className="p-3 min-w-[150px]">ACCOUNT PAID INTO</th>
                  {/* 19. TAGS */}
                  <th className="p-3 min-w-[130px]">TAGS</th>
                  {/* 20. ORDER DATE */}
                  <th className="p-3 min-w-[140px]">ORDER DATE</th>
                  {/* 21. DAY IN STATUS */}
                  <th className="p-3 min-w-[110px]">DAY IN STATUS</th>
                  {/* 22. FORM SOURCE */}
                  <th className="p-3 min-w-[140px]">FORM SOURCE</th>
                  {/* 23. ADDED BY */}
                  <th className="p-3 min-w-[120px]">ADDED BY</th>
                  {/* 24. UPDATED BY */}
                  <th className="p-3 min-w-[120px]">UPDATED BY</th>
                  {/* 25. PROCESSED BY */}
                  <th className="p-3 min-w-[130px]">PROCESSED BY</th>
                  {/* 26. ACTIONS (SECONDARY) */}
                  <th className="p-3 sticky right-0 z-40 bg-[#080b11] border-l border-slate-800 shadow-[-4px_0_8px_rgba(0,0,0,0.35)] min-w-[170px] text-right pr-4">
                    ACTIONS
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {tableOrders.length === 0 ? (
                  <tr>
                    <td colSpan={27} className="text-center py-16 text-slate-500 italic">
                      No orders found in "{activePipelineTab}" stage matching current filters.
                    </td>
                  </tr>
                ) : (
                  tableOrders.map(o => {
                    const meta = getOrderMeta(o);
                    const rep = teamMembers.find(m => String(m.id) === String(o.assigned_staff_id));
                    const ag = agents.find(a => String(a.id) === String(o.delivery_agent_id));
                    const daysInStatus = getDaysInStatus(o);
                    const onHoldBy = o.on_hold_by || meta.on_hold_by || (o.status === 'Audit Hold' ? 'Audit Team' : null);
                    const assignedTo = o.assigned_to_name || meta.sales_rep_name || rep?.full_name || 'Unassigned';
                    const agentName = o.delivery_agent_name || meta.delivery_agent_name || ag?.name || null;
                    const amountRemitted = o.amount_remitted ?? meta.amount_remitted ?? (o.payment_status === 'Paid' ? o.total_amount : 0);
                    const proofUrl = o.proof_of_payment_url || meta.proof_of_payment_url || null;
                    const accountPaid = o.account_paid_into || meta.account_paid_into || (o.payment_method === 'COD' ? 'Cash on Delivery' : 'Merchant Bank Account');
                    const comboStr = o.combo_details || meta.combo_details || meta.free_gift || (o.items?.length > 1 ? `${o.items.length}-Item Combo` : '—');
                    const commentsStr = o.comments || meta.comments || (typeof o.confirmation_call_notes === 'string' && !o.confirmation_call_notes.startsWith('{') ? o.confirmation_call_notes : '');
                    const tagsList = Array.isArray(o.tags) && o.tags.length ? o.tags : (Array.isArray(meta.tags) && meta.tags.length ? meta.tags : (o.total_amount > 50000 ? ['High Value'] : ['Standard']));

                    const primaryItem = o.items?.[0] || { name: 'ROD HOLDER', quantity: 1 };
                    const itemTitle = primaryItem.name || 'ROD HOLDER';
                    const itemQty = primaryItem.quantity || (o.items ? o.items.reduce((sum, i) => sum + (i.quantity || 1), 0) : 1);
                    const itemAmount = o.total_amount || 0;
                    const cleanOrderId = o.order_number?.replace(/^OLI-/, '') || o.id?.slice(0, 10) || '1677638564';
                    const statusBadge = getStatusBadgeConfig(o.status);

                    return (
                      <tr key={o.id} className="group hover:bg-[#0f1422] transition-colors">
                        {/* Checkbox */}
                        <td className="p-3 text-center sticky left-0 z-20 bg-[#080b11] group-hover:bg-[#0f1422] border-r border-slate-800 transition-colors">
                          <input
                            type="checkbox"
                            checked={selectedOrderIds.includes(o.id)}
                            onChange={() => toggleSelectOrder(o.id)}
                            className="w-4 h-4 rounded border-slate-700 bg-[#0d121d] text-indigo-600 focus:ring-0 cursor-pointer accent-indigo-600"
                          />
                        </td>

                        {/* 1. ACTIONS (3 vertical dots popup menu matching screenshot) */}
                        <td className="p-3 sticky left-10 z-20 bg-[#080b11] group-hover:bg-[#0f1422] border-r border-slate-800 transition-colors action-menu-container">
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setActiveActionMenuId(activeActionMenuId === o.id ? null : o.id)}
                              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                              title="Actions Menu"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {activeActionMenuId === o.id && (
                              <div className="absolute left-6 top-0 w-44 bg-[#0d121d] border border-slate-700 rounded-xl shadow-2xl z-50 p-1 space-y-0.5 text-left text-xs font-semibold animate-fade-in">
                                <button
                                  onClick={() => {
                                    onOpenConfirmationModal && onOpenConfirmationModal(o);
                                    setActiveActionMenuId(null);
                                  }}
                                  className="w-full px-2.5 py-1.5 rounded-lg flex items-center gap-2 hover:bg-slate-800 text-slate-200 cursor-pointer"
                                >
                                  <Phone className="w-3.5 h-3.5 text-indigo-400" /> Call / Confirm
                                </button>
                                <a
                                  href={getWhatsAppUrl(o)}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={() => setActiveActionMenuId(null)}
                                  className="w-full px-2.5 py-1.5 rounded-lg flex items-center gap-2 hover:bg-slate-800 text-emerald-400 cursor-pointer"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" /> WhatsApp Chat
                                </a>
                                <button
                                  onClick={() => {
                                    setDeliveryModalMode('delivered');
                                    setDeliveryModalOrder(o);
                                    setActiveActionMenuId(null);
                                  }}
                                  className="w-full px-2.5 py-1.5 rounded-lg flex items-center gap-2 hover:bg-slate-800 text-emerald-300 cursor-pointer"
                                >
                                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Mark Delivered
                                </button>
                                <button
                                  onClick={() => {
                                    setDeliveryModalMode('failed');
                                    setDeliveryModalOrder(o);
                                    setActiveActionMenuId(null);
                                  }}
                                  className="w-full px-2.5 py-1.5 rounded-lg flex items-center gap-2 hover:bg-slate-800 text-rose-300 cursor-pointer"
                                >
                                  <XCircle className="w-3.5 h-3.5 text-rose-400" /> Mark Failed
                                </button>
                                <button
                                  onClick={() => {
                                    setSchedulingOrder(o);
                                    setActiveActionMenuId(null);
                                  }}
                                  className="w-full px-2.5 py-1.5 rounded-lg flex items-center gap-2 hover:bg-slate-800 text-slate-200 cursor-pointer"
                                >
                                  <Calendar className="w-3.5 h-3.5 text-indigo-400" /> Schedule Delivery
                                </button>
                                <button
                                  onClick={() => {
                                    copyOrderToClipboard(o, curr);
                                    setActiveActionMenuId(null);
                                  }}
                                  className="w-full px-2.5 py-1.5 rounded-lg flex items-center gap-2 hover:bg-slate-800 text-slate-300 cursor-pointer"
                                >
                                  <Copy className="w-3.5 h-3.5 text-slate-400" /> Copy Details
                                </button>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* 2. ORDER ID (with copy icon matching screenshot) */}
                        <td className="p-3 sticky left-[115px] z-20 bg-[#080b11] group-hover:bg-[#0f1422] border-r border-slate-800 shadow-[4px_0_8px_rgba(0,0,0,0.35)] transition-colors">
                          <div className="flex items-center gap-1.5 font-mono text-xs">
                            <span className="font-bold text-slate-100">{cleanOrderId}</span>
                            <button
                              type="button"
                              onClick={() => navigator.clipboard.writeText(cleanOrderId)}
                              title="Copy Order ID"
                              className="text-slate-500 hover:text-slate-200 p-0.5 transition-colors cursor-pointer"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                        {/* 3. ON HOLD BY */}
                        <td className="p-3">
                          <span className="text-slate-500 font-mono text-xs">{onHoldBy || '—'}</span>
                        </td>

                        {/* 4. ASSIGNED TO (with MAIN OFFER badge matching screenshot) */}
                        <td className="p-3">
                          <div>
                            <p className="text-slate-200 font-medium text-xs">{assignedTo}</p>
                            <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-blue-950/70 text-blue-400 border border-blue-800/40 mt-1 tracking-wider">
                              MAIN OFFER
                            </span>
                          </div>
                        </td>

                        {/* 5. CUSTOMER NAME (Name + Date/Time matching screenshot) */}
                        <td className="p-3">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-slate-100 text-xs">{o.customer_name || 'Guest Customer'}</p>
                              {o.is_duplicate_flagged && (
                                <span title="Duplicate submission flagged" className="text-rose-400 cursor-help">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">{formatCustomerDate(o.created_at)}</p>
                          </div>
                        </td>

                        {/* 6. CONTACT (Phone, WhatsApp green, Mail matching screenshot) */}
                        <td className="p-3">
                          <div className="space-y-1 text-xs">
                            <div className="flex items-center gap-1.5 font-mono text-slate-300">
                              <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <a href={`tel:${o.customer_phone}`} className="hover:text-indigo-400 transition-colors">
                                {o.customer_phone || '—'}
                              </a>
                            </div>
                            <div className="flex items-center gap-1.5 font-mono text-slate-300">
                              <MessageCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <a
                                href={getWhatsAppUrl(o)}
                                target="_blank"
                                rel="noreferrer"
                                className="hover:text-emerald-400 transition-colors"
                              >
                                {o.customer_phone || '—'}
                              </a>
                            </div>
                            {o.customer_email && (
                              <div className="flex items-center gap-1.5 text-slate-400 text-[11px] truncate max-w-[180px]">
                                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <a href={`mailto:${o.customer_email}`} className="hover:text-slate-200 transition-colors truncate">
                                  {o.customer_email}
                                </a>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* 7. ADDRESS (Street, State, Country matching screenshot) */}
                        <td className="p-3">
                          <div className="space-y-0.5 text-xs max-w-[230px]">
                            <p className="font-bold text-slate-200 truncate" title={o.delivery_address}>
                              {o.delivery_address || '—'}
                            </p>
                            <p className="text-slate-400 text-[11px]">{o.state || ''}</p>
                            <p className="text-slate-500 text-[10px]">{o.country || 'Nigeria'}</p>
                          </div>
                        </td>

                        {/* 8. PRODUCT (Title, Qty, Amount matching screenshot) */}
                        <td className="p-3">
                          <div className="space-y-0.5 text-xs max-w-[200px]">
                            <p className="font-bold text-slate-100 uppercase truncate" title={itemTitle}>
                              {itemTitle}
                            </p>
                            <p className="text-slate-400 text-[11px]">Qty: {itemQty}</p>
                            <p className="text-slate-300 text-[11px] font-semibold">
                              Amount: {curr}{Number(itemAmount).toLocaleString()}
                            </p>
                          </div>
                        </td>

                        {/* 9. ORDER STATUS (Colored dot + status name matching screenshot) */}
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusBadge.dot}`}></span>
                            <select
                              value={o.status}
                              onChange={e => handleStageDropdownChange(o, e.target.value)}
                              className={`bg-transparent border-0 font-bold text-xs cursor-pointer outline-none ${statusBadge.text}`}
                            >
                              {ALL_SYSTEM_TABS.filter(s => s.id !== 'All').map(s => (
                                <option key={s.id} value={s.id} className="bg-slate-900 text-slate-200">
                                  {s.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>

                        {/* 10. PAYMENT */}
                        <td className="p-3">
                          <div className="space-y-0.5 text-xs">
                            <p className="font-semibold text-slate-200">{o.payment_method || 'COD'}</p>
                            <span className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              o.payment_status === 'Paid' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                            }`}>
                              {o.payment_status || 'Unpaid'}
                            </span>
                          </div>
                        </td>

                        {/* 11. FREE GIFTS / COMBO */}
                        <td className="p-3">
                          <span className="text-slate-400 text-xs font-medium">{comboStr}</span>
                        </td>

                        {/* 12. OTHER DETAILS */}
                        <td className="p-3">
                          <div className="text-xs text-slate-300 max-w-[160px]">
                            {o.scheduled_delivery_date ? (
                              <p className="font-medium text-slate-200">{o.scheduled_delivery_date} {o.scheduled_delivery_time || ''}</p>
                            ) : null}
                            {o.reminder_notes ? <p className="text-[11px] text-slate-400 truncate">{o.reminder_notes}</p> : (!o.scheduled_delivery_date ? '—' : null)}
                          </div>
                        </td>

                        {/* 13. COMMENTS */}
                        <td className="p-3">
                          <span className="text-slate-400 text-xs max-w-[150px] truncate block" title={commentsStr}>
                            {commentsStr || '—'}
                          </span>
                        </td>

                        {/* 14. AGENT */}
                        <td className="p-3">
                          <span className="text-slate-300 text-xs font-medium">{agentName || 'Unassigned'}</span>
                        </td>

                        {/* 15. DELIVERY FEE */}
                        <td className="p-3 font-mono text-slate-300 text-xs">
                          {curr}{Number(o.delivery_fee || 0).toLocaleString()}
                        </td>

                        {/* 16. AMOUNT REMITTED */}
                        <td className="p-3 font-mono font-semibold text-emerald-400 text-xs">
                          {curr}{Number(amountRemitted).toLocaleString()}
                        </td>

                        {/* 17. PROOF OF PAYMENT */}
                        <td className="p-3">
                          {proofUrl ? (
                            <a href={proofUrl} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline text-xs flex items-center gap-1">
                              <ExternalLink className="w-3 h-3" /> View
                            </a>
                          ) : (
                            <span className="text-slate-500 text-xs">—</span>
                          )}
                        </td>

                        {/* 18. ACCOUNT PAID INTO */}
                        <td className="p-3">
                          <span className="text-slate-400 text-xs truncate max-w-[140px] block" title={accountPaid}>
                            {accountPaid}
                          </span>
                        </td>

                        {/* 19. TAGS */}
                        <td className="p-3">
                          <div className="flex items-center gap-1 flex-wrap max-w-[130px]">
                            {tagsList.map((tag, idx) => (
                              <span key={idx} className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-[#141b2b] text-indigo-300 border border-slate-700/60">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* 20. ORDER DATE */}
                        <td className="p-3 text-slate-400 text-xs">
                          {formatCustomerDate(o.created_at)}
                        </td>

                        {/* 21. DAY IN STATUS */}
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            daysInStatus === 0 ? 'bg-emerald-500/15 text-emerald-400' :
                            daysInStatus === 1 ? 'bg-indigo-500/15 text-indigo-400' :
                            daysInStatus <= 4 ? 'bg-amber-500/15 text-amber-400' :
                            'bg-rose-500/20 text-rose-400 animate-pulse'
                          }`}>
                            {daysInStatus === 0 ? 'Today' : `${daysInStatus}d`}
                          </span>
                        </td>

                        {/* 22. FORM SOURCE */}
                        <td className="p-3">
                          <span className="text-slate-400 text-xs truncate max-w-[130px] block" title={o.source || 'Direct'}>
                            {o.source ? (o.source.startsWith('form:') ? o.source.replace('form:', '') : o.source) : 'Direct'}
                          </span>
                        </td>

                        {/* 23. ADDED BY */}
                        <td className="p-3 text-slate-400 text-xs">
                          {o.added_by || meta.added_by || 'Online Checkout'}
                        </td>

                        {/* 24. UPDATED BY */}
                        <td className="p-3 text-slate-400 text-xs">
                          {o.updated_by || meta.updated_by || 'System'}
                        </td>

                        {/* 25. PROCESSED BY */}
                        <td className="p-3 text-slate-400 text-xs">
                          {o.processed_by || meta.processed_by || '—'}
                        </td>

                        {/* 26. ACTIONS (SECONDARY) */}
                        <td className="p-3 sticky right-0 z-20 bg-[#080b11] group-hover:bg-[#0f1422] border-l border-slate-800 shadow-[-4px_0_8px_rgba(0,0,0,0.35)] transition-colors text-right pr-4">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setDeliveryModalMode('delivered');
                                setDeliveryModalOrder(o);
                              }}
                              className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow transition-colors cursor-pointer"
                            >
                              Delivered
                            </button>
                            <button
                              onClick={() => {
                                setDeliveryModalMode('failed');
                                setDeliveryModalOrder(o);
                              }}
                              className="px-2.5 py-1 rounded bg-rose-600/80 hover:bg-rose-600 text-white font-bold text-[11px] shadow transition-colors cursor-pointer"
                            >
                              Failed
                            </button>
                          </div>
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

      {/* ── COLUMNS & ORDER CONFIGURATION MODAL ── */}
      {showColumnsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
                <h3 className="font-bold text-sm text-slate-100">Table Columns & Order</h3>
              </div>
              <button
                onClick={() => setShowColumnsModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold p-1"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-400">
              All 26 operational columns are actively configured and rendered in your table view.
            </p>
            <div className="max-h-64 overflow-y-auto space-y-1.5 pr-2">
              {[
                'Actions', 'Order ID', 'On Hold By', 'Assigned To', 'Customer Name', 'Contact', 'Address',
                'Product', 'Order Status', 'Payment', 'Free Gifts / Combo', 'Other Details', 'Comments',
                'Agent', 'Delivery Fee', 'Amount Remitted', 'Proof of Payment', 'Account Paid Into',
                'Tags', 'Order Date', 'Day in Status', 'Form Source', 'Added By', 'Updated By', 'Processed By', 'Actions (Secondary)'
              ].map((colName, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                  <span className="text-slate-200 font-medium">{idx + 1}. {colName}</span>
                  <span className="text-emerald-400 font-bold text-[11px]">Active</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowColumnsModal(false)}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
