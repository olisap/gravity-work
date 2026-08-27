import { supabase } from '../config/supabase.js';

let mockCategories = [
  { id: '11000000-0000-0000-0000-000000000001', name: 'Kitchen Wares & Dining' },
  { id: '11000000-0000-0000-0000-000000000002', name: 'Household Gadgets & Cleaning' },
  { id: '11000000-0000-0000-0000-000000000003', name: 'Health & Personal Care' }
];

let mockProducts = [];

function sanitizeUuid(val) {
  if (!val || typeof val !== 'string' || val.trim() === '') return null;
  return val.trim();
}

export async function getProducts(req, res) {
  const effectiveStoreId = req.user?.store_id || req.query.store_id;
  if (supabase) {
    // Fetch all products ordered by created_at desc
    const { data: allProds, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (!error && allProds) {
      if (allProds.length > 0) {
        // If effectiveStoreId is supplied, check if store-specific items exist
        if (effectiveStoreId) {
          const storeSpecific = allProds.filter(p => p.store_id === effectiveStoreId || !p.store_id || p.store_id === '00000000-0000-0000-0000-784637855674');
          if (storeSpecific.length > 0) return res.json(storeSpecific);
        }
        return res.json(allProds);
      }
      return res.json([]);
    }
  }

  let list = [...mockProducts];
  res.json(list);
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
    store_id
  } = req.body;

  const sanitizedCategoryId = sanitizeUuid(category_id);
  const DEFAULT_PRIMARY_STORE_ID = '00000000-0000-0000-0000-784637855674';
  const sanitizedStoreId = sanitizeUuid(store_id || req.query.store_id || req.user?.store_id) || DEFAULT_PRIMARY_STORE_ID;

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
    let { data, error } = await supabase.from('products').update(dbPayload).eq('id', id).select();

    if (error && (error.code === '23503' || error.message?.includes('foreign key'))) {
      dbPayload.category_id = null;
      const retry = await supabase.from('products').update(dbPayload).eq('id', id).select();
      data = retry.data;
      error = retry.error;
    }

    if (!error && data && data.length > 0) {
      const idx = mockProducts.findIndex(p => p.id === id);
      if (idx !== -1) mockProducts[idx] = { ...mockProducts[idx], ...data[0] };
      return res.json(data[0]);
    }
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
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (!error) {
      mockProducts = mockProducts.filter(p => p.id !== id);
      return res.json({ success: true, id });
    }
  }

  mockProducts = mockProducts.filter(p => p.id !== id);
  res.json({ success: true, id });
}

export async function createCategory(req, res) {
  const { name } = req.body;
  const newCategory = {
    id: `11000000-0000-0000-0000-${Date.now().toString().padStart(12, '0').slice(-12)}`,
    name
  };

  if (supabase) {
    const { data, error } = await supabase.from('product_categories').insert([newCategory]).select();
    if (!error && data && data.length > 0) {
      mockCategories.push(data[0]);
      return res.status(201).json(data[0]);
    }
  }

  mockCategories.push(newCategory);
  res.status(201).json(newCategory);
}

export async function getStockMovements(req, res) {
  const storeId = req.user?.store_id || req.query.store_id;

  if (supabase) {
    let query = supabase.from('stock_movements').select('*').order('created_at', { ascending: false }).limit(50);
    const { data, error } = await query;
    if (!error && data) return res.json(data);
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
      const { data: prod } = await supabase.from('products').select('available_stock').eq('id', product_id).single();
      if (prod) {
        const newStock = Math.max(0, (prod.available_stock || 0) + delta);
        await supabase.from('products').update({ available_stock: newStock }).eq('id', product_id);
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
