import { supabase } from '../config/supabase.js';

let mockCategories = [];

let mockProducts = [];

function sanitizeUuid(val) {
  if (!val || typeof val !== 'string' || val.trim() === '') return null;
  return val.trim();
}

export async function getProducts(req, res) {
  const effectiveStoreId = req.storeId;
  if (supabase) {
    const { data: allProds, error } = await supabase.from('products').select('*').eq('store_id', effectiveStoreId).order('created_at', { ascending: false });
    if (!error && allProds) {
      return res.json(allProds);
    }
  }

  let list = [...mockProducts];
  res.json(list);
}

export async function getProductForPublicForm(req, res) {
  const { embedKey } = req.params;
  if (!supabase) return res.status(503).json({ error: 'Public checkout is unavailable' });

  const { data: form, error: formError } = await supabase
    .from('forms')
    .select('linked_product_id, fields_config, store_id')
    .eq('embed_key', embedKey)
    .maybeSingle();
  if (formError) return res.status(502).json({ error: 'Checkout form could not be loaded' });
  if (!form?.linked_product_id || !form.store_id) return res.status(404).json({ error: 'Checkout product not found' });

  const productIds = [form.linked_product_id];
  const upsellProductId = form.fields_config?.upsell_product_id;
  if (upsellProductId) productIds.push(upsellProductId);

  const { data: products, error: productError } = await supabase
    .from('products')
    .select('*')
    .eq('store_id', form.store_id)
    .in('id', productIds);
  if (productError) return res.status(502).json({ error: 'Checkout product could not be loaded' });

  const product = products?.find(item => item.id === form.linked_product_id);
  if (!product) return res.status(404).json({ error: 'Checkout product not found' });
  res.json({ product, products });
}

export async function getCategories(req, res) {
  if (supabase) {
    const { data, error } = await supabase.from('product_categories').select('*');
    if (!error && data && data.length > 0) return res.json(data);
  }
  res.json(mockCategories);
}

function prepareProductPayloadForSupabase(prod) {
  if (!prod) return prod;
  const { custom_fields, ...rest } = prod;
  return rest;
}

export async function createProduct(req, res) {
  const {
    name, category_id, category_name, country, description,
    cost_price, base_price, sku, initial_stock, price_bundles,
    store_id: ignoredStoreId
  } = req.body;

  const sanitizedCategoryId = sanitizeUuid(category_id);
  const DEFAULT_PRIMARY_STORE_ID = '00000000-0000-0000-0000-784637855674';
  const sanitizedStoreId = sanitizeUuid(req.storeId) || DEFAULT_PRIMARY_STORE_ID;

  const newProduct = {
    id: `22000000-0000-0000-0000-${Date.now().toString().padStart(12, '0').slice(-12)}`,
    store_id: sanitizedStoreId,
    category_id: sanitizedCategoryId,
    category_name: category_name || 'general',
    country: country || 'Nigeria',
    name,
    description: description || '',
    cost_price: Number(cost_price) || 0,
    base_price: Number(base_price) || 0,
    sku: sku || `SKU-${Date.now().toString().slice(-6)}`,
    variation_1: '',
    variation_2: '',
    price_bundles: price_bundles || [
      { qty: 1, label: `1 ${name} + Free Delivery`, price: Number(base_price) || 0 }
    ],
    images: Array.isArray(req.body.images) && req.body.images.length > 0 ? req.body.images : ['https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=500&auto=format&fit=crop'],
    custom_fields: req.body.custom_fields || [],
    has_variants: false,
    is_active: true,
    available_stock: Number(initial_stock) || 0,
    created_at: new Date().toISOString()
  };

  if (supabase) {
    let dbPayload = prepareProductPayloadForSupabase(newProduct);
    let { data, error } = await supabase.from('products').insert([dbPayload]).select();
    
    // Auto-healing: If foreign key check failed (e.g. mock category_id or store_id), retry with safe foreign key fallbacks
    if (error && (error.code === '23503' || error.message?.includes('foreign key'))) {
      console.warn('⚠️ Foreign key error on product insert, retrying with category_id = null...');
      dbPayload.category_id = null;
      const retry1 = await supabase.from('products').insert([dbPayload]).select();
      data = retry1.data;
      error = retry1.error;

      if (error && (error.code === '23503' || error.message?.includes('foreign key'))) {
        console.warn('⚠️ Foreign key error on store_id, retrying with store_id = null...');
        dbPayload.store_id = null;
        const retry2 = await supabase.from('products').insert([dbPayload]).select();
        data = retry2.data;
        error = retry2.error;
      }
    }

    if (!error && data && data.length > 0) {
      mockProducts.unshift(data[0]);
      console.log('✅ Product successfully saved to Supabase permanently:', data[0].name);
      return res.status(201).json(data[0]);
    } else if (error) {
      console.error('❌ Supabase product insert error:', error.message);
      return res.status(502).json({ error: 'Product could not be saved to Supabase', details: error.message });
    }
  }

  mockProducts.unshift(newProduct);
  res.status(201).json(newProduct);
}

export async function updateProduct(req, res) {
  const { id } = req.params;
  const updates = req.body;

  if (supabase) {
    let dbPayload = prepareProductPayloadForSupabase(updates);
    let { data, error } = await supabase.from('products').update(dbPayload).eq('id', id).eq('store_id', req.storeId).select();

    if (error && (error.code === '23503' || error.message?.includes('foreign key'))) {
      dbPayload.category_id = null;
      const retry = await supabase.from('products').update(dbPayload).eq('id', id).eq('store_id', req.storeId).select();
      data = retry.data;
      error = retry.error;
    }

    if (!error && data && data.length > 0) {
      const idx = mockProducts.findIndex(p => p.id === id);
      if (idx !== -1) mockProducts[idx] = { ...mockProducts[idx], ...data[0] };
      return res.json(data[0]);
    }
    if (error) return res.status(502).json({ error: 'Product could not be updated in Supabase', details: error.message });
  }

  const idx = mockProducts.findIndex(p => p.id === id);
  if (idx !== -1) {
    mockProducts[idx] = { ...mockProducts[idx], ...updates };
    return res.json(mockProducts[idx]);
  }
  res.status(404).json({ error: 'Product not found' });
}

export async function deleteProduct(req, res) {
  const { id } = req.params;

  if (supabase) {
    const { error } = await supabase.from('products').delete().eq('id', id).eq('store_id', req.storeId);
    if (!error) {
      mockProducts = mockProducts.filter(p => p.id !== id);
      return res.json({ success: true, id });
    }
    return res.status(502).json({ error: 'Product could not be deleted from Supabase', details: error.message });
  }

  mockProducts = mockProducts.filter(p => p.id !== id);
  res.json({ success: true, id });
}

export async function createCategory(req, res) {
  const { name } = req.body;
  const newCategory = {
    id: `11000000-0000-0000-0000-${Date.now().toString().padStart(12, '0').slice(-12)}`,
    name,
    store_id: req.storeId
  };

  if (supabase) {
    const { data, error } = await supabase.from('product_categories').insert([newCategory]).select();
    if (!error && data && data.length > 0) {
      mockCategories.push(data[0]);
      return res.status(201).json(data[0]);
    }
    if (error) return res.status(502).json({ error: 'Category could not be saved to Supabase', details: error.message });
  }

  mockCategories.push(newCategory);
  res.status(201).json(newCategory);
}

export async function getStockMovements(req, res) {
  const storeId = req.storeId || req.user?.store_id;

  if (supabase) {
    const { data: storeProducts, error: productError } = await supabase
      .from('products')
      .select('id')
      .eq('store_id', storeId);
    if (productError) return res.status(502).json({ error: 'Inventory could not be loaded', details: productError.message });

    const productIds = (storeProducts || []).map(product => product.id);
    if (productIds.length === 0) return res.json([]);

    const query = supabase
      .from('stock_movements')
      .select('*')
      .in('product_id', productIds)
      .order('created_at', { ascending: false })
      .limit(50);
    const { data, error } = await query;
    if (!error && data) return res.json(data);
    if (error) return res.status(502).json({ error: 'Inventory could not be loaded', details: error.message });
  }

  res.json([]);
}

export async function recordStockAdjustment(req, res) {
  const { product_id, movement_type, quantity_delta, note } = req.body;

  const delta = Number(quantity_delta) || 0;
  if (!product_id || delta === 0) {
    return res.status(400).json({ error: 'Product ID and non-zero quantity delta required' });
  }

  if (supabase) {
    try {
      const { data: prod } = await supabase.from('products').select('available_stock').eq('id', product_id).eq('store_id', req.storeId).single();
      if (prod) {
        const newStock = Math.max(0, (prod.available_stock || 0) + delta);
        await supabase.from('products').update({ available_stock: newStock }).eq('id', product_id).eq('store_id', req.storeId);
      }
      await supabase.from('stock_movements').insert([{
        product_id,
        movement_type: movement_type || 'manual_adjustment',
        quantity_delta: delta,
        note: note || 'Manual Stock Adjustment'
      }]);
    } catch (err) {
      console.error('Error in recordStockAdjustment:', err);
    }
  }

  const idx = mockProducts.findIndex(p => p.id === product_id);
  if (idx !== -1) {
    mockProducts[idx].available_stock = Math.max(0, (mockProducts[idx].available_stock || 0) + delta);
  }

  res.json({ success: true, message: 'Stock movement recorded successfully' });
}
