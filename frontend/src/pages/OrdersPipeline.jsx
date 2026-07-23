import React, { useState } from 'react';
import { LayoutGrid, List, Phone, CheckCircle, ArrowRight, AlertTriangle, Truck, Filter, Copy, MessageCircle, Calendar, Clock, ChevronDown } from 'lucide-react';
import { AFRICAN_LOCATIONS } from '../data/africanLocations';
import { copyOrderToClipboard } from '../utils/copyOrder';
import ScheduleModal from '../components/ScheduleModal';

const PIPELINE_ORDER = ['Pending', 'Awaiting', 'Scheduled', 'Delivered', 'Cancelled', 'Draft'];
const BADGE_CLASS = {
  Draft:     'badge-draft',
  Pending:   'badge-pending',
  Awaiting:  'badge-awaiting',
  Scheduled: 'badge-scheduled',
  Delivered: 'badge-delivered',
  Cancelled: 'badge-cancelled',
};

export default function OrdersPipeline({ orders = [], selectedCountry, selectedState, onOpenConfirmationModal, onUpdateStatus }) {
  const [viewMode, setViewMode] = useState('kanban');
  const [filterStatus, setFilterStatus] = useState('All');
  const [schedulingOrder, setSchedulingOrder] = useState(null);

  const loc  = AFRICAN_LOCATIONS.find(c => c.country === selectedCountry) || AFRICAN_LOCATIONS[0];
  const curr = loc.currency;

  const filtered = orders.filter(o => {
    if (o.country && o.country !== selectedCountry) return false;
    if (selectedState && selectedState !== 'All Regions' && o.state !== selectedState) return false;
    if (filterStatus !== 'All' && o.status !== filterStatus) return false;
    return true;
  });

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
    } else {
      onUpdateStatus(order.id, targetStage);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">

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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
        <div>
          <h2 className="section-title">
            <Truck className="w-5 h-5 text-indigo-400" /> COD Orders & Operations Pipeline
          </h2>
          <p className="section-subtitle">Form Draft → Pending Confirmation → Awaiting Dispatch → Scheduled → Delivered (Revenue)</p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 glass px-3 py-1.5 rounded-xl text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer text-xs font-medium"
            >
              <option value="All" className="bg-slate-900">All Statuses</option>
              {PIPELINE_ORDER.map(s => <option key={s} value={s} className="bg-slate-900">{s}</option>)}
            </select>
          </div>

          {/* View Toggle */}
          <div className="flex glass p-1 rounded-xl gap-1">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'kanban' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              title="Kanban view"
            ><LayoutGrid className="w-4 h-4" /></button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'table' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              title="Table view"
            ><List className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      {/* ── KANBAN ── */}
      {viewMode === 'kanban' && (
        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-none -mx-1 px-1 snap-x">
          {PIPELINE_ORDER.map(status => {
            const cols = filtered.filter(o => o.status === status);
            return (
              <div key={status} className="glass rounded-2xl flex flex-col shrink-0 w-72 md:w-64 snap-start">
                {/* Column header */}
                <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-800/60">
                  <span className={`badge ${BADGE_CLASS[status]}`}>{status}</span>
                  <span className="text-[11px] font-bold text-slate-500 bg-slate-800/80 px-2 py-0.5 rounded-full">
                    {cols.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="flex flex-col gap-2.5 p-2 overflow-y-auto scrollbar-none max-h-[70vh]">
                  {cols.length === 0
                    ? <p className="text-[11px] text-slate-600 text-center py-8 italic">No orders in this stage</p>
                    : cols.map(order => (
                      <div key={order.id} className="bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 rounded-xl p-3 space-y-2.5 transition-all shadow-md group">

                        {order.is_duplicate_flagged && (
                          <div className="flex items-center gap-1 text-[10px] font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded-md">
                            <AlertTriangle className="w-3 h-3" /> Duplicate Flag
                          </div>
                        )}

                        <div className="flex justify-between items-center gap-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[11px] font-bold text-indigo-400">#{order.order_number}</span>
                            <button
                              type="button"
                              onClick={() => copyOrderToClipboard(order, curr)}
                              title="Copy order details"
                              className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white hover:bg-indigo-600 transition-colors"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                          <span className="text-xs font-extrabold text-emerald-400">{curr}{order.total_amount?.toLocaleString()}</span>
                        </div>

                        <div>
                          <p className="text-xs font-bold text-slate-100 truncate">{order.customer_name}</p>
                          <p className="text-[10px] text-slate-400 truncate">{order.customer_phone}</p>
                          <p className="text-[10px] text-slate-500 truncate mt-0.5">{order.delivery_address || 'Address pending'}, {order.state}</p>
                        </div>

                        <p className="text-[10px] text-slate-300 bg-slate-950/80 px-2 py-1 rounded-lg border border-slate-800/80 truncate">
                          {order.items?.[0]?.name || 'Product Item'}
                          {order.items?.length > 1 && ` +${order.items.length - 1} more`}
                        </p>

                        {/* Scheduled Delivery Date Badge */}
                        {order.scheduled_delivery_date && (
                          <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-300 font-medium flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-amber-400" /> Delivery: {order.scheduled_delivery_date}
                            </span>
                            <span className="text-[9px] text-amber-400/80">{order.scheduled_delivery_time || ''}</span>
                          </div>
                        )}

                        {/* Direct Call & WhatsApp Quick Conversion Bar */}
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

                        {/* Stage Selector Dropdown */}
                        <div className="pt-1">
                          <div className="relative">
                            <select
                              value={order.status}
                              onChange={(e) => handleStageDropdownChange(order, e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-[10px] font-bold text-slate-200 cursor-pointer outline-none focus:border-indigo-500 appearance-none pr-6"
                            >
                              {PIPELINE_ORDER.map(s => (
                                <option key={s} value={s} className="bg-slate-900 text-slate-200">
                                  Move to: {s}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="w-3 h-3 text-slate-500 absolute right-2 top-2.5 pointer-events-none" />
                          </div>
                        </div>

                        {/* Recommended Quick Actions */}
                        <div className="space-y-1">
                          {status === 'Pending' && (
                            <button onClick={() => onOpenConfirmationModal(order)} className="btn-primary w-full py-1 text-[10px]">
                              <Phone className="w-3 h-3" /> Call Script Desk
                            </button>
                          )}
                          {status === 'Awaiting' && (
                            <button onClick={() => setSchedulingOrder(order)} className="btn-primary w-full py-1 text-[10px]">
                              <Calendar className="w-3 h-3" /> Schedule & Dispatch
                            </button>
                          )}
                          {status === 'Scheduled' && (
                            <button onClick={() => onUpdateStatus(order.id, 'Delivered')} className="btn-success w-full py-1 text-[10px]">
                              <CheckCircle className="w-3 h-3" /> Mark Delivered
                            </button>
                          )}
                        </div>

                      </div>
                    ))
                  }
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── TABLE VIEW ── */}
      {viewMode === 'table' && (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order Ref</th>
                  <th>Customer</th>
                  <th>Location</th>
                  <th>Item</th>
                  <th>Amount</th>
                  <th>Stage</th>
                  <th>Quick Contact</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0
                  ? <tr><td colSpan={8} className="text-center py-10 text-slate-500 italic text-xs">No orders match the current filters.</td></tr>
                  : filtered.map(o => (
                    <tr key={o.id}>
                      <td className="font-mono font-bold text-indigo-400 flex items-center gap-1.5">
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
                      <td>
                        <p className="font-semibold text-slate-200">{o.customer_name}</p>
                        <p className="text-[10px] text-slate-500">{o.customer_phone}</p>
                      </td>
                      <td className="text-slate-400 text-xs">{o.state}, {o.country}</td>
                      <td className="text-slate-400 text-xs max-w-[160px] truncate">{o.items?.[0]?.name || '—'}</td>
                      <td className="font-bold text-emerald-400 text-xs">{curr}{o.total_amount?.toLocaleString()}</td>
                      <td>
                        <select
                          value={o.status}
                          onChange={(e) => handleStageDropdownChange(o, e.target.value)}
                          className="bg-slate-900 border border-slate-700 text-slate-200 text-xs font-bold rounded-lg p-1 cursor-pointer outline-none"
                        >
                          {PIPELINE_ORDER.map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <a
                            href={`tel:${o.customer_phone}`}
                            className="p-1.5 rounded-lg bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600 hover:text-white transition-colors"
                            title="Call customer"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                          <a
                            href={getWhatsAppUrl(o)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600 hover:text-white transition-colors"
                            title="WhatsApp quick chat"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </td>
                      <td className="text-right space-x-1.5">
                        <button
                          onClick={() => copyOrderToClipboard(o, curr)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold inline-flex items-center gap-1 border border-slate-700"
                        >
                          <Copy className="w-3 h-3 text-indigo-400" /> Copy
                        </button>
                        {o.status === 'Pending' && (
                          <button onClick={() => onOpenConfirmationModal(o)} className="btn-primary py-1.5 px-3 text-[11px]">
                            <Phone className="w-3 h-3" /> Call Script
                          </button>
                        )}
                        {o.status === 'Awaiting' && (
                          <button onClick={() => setSchedulingOrder(o)} className="btn-primary py-1.5 px-3 text-[11px]">
                            <Calendar className="w-3 h-3" /> Schedule
                          </button>
                        )}
                        {o.status === 'Scheduled' && (
                          <button onClick={() => onUpdateStatus(o.id, 'Delivered')} className="btn-success py-1.5 px-3 text-[11px]">
                            Delivered
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
