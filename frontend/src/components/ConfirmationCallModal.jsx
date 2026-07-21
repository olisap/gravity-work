import React, { useState } from 'react';
import { Phone, CheckCircle, XCircle, AlertTriangle, Zap, MessageSquare } from 'lucide-react';

export default function ConfirmationCallModal({ order, onClose, onUpdateStatus, onAddUpsell }) {
  const [notes, setNotes] = useState(order?.confirmation_call_notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!order) return null;

  const handleStatusChange = async (newStatus) => {
    setIsSubmitting(true);
    try {
      await onUpdateStatus(order.id, newStatus, notes);
      onClose();
    } catch (err) {
      console.error('Failed to update order status:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddUpsellOffer = async () => {
    if (onAddUpsell) {
      await onAddUpsell(order.id, {
        product_id: 'p4000000-0000-0000-0000-000000000004',
        name: 'Portable Electric USB Juicer Cup',
        unit_price_at_time_of_order: 7000,
        quantity: 1
      }, 'confirmation_call');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-lg p-6 rounded-2xl border-slate-700 space-y-4 shadow-2xl animate-pulse-glow">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">Staff Confirmation Desk</span>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Phone className="w-4 h-4 text-indigo-400" /> Confirm Order #{order.order_number}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white font-bold text-lg">&times;</button>
        </div>

        {/* Duplicate Warning Alert */}
        {order.is_duplicate_flagged && (
          <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <div>
              <strong>Duplicate Order Flagged:</strong> {order.duplicate_reason || 'Same customer phone submitted multiple orders.'}
            </div>
          </div>
        )}

        {/* Customer Details & Call Script Prompt */}
        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Customer Name:</span>
            <span className="font-bold text-slate-200">{order.customer_name}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Phone Number:</span>
            <a href={`tel:${order.customer_phone}`} className="font-bold text-indigo-400 underline flex items-center gap-1">
              <Phone className="w-3 h-3" /> {order.customer_phone}
            </a>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Delivery Address:</span>
            <span className="text-slate-300 text-right">{order.delivery_address}, {order.state}</span>
          </div>
          <div className="flex justify-between items-center border-t border-slate-800 pt-1.5 mt-1 font-bold text-emerald-400">
            <span>Total COD Amount:</span>
            <span>₦{order.total_amount?.toLocaleString()}</span>
          </div>
        </div>

        {/* Suggested Call Script */}
        <div className="p-3 bg-indigo-950/30 border border-indigo-500/30 rounded-xl text-xs space-y-1">
          <span className="font-bold text-indigo-300 flex items-center gap-1">
            <MessageSquare className="w-3.5 h-3.5" /> Call Script Prompt for Staff:
          </span>
          <p className="text-slate-300 italic">
            "Hello {order.customer_name}, calling from Gravity Merchant regarding your order for {order.items?.[0]?.name}. Are you ready to receive this delivery at {order.state} within 24–48 hours?"
          </p>
        </div>

        {/* Staff Upsell Prompt */}
        <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-xl text-xs flex items-center justify-between">
          <div>
            <span className="font-bold text-amber-300 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 fill-amber-400" /> Phone Call Upsell Offer:
            </span>
            <p className="text-slate-300 text-[11px]">Suggest adding Juicer Cup for ₦7,000 extra on call</p>
          </div>
          <button
            onClick={handleAddUpsellOffer}
            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-[11px] flex items-center gap-1 transition-colors"
          >
            + Add Upsell (₦7k)
          </button>
        </div>

        {/* Call Notes Textarea */}
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1">Confirmation Call Notes:</label>
          <textarea
            rows="2"
            placeholder="e.g. Customer confirmed delivery address for tomorrow 2pm..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:border-indigo-500 outline-none"
          ></textarea>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <button
            disabled={isSubmitting}
            onClick={() => handleStatusChange('Cancelled')}
            className="w-1/2 py-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
          >
            <XCircle className="w-4 h-4" /> Cancel Order
          </button>
          <button
            disabled={isSubmitting}
            onClick={() => handleStatusChange('Awaiting')}
            className="w-1/2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all"
          >
            <CheckCircle className="w-4 h-4" /> Confirm Order (Move to Awaiting)
          </button>
        </div>
      </div>
    </div>
  );
}
