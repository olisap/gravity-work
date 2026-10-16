import { supabase } from '../config/supabase.js';

let mockExpenses = [];

export async function getExpenses(req, res) {
  const storeId = req.storeId || req.query.store_id || req.user?.store_id;

  if (supabase) {
    try {
      let query = supabase.from('expenses').select('*').order('expense_date', { ascending: false });
      if (storeId) query = query.eq('store_id', storeId);
      const { data, error } = await query;
      if (!error && data) {
        return res.json(data);
      }
      if (error) {
        console.error('Error fetching expenses from Supabase:', error);
      }
    } catch (e) {
      console.error('getExpenses exception:', e);
    }
  }

  let filtered = [...mockExpenses];
  if (storeId && storeId !== '00000000-0000-0000-0000-000000000001') {
    filtered = filtered.filter(e => e.store_id === storeId);
  }
  res.json(filtered);
}

export async function createExpense(req, res) {
  const storeId = req.storeId || req.body.store_id || req.user?.store_id;
  const { title, category, amount, expense_date } = req.body;

  if (!title || amount === undefined || amount === null) {
    return res.status(400).json({ error: 'Title and amount are required' });
  }

  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount < 0) {
    return res.status(400).json({ error: 'Valid amount is required' });
  }

  const newExpense = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `exp-${Date.now()}`,
    store_id: storeId || null,
    title: String(title).trim(),
    category: category || 'Advertising',
    amount: numAmount,
    expense_date: expense_date || new Date().toISOString().slice(0, 10),
    created_at: new Date().toISOString()
  };

  if (supabase) {
    try {
      const { data, error } = await supabase.from('expenses').insert([newExpense]).select();
      if (!error && data && data.length > 0) {
        mockExpenses.unshift(data[0]);
        return res.status(201).json(data[0]);
      }
      if (error) {
        console.error('Error creating expense in Supabase:', error);
        return res.status(500).json({ error: 'Failed to record expense' });
      }
    } catch (e) {
      console.error('createExpense exception:', e);
      return res.status(500).json({ error: 'Failed to record expense' });
    }
  }

  mockExpenses.unshift(newExpense);
  res.status(201).json(newExpense);
}

export async function deleteExpense(req, res) {
  const { id } = req.params;
  const storeId = req.storeId || req.query.store_id || req.user?.store_id;

  if (supabase) {
    try {
      let query = supabase.from('expenses').delete().eq('id', id);
      if (storeId) query = query.eq('store_id', storeId);
      const { error } = await query;
      if (!error) {
        mockExpenses = mockExpenses.filter(e => e.id !== id);
        return res.json({ success: true, message: 'Expense deleted' });
      }
      console.error('Error deleting expense from Supabase:', error);
      return res.status(500).json({ error: 'Failed to delete expense' });
    } catch (e) {
      console.error('deleteExpense exception:', e);
      return res.status(500).json({ error: 'Failed to delete expense' });
    }
  }

  const beforeLen = mockExpenses.length;
  mockExpenses = mockExpenses.filter(e => e.id !== id);
  if (mockExpenses.length < beforeLen) {
    return res.json({ success: true, message: 'Expense deleted' });
  }
  res.status(404).json({ error: 'Expense not found' });
}
