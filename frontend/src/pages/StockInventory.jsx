import React, { useState, useEffect } from 'react';
import {
  Package, Plus, TrendingUp, AlertTriangle, Layers,
  RefreshCw, History, ArrowUpRight, ArrowDownRight, Search, X, Check
} from 'lucide-react';
import { AFRICAN_LOCATIONS } from '../data/africanLocations';
import { useAuth } from '../context/AuthContext';

export default function StockInventory({ products = [], selectedCountry, onProductUpdated }) {
  const { user } = useAuth();
  const currentCountryObj = AFRICAN_LOCATIONS.find(c => c.country === selectedCountry) || AFRICAN_LOCATIONS[0];
  const curr = currentCountryObj.currency;

  const [searchTerm, setSearchTerm] = useState('');
  const [stockMovements, setStockMovements] = useState([]);
  const [loadingMovements, setLoadingMovements] = useState(true);

  // Modal State for Restock / Stock Adjustment
  const [selectedProductForAdjust, setSelectedProductForAdjust] = useState(null);
  const [adjustType, setAdjustType] = useState('restock'); // 'restock' or 'manual_adjustment'
  const [adjustDelta, setAdjustDelta] = useState('');
  const [adjustNote, setAdjustNote] = useState('');
  const [submittingAdjust, setSubmittingAdjust] = useState(false);

  // Fetch Stock Movement History Ledger
  const fetchStockMovements = async () => {
    try {
      const token = localStorage.getItem('gravity_crm_token');
      const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};
      const storeId = user?.store_id || user?.id || '';
      const res = await fetch(`/api/stock-movements?store_id=${storeId}`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setStockMovements(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching stock movements:', err);
    } finally {
      setLoadingMovements(false);
    }
  };

  useEffect(() => {
    fetchStockMovements();
  }, [user]);

  // Calculate Metrics
  const totalStockUnits = products.reduce((sum, p) => sum + (Number(p.available_stock) || 0), 0);
  const totalValuation = products.reduce((sum, p) => sum + ((Number(p.available_stock) || 0) * (Number(p.cost_price) || Number(p.base_price) || 0)), 0);
  const lowStockCount = products.filter(p => (Number(p.available_stock) || 0) > 0 && (Number(p.available_stock) || 0) <= 10).length;
  const outOfStockCount = products.filter(p => (Number(p.available_stock) || 0) === 0).length;

  const filteredProducts = products.filter(p =>
    !searchTerm ||
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Submit Restock / Adjustment
  const handleStockAdjustSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProductForAdjust || !adjustDelta) return;

    const deltaNum = adjustType === 'restock' ? Math.abs(Number(adjustDelta)) : Number(adjustDelta);
    setSubmittingAdjust(true);

    try {
      const token = localStorage.getItem('gravity_crm_token');
      const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch('/api/stock-movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          product_id: selectedProductForAdjust.id,
          movement_type: adjustType,
          quantity_delta: deltaNum,
          note: adjustNote || (adjustType === 'restock' ? 'Inventory Restock Batch' : 'Manual Stock Adjustment')
        })
      });

      if (res.ok) {
        // Update product stock locally
        const updatedStock = Math.max(0, (Number(selectedProductForAdjust.available_stock) || 0) + deltaNum);
        if (onProductUpdated) {
          onProductUpdated({ ...selectedProductForAdjust, available_stock: updatedStock });
        }
        fetchStockMovements();
        setSelectedProductForAdjust(null);
        setAdjustDelta('');
        setAdjustNote('');
      }
    } catch (err) {
      console.error('Error submitting stock adjustment:', err);
    } finally {
      setSubmittingAdjust(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" /> Warehouse Stock Inventory & Ledger
          </h2>
          <p className="text-xs text-slate-400">
            Real-time stock counts, total inventory valuation, and append-only audit trail
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl border-indigo-500/30 bg-indigo-950/10">
          <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider block">Total Available Stock</span>
          <h3 className="text-2xl font-extrabold text-slate-100 mt-1">{totalStockUnits.toLocaleString()} Units</h3>
          <p className="text-[10px] text-slate-400 mt-1">Across all catalog items</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border-emerald-500/30 bg-emerald-950/10">
          <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">Stock Valuation (Cost)</span>
          <h3 className="text-2xl font-extrabold text-slate-100 mt-1">{curr}{totalValuation.toLocaleString()}</h3>
          <p className="text-[10px] text-slate-400 mt-1">Total physical inventory worth</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border-amber-500/30 bg-amber-950/10">
          <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">Low Stock Alert (≤10)</span>
          <h3 className="text-2xl font-extrabold text-slate-100 mt-1">{lowStockCount} Products</h3>
          <p className="text-[10px] text-slate-400 mt-1">Reorder threshold reached</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border-rose-500/30 bg-rose-950/10">
          <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider block">Out of Stock (0)</span>
          <h3 className="text-2xl font-extrabold text-slate-100 mt-1">{outOfStockCount} Products</h3>
          <p className="text-[10px] text-slate-400 mt-1">Requires immediate restocking</p>
        </div>
      </div>

      {/* Main Stock Inventory Table */}
      <div className="glass p-5 rounded-2xl border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Package className="w-4 h-4 text-indigo-400" /> Current Stock Counts by Product
          </h3>
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
            <input
              type="text"
              placeholder="Search product stock..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="input pl-9 text-xs py-1.5"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3">Product Name & SKU</th>
                <th className="p-3">Category</th>
                <th className="p-3">Cost Price</th>
                <th className="p-3">Selling Price</th>
                <th className="p-3">In-Stock Qty</th>
                <th className="p-3">Stock Valuation</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-500 italic">No products found matching stock criteria.</td>
                </tr>
              ) : (
                filteredProducts.map(p => {
                  const stock = Number(p.available_stock) || 0;
                  const cost = Number(p.cost_price) || Number(p.base_price) || 0;
                  const valuation = stock * cost;

                  let statusBadge = <span className="badge badge-delivered font-bold">In Stock</span>;
                  if (stock === 0) {
                    statusBadge = <span className="badge badge-danger font-bold">Out of Stock</span>;
                  } else if (stock <= 10) {
                    statusBadge = <span className="badge badge-scheduled font-bold">Low Stock ({stock})</span>;
                  }

                  return (
                    <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-3">
                        <span className="font-bold text-slate-100 block">{p.name}</span>
                        <span className="text-[10px] font-mono text-indigo-400">{p.sku || 'N/A'}</span>
                      </td>
                      <td className="p-3 text-slate-300 capitalize">{p.category_name || 'General'}</td>
                      <td className="p-3 text-slate-300 font-semibold">{curr}{cost.toLocaleString()}</td>
                      <td className="p-3 font-bold text-emerald-400">{curr}{(Number(p.base_price) || 0).toLocaleString()}</td>
                      <td className="p-3 font-extrabold text-slate-100 flex items-center gap-2">
                        {stock} {statusBadge}
                      </td>
                      <td className="p-3 font-bold text-indigo-300">{curr}{valuation.toLocaleString()}</td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedProductForAdjust(p);
                              setAdjustType('restock');
                              setAdjustDelta('20');
                            }}
                            className="btn-primary py-1 px-2.5 text-[11px] font-bold"
                          >
                            <Plus className="w-3 h-3 inline mr-1" /> Restock
                          </button>
                          <button
                            onClick={() => {
                              setSelectedProductForAdjust(p);
                              setAdjustType('manual_adjustment');
                              setAdjustDelta('-1');
                            }}
                            className="btn-ghost py-1 px-2.5 text-[11px] border-slate-700 text-slate-300"
                          >
                            Audit / Adjust
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock Movement Audit Trail Ledger */}
      <div className="glass p-5 rounded-2xl border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <History className="w-4 h-4 text-amber-400" /> Stock Movements Audit Trail Ledger
        </h3>

        <div className="overflow-x-auto">
          {loadingMovements ? (
            <div className="p-6 text-center text-xs text-slate-400 animate-pulse">Loading stock ledger...</div>
          ) : stockMovements.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500 italic bg-slate-950/40 rounded-xl">No stock movements recorded yet.</div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Movement Type</th>
                  <th className="p-3">Quantity Delta</th>
                  <th className="p-3">Reason / Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {stockMovements.map((sm, idx) => (
                  <tr key={sm.id || idx} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-3 font-mono text-[11px] text-slate-400">{new Date(sm.created_at || Date.now()).toLocaleString()}</td>
                    <td className="p-3 font-semibold uppercase text-indigo-300">{sm.movement_type || 'Restock'}</td>
                    <td className="p-3 font-extrabold">
                      {sm.quantity_delta > 0 ? (
                        <span className="text-emerald-400 flex items-center gap-1"><ArrowUpRight className="w-3.5 h-3.5" /> +{sm.quantity_delta} Units</span>
                      ) : (
                        <span className="text-rose-400 flex items-center gap-1"><ArrowDownRight className="w-3.5 h-3.5" /> {sm.quantity_delta} Units</span>
                      )}
                    </td>
                    <td className="p-3 text-slate-300 font-medium">{sm.note || 'Inventory Adjustment'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Restock & Adjustment Modal */}
      {selectedProductForAdjust && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass w-full max-w-md p-6 rounded-2xl border-slate-700 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-indigo-400" /> Adjust Stock: {selectedProductForAdjust.name}
              </h3>
              <button onClick={() => setSelectedProductForAdjust(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleStockAdjustSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Adjustment Type</label>
                <select
                  value={adjustType}
                  onChange={e => setAdjustType(e.target.value)}
                  className="select w-full text-xs py-2.5"
                >
                  <option value="restock" className="bg-slate-900">+ Add Restock Batch (Receive Stock)</option>
                  <option value="manual_adjustment" className="bg-slate-900">± Manual Audit / Inventory Correction</option>
                  <option value="return" className="bg-slate-900">+ Return from Cancelled Delivery</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Quantity Delta *</label>
                <input
                  type="number"
                  required
                  placeholder={adjustType === 'restock' ? 'e.g. 50' : 'e.g. -2'}
                  value={adjustDelta}
                  onChange={e => setAdjustDelta(e.target.value)}
                  className="input text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Reason / Note</label>
                <input
                  type="text"
                  placeholder="e.g. Batch #204 from Guangzhou Supplier"
                  value={adjustNote}
                  onChange={e => setAdjustNote(e.target.value)}
                  className="input text-xs"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button type="button" onClick={() => setSelectedProductForAdjust(null)} className="w-1/2 btn-ghost py-2.5 text-xs">
                  Cancel
                </button>
                <button type="submit" disabled={submittingAdjust} className="w-1/2 btn-primary py-2.5 text-xs">
                  {submittingAdjust ? 'Saving...' : 'Confirm Stock Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
