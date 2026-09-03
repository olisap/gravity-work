import React, { useState } from 'react';
import { Truck, PhoneCall, CheckCircle, Clock, MapPin, Package } from 'lucide-react';
import { AFRICAN_LOCATIONS } from '../data/africanLocations';

export default function DeliveriesFollowups({
  orders = [],
  selectedCountry,
  onOpenConfirmationModal,
  onUpdateStatus,
}) {
  const loc = AFRICAN_LOCATIONS.find(c => c.country === selectedCountry) || AFRICAN_LOCATIONS[0];
  const curr = loc.currency;

  const [activeSegment, setActiveSegment] = useState('deliveries');
  const [loadingOrderId, setLoadingOrderId] = useState(null);

  const deliveryOrders = orders.filter(o => o.status === 'Scheduled' || o.status === 'Awaiting');
  const followupOrders = orders.filter(o => o.status === 'Pending');

  const isDeliveries = activeSegment === 'deliveries';
  const targetOrders = isDeliveries ? deliveryOrders : followupOrders;

  const handleDeliver = async (orderId) => {
    setLoadingOrderId(orderId);
    try {
      await onUpdateStatus(orderId, 'Delivered');
    } finally {
      setLoadingOrderId(null);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <div>
          <h2 className="section-title">
            <Truck className="w-5 h-5" style={{ color: 'var(--brand)' }} />
            Dispatch & Tasks
          </h2>
          <p className="section-subtitle">
            Today's scheduled deliveries and unconfirmed orders pending a call.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {deliveryOrders.length > 0 && (
            <span className="badge badge-awaiting text-[11px] px-2.5 py-1">
              {deliveryOrders.length} dispatch{deliveryOrders.length !== 1 ? 'es' : ''}
            </span>
          )}
          {followupOrders.length > 0 && (
            <span className="badge badge-pending text-[11px] px-2.5 py-1">
              {followupOrders.length} followup{followupOrders.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Segment toggle */}
      <div className="segment-toggle w-fit">
        <button
          className={`segment-btn${activeSegment === 'deliveries' ? ' active' : ''}`}
          onClick={() => setActiveSegment('deliveries')}
        >
          <Truck className="w-3.5 h-3.5" />
          Scheduled Deliveries
          {deliveryOrders.length > 0 && (
            <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              activeSegment === 'deliveries' ? 'bg-white/20 text-white' : 'bg-slate-700 text-slate-300'
            }`}>{deliveryOrders.length}</span>
          )}
        </button>
        <button
          className={`segment-btn${activeSegment === 'followups' ? ' active' : ''}`}
          onClick={() => setActiveSegment('followups')}
        >
          <PhoneCall className="w-3.5 h-3.5" />
          Pending Call Followups
          {followupOrders.length > 0 && (
            <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              activeSegment === 'followups' ? 'bg-white/20 text-white' : 'bg-slate-700 text-slate-300'
            }`}>{followupOrders.length}</span>
          )}
        </button>
      </div>

      {/* Order cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {targetOrders.length === 0 ? (
          <div className="col-span-full glass p-10 text-center rounded-2xl">
            {isDeliveries
              ? <Truck className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--text-3)' }} />
              : <PhoneCall className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--text-3)' }} />
            }
            <p className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
              {isDeliveries ? 'No scheduled dispatches today.' : 'No pending followup calls.'}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>
              {isDeliveries
                ? 'Orders in Scheduled or Awaiting status will appear here.'
                : 'Pending orders that need confirmation calls appear here.'}
            </p>
          </div>
        ) : (
          targetOrders.map(order => {
            const isLoading = loadingOrderId === order.id;
            return (
              <div
                key={order.id}
                className="glass p-5 rounded-2xl space-y-3 flex flex-col justify-between hover-lift"
              >
                <div className="space-y-2">
                  {/* Header row */}
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold" style={{ color: '#a5b4fc' }}>
                      #{order.order_number}
                    </span>
                    <span className="font-bold text-slate-100 text-sm font-mono">
                      {curr}{order.total_amount?.toLocaleString()}
                    </span>
                  </div>

                  {/* Customer */}
                  <div>
                    <h4 className="font-bold text-slate-100 text-sm">{order.customer_name}</h4>
                    <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--text-2)' }}>
                      {order.customer_phone}
                    </p>
                  </div>

                  {/* Address */}
                  {order.delivery_address && (
                    <div className="flex items-start gap-1.5 text-xs" style={{ color: 'var(--text-2)' }}>
                      <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                      <span className="line-clamp-2">{order.delivery_address}, {order.state}</span>
                    </div>
                  )}

                  {/* Items */}
                  {order.items && order.items.length > 0 && (
                    <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-3)' }}>
                      <Package className="w-3 h-3 shrink-0" />
                      <span>
                        {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                        {order.items[0]?.product_name && ` — ${order.items[0].product_name}`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Action */}
                <div className="pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                  {isDeliveries ? (
                    <button
                      onClick={() => handleDeliver(order.id)}
                      disabled={isLoading}
                      className="w-full btn-success py-2 text-xs"
                    >
                      {isLoading
                        ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Updating…</>
                        : <><CheckCircle className="w-3.5 h-3.5" /> Mark Cash Collected &amp; Delivered</>
                      }
                    </button>
                  ) : (
                    <button
                      onClick={() => onOpenConfirmationModal?.(order)}
                      className="w-full btn-primary py-2 text-xs"
                    >
                      <PhoneCall className="w-3.5 h-3.5" /> Start Confirmation Call
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
