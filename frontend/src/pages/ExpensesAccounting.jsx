import React, { useState } from 'react';
import { Wallet, Plus, TrendingDown, DollarSign, PieChart, ShieldAlert } from 'lucide-react';
import { AFRICAN_LOCATIONS } from '../data/africanLocations';

export default function ExpensesAccounting({ selectedCountry, orders = [] }) {
  const [expenses, setExpenses] = useState([
    { id: 1, title: 'Facebook Ads - Lunchbox Campaign', category: 'Advertising', amount: 45000, date: '2026-07-20' },
    { id: 2, title: 'Speedaf Logistics Dispatch Fees', category: 'Logistics', amount: 18000, date: '2026-07-21' },
    { id: 3, title: 'Custom Printed Packaging Boxes', category: 'Packaging', amount: 25000, date: '2026-07-19' },
  ]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Advertising');
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loc = AFRICAN_LOCATIONS.find(c => c.country === selectedCountry) || AFRICAN_LOCATIONS[0];
  const curr = loc.currency;

  const totalDeliveredRevenue = orders
    .filter(o => o.status === 'Delivered')
    .reduce((sum, o) => sum + (o.total_amount || 0), 0);

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = totalDeliveredRevenue - totalExpenses;

  const handleAddExpense = (e) => {
    e.preventDefault();
    if (!title || !amount) return;
    setIsSubmitting(true);
    
    // Simulate network request
    setTimeout(() => {
      setExpenses(prev => [
        { id: Date.now(), title, category, amount: Number(amount), date: new Date().toISOString().slice(0, 10) },
        ...prev
      ]);
      setShowAddModal(false);
      setTitle('');
      setAmount('');
      setIsSubmitting(false);
    }, 600);
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
          <p className="text-[11px] text-slate-500 mt-1">Ads, logistics, packaging</p>
        </div>

        <div className="glass p-5 rounded-2xl border-indigo-500/30">
          <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">Net Estimated Profit</p>
          <p className="text-2xl font-extrabold text-slate-100 mt-1">{curr}{netProfit.toLocaleString()}</p>
          <p className="text-[11px] text-slate-500 mt-1">Revenue minus operational costs</p>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800">
          <h3 className="text-sm font-bold text-slate-100">Recorded Business Expenses</h3>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Expense Item</th>
              <th>Category</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map(e => (
              <tr key={e.id}>
                <td className="font-mono text-slate-400">{e.date}</td>
                <td className="font-semibold text-slate-200">{e.title}</td>
                <td><span className="badge badge-pending">{e.category}</span></td>
                <td className="font-bold text-rose-400">{curr}{e.amount.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ADD EXPENSE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass w-full max-w-md p-6 rounded-2xl border-slate-700 space-y-4">
            <h3 className="text-base font-bold text-slate-100">Record New Expense</h3>
            <form onSubmit={handleAddExpense} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Expense Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. TikTok Ads Campaign"
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
                    <option value="Advertising">Advertising</option>
                    <option value="Logistics">Logistics / Freight</option>
                    <option value="Packaging">Packaging</option>
                    <option value="Salaries">Staff Salaries</option>
                    <option value="Software">Software / Subscriptions</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Amount ({curr})</label>
                  <input
                    type="number"
                    required
                    placeholder="15000"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="input text-xs"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="w-1/2 btn-ghost py-2 text-xs">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="w-1/2 btn-primary py-2 text-xs">
                  {isSubmitting ? (
                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</>
                  ) : (
                    'Save Expense'
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
