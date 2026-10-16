import React, { useState } from 'react';
import { Phone, CheckCircle, XCircle, AlertTriangle, Zap, MessageSquare, Copy } from 'lucide-react';
import { copyOrderToClipboard } from '../utils/copyOrder';

export default function ConfirmationCallModal({ order, products = [], onClose, onUpdateStatus, onAddUpsell }) {
  const [notes, setNotes] = useState(order?.confirmation_call_notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addingUpsell, setAddingUpsell] = useState(false);
  const [upsellSuccess, setUpsellSuccess] = useState(false);

  // Identify products suitable for upsell (prefer products not already in customer's order)
  const orderedProductNames = (order?.items || []).map(i => (i.name || '').toLowerCase());
  const candidateProducts = products.filter(p => !orderedProductNames.includes((p.name || '').toLowerCase()));
  const availableUpsellProducts = candidateProducts.length > 0 ? candidateProducts : products;

  const [selectedUpsellId, setSelectedUpsellId] = useState(availableUpsellProducts[0]?.id || '');
  const [upsellPrice, setUpsellPrice] = useState(availableUpsellProducts[0]?.base_price || 5000);

  const existingUpsell = (order?.items || []).find(i => i.is_upsell);

  const handleProductSelect = (prodId) => {
    setSelectedUpsellId(prodId);
    const prod = availableUpsellProducts.find(p => p.id === prodId);
    if (prod) {
      setUpsellPrice(prod.base_price || 5000);
    }
  };

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
    if (!onAddUpsell || availableUpsellProducts.length === 0) return;
    const targetProd = availableUpsellProducts.find(p => p.id === selectedUpsellId) || availableUpsellProducts[0];
    if (!targetProd) return;

    setAddingUpsell(true);
    try {
      await onAddUpsell(order.id, {
        product_id: targetProd.id,
        name: targetProd.name,
        unit_price_at_time_of_order: Number(upsellPrice) || Number(targetProd.base_price) || 0,
        quantity: 1
      }, 'confirmation_call');
      setUpsellSuccess(true);
      setTimeout(() => setUpsellSuccess(false), 3500);
    } catch (err) {
      console.error('Failed to add upsell offer:', err);
    } finally {
      setAddingUpsell(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="glass-panel w-full max-w-lg max-h-[92vh] overflow-y-auto p-4 sm:p-6 rounded-2xl border-slate-700 space-y-4 shadow-2xl animate-pulse-glow">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">Staff Confirmation Desk</span>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Phone className="w-4 h-4 text-indigo-400" /> Confirm Order #{order.order_number}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => copyOrderToClipboard(order)}
              className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white font-bold text-xs flex items-center gap-1 transition-colors border border-indigo-500/30"
            >
              <Copy className="w-3.5 h-3.5" /> Copy Order
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-white font-bold text-lg">&times;</button>
          </div>
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
            <div className="flex items-center gap-2">
              <a href={`tel:${order.customer_phone}`} className="font-bold text-indigo-400 underline flex items-center gap-1">
                <Phone className="w-3 h-3" /> {order.customer_phone}
              </a>
              <a 
                href={`https://wa.me/${(order.customer_whatsapp || order.customer_phone || '').replace(/[^0-9]/g, '').replace(/^0/, '234')}?text=${encodeURIComponent(`Hi ${order.customer_name}, this is from the delivery team regarding your order #${order.order_number} for ₦${Number(order.total_amount || 0).toLocaleString()} (Pay on Delivery). Are you available for delivery?`)}`}
                target="_blank" 
                rel="noreferrer"
                className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 font-semibold text-[11px] flex items-center gap-1 border border-emerald-500/30"
                title="Open WhatsApp chat"
              >
                <MessageSquare className="w-3 h-3" /> WhatsApp
              </a>
            </div>
          </div>
          {order.customer_whatsapp && (
            <div className="flex justify-between items-center">
              <span className="text-slate-400">WhatsApp:</span>
              <span className="font-bold text-emerald-400">{order.customer_whatsapp}</span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Delivery Address:</span>
            <span className="text-slate-300 text-right">{order.delivery_address}, {order.state}</span>
          </div>
          {order.comments && (
            <div className="flex justify-between items-start border-t border-slate-800/80 pt-1.5 text-xs">
              <span className="text-slate-400 shrink-0">Extra Details:</span>
              <span className="text-indigo-300 font-semibold text-right max-w-[280px] break-words">{order.comments}</span>
            </div>
          )}
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
        {existingUpsell ? (
          <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-xl text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <span className="font-bold text-emerald-300">Upsell Attached to Order</span>
                <p className="text-slate-300 text-[11px]">{existingUpsell.name} (+₦{Number(existingUpsell.unit_price_at_time_of_order).toLocaleString()})</p>
              </div>
            </div>
            <span className="badge badge-delivered text-[10px]">Attached</span>
          </div>
        ) : (
          <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-xl text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-300 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 fill-amber-400" /> Phone Call Upsell Offer:
              </span>
              {upsellSuccess && (
                <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> Added to order!
                </span>
              )}
            </div>

            {availableUpsellProducts.length > 0 ? (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <select
                  value={selectedUpsellId}
                  onChange={(e) => handleProductSelect(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-slate-100 flex-1 focus:border-amber-400 outline-none"
                >
                  {availableUpsellProducts.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} (₦{Number(p.base_price || 0).toLocaleString()})
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-slate-400 text-[11px]">₦</span>
                  <input
                    type="number"
                    value={upsellPrice}
                    onChange={(e) => setUpsellPrice(e.target.value)}
                    className="w-20 bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-slate-100 font-bold focus:border-amber-400 outline-none text-right"
                    placeholder="Price"
                  />
                  <button
                    type="button"
                    disabled={addingUpsell}
                    onClick={handleAddUpsellOffer}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-[11px] flex items-center gap-1 transition-colors shrink-0"
                  >
                    {addingUpsell ? 'Adding...' : '+ Add Upsell'}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 italic">No additional catalog products available for staff upsell.</p>
            )}
          </div>
        )}

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
