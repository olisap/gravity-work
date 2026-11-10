import { supabase } from '../config/supabase.js';

export async function getDashboardStats(req, res) {
  const { country, state, period } = req.query;
  const effectiveStoreId = req.user?.store_id || req.query.store_id;

  let orders = [];

  // 1. Fetch orders from Supabase if connected
  if (supabase) {
    try {
      let query = supabase.from('orders').select('*');
      if (effectiveStoreId) {
        query = query.eq('store_id', effectiveStoreId);
      }
      if (country && country !== 'All') {
        query = query.eq('country', country);
      }
      if (state && state !== 'AllRegions') {
        query = query.eq('state', state);
      }
      const { data, error } = await query;
      if (!error && data) {
        orders = data;
      }
    } catch (err) {
      console.error('Error querying Supabase dashboard stats:', err);
    }
  }

  // Filter out Drafts and Cancelled for total valid orders
  const validOrders = orders.filter(o => o.status !== 'Draft' && o.status !== 'Cancelled');
  const deliveredOrders = orders.filter(o => o.status === 'Delivered');
  const expectedOrders = orders.filter(o => ['Awaiting', 'Scheduled', 'Pending'].includes(o.status));

  const total_order_amount = validOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
  const delivered_revenue = deliveredOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
  const expected_revenue = expectedOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

  const delivered_count = deliveredOrders.length;
  const scheduled_count = orders.filter(o => o.status === 'Scheduled').length;
  const awaiting_count = orders.filter(o => o.status === 'Awaiting').length;
  const pending_count = orders.filter(o => o.status === 'Pending').length;
  const cancelled_count = orders.filter(o => o.status === 'Cancelled').length;
  const draft_count = orders.filter(o => o.status === 'Draft').length;

  const total_orders_count = validOrders.length;
  const fulfillment_rate = total_orders_count > 0 ? ((delivered_count / total_orders_count) * 100).toFixed(1) : 0;

  const status_breakdown = [
    { status: 'Delivered', count: delivered_count, amount: delivered_revenue, percentage: total_order_amount > 0 ? ((delivered_revenue / total_order_amount) * 100).toFixed(1) : 0 },
    { status: 'Scheduled', count: scheduled_count, amount: orders.filter(o => o.status === 'Scheduled').reduce((s, o) => s + Number(o.total_amount || 0), 0), percentage: 0 },
    { status: 'Awaiting', count: awaiting_count, amount: orders.filter(o => o.status === 'Awaiting').reduce((s, o) => s + Number(o.total_amount || 0), 0), percentage: 0 },
    { status: 'Pending', count: pending_count, amount: orders.filter(o => o.status === 'Pending').reduce((s, o) => s + Number(o.total_amount || 0), 0), percentage: 0 },
    { status: 'Cancelled', count: cancelled_count, amount: 0, percentage: 0 },
    { status: 'Draft', count: draft_count, amount: orders.filter(o => o.status === 'Draft').reduce((s, o) => s + Number(o.total_amount || 0), 0), percentage: 0 }
  ];

  res.json({
    total_order_amount,
    total_orders_count,
    delivered_revenue,
    expected_revenue,
    fulfillment_rate,
    delivered_count,
    scheduled_count,
    awaiting_count,
    pending_count,
    cancelled_count,
    draft_count,
    status_breakdown
  });
}
