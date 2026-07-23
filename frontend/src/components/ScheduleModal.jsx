import React, { useState } from 'react';
import { Calendar, Clock, Truck, FileText, CheckCircle, X } from 'lucide-react';

export default function ScheduleModal({ order, onClose, onConfirmSchedule }) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDateStr = tomorrow.toISOString().split('T')[0];

  const [deliveryDate, setDeliveryDate] = useState(order?.scheduled_delivery_date || defaultDateStr);
  const [deliveryTime, setDeliveryTime] = useState(order?.scheduled_delivery_time || '12:00 PM - 04:00 PM');
  const [reminderNotes, setReminderNotes] = useState(order?.reminder_notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!order) return null;

  const handleConfirm = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onConfirmSchedule(order.id, 'Scheduled', {
        scheduled_delivery_date: deliveryDate,
        scheduled_delivery_time: deliveryTime,
        reminder_notes: reminderNotes
      });
      onClose();
    } catch (err) {
      console.error('Failed to schedule order:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-md p-6 rounded-2xl border-slate-700 space-y-5 shadow-2xl animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <span className="text-[10px] uppercase font-black text-amber-400 tracking-wider flex items-center gap-1">
              <Truck className="w-3.5 h-3.5" /> Dispatch Logistics Scheduler
            </span>
            <h3 className="text-base font-bold text-slate-100">
              Schedule Order #{order.order_number}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Customer Summary */}
        <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-xs space-y-1">
          <div className="flex justify-between font-bold text-slate-200">
            <span>{order.customer_name}</span>
            <span className="text-indigo-400">{order.customer_phone}</span>
          </div>
          <p className="text-slate-400 truncate">{order.delivery_address}, {order.state}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleConfirm} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" /> Promised Delivery Date:
            </label>
            <input
              type="date"
              required
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:border-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-400" /> Delivery Time Slot:
            </label>
            <select
              value={deliveryTime}
              onChange={(e) => setDeliveryTime(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:border-indigo-500 outline-none"
            >
              <option value="09:00 AM - 12:00 PM">Morning (09:00 AM - 12:00 PM)</option>
              <option value="12:00 PM - 04:00 PM">Afternoon (12:00 PM - 04:00 PM)</option>
              <option value="04:00 PM - 07:00 PM">Evening (04:00 PM - 07:00 PM)</option>
              <option value="Anytime (09:00 AM - 06:00 PM)">Anytime During Working Hours</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-400" /> Courier / Reminder Notes:
            </label>
            <textarea
              rows="2"
              placeholder="e.g. Call customer before arriving. Customer prefers delivery after 2pm at office."
              value={reminderNotes}
              onChange={(e) => setReminderNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:border-indigo-500 outline-none"
            ></textarea>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-1/2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30"
            >
              <CheckCircle className="w-4 h-4" /> Save Schedule & Dispatch
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
