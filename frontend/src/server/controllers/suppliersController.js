import { supabase } from '../config/supabase.js';

let mockSuppliers = [];

export async function getSuppliers(req, res) {
  const storeId = req.storeId;

  if (supabase) {
    let query = supabase.from('suppliers').select('*').order('created_at', { ascending: false });
    if (storeId) query = query.eq('store_id', storeId);
    const { data, error } = await query;
    if (!error && data) {
      if (data.length > 0) return res.json(data);
      if (storeId) return res.json([]);
    }
  }

  let filtered = [...mockSuppliers];
  if (storeId && storeId !== '00000000-0000-0000-0000-000000000001') {
    filtered = filtered.filter(s => s.store_id === storeId);
  }
  res.json(filtered);
}

export async function createSupplier(req, res) {
  const storeId = req.storeId;
  const newSupplier = {
    id: `sup-${Date.now()}`,
    store_id: storeId,
    name: req.body.name,
    contact_person: req.body.contact_person || '',
    email: req.body.email || '',
    phone: req.body.phone || '',
    country: req.body.country || 'China',
    lead_time_days: Number(req.body.lead_time_days) || 14,
    status: req.body.status || 'Active',
    created_at: new Date().toISOString()
  };

  if (supabase) {
    const { data, error } = await supabase.from('suppliers').insert([newSupplier]).select();
    if (!error && data && data.length > 0) {
      mockSuppliers.unshift(data[0]);
      return res.status(201).json(data[0]);
    }
  }

  mockSuppliers.unshift(newSupplier);
  res.status(201).json(newSupplier);
}

export async function updateSupplier(req, res) {
  const { id } = req.params;
  const updates = req.body;

  if (supabase) {
    const { data, error } = await supabase.from('suppliers').update(updates).eq('id', id).eq('store_id', req.storeId).select();
    if (!error && data && data.length > 0) {
      const idx = mockSuppliers.findIndex(s => s.id === id);
      if (idx !== -1) mockSuppliers[idx] = { ...mockSuppliers[idx], ...data[0] };
      return res.json(data[0]);
    }
  }

  const idx = mockSuppliers.findIndex(s => s.id === id);
  if (idx !== -1) {
    mockSuppliers[idx] = { ...mockSuppliers[idx], ...updates };
    return res.json(mockSuppliers[idx]);
  }
  res.status(404).json({ error: 'Supplier not found' });
}

export async function deleteSupplier(req, res) {
  const { id } = req.params;
  if (supabase) {
    const { error } = await supabase.from('suppliers').delete().eq('id', id).eq('store_id', req.storeId);
    if (error) return res.status(502).json({ error: 'Supplier could not be deleted from Supabase', details: error.message });
  }
  mockSuppliers = mockSuppliers.filter(s => s.id !== id);
  res.json({ success: true, message: 'Supplier deleted' });
}
