import { supabase } from '../config/supabase.js';

let mockForms = [
  {
    id: '33000000-0000-0000-0000-000000000001',
    name: 'POT KNOB Order Form',
    linked_product_id: '22000000-0000-0000-0000-784714673902',
    embed_key: 'EMBED-POTKNOBORD-5463',
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
    thank_you_url: '',
    upsell_enabled: true,
    upsell_product_id: '22000000-0000-0000-0000-000000000004',
    upsell_title: 'Special 1-Click Offer!',
    upsell_description: 'Add a Portable USB Juicer Cup for only ₦7,000 extra (Normal Price: ₦9,500)!',
    upsell_price: 7000,
    is_active: true
  },
  {
    id: '33000000-0000-0000-0000-000000000003',
    name: 'Lunchbox Landing Page Form',
    linked_product_id: '22000000-0000-0000-0000-784714673902',
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
    thank_you_url: '',
    upsell_enabled: true,
    upsell_product_id: '22000000-0000-0000-0000-000000000004',
    upsell_title: 'Special 1-Click Offer!',
    upsell_description: 'Add a Portable USB Juicer Cup for only ₦7,000 extra (Normal Price: ₦9,500)!',
    upsell_price: 7000,
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
    thank_you_url: '',
    upsell_enabled: true,
    upsell_product_id: '22000000-0000-0000-0000-000000000004',
    upsell_title: 'Special 1-Click Offer!',
    upsell_description: 'Add a Portable USB Juicer Cup for only ₦7,000 extra!',
    upsell_price: 7000,
    is_active: true
  }
];

function sanitizeUuid(val) {
  if (!val || typeof val !== 'string' || val.trim() === '') return null;
  return val.trim();
}

function formatForm(form) {
  if (!form) return null;
  const cfg = (typeof form.fields_config === 'object' && form.fields_config && !Array.isArray(form.fields_config))
    ? form.fields_config
    : {};
  return {
    ...form,
    thank_you_url: form.thank_you_url || cfg.thank_you_url || '',
    upsell_enabled: form.upsell_enabled !== undefined ? form.upsell_enabled : (cfg.upsell_enabled !== undefined ? cfg.upsell_enabled : true),
    upsell_product_id: form.upsell_product_id || cfg.upsell_product_id || '',
    upsell_title: form.upsell_title || cfg.upsell_title || 'Special 1-Click Offer!',
    upsell_description: form.upsell_description || cfg.upsell_description || 'Add an extra product to your order for a special price!',
    upsell_price: form.upsell_price || cfg.upsell_price || 7000
  };
}

function prepareSupabasePayload(body, existingFieldsConfig = {}) {
  const knownColumns = [
    'id', 'store_id', 'name', 'linked_product_id', 'embed_key',
    'header_text', 'subheader_text', 'button_text', 'button_bg_color',
    'button_text_color', 'form_bg_color', 'show_country_code',
    'payment_cod_enabled', 'payment_paystack_enabled',
    'payment_flutterwave_enabled', 'payment_bank_enabled',
    'notification_email', 'thank_you_url', 'is_active', 'created_at', 'updated_at'
  ];

  const payload = {};
  const currentCfg = (typeof existingFieldsConfig === 'object' && existingFieldsConfig && !Array.isArray(existingFieldsConfig))
    ? existingFieldsConfig
    : {};
  const newFieldsConfig = { ...currentCfg };

  for (const [key, val] of Object.entries(body)) {
    if (knownColumns.includes(key)) {
      if (['linked_product_id', 'store_id'].includes(key)) {
        payload[key] = sanitizeUuid(val);
      } else {
        payload[key] = val;
      }
    } else {
      if (key === 'upsell_product_id') {
        newFieldsConfig[key] = sanitizeUuid(val);
      } else {
        newFieldsConfig[key] = val;
      }
    }
  }

  payload.fields_config = newFieldsConfig;
  return payload;
}

export async function getForms(req, res) {
  const effectiveStoreId = req.user?.store_id || req.query.store_id;
  if (supabase) {
    let query = supabase.from('forms').select('*');
    if (effectiveStoreId) query = query.eq('store_id', effectiveStoreId);
    const { data, error } = await query;
    if (!error && data) {
      if (data.length > 0) return res.json(data.map(formatForm));
      if (effectiveStoreId) return res.json([]);
    }
  }

  let list = [...mockForms];
  if (effectiveStoreId && effectiveStoreId !== '00000000-0000-0000-0000-000000000001' && !effectiveStoreId.startsWith('a100') && !effectiveStoreId.startsWith('u100')) {
    list = list.filter(f => f.store_id === effectiveStoreId);
  }
  res.json(list.map(formatForm));
}

export async function getFormByEmbedKey(req, res) {
  const { embedKey } = req.params;
  if (supabase) {
    const { data, error } = await supabase.from('forms').select('*').or(`embed_key.eq.${embedKey},id.eq.${embedKey}`).maybeSingle();
    if (!error && data) return res.json(formatForm(data));
  }
  const form = mockForms.find(f => f.embed_key === embedKey || f.id === embedKey) || mockForms[0];
  if (!form) return res.status(404).json({ error: 'Embeddable form not found' });
  res.json(formatForm(form));
}

export async function createForm(req, res) {
  const body = req.body;
  const embed_key = body.embed_key || `EMBED-${(body.name || 'PRODUCT').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 10)}-${Date.now().toString().slice(-4)}`;

  const newForm = {
    id: `33000000-0000-0000-0000-${Date.now().toString().padStart(12, '0').slice(-12)}`,
    store_id: sanitizeUuid(body.store_id || req.query.store_id),
    name: body.name || 'Product Order Form',
    linked_product_id: sanitizeUuid(body.linked_product_id),
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
    upsell_enabled: body.upsell_enabled !== undefined ? body.upsell_enabled : true,
    upsell_product_id: sanitizeUuid(body.upsell_product_id),
    upsell_title: body.upsell_title || 'Special 1-Click Offer!',
    upsell_description: body.upsell_description || 'Add an extra product to your order for a special price!',
    upsell_price: body.upsell_price ? Number(body.upsell_price) : 7000,
    thank_you_url: body.thank_you_url || null,
    is_active: true,
    created_at: new Date().toISOString()
  };

  if (supabase) {
    const supabasePayload = prepareSupabasePayload(newForm);
    const { data, error } = await supabase.from('forms').insert([supabasePayload]).select();
    if (!error && data && data.length > 0) {
      const formatted = formatForm(data[0]);
      mockForms.unshift(formatted);
      console.log('✅ Form successfully saved to Supabase:', formatted.name, `(${formatted.embed_key})`);
      return res.status(201).json(formatted);
    } else if (error) {
      console.error('❌ Supabase form insert error:', error.message, error.details || '');
      return res.status(502).json({ error: 'Form could not be saved to Supabase', details: error.message });
    }
  }

  const formattedNew = formatForm(newForm);
  mockForms.unshift(formattedNew);
  res.status(201).json(formattedNew);
}

export async function updateForm(req, res) {
  const { id } = req.params;
  const updates = req.body;

  if (supabase) {
    const { data: existing } = await supabase.from('forms').select('*').eq('id', id).single();
    const existingCfg = existing ? existing.fields_config : {};
    const supabasePayload = prepareSupabasePayload(updates, existingCfg);

    const { data, error } = await supabase.from('forms').update(supabasePayload).eq('id', id).select();
    if (!error && data && data.length > 0) {
      const formatted = formatForm(data[0]);
      const idx = mockForms.findIndex(f => f.id === id);
      if (idx !== -1) mockForms[idx] = { ...mockForms[idx], ...formatted };
      return res.json(formatted);
    } else if (error) {
      console.error('❌ Supabase form update error:', error.message);
      return res.status(502).json({ error: 'Form could not be updated in Supabase', details: error.message });
    }
  }

  const idx = mockForms.findIndex(f => f.id === id);
  if (idx !== -1) {
    mockForms[idx] = formatForm({ ...mockForms[idx], ...updates });
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
    return res.status(502).json({ error: 'Form could not be deleted from Supabase', details: error.message });
  }

  mockForms = mockForms.filter(f => f.id !== id);
  res.json({ success: true, id });
}

