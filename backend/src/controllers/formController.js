import { supabase } from '../config/supabase.js';

let mockForms = [
  {
    id: '33000000-0000-0000-0000-000000000001',
    name: 'Lunchbox Landing Page Form',
    linked_product_id: '22000000-0000-0000-0000-000000000001',
    embed_key: 'EMBED-LUNCHBOX-2026',
    header_text: 'Please Fill The Form Below To Place Your Order',
    subheader_text: 'Only Serious Buyers Should Fill The Form Below',
    button_text: 'ORDER NOW',
    button_bg_color: '#4f46e5',
    button_text_color: '#ffffff',
    form_bg_color: '#0f172a',
    show_country_code: 'Yes',
    payment_cod_enabled: true,
    payment_paystack_enabled: false,
    payment_flutterwave_enabled: false,
    payment_bank_enabled: false,
    notification_email: 'merchant@gmail.com',
    is_active: true
  },
  {
    id: '33000000-0000-0000-0000-000000000002',
    name: 'Spin Mop Promo Form',
    linked_product_id: '22000000-0000-0000-0000-000000000002',
    embed_key: 'EMBED-SPINMOP-2026',
    header_text: 'Order Your Rechargeable Spin Mop Today',
    subheader_text: 'Free Delivery & Pay On Delivery Nationwide',
    button_text: 'COMPLETE MY ORDER NOW',
    button_bg_color: '#10b981',
    button_text_color: '#ffffff',
    form_bg_color: '#0f172a',
    show_country_code: 'Yes',
    payment_cod_enabled: true,
    payment_paystack_enabled: false,
    payment_flutterwave_enabled: false,
    payment_bank_enabled: false,
    notification_email: 'merchant@gmail.com',
    is_active: true
  }
];

export async function getForms(req, res) {
  const { store_id } = req.query;
  if (supabase) {
    let query = supabase.from('forms').select('*');
    if (store_id) query = query.eq('store_id', store_id);
    const { data, error } = await query;
    if (!error && data && data.length > 0) return res.json(data);
  }

  let list = [...mockForms];
  if (store_id && store_id !== '00000000-0000-0000-0000-000000000001' && !store_id.startsWith('a100') && !store_id.startsWith('u100')) {
    list = list.filter(f => f.store_id === store_id);
  }
  res.json(list);
}

export async function getFormByEmbedKey(req, res) {
  const { embedKey } = req.params;
  if (supabase) {
    const { data, error } = await supabase.from('forms').select('*').eq('embed_key', embedKey).single();
    if (!error && data) return res.json(data);
  }
  const form = mockForms.find(f => f.embed_key === embedKey);
  if (!form) return res.status(404).json({ error: 'Embeddable form not found' });
  res.json(form);
}

export async function createForm(req, res) {
  const body = req.body;
  const embed_key = body.embed_key || `EMBED-${(body.name || 'PRODUCT').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 10)}-${Date.now().toString().slice(-4)}`;

  const newForm = {
    id: `33000000-0000-0000-0000-${Date.now().toString().padStart(12, '0').slice(-12)}`,
    name: body.name || 'Product Order Form',
    linked_product_id: body.linked_product_id,
    embed_key,
    header_text: body.header_text || 'Please Fill The Form Below To Place Your Order',
    subheader_text: body.subheader_text || 'Only Serious Buyers Should Fill The Form Below',
    button_text: body.button_text || 'ORDER NOW',
    button_bg_color: body.button_bg_color || '#4f46e5',
    button_text_color: body.button_text_color || '#ffffff',
    form_bg_color: body.form_bg_color || '#0f172a',
    show_country_code: body.show_country_code || 'Yes',
    payment_cod_enabled: body.payment_cod_enabled !== undefined ? body.payment_cod_enabled : true,
    payment_paystack_enabled: body.payment_paystack_enabled || false,
    payment_flutterwave_enabled: body.payment_flutterwave_enabled || false,
    payment_bank_enabled: body.payment_bank_enabled || false,
    notification_email: body.notification_email || 'merchant@gmail.com',
    is_active: true,
    created_at: new Date().toISOString()
  };

  if (supabase) {
    const { data, error } = await supabase.from('forms').insert([newForm]).select();
    if (!error && data && data.length > 0) {
      mockForms.unshift(data[0]);
      return res.status(201).json(data[0]);
    }
  }

  mockForms.unshift(newForm);
  res.status(201).json(newForm);
}

export async function updateForm(req, res) {
  const { id } = req.params;
  const updates = req.body;

  if (supabase) {
    const { data, error } = await supabase.from('forms').update(updates).eq('id', id).select();
    if (!error && data && data.length > 0) {
      const idx = mockForms.findIndex(f => f.id === id);
      if (idx !== -1) mockForms[idx] = { ...mockForms[idx], ...data[0] };
      return res.json(data[0]);
    }
  }

  const idx = mockForms.findIndex(f => f.id === id);
  if (idx !== -1) {
    mockForms[idx] = { ...mockForms[idx], ...updates };
    return res.json(mockForms[idx]);
  }
  res.status(404).json({ error: 'Form not found' });
}

export async function deleteForm(req, res) {
  const { id } = req.params;

  if (supabase) {
    const { error } = await supabase.from('forms').delete().eq('id', id);
    if (!error) {
      mockForms = mockForms.filter(f => f.id !== id);
      return res.json({ success: true, id });
    }
  }

  mockForms = mockForms.filter(f => f.id !== id);
  res.json({ success: true, id });
}
