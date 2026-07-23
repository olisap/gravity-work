import crypto from 'crypto';
import { supabase } from '../config/supabase.js';
import { InventoryService } from '../services/inventoryService.js';
import { NotificationService } from '../services/notificationService.js';

function isValidUUID(str) {
  if (!str) return false;
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(str);
}

function prepareOrderPayloadForSupabase(order) {
  const { items, ...rest } = order;
  return {
    ...rest,
    id: isValidUUID(rest.id) ? rest.id : crypto.randomUUID(),
    upsell_items: items || []
  };
}

function formatOrderFromSupabase(order) {
  if (!order) return order;
  return {
    ...order,
    items: order.items || order.upsell_items || []
  };
}

// In-memory fallback mock orders database if Supabase isn't connected
let mockOrders = [
  {
    id: 'o1000000-0000-0000-0000-000000000001',
    order_number: 'OLI-10001',
    customer_name: 'Emeka Nwosu',
    customer_phone: '+2348039988776',
    customer_email: 'emeka@gmail.com',
    delivery_address: '14 Admiralty Way, Lekki Phase 1',
    country: 'Nigeria',
    state: 'Lagos',
    subtotal: 18500,
    delivery_fee: 2000,
    total_amount: 20500,
    status: 'Delivered',
    payment_method: 'COD',
    payment_status: 'Paid',
    source: 'form:f1',
    items: [{ product_id: 'p1', name: 'Insulated Stainless Steel Lunch Box', quantity: 1, unit_price_at_time_of_order: 18500 }],
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    delivered_at: new Date(Date.now() - 1 * 86400000).toISOString()
  },
  {
    id: 'o2000000-0000-0000-0000-000000000002',
    order_number: 'OLI-10002',
    customer_name: 'Fatima Abubakar',
    customer_phone: '+2348021122334',
    customer_email: 'fatima@yahoo.com',
    delivery_address: 'Plot 402 Maitama District',
    country: 'Nigeria',
    state: 'Abuja (FCT)',
    subtotal: 28000,
    delivery_fee: 2500,
    total_amount: 30500,
    status: 'Delivered',
    payment_method: 'COD',
    payment_status: 'Paid',
    source: 'form:f2',
    items: [{ product_id: 'p2', name: 'Cordless Rechargeable Spin Mop', quantity: 1, unit_price_at_time_of_order: 28000 }],
    created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
    delivered_at: new Date(Date.now() - 2 * 86400000).toISOString()
  },
  {
    id: 'o3000000-0000-0000-0000-000000000003',
    order_number: 'OLI-10003',
    customer_name: 'Kwame Mensah',
    customer_phone: '+233244123456',
    customer_email: 'kwame@ghana.com',
    delivery_address: '22 Ring Road Central, Accra',
    country: 'Ghana',
    state: 'Greater Accra',
    subtotal: 22500,
    delivery_fee: 3000,
    total_amount: 25500,
    status: 'Scheduled',
    payment_method: 'COD',
    payment_status: 'Unpaid',
    source: 'form:f1',
    items: [{ product_id: 'p3', name: 'Smart Blood Pressure Monitor', quantity: 1, unit_price_at_time_of_order: 22500 }],
    created_at: new Date(Date.now() - 1 * 86400000).toISOString()
  },
  {
    id: 'o4000000-0000-0000-0000-000000000004',
    order_number: 'OLI-10004',
    customer_name: 'Yetunde Sowande',
    customer_phone: '+2348056677889',
    customer_email: 'yetunde@gmail.com',
    delivery_address: '5 Ring Road, Ibadan',
    country: 'Nigeria',
    state: 'Oyo',
    subtotal: 18500,
    delivery_fee: 2000,
    total_amount: 20500,
    status: 'Awaiting',
    payment_method: 'COD',
    payment_status: 'Unpaid',
    source: 'form:f1',
    items: [{ product_id: 'p1', name: 'Insulated Stainless Steel Lunch Box', quantity: 1, unit_price_at_time_of_order: 18500 }],
    created_at: new Date(Date.now() - 6 * 3600000).toISOString()
  },
  {
    id: 'o5000000-0000-0000-0000-000000000005',
    order_number: 'OLI-10005',
    customer_name: 'Njabulo Dlamini',
    customer_phone: '+27821234567',
    customer_email: 'njabulo@joburg.co.za',
    delivery_address: '88 Sandton Drive, Johannesburg',
    country: 'South Africa',
    state: 'Gauteng',
    subtotal: 28000,
    delivery_fee: 4000,
    total_amount: 32000,
    status: 'Pending',
    payment_method: 'COD',
    payment_status: 'Unpaid',
    source: 'form:f2',
    items: [{ product_id: 'p2', name: 'Cordless Rechargeable Spin Mop', quantity: 1, unit_price_at_time_of_order: 28000 }],
    created_at: new Date(Date.now() - 2 * 3600000).toISOString()
  },
  {
    id: 'o6000000-0000-0000-0000-000000000006',
    order_number: 'OLI-10006',
    customer_name: 'Kofi Annan',
    customer_phone: '+2348109988112',
    customer_email: 'kofi@drafts.com',
    delivery_address: 'Unfinished step address',
    country: 'Nigeria',
    state: 'Lagos',
    subtotal: 18500,
    delivery_fee: 0,
    total_amount: 18500,
    status: 'Draft',
    payment_method: 'COD',
    payment_status: 'Unpaid',
    resume_token: 'RESUME-DRAFT-10006',
    form_step_reached: 2,
    source: 'form:f1',
    items: [{ product_id: 'p1', name: 'Insulated Stainless Steel Lunch Box', quantity: 1, unit_price_at_time_of_order: 18500 }],
    created_at: new Date(Date.now() - 25 * 60000).toISOString(),
    last_activity_at: new Date(Date.now() - 25 * 60000).toISOString()
  }
];

/**
 * Phone Sanitization for Nigerian and International Phone Numbers
 */
function normalizePhone(phone) {
  if (!phone) return '';
  let cleaned = phone.replace(/\s+/g, '').replace(/-/g, '');
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    return '+234' + cleaned.substring(1);
  }
  if (cleaned.startsWith('234') && cleaned.length === 13) {
    return '+' + cleaned;
  }
  if (!cleaned.startsWith('+')) {
    return '+' + cleaned;
  }
  return cleaned;
}

export async function getOrders(req, res) {
  const { status, state, country, search, store_id } = req.query;

  if (supabase) {
    let query = supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (store_id) query = query.eq('store_id', store_id);
    if (status) query = query.eq('status', status);
    if (state) query = query.eq('state', state);
    if (country) query = query.eq('country', country);
    
    const { data, error } = await query;
    if (!error && data) {
      const formatted = data.map(formatOrderFromSupabase);
      return res.json(formatted);
    }
  }

  let filtered = [...mockOrders];

  // If user belongs to a custom new store, only return custom orders for that store
  if (store_id && store_id !== '00000000-0000-0000-0000-000000000001' && !store_id.startsWith('a100') && !store_id.startsWith('u100')) {
    filtered = filtered.filter(o => o.store_id === store_id);
  }

  if (status) filtered = filtered.filter(o => o.status === status);
  if (state) filtered = filtered.filter(o => o.state === state);
  if (country) filtered = filtered.filter(o => o.country === country);
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(o => 
      o.customer_name?.toLowerCase().includes(s) || 
      o.customer_phone?.includes(s) || 
      o.order_number?.toLowerCase().includes(s)
    );
  }

  res.json(filtered);
}

export async function createOrUpdateDraftOrder(req, res) {
  const {
    id,
    resume_token,
    customer_name,
    customer_phone,
    customer_email,
    delivery_address,
    country,
    state,
    items,
    form_step_reached,
    is_final_submit,
    upsell_source,
    delivery_fee,
    notification_email,
    store_id
  } = req.body;

  const normalizedPhone = normalizePhone(customer_phone);

  // Check duplicate submission anti-spam
  let isDuplicate = false;
  let duplicateReason = '';
  if (normalizedPhone) {
    const recentDuplicate = mockOrders.find(o => 
      o.customer_phone === normalizedPhone && 
      o.id !== id && 
      o.status !== 'Cancelled' && 
      (Date.now() - new Date(o.created_at).getTime()) < 3600000
    );
    if (recentDuplicate) {
      isDuplicate = true;
      duplicateReason = `Duplicate submission detected for phone ${normalizedPhone} within 1 hour (Order #${recentDuplicate.order_number})`;
    }
  }

  let orderIndex = mockOrders.findIndex(o => o.id === id || (resume_token && o.resume_token === resume_token));
  const subtotal = items ? items.reduce((acc, i) => acc + (i.unit_price_at_time_of_order * i.quantity), 0) : 0;
  const fee = delivery_fee !== undefined ? Number(delivery_fee) : 0;

  let finalOrder = null;

  if (orderIndex >= 0) {
    // Update existing draft
    const existing = mockOrders[orderIndex];
    finalOrder = {
      ...existing,
      store_id: store_id || existing.store_id || null,
      customer_name: customer_name || existing.customer_name,
      customer_phone: normalizedPhone || existing.customer_phone,
      customer_email: customer_email || existing.customer_email,
      delivery_address: delivery_address || existing.delivery_address,
      country: country || existing.country || 'Nigeria',
      state: state || existing.state || 'Lagos',
      items: items || existing.items,
      subtotal,
      delivery_fee: fee,
      total_amount: subtotal + fee,
      form_step_reached: form_step_reached || existing.form_step_reached,
      last_activity_at: new Date().toISOString(),
      is_duplicate_flagged: isDuplicate,
      duplicate_reason: duplicateReason,
      status: is_final_submit ? 'Pending' : (existing.status === 'Draft' ? 'Draft' : existing.status)
    };

    if (is_final_submit) {
      finalOrder.resume_token = null; // Clear resume token on final submit
    }

    mockOrders[orderIndex] = finalOrder;
  } else {
    // Create new Order / Draft
    const newOrderNumber = `OLI-${10000 + mockOrders.length + 1}`;
    finalOrder = {
      id: isValidUUID(id) ? id : crypto.randomUUID(),
      store_id: store_id || null,
      order_number: newOrderNumber,
      customer_name: customer_name || 'Guest Customer',
      customer_phone: normalizedPhone,
      customer_email: customer_email || '',
      delivery_address: delivery_address || '',
      country: country || 'Nigeria',
      state: state || 'Lagos',
      items: items || [],
      subtotal,
      delivery_fee: fee,
      total_amount: subtotal + fee,
      status: is_final_submit ? 'Pending' : 'Draft',
      payment_method: 'COD',
      payment_status: 'Unpaid',
      source: 'form:embedded',
      resume_token: is_final_submit ? null : `RESUME-${Date.now()}`,
      form_step_reached: form_step_reached || 1,
      is_duplicate_flagged: isDuplicate,
      duplicate_reason: duplicateReason,
      created_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString()
    };

    mockOrders.unshift(finalOrder);
  }

  // Persist to Supabase if connected
  if (supabase) {
    try {
      const dbPayload = prepareOrderPayloadForSupabase(finalOrder);
      const { data: dbData, error: dbErr } = await supabase.from('orders').upsert([dbPayload]).select();
      if (dbErr) {
        console.error('Failed to upsert order to Supabase:', dbErr);
      } else if (dbData && dbData[0]) {
        console.log('✅ Order successfully persisted to Supabase:', dbData[0].order_number);
        finalOrder.id = dbData[0].id;
      }
    } catch (dbErr) {
      console.error('Failed to upsert order to Supabase:', dbErr);
    }
  }

  // Trigger Notifications on Final Order Submit
  if (is_final_submit) {
    const targetNotificationEmail = notification_email || 'olisapaul1@gmail.com';
    NotificationService.sendOrderFinalizedNotifications(finalOrder, targetNotificationEmail).catch(err => {
      console.error('Failed to send order finalized notifications:', err);
    });
  }

  res.status(orderIndex >= 0 ? 200 : 201).json(finalOrder);
}

export async function updateOrderStatus(req, res) {
  const { id } = req.params;
  const { status, confirmation_notes, assigned_staff_id } = req.body;

  const validStatuses = ['Draft', 'Pending', 'Awaiting', 'Scheduled', 'Delivered', 'Cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid order status' });
  }

  let order = mockOrders.find(o => o.id === id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  const previousStatus = order.status;
  
  // Enforce legal status transitions
  if (previousStatus === 'Delivered' && status !== 'Delivered') {
    return res.status(400).json({ error: 'Delivered orders cannot change status directly. Process a Return instead.' });
  }

  order.status = status;
  if (confirmation_notes !== undefined) order.confirmation_call_notes = confirmation_notes;
  if (assigned_staff_id) order.assigned_staff_id = assigned_staff_id;

  if (status === 'Delivered') {
    order.delivered_at = new Date().toISOString();
    order.payment_status = 'Paid'; // COD payment collected upon delivery
    
    // Automatically trigger delivery receipt notification
    NotificationService.send({
      templateName: 'order_delivered_receipt',
      recipient: order.customer_phone,
      channel: 'sms',
      variables: {
        customer_name: order.customer_name,
        order_number: order.order_number,
        total_amount: order.total_amount
      }
    });
  }

  // Stock Ledger Handling (Deduct on Scheduled, restore on Cancel)
  await InventoryService.handleOrderStatusChange(order, previousStatus, status);

  res.json(order);
}

export async function addUpsellToOrder(req, res) {
  const { id } = req.params;
  const { upsell_item, upsell_source } = req.body; // { product_id, name, unit_price_at_time_of_order, quantity }

  let order = mockOrders.find(o => o.id === id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  order.items.push({
    ...upsell_item,
    is_upsell: true
  });

  order.upsell_source = upsell_source || 'confirmation_call';
  order.subtotal += Number(upsell_item.unit_price_at_time_of_order) * (upsell_item.quantity || 1);
  order.total_amount = order.subtotal + order.delivery_fee;

  res.json(order);
}
