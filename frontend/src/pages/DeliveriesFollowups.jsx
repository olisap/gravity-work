import React from 'react';
import { Truck, PhoneCall, Calendar, CheckCircle, Clock } from 'lucide-react';
import { AFRICAN_LOCATIONS } from '../data/africanLocations';

export default function DeliveriesFollowups({ type = 'deliveries', orders = [], selectedCountry, onOpenConfirmationModal, onUpdateStatus }) {
  const loc = AFRICAN_LOCATIONS.find(c => c.country === selectedCountry) || AFRICAN_LOCATIONS[0];
  const curr = loc.currency;

  const isDeliveries = type === 'deliveries';
  const title = isDeliveries ? "Today's Scheduled Deliveries" : "Today's Pending Call Followups";
  const subtitle = isDeliveries
    ? "Active dispatches assigned to courier agents for delivery today"
    : "Unconfirmed orders needing phone call verification before dispatch";

  const targetOrders = isDeliveries
    ? orders.filter(o => o.status === 'Scheduled' || o.status === 'Awaiting')
    : orders.filter(o => o.status === 'Pending');

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <h2 className="section-title">
            {isDeliveries ? <Truck className="w-5 h-5 text-indigo-400" /> : <PhoneCall className="w-5 h-5 text-amber-400" />}
            {title}
          </h2>
          <p className="section-subtitle">{subtitle}</p>
        </div>
        <span className="badge badge-scheduled text-xs px-3 py-1 self-start sm:self-auto">
          {targetOrders.length} {targetOrders.length === 1 ? 'item' : 'items'} today
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {targetOrders.length === 0 ? (
          <div className="col-span-full glass p-8 text-center text-slate-500 italic text-sm rounded-2xl">
            No active {isDeliveries ? 'deliveries' : 'followups'} scheduled for today.
          </div>
        ) : (
          targetOrders.map(order => (
            <div key={order.id} className="glass p-5 rounded-2xl border-slate-800 space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <span className="font-mono text-xs font-bold text-indigo-400">#{order.order_number}</span>
                  <span className="font-bold text-slate-100 text-sm">{curr}{order.total_amount?.toLocaleString()}</span>
                </div>

                <div>
                  <h4 className="font-bold text-slate-100 text-sm">{order.customer_name}</h4>
                  <p className="text-xs text-slate-400 font-mono">{order.customer_phone}</p>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{order.delivery_address}, {order.state}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800">
                {isDeliveries ? (
                  <button
                    onClick={() => onUpdateStatus(order.id, 'Delivered')}
                    className="w-full btn-success py-2 text-xs"
                  >
                    <CheckCircle className="w-4 h-4" /> Confirm Cash Collected & Delivered
                  </button>
                ) : (
                  <button
                    onClick={() => onOpenConfirmationModal(order)}
                    className="w-full btn-primary py-2 text-xs"
                  >
                    <PhoneCall className="w-4 h-4" /> Start Confirmation Call
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
