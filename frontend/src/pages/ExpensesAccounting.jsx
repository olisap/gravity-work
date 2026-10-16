import React, { useState, useEffect } from 'react';
import { Wallet, Plus, TrendingDown, DollarSign, PieChart, ShieldAlert, Trash2, Loader2, Calendar } from 'lucide-react';
import { AFRICAN_LOCATIONS } from '../data/africanLocations';
import { useAuth } from '../context/AuthContext';
import { apiUrl } from '../utils/apiUrl';

export default function ExpensesAccounting({ selectedCountry, orders = [] }) {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Advertising');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const loc = AFRICAN_LOCATIONS.find(c => c.country === selectedCountry) || AFRICAN_LOCATIONS[0];
  const curr = loc.currency;

  const fetchExpenses = async () => {
    try {
      const token = localStorage.getItem('gravity_crm_token');
      const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};
      const storeId = user?.store_id || user?.id || '';
      const res = await fetch(apiUrl(`/api/expenses?store_id=${storeId}`), { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setExpenses(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [user]);

  const totalDeliveredRevenue = orders
    .filter(o => o.status === 'Delivered')
    .reduce((sum, o) => sum + (o.total_amount || 0), 0);

  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const netProfit = totalDeliveredRevenue - totalExpenses;

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!title || !amount) return;
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('gravity_crm_token');
      const authHeaders = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      };
      const storeId = user?.store_id || user?.id || '';
      const res = await fetch(apiUrl('/api/expenses'), {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          store_id: storeId,
          title: title.trim(),
          category,
          amount: Number(amount),
          expense_date: expenseDate || new Date().toISOString().slice(0, 10)
        })
      });

      if (res.ok) {
        const created = await res.json();
        setExpenses(prev => [created, ...prev]);
        setShowAddModal(false);
        setTitle('');
        setAmount('');
        setExpenseDate(new Date().toISOString().slice(0, 10));
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to save expense');
      }
    } catch (err) {
      console.error('Failed to create expense:', err);
      alert('Network error while saving expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm('Are you sure you want to delete this recorded expense?')) return;
    setDeletingId(id);
    try {
      const token = localStorage.getItem('gravity_crm_token');
      const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};
      const storeId = user?.store_id || user?.id || '';
      const res = await fetch(apiUrl(`/api/expenses/${id}?store_id=${storeId}`), {
        method: 'DELETE',
        headers: authHeaders
      });

      if (res.ok) {
        setExpenses(prev => prev.filter(e => e.id !== id));
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to delete expense');
      }
    } catch (err) {
      console.error('Failed to delete expense:', err);
      alert('Network error while deleting expense');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <h2 className="section-title">
            <Wallet className="w-5 h-5 text-indigo-400" /> Accounting & Expense Ledger
          </h2>
          <p className="section-subtitle">Track operational costs, delivery expenses, ad spends, and calculate net profit margins</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-primary text-xs self-start sm:self-auto">
          <Plus className="w-4 h-4" /> + Record Expense
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass p-5 rounded-2xl border-emerald-500/30">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Total Collected Revenue</p>
          <p className="text-2xl font-extrabold text-slate-100 mt-1">{curr}{totalDeliveredRevenue.toLocaleString()}</p>
          <p className="text-[11px] text-slate-500 mt-1">From delivered COD orders</p>
        </div>

        <div className="glass p-5 rounded-2xl border-rose-500/30">
          <p className="text-[11px] font-bold uppercase tracking-wider text-rose-400">Total Operational Expenses</p>
          <p className="text-2xl font-extrabold text-slate-100 mt-1">{curr}{totalExpenses.toLocaleString()}</p>
          <p className="text-[11px] text-slate-500 mt-1">Ads, logistics, packaging & overhead</p>
        </div>

        <div className="glass p-5 rounded-2xl border-indigo-500/30">
          <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">Net Estimated Profit</p>
          <p className={`text-2xl font-extrabold mt-1 ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {curr}{netProfit.toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Delivered revenue minus recorded expenses</p>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-100">Recorded Business Expenses</h3>
          <span className="text-xs text-slate-400">{expenses.length} {expenses.length === 1 ? 'entry' : 'entries'}</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
            <p className="text-xs">Loading store expenses ledger...</p>
          </div>
        ) : expenses.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-800/80 flex items-center justify-center mx-auto text-slate-400">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-200">No expenses recorded yet</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Record Facebook ad spend, logistics courier fees, packaging costs, and overhead to automatically calculate true net profitability.
              </p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary text-xs px-4 py-2 mt-2"
            >
              <Plus className="w-3.5 h-3.5" /> Record First Expense
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Expense Item</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map(e => (
                  <tr key={e.id}>
                    <td className="font-mono text-slate-400 text-xs">
                      {e.expense_date || (e.created_at ? e.created_at.slice(0, 10) : '—')}
                    </td>
                    <td className="font-semibold text-slate-200">{e.title}</td>
                    <td>
                      <span className="badge badge-pending text-xs">{e.category}</span>
                    </td>
                    <td className="font-bold text-rose-400">{curr}{Number(e.amount || 0).toLocaleString()}</td>
                    <td className="text-right">
                      <button
                        onClick={() => handleDeleteExpense(e.id)}
                        disabled={deletingId === e.id}
                        className="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors"
                        title="Delete expense"
                      >
                        {deletingId === e.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD EXPENSE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass w-full max-w-md p-6 rounded-2xl border-slate-700 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-100">Record New Business Expense</h3>
            <form onSubmit={handleAddExpense} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Expense Title / Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Meta Ads — Ear Cleaner Campaign"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="input text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="select w-full text-xs py-2.5"
                  >
                    <option value="Advertising">Advertising / Meta Ads</option>
                    <option value="Logistics">Logistics / Dispatch</option>
                    <option value="Packaging">Packaging & Supplies</option>
                    <option value="Salaries">Staff / Agent Salaries</option>
                    <option value="Software">Software & Subscriptions</option>
                    <option value="Other">Other Operational Overhead</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Amount ({curr})</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="any"
                    placeholder="25000"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="input text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Expense Date</label>
                <input
                  type="date"
                  required
                  value={expenseDate}
                  onChange={e => setExpenseDate(e.target.value)}
                  className="input text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-1/2 btn-ghost py-2 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-1/2 btn-primary py-2 text-xs"
                >
                  {isSubmitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                  ) : (
                    'Save to Ledger'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
