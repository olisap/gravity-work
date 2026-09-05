import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, X, Truck, Package, DollarSign, Calendar, User, Plus, Trash2 } from 'lucide-react';
import { AFRICAN_LOCATIONS } from '../data/africanLocations';

export default function MarkDeliveredModal({
  order,
  isOpen,
  mode = 'delivered', // 'delivered' or 'failed'
  agents = [],
  teamMembers = [],
  currency = '₦',
  onClose,
  onSubmit
}) {
  if (!isOpen || !order) return null;

  const orderState = order.state || '';
  
  // Filter agents matching the order's state if available, or show all active agents
  const stateAgents = agents.filter(a => {
    if (!a.coverage_states) return true;
    if (Array.isArray(a.coverage_states)) {
      return a.coverage_states.length === 0 || a.coverage_states.some(s => s.toLowerCase() === orderState.toLowerCase());
    }
    return String(a.coverage_states).toLowerCase().includes(orderState.toLowerCase());
  });

  const availableAgents = stateAgents.length > 0 ? stateAgents : agents;

  // Existing notes parser
  let existingMeta = {};
  if (order.confirmation_call_notes && typeof order.confirmation_call_notes === 'string' && order.confirmation_call_notes.startsWith('{')) {
    try { existingMeta = JSON.parse(order.confirmation_call_notes); } catch (e) {}
  }

  const [selectedAgentId, setSelectedAgentId] = useState(existingMeta.delivery_agent_id || order.delivery_agent_id || '');
  const [selectedPackage, setSelectedPackage] = useState(existingMeta.delivered_package || order.items?.[0]?.name || 'Standard Package');
  const [amountPaid, setAmountPaid] = useState(mode === 'delivered' ? String(order.total_amount || 0) : '0');
  const [deliveryFee, setDeliveryFee] = useState(String(order.delivery_fee || 0));
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
  const [salesRepId, setSalesRepId] = useState(existingMeta.sales_rep_id || order.assigned_staff_id || '');
  const [failureReason, setFailureReason] = useState(existingMeta.failure_reason || 'Customer not reachable / phone switched off');
  const [expenses, setExpenses] = useState(existingMeta.expenses || []);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expTitle, setExpTitle] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-fill delivery fee if agent is selected
  useEffect(() => {
    if (selectedAgentId) {
      const ag = agents.find(a => String(a.id) === String(selectedAgentId));
      if (ag) {
        if (mode === 'delivered' && ag.successful_delivery_fee) {
          setDeliveryFee(String(ag.successful_delivery_fee));
        } else if (mode === 'failed' && ag.failed_delivery_fee) {
          setDeliveryFee(String(ag.failed_delivery_fee));
        }
      }
    }
  }, [selectedAgentId, mode, agents]);

  const handleAddExpense = (e) => {
    e.preventDefault();
    if (!expTitle || !expAmount) return;
    setExpenses(prev => [...prev, { title: expTitle, amount: Number(expAmount) }]);
    setExpTitle('');
    setExpAmount('');
    setShowExpenseForm(false);
  };

  const handleRemoveExpense = (idx) => {
    setExpenses(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const ag = agents.find(a => String(a.id) === String(selectedAgentId));
    const rep = teamMembers.find(m => String(m.id) === String(salesRepId));

    const meta = {
      ...existingMeta,
      delivery_agent_id: selectedAgentId || null,
      delivery_agent_name: ag?.name || null,
      delivery_agent_phone: ag?.phone || null,
      delivered_package: selectedPackage,
      amount_paid: Number(amountPaid) || 0,
      delivery_fee: Number(deliveryFee) || 0,
      delivery_date: deliveryDate,
      sales_rep_id: salesRepId || null,
      sales_rep_name: rep?.full_name || rep?.name || null,
      expenses: expenses,
      failure_reason: mode === 'failed' ? failureReason : null,
      recorded_at: new Date().toISOString()
    };

    const targetStatus = mode === 'delivered' ? 'Delivered' : 'Failed';

    try {
      await onSubmit(order.id, targetStatus, JSON.stringify(meta), {
        scheduled_delivery_date: deliveryDate,
        assigned_staff_id: salesRepId || null
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDelivered = mode === 'delivered';

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#0f172a] border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-fade-in my-8">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#090d16]">
          <div className="flex items-center gap-2.5">
            {isDelivered ? (
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <CheckCircle className="w-5 h-5" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
                <XCircle className="w-5 h-5" />
              </div>
            )}
            <div>
              <h3 className="text-base font-bold text-slate-100">
                {isDelivered ? 'Mark Order as Delivered' : 'Mark Order as Failed Delivery'}
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Order #{order.order_number} &bull; {order.customer_name} ({order.state})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          
          {/* Agent Selector */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">
              Select from {orderState || 'Coverage'} agents *
            </label>
            <select
              value={selectedAgentId}
              onChange={e => setSelectedAgentId(e.target.value)}
              required
              className="w-full bg-[#1e293b] border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-indigo-500 cursor-pointer text-xs"
            >
              <option value="">Select an agent</option>
              {availableAgents.map(a => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.fleet_type || 'Rider'}) &bull; {a.phone || 'No phone'}
                </option>
              ))}
              {availableAgents.length === 0 && (
                <option value="unassigned" disabled>No agents found for this region</option>
              )}
            </select>
          </div>

          {/* Package Delivered */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">
              Select Package {isDelivered ? 'Delivered' : 'Attempted'} *
            </label>
            <select
              value={selectedPackage}
              onChange={e => setSelectedPackage(e.target.value)}
              required
              className="w-full bg-[#1e293b] border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-indigo-500 cursor-pointer text-xs"
            >
              {order.items && order.items.length > 0 ? (
                order.items.map((item, idx) => (
                  <option key={idx} value={item.name}>
                    {item.name} (Qty: {item.quantity || 1})
                  </option>
                ))
              ) : (
                <option value="Main Product Item">Standard Package</option>
              )}
            </select>
          </div>

          {/* Failure Reason if Mode is Failed */}
          {!isDelivered && (
            <div>
              <label className="block text-rose-400 font-semibold mb-1.5">
                Failure / Non-Delivery Reason *
              </label>
              <select
                value={failureReason}
                onChange={e => setFailureReason(e.target.value)}
                required
                className="w-full bg-[#1e293b] border border-rose-500/40 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-rose-500 text-xs"
              >
                <option value="Customer not reachable / phone switched off">Customer not reachable / phone switched off</option>
                <option value="Customer refused package / cancelled at doorstep">Customer refused package / cancelled at doorstep</option>
                <option value="Customer requested date postponement">Customer requested date postponement</option>
                <option value="Customer travelled / out of town">Customer travelled / out of town</option>
                <option value="Fake address / invalid phone number">Fake address / invalid phone number</option>
                <option value="Incomplete cash / payment declined">Incomplete cash / payment declined</option>
                <option value="Agent couldn't reach location / security barrier">Agent couldn't reach location / security barrier</option>
              </select>
            </div>
          )}

          {/* Total Amount Paid */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">
              Total Amount Paid By Customer {isDelivered ? '*' : '(Cash Collected)'}
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold">{currency}</span>
              <input
                type="number"
                value={amountPaid}
                onChange={e => setAmountPaid(e.target.value)}
                required={isDelivered}
                className="w-full bg-[#1e293b] border border-slate-700 rounded-xl pl-8 pr-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-indigo-500 text-xs font-semibold"
                placeholder="0"
              />
            </div>
          </div>

          {/* Delivery Fee & Date Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">
                Delivery fee (Rider payout)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold">{currency}</span>
                <input
                  type="number"
                  value={deliveryFee}
                  onChange={e => setDeliveryFee(e.target.value)}
                  className="w-full bg-[#1e293b] border border-slate-700 rounded-xl pl-8 pr-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-indigo-500 text-xs font-semibold"
                  placeholder="0"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">
                Delivery date
              </label>
              <input
                type="date"
                value={deliveryDate}
                onChange={e => setDeliveryDate(e.target.value)}
                required
                className="w-full bg-[#1e293b] border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-indigo-500 text-xs"
              />
            </div>
          </div>

          {/* Sold by / Confirmation Closer */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">
              Sold by / Assigned Sales Rep
            </label>
            <select
              value={salesRepId}
              onChange={e => setSalesRepId(e.target.value)}
              className="w-full bg-[#1e293b] border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-indigo-500 cursor-pointer text-xs"
            >
              <option value="">No sales reps assigned</option>
              {teamMembers.map(m => (
                <option key={m.id} value={m.id}>
                  {m.full_name || m.name || m.email} ({m.role || 'Staff'})
                </option>
              ))}
            </select>
          </div>

          {/* Expenses Section */}
          <div className="pt-2 border-t border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-400">Additional Expenses</span>
              <button
                type="button"
                onClick={() => setShowExpenseForm(!showExpenseForm)}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-2.5 py-1 rounded-lg transition-colors"
              >
                <Plus className="w-3 h-3" /> Add expenses
              </button>
            </div>

            {showExpenseForm && (
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex gap-2 items-center">
                <input
                  type="text"
                  placeholder="e.g. Waybill / Toll"
                  value={expTitle}
                  onChange={e => setExpTitle(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100"
                />
                <input
                  type="number"
                  placeholder="Amount"
                  value={expAmount}
                  onChange={e => setExpAmount(e.target.value)}
                  className="w-24 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100"
                />
                <button
                  type="button"
                  onClick={handleAddExpense}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs"
                >
                  Add
                </button>
              </div>
            )}

            {expenses.length > 0 && (
              <div className="space-y-1 pt-1">
                {expenses.map((exp, i) => (
                  <div key={i} className="flex justify-between items-center bg-slate-900/60 px-3 py-1.5 rounded-lg text-[11px]">
                    <span className="text-slate-300">{exp.title}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-amber-400">{currency}{Number(exp.amount).toLocaleString()}</span>
                      <button type="button" onClick={() => handleRemoveExpense(i)} className="text-rose-400 hover:text-rose-300">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-5 py-2 rounded-xl font-bold text-xs text-white transition-all shadow-lg flex items-center gap-1.5 ${
                isDelivered
                  ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30'
                  : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
              }`}
            >
              {isSubmitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
