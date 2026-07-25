import { supabase } from '../config/supabase.js';

let mockCategories = [
  { id: '11000000-0000-0000-0000-000000000001', name: 'Kitchen Wares & Dining' },
  { id: '11000000-0000-0000-0000-000000000002', name: 'Household Gadgets & Cleaning' },
  { id: '11000000-0000-0000-0000-000000000003', name: 'Health & Personal Care' }
];

let mockProducts = [
  {
    id: '22000000-0000-0000-0000-000000000001',
    category_id: '11000000-0000-0000-0000-000000000001',
    category_name: 'kitchen wares',
    country: 'Nigeria',
    name: 'POT LID HOLDER',
    description: 'Adjustable kitchen pot lid rack & organizer',
    cost_price: 3000,
    base_price: 18500,
    sku: 'POT-LID-HOLDER',
    variation_1: '',
    variation_2: '',
    price_bundles: [
      { qty: 1, label: '1 POT LID HOLDER + Free Delivery', price: 18500 },
      { qty: 2, label: '2 POT LID HOLDER + Free Delivery', price: 35500 },
      { qty: 3, label: '3 POT LID HOLDER + Free Delivery', price: 52500 }
    ],
    available_stock: 0,
    is_active: true
  },
  {
    id: '22000000-0000-0000-0000-000000000002',
    category_id: '11000000-0000-0000-0000-000000000002',
    category_name: 'household gadgets',
    country: 'Nigeria',
    name: 'ROD HOLDER',
    description: 'Wall mounted adhesive curtain rod holder bracket',
    cost_price: 1000,
    base_price: 18500,
    sku: 'ROD-HOLDER',
    variation_1: '',
    variation_2: '',
    price_bundles: [
      { qty: 4, label: '4 ROD HOLDER + Free Delivery', price: 18500 },
      { qty: 8, label: '8 ROD HOLDER + Free Delivery', price: 34500 },
      { qty: 12, label: '12 ROD HOLDER + Free Delivery', price: 48500 },
      { qty: 16, label: '16 ROD HOLDER + Free Delivery', price: 65500 }
    ],
    available_stock: 0,
    is_active: true
  },
  {
    id: '22000000-0000-0000-0000-000000000003',
    category_id: '11000000-0000-0000-0000-000000000001',
    category_name: 'kitchen wares',
    country: 'Nigeria',
    name: 'Luxury Food Warmer',
    description: 'Stainless steel thermal serving dish container set',
    cost_price: 310000,
    base_price: 525500,
    sku: 'LUX-FOOD-WARMER',
    variation_1: '',
    variation_2: '',
    price_bundles: [
      { qty: 1, label: '1 set of Luxury Food Warmer', price: 525500 },
      { qty: 2, label: '2 sets of Luxury Food Warmer', price: 1025000 },
      { qty: 3, label: '3 sets of Luxury Food Warmer', price: 1550498 }
    ],
    available_stock: 0,
    is_active: true
  },
  {
    id: '22000000-0000-0000-0000-000000000004',
    category_id: '11000000-0000-0000-0000-000000000002',
    category_name: 'household gadgets',
    country: 'Nigeria',
    name: 'Luxe carry',
    description: 'Foldable shopping bag & storage tote cart',
    cost_price: 15000,
    base_price: 48500,
    sku: 'LUXE-CARRY',
    variation_1: '',
    variation_2: '',
    price_bundles: [
      { qty: 1, label: '1 Luxe carry + Free Delivery', price: 48500 },
      { qty: 2, label: '2 Luxe carry + Free Delivery', price: 97500 },
      { qty: 3, label: '3 Luxe carry + Free Delivery', price: 140500 }
    ],
    available_stock: 50,
    is_active: true
  }
];

export async function getProducts(req, res) {
  const { store_id } = req.query;
  if (supabase) {
    let query = supabase.from('products').select('*');
    if (store_id) query = query.eq('store_id', store_id);
    const { data, error } = await query;
    if (!error && data && data.length > 0) return res.json(data);
  }

  let list = [...mockProducts];
  if (store_id && store_id !== '00000000-0000-0000-0000-000000000001' && !store_id.startsWith('a100') && !store_id.startsWith('u100')) {
    const filtered = list.filter(p => p.store_id === store_id);
    if (filtered.length > 0) list = filtered;
  }
  res.json(list);
}

export async function getCategories(req, res) {
  if (supabase) {
    const { data, error } = await supabase.from('product_categories').select('*');
    if (!error && data && data.length > 0) return res.json(data);
  }
  res.json(mockCategories);
}

export async function createProduct(req, res) {
  const {
    name, category_id, category_name, country, description,
    cost_price, base_price, sku, initial_stock, price_bundles,
    store_id
  } = req.body;

  const newProduct = {
    id: `22000000-0000-0000-0000-${Date.now().toString().padStart(12, '0').slice(-12)}`,
    store_id: store_id || req.query.store_id || null,
    category_id: category_id || mockCategories[0].id,
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
    images: ['https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=500&auto=format&fit=crop'],
    has_variants: false,
    is_active: true,
    available_stock: Number(initial_stock) || 0,
    created_at: new Date().toISOString()
  };

  if (supabase) {
    const { data, error } = await supabase.from('products').insert([newProduct]).select();
    if (!error && data && data.length > 0) {
      mockProducts.unshift(data[0]);
      return res.status(201).json(data[0]);
    }
  }

  mockProducts.unshift(newProduct);
  res.status(201).json(newProduct);
}

export async function updateProduct(req, res) {
  const { id } = req.params;
  const updates = req.body;

  if (supabase) {
    const { data, error } = await supabase.from('products').update(updates).eq('id', id).select();
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
