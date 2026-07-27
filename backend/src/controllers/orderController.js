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
let mockOrders = [];

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
  const { status, state, country, search } = req.query;
  const effectiveStoreId = req.user?.store_id || req.query.store_id;

  if (supabase) {
    let query = supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (effectiveStoreId) query = query.eq('store_id', effectiveStoreId);
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

  if (effectiveStoreId && effectiveStoreId !== '00000000-0000-0000-0000-000000000001' && !effectiveStoreId.startsWith('a100') && !effectiveStoreId.startsWith('u100')) {
    filtered = filtered.filter(o => o.store_id === effectiveStoreId);
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
    thank_you_url,
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
      thank_you_url: thank_you_url !== undefined ? thank_you_url : (existing.thank_you_url || null),
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
      thank_you_url: thank_you_url || null,
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
    let targetNotificationEmail = notification_email;
    if (!targetNotificationEmail && store_id && supabase) {
      try {
        const { data: storeForm } = await supabase.from('forms').select('notification_email').eq('store_id', store_id).limit(1).maybeSingle();
        if (storeForm && storeForm.notification_email) {
          targetNotificationEmail = storeForm.notification_email;
        }
      } catch (e) {
        // ignore error
      }
    }
    if (!targetNotificationEmail || targetNotificationEmail === 'merchant@gmail.com') {
      targetNotificationEmail = process.env.SENDER_EMAIL || 'olisapaul1@gmail.com';
    }

    console.log(`📧 Dispatching final order #${finalOrder.order_number} notifications (Merchant Target: ${targetNotificationEmail}, Customer: ${finalOrder.customer_email || 'None'})`);
    NotificationService.sendOrderFinalizedNotifications(finalOrder, targetNotificationEmail).catch(err => {
      console.error('Failed to send order finalized notifications:', err);
    });
  }

  res.status(orderIndex >= 0 ? 200 : 201).json(finalOrder);
}

export async function updateOrderStatus(req, res) {
  const { id } = req.params;
  const { status, confirmation_notes, assigned_staff_id, scheduled_delivery_date, scheduled_delivery_time, reminder_notes } = req.body;

  const validStatuses = ['Draft', 'Pending', 'Awaiting', 'Scheduled', 'Delivered', 'Cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid order status' });
  }

  // If Supabase is connected, update Supabase first
  if (supabase) {
    try {
      const updates = {
        status,
        updated_at: new Date().toISOString()
      };
      if (confirmation_notes !== undefined) updates.confirmation_call_notes = confirmation_notes;
      if (assigned_staff_id) updates.assigned_staff_id = assigned_staff_id;
      if (scheduled_delivery_date) updates.scheduled_delivery_date = scheduled_delivery_date;
      if (scheduled_delivery_time) updates.scheduled_delivery_time = scheduled_delivery_time;
      if (reminder_notes) updates.reminder_notes = reminder_notes;
      if (status === 'Delivered') {
        updates.delivered_at = new Date().toISOString();
        updates.payment_status = 'Paid';
      }

      const { data: dbData, error: dbErr } = await supabase.from('orders').update(updates).eq('id', id).select();
      if (!dbErr && dbData && dbData[0]) {
        const formatted = formatOrderFromSupabase(dbData[0]);
        const idx = mockOrders.findIndex(o => o.id === id);
        if (idx >= 0) mockOrders[idx] = { ...mockOrders[idx], ...formatted };
        else mockOrders.unshift(formatted);
        
        console.log(`✅ Order #${formatted.order_number} status updated to "${status}" in Supabase (Scheduled Date: ${scheduled_delivery_date || 'N/A'})`);
        return res.json(formatted);
      }
    } catch (dbErr) {
      console.error('Failed to update order status in Supabase:', dbErr);
    }
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
  if (scheduled_delivery_date) order.scheduled_delivery_date = scheduled_delivery_date;
  if (scheduled_delivery_time) order.scheduled_delivery_time = scheduled_delivery_time;
  if (reminder_notes) order.reminder_notes = reminder_notes;

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
