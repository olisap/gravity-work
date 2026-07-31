import { supabase } from '../config/supabase.js';

let mockAgents = [];

export async function getDeliveryAgents(req, res) {
  const storeId = req.user?.store_id || req.query.store_id;

  if (supabase) {
    let query = supabase.from('delivery_agents').select('*').order('created_at', { ascending: false });
    if (storeId) query = query.eq('store_id', storeId);
    const { data, error } = await query;
    if (!error && data) {
      if (data.length > 0) return res.json(data);
      if (storeId) return res.json([]);
    }
  }

  let filtered = [...mockAgents];
  if (storeId && storeId !== '00000000-0000-0000-0000-000000000001') {
    filtered = filtered.filter(a => a.store_id === storeId);
  }
  res.json(filtered);
}

export async function createDeliveryAgent(req, res) {
  const storeId = req.user?.store_id || req.body.store_id;
  const newAgent = {
    id: `agent-${Date.now()}`,
    store_id: storeId,
    name: req.body.name,
    fleet_type: req.body.fleet_type || 'Internal Rider',
    phone: req.body.phone || '',
    coverage_states: req.body.coverage_states || [],
    successful_delivery_fee: Number(req.body.successful_delivery_fee) || 2000,
    failed_delivery_fee: Number(req.body.failed_delivery_fee) || 1000,
    status: req.body.status || 'Active',
    assigned_stock: req.body.assigned_stock || [],
    delivered_orders_count: 0,
    failed_orders_count: 0,
    total_cod_collected: 0,
    created_at: new Date().toISOString()
  };

  if (supabase) {
    const { data, error } = await supabase.from('delivery_agents').insert([newAgent]).select();
    if (!error && data && data.length > 0) {
      mockAgents.unshift(data[0]);
      return res.status(201).json(data[0]);
    }
  }

  mockAgents.unshift(newAgent);
  res.status(201).json(newAgent);
}

export async function updateDeliveryAgent(req, res) {
  const { id } = req.params;
  const updates = req.body;

  if (supabase) {
    const { data, error } = await supabase.from('delivery_agents').update(updates).eq('id', id).select();
    if (!error && data && data.length > 0) {
      const idx = mockAgents.findIndex(a => a.id === id);
      if (idx !== -1) mockAgents[idx] = { ...mockAgents[idx], ...data[0] };
      return res.json(data[0]);
    }
  }

  const idx = mockAgents.findIndex(a => a.id === id);
  if (idx !== -1) {
    mockAgents[idx] = { ...mockAgents[idx], ...updates };
    return res.json(mockAgents[idx]);
  }
  res.status(404).json({ error: 'Delivery Agent not found' });
}

export async function assignStockToAgent(req, res) {
  const { id } = req.params;
  const { product_id, product_name, quantity } = req.body;

  const agent = mockAgents.find(a => a.id === id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });

  const stockList = Array.isArray(agent.assigned_stock) ? [...agent.assigned_stock] : [];
  const existingIdx = stockList.findIndex(s => s.product_id === product_id);

  if (existingIdx !== -1) {
    stockList[existingIdx].quantity += Number(quantity);
  } else {
    stockList.push({ product_id, product_name, quantity: Number(quantity) });
  }

  agent.assigned_stock = stockList;

  if (supabase) {
    await supabase.from('delivery_agents').update({ assigned_stock: stockList }).eq('id', id);
  }

  res.json(agent);
}

export async function deleteDeliveryAgent(req, res) {
  const { id } = req.params;
  if (supabase) {
    await supabase.from('delivery_agents').delete().eq('id', id);
  }
  mockAgents = mockAgents.filter(a => a.id !== id);
  res.json({ success: true, message: 'Delivery Agent deleted' });
}
