import crypto from 'crypto';
import { supabase } from '../config/supabase.js';
import { InventoryService } from '../services/inventoryService.js';
import { NotificationService } from '../services/notificationService.js';
import { AbandonmentWorker } from '../services/abandonmentWorker.js';

function isValidUUID(str) {
  if (!str) return false;
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(str);
}

/**
 * Resolve which email address should receive the "New Order Alert" for a given store.
 * Priority:
 *   1. Explicit notification_email passed in the request body (e.g. set on the form itself)
 *   2. The form's saved notification_email in Supabase (per-store setting)
 *   3. The store owner's account email (users table, role = 'owner', matching store_id)
 *   4. process.env.SENDER_EMAIL (last-resort fallback for single-tenant/dev setups)
 * Returns null if nothing usable is found (caller should skip the merchant email rather than
 * silently sending it to a hardcoded stranger's inbox).
 */
async function resolveMerchantNotificationEmail({ explicitEmail, storeId }) {
  const isPlaceholder = (val) => !val || !val.trim() || val.trim().toLowerCase() === 'merchant@gmail.com';

  if (!isPlaceholder(explicitEmail)) {
    return explicitEmail.trim();
  }

  if (storeId && supabase) {
    try {
      const { data: storeForm } = await supabase
        .from('forms')
        .select('notification_email, fields_config')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      const cfgEmail = storeForm?.fields_config?.notification_email;
      const candidate = storeForm?.notification_email || cfgEmail;
      if (candidate && !isPlaceholder(candidate)) {
        return candidate.trim();
      }
    } catch (e) {
      console.error('resolveMerchantNotificationEmail: failed to read forms.notification_email', e);
    }

    try {
      const { data: owner } = await supabase
        .from('users')
        .select('email')
        .eq('store_id', storeId)
        .eq('role', 'owner')
        .limit(1)
        .maybeSingle();
      if (owner && !isPlaceholder(owner.email)) {
        return owner.email.trim();
      }
    } catch (e) {
      console.error('resolveMerchantNotificationEmail: failed to read store owner email', e);
    }
  }

  if (!isPlaceholder(process.env.SENDER_EMAIL)) {
    return process.env.SENDER_EMAIL.trim();
  }

  return null;
}

/**
 * Resolve the store's display name for use in emails.
 */
async function resolveStoreName(storeId) {
  if (storeId && supabase) {
    try {
      const { data: store } = await supabase
        .from('stores')
        .select('name')
        .eq('id', storeId)
        .single();
      if (store?.name) return store.name;
    } catch (e) { /* ignore */ }
    try {
      const { data: owner } = await supabase
        .from('users')
        .select('store_name')
        .eq('store_id', storeId)
        .eq('role', 'owner')
        .limit(1)
        .maybeSingle();
      if (owner?.store_name) return owner.store_name;
    } catch (e) { /* ignore */ }
  }
  return process.env.SENDER_NAME || 'Our Store';
}

function prepareOrderPayloadForSupabase(order) {
  const { items, thank_you_url, notification_email, ...rest } = order;
  return {
    ...rest,
    id: isValidUUID(rest.id) ? rest.id : crypto.randomUUID(),
    upsell_items: items || []
  };
}

function formatOrderFromSupabase(order) {
  if (!order) return order;
  let meta = {};
  if (order.confirmation_call_notes && typeof order.confirmation_call_notes === 'string' && order.confirmation_call_notes.startsWith('{')) {
    try {
      meta = JSON.parse(order.confirmation_call_notes);
    } catch (e) {}
  }
  return {
    ...order,
    items: order.items || order.upsell_items || [],
    delivery_agent_id: order.delivery_agent_id || meta.delivery_agent_id || null,
    delivery_agent_name: order.delivery_agent_name || meta.delivery_agent_name || null,
    amount_remitted: order.amount_remitted ?? meta.amount_remitted ?? (order.payment_status === 'Paid' ? (order.total_amount || 0) : 0),
    proof_of_payment_url: order.proof_of_payment_url || meta.proof_of_payment_url || null,
    account_paid_into: order.account_paid_into || meta.account_paid_into || (order.payment_method === 'COD' ? 'Cash on Delivery' : 'Bank Transfer'),
    on_hold_by: order.on_hold_by || meta.on_hold_by || (order.status === 'Audit Hold' ? (order.updated_by || 'Staff') : null),
    assigned_to_name: order.assigned_to_name || meta.sales_rep_name || null,
    tags: Array.isArray(order.tags) ? order.tags : (Array.isArray(meta.tags) ? meta.tags : []),
    comments: order.comments || meta.comments || null,
    combo_details: order.combo_details || meta.combo_details || null,
    added_by: order.added_by || meta.added_by || (order.source?.startsWith('form:') ? 'Form Customer' : 'System'),
    updated_by: order.updated_by || meta.updated_by || 'System',
    processed_by: order.processed_by || meta.processed_by || meta.sales_rep_name || null
  };
}

// In-memory fallback mock orders database if Supabase isn't connected
let mockOrders = [
  {
    id: '44000000-0000-0000-0000-000000000010',
    store_id: '00000000-0000-0000-0000-000000000001',
    order_number: '1677638564',
    customer_name: 'Bright Ayebakari',
    customer_phone: '+2348031234567',
    customer_email: 'brightayebakari@gmail.com',
    delivery_address: 'Okaka Road Yenagoa Bayelsa State 79',
    state: 'Bayelsa',
    city: 'Yenagoa',
    country: 'Nigeria',
    items: [{ name: 'ROD HOLDER', quantity: 8, unit_price_at_time_of_order: 4312.5 }],
    subtotal: 34500,
    delivery_fee: 0,
    total_amount: 34500,
    status: 'Pending',
    payment_method: 'COD',
    payment_status: 'Unpaid',
    on_hold_by: null,
    assigned_to_name: 'Unassigned',
    created_at: '2026-09-16T13:28:00Z',
    updated_at: '2026-09-16T13:28:00Z'
  },
  {
    id: '44000000-0000-0000-0000-000000000011',
    store_id: '00000000-0000-0000-0000-000000000001',
    order_number: '1414742744',
    customer_name: 'Ifeanyi Ezeah',
    customer_phone: '+2347061234567',
    customer_email: 'ifeanyiezeah@gmail.com',
    delivery_address: 'Kpokpo ogbozalla Opi, Nsukka',
    state: 'Enugu',
    city: 'Nsukka',
    country: 'Nigeria',
    items: [{ name: 'FIX GLUE', quantity: 1, unit_price_at_time_of_order: 65500 }],
    subtotal: 65500,
    delivery_fee: 0,
    total_amount: 65500,
    status: 'Pending',
    payment_method: 'COD',
    payment_status: 'Unpaid',
    on_hold_by: null,
    assigned_to_name: 'Unassigned',
    created_at: '2026-09-16T13:25:00Z',
    updated_at: '2026-09-16T13:25:00Z'
  },
  {
    id: '44000000-0000-0000-0000-000000000012',
    store_id: '00000000-0000-0000-0000-000000000001',
    order_number: '5908450138',
    customer_name: 'Sunday',
    customer_phone: '+2348029876543',
    customer_email: 'sundayorder@gmail.com',
    delivery_address: 'No.1 ospuc Av. Behind Jehovah jireh ANGLICAN church,egbu road. Owerri',
    state: 'Imo',
    city: 'Owerri',
    country: 'Nigeria',
    items: [{ name: 'FIX GLUE', quantity: 1, unit_price_at_time_of_order: 65500 }],
    subtotal: 65500,
    delivery_fee: 0,
    total_amount: 65500,
    status: 'Pending',
    payment_method: 'COD',
    payment_status: 'Unpaid',
    on_hold_by: null,
    assigned_to_name: 'Unassigned',
    created_at: '2026-09-16T11:54:00Z',
    updated_at: '2026-09-16T11:54:00Z'
  },
  {
    id: '44000000-0000-0000-0000-000000000013',
    store_id: '00000000-0000-0000-0000-000000000001',
    order_number: '2399488443',
    customer_name: 'ONOWU Dennis',
    customer_phone: '+2348051112233',
    customer_email: 'onowudennis@gmail.com',
    delivery_address: '24 Aba Owerri road,Aba Abia',
    state: 'Abia',
    city: 'Aba',
    country: 'Nigeria',
    items: [{ name: 'FIX GLUE', quantity: 1, unit_price_at_time_of_order: 65500 }],
    subtotal: 65500,
    delivery_fee: 0,
    total_amount: 65500,
    status: 'Pending',
    payment_method: 'COD',
    payment_status: 'Unpaid',
    on_hold_by: null,
    assigned_to_name: 'Unassigned',
    created_at: '2026-09-16T10:30:00Z',
    updated_at: '2026-09-16T10:30:00Z'
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
    // NOTE: We cannot use mockOrders.length here because Vercel serverless functions
    // reset in-memory state on every cold start, making the counter always 0 and
    // causing a duplicate key violation in Supabase ('OLI-10001' already exists).
    // Instead, use a timestamp + random suffix for a collision-safe unique order number.
    const tsBase = Date.now().toString().slice(-6);  // last 6 digits of ms timestamp
    const rndSuffix = Math.floor(Math.random() * 900 + 100); // 3-digit random: 100-999
    const newOrderNumber = `OLI-${tsBase}${rndSuffix}`;
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
      // Use onConflict on 'id' so updating an existing draft by UUID works correctly
      // without hitting the order_number unique constraint on re-inserts.
      const { data: dbData, error: dbErr } = await supabase
        .from('orders')
        .upsert([dbPayload], { onConflict: 'id' })
        .select();
      if (dbErr) {
        console.error('Failed to upsert order to Supabase:', dbErr);
        // If it's a duplicate order_number, retry with a fresh unique number
        if (dbErr.code === '23505' && dbErr.details?.includes('order_number')) {
          const retryTs = Date.now().toString().slice(-6);
          const retryRnd = Math.floor(Math.random() * 900 + 100);
          finalOrder.order_number = `OLI-${retryTs}${retryRnd}`;
          const retryPayload = prepareOrderPayloadForSupabase(finalOrder);
          const { data: retryData, error: retryErr } = await supabase
            .from('orders')
            .upsert([retryPayload], { onConflict: 'id' })
            .select();
          if (!retryErr && retryData && retryData[0]) {
            console.log('✅ Order saved to Supabase (retry):', retryData[0].order_number);
            finalOrder.id = retryData[0].id;
            finalOrder.order_number = retryData[0].order_number;
          } else {
            console.error('Failed retry upsert:', retryErr);
          }
        }
      } else if (dbData && dbData[0]) {
        console.log('✅ Order successfully persisted to Supabase:', dbData[0].order_number);
        finalOrder.id = dbData[0].id;
        finalOrder.order_number = dbData[0].order_number;
      }
    } catch (dbErr) {
      console.error('Failed to upsert order to Supabase:', dbErr);
    }
  }

  // Trigger Notifications on Final Order Submit
  if (is_final_submit) {
    const [targetNotificationEmail, storeName] = await Promise.all([
      resolveMerchantNotificationEmail({ explicitEmail: notification_email, storeId: store_id }),
      resolveStoreName(store_id)
    ]);

    console.log(`📧 Dispatching final order #${finalOrder.order_number} notifications (Store: ${storeName}, Merchant: ${targetNotificationEmail || 'NONE'}, Customer: ${finalOrder.customer_email || 'None'})`);
    if (targetNotificationEmail) {
      NotificationService.sendOrderFinalizedNotifications(finalOrder, targetNotificationEmail, storeName).catch(err => {
        console.error('Failed to send order finalized notifications:', err);
      });
    } else {
      console.warn(`⚠️ No merchant notification email resolved for store ${store_id}. Sending customer receipt only.`);
      NotificationService.sendOrderFinalizedNotifications(finalOrder, null, storeName).catch(err => {
        console.error('Failed to send order finalized notifications:', err);
      });
    }
  }

  res.status(orderIndex >= 0 ? 200 : 201).json(finalOrder);
}

export async function updateOrderStatus(req, res) {
  const { id } = req.params;
  const {
    status,
    confirmation_notes,
    assigned_staff_id,
    assigned_to_name,
    scheduled_delivery_date,
    scheduled_delivery_time,
    reminder_notes,
    on_hold_by,
    delivery_agent_id,
    delivery_agent_name,
    delivery_fee,
    amount_remitted,
    proof_of_payment_url,
    account_paid_into,
    tags,
    comments,
    combo_details,
    added_by,
    updated_by,
    processed_by
  } = req.body;

  const validStatuses = [
    'Draft', 'Pending', 'Audit Hold', 'Awaiting', 'Scheduled', 'Confirmed',
    'Shipped', 'Delivered', 'Paid', 'Cash Remitted', 'Cancelled', 'Failed',
    'After-Sale Followup', 'Returned', 'Deleted', 'Cart Abandonment', 'Banned'
  ];
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid order status' });
  }

  // If Supabase is connected, update Supabase first
  if (supabase) {
    try {
      const updates = {
        updated_at: new Date().toISOString()
      };
      if (status) updates.status = status;
      if (confirmation_notes !== undefined) updates.confirmation_call_notes = confirmation_notes;
      if (assigned_staff_id !== undefined) updates.assigned_staff_id = assigned_staff_id;
      if (assigned_to_name !== undefined) updates.assigned_to_name = assigned_to_name;
      if (scheduled_delivery_date !== undefined) updates.scheduled_delivery_date = scheduled_delivery_date;
      if (scheduled_delivery_time !== undefined) updates.scheduled_delivery_time = scheduled_delivery_time;
      if (reminder_notes !== undefined) updates.reminder_notes = reminder_notes;
      if (on_hold_by !== undefined) updates.on_hold_by = on_hold_by;
      if (delivery_agent_id !== undefined) updates.delivery_agent_id = delivery_agent_id;
      if (delivery_agent_name !== undefined) updates.delivery_agent_name = delivery_agent_name;
      if (delivery_fee !== undefined) updates.delivery_fee = Number(delivery_fee);
      if (amount_remitted !== undefined) updates.amount_remitted = Number(amount_remitted);
      if (proof_of_payment_url !== undefined) updates.proof_of_payment_url = proof_of_payment_url;
      if (account_paid_into !== undefined) updates.account_paid_into = account_paid_into;
      if (tags !== undefined) updates.tags = tags;
      if (comments !== undefined) updates.comments = comments;
      if (combo_details !== undefined) updates.combo_details = combo_details;
      if (added_by !== undefined) updates.added_by = added_by;
      if (updated_by !== undefined) updates.updated_by = updated_by;
      if (processed_by !== undefined) updates.processed_by = processed_by;

      if (status === 'Delivered') {
        updates.delivered_at = new Date().toISOString();
        updates.payment_status = 'Paid';
      } else if (status === 'Failed') {
        updates.payment_status = 'Unpaid';
      }

      let updateQuery = supabase.from('orders').update(updates).eq('id', id);
      if (req.storeId) {
        updateQuery = updateQuery.eq('store_id', req.storeId);
      }
      const { data: dbData, error: dbErr } = await updateQuery.select();
      if (!dbErr && dbData && dbData[0]) {
        const formatted = formatOrderFromSupabase(dbData[0]);
        const idx = mockOrders.findIndex(o => o.id === id);
        if (idx >= 0) mockOrders[idx] = { ...mockOrders[idx], ...formatted };
        else mockOrders.unshift(formatted);

        console.log(`✅ Order #${formatted.order_number} status updated to "${status || formatted.status}" in Supabase`);
        return res.json(formatted);
      }
    } catch (dbErr) {
      console.error('Failed to update order status in Supabase:', dbErr);
    }
  }

  let order = mockOrders.find(o => o.id === id && (!req.storeId || o.store_id === req.storeId));
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  const previousStatus = order.status;

  // Enforce legal status transitions
  if (previousStatus === 'Delivered' && status && status !== 'Delivered') {
    return res.status(400).json({ error: 'Delivered orders cannot change status directly. Process a Return instead.' });
  }

  if (status) order.status = status;
  order.updated_at = new Date().toISOString();
  if (confirmation_notes !== undefined) order.confirmation_call_notes = confirmation_notes;
  if (assigned_staff_id !== undefined) order.assigned_staff_id = assigned_staff_id;
  if (assigned_to_name !== undefined) order.assigned_to_name = assigned_to_name;
  if (scheduled_delivery_date !== undefined) order.scheduled_delivery_date = scheduled_delivery_date;
  if (scheduled_delivery_time !== undefined) order.scheduled_delivery_time = scheduled_delivery_time;
  if (reminder_notes !== undefined) order.reminder_notes = reminder_notes;
  if (on_hold_by !== undefined) order.on_hold_by = on_hold_by;
  if (delivery_agent_id !== undefined) order.delivery_agent_id = delivery_agent_id;
  if (delivery_agent_name !== undefined) order.delivery_agent_name = delivery_agent_name;
  if (delivery_fee !== undefined) order.delivery_fee = Number(delivery_fee);
  if (amount_remitted !== undefined) order.amount_remitted = Number(amount_remitted);
  if (proof_of_payment_url !== undefined) order.proof_of_payment_url = proof_of_payment_url;
  if (account_paid_into !== undefined) order.account_paid_into = account_paid_into;
  if (tags !== undefined) order.tags = tags;
  if (comments !== undefined) order.comments = comments;
  if (combo_details !== undefined) order.combo_details = combo_details;
  if (added_by !== undefined) order.added_by = added_by;
  if (updated_by !== undefined) order.updated_by = updated_by;
  if (processed_by !== undefined) order.processed_by = processed_by;

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
  if (status) {
    await InventoryService.handleOrderStatusChange(order, previousStatus, status);
  }

  res.json(formatOrderFromSupabase(order));
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

export async function sendManualDraftReminder(req, res) {
  const { id } = req.params;
  const storeId = req.storeId;

  let draft = null;

  if (supabase) {
    try {
      let query = supabase.from('orders').select('*').eq('id', id);
      if (storeId) query = query.eq('store_id', storeId);
      const { data, error } = await query.maybeSingle();
      if (!error && data) {
        draft = formatOrderFromSupabase(data);
      }
    } catch (e) {
      console.error('Error fetching draft for manual reminder:', e);
    }
  }

  if (!draft) {
    draft = mockOrders.find(o => o.id === id && (!storeId || o.store_id === storeId));
  }

  if (!draft) {
    return res.status(404).json({ error: 'Order or draft not found' });
  }

  const result = await AbandonmentWorker.sendDraftReminder(draft);
  if (!result.success) {
    return res.status(400).json({ error: result.error || 'Failed to dispatch draft recovery reminder' });
  }

  res.json({
    message: 'Draft recovery reminder dispatched successfully',
    emailSent: result.emailSent,
    smsSent: result.smsSent,
    order: draft
  });
}
