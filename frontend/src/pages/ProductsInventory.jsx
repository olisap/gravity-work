import React, { useState } from 'react';
import {
  Package, Plus, Search, MoreVertical, HelpCircle,
  Trash2, Edit, Copy, EyeOff, Tag, Globe, History,
  Settings, Check, X, FileText, AlertTriangle
} from 'lucide-react';
import { AFRICAN_LOCATIONS } from '../data/africanLocations';
import { useAuth } from '../context/AuthContext';

export default function ProductsInventory({
  products = [],
  selectedCountry,
  onProductCreated,
  onProductDeleted,
  onProductUpdated,
  onNavigateToFormBuilder
}) {
  const { user } = useAuth();
  const storeId = user?.store_id || user?.id || '';

  const [selectedProductFilter, setSelectedProductFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [activeMenuProductId, setActiveMenuProductId] = useState(null);

  // Modals
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showEditProductModal, setShowEditProductModal] = useState(null);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(null);
  const [showPriceVariationsModal, setShowPriceVariationsModal] = useState(null);
  const [showStockHistoryModal, setShowStockHistoryModal] = useState(null);
  const [showDeliveryFeeModal, setShowDeliveryFeeModal] = useState(false);

  // Add/Edit Product Form State
  const [formProdName, setFormProdName] = useState('');
  const [formCategory, setFormCategory] = useState('kitchen wares');
  const [formCountry, setFormCountry] = useState(selectedCountry || 'Nigeria');
  const [formCostPrice, setFormCostPrice] = useState('');
  const [formBasePrice, setFormBasePrice] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formStock, setFormStock] = useState('50');

  // Bundles State (Multiple Selling Price Tiers)
  const [bundles, setBundles] = useState([
    { qty: 1, label: '1 Product + Free Delivery', price: '18500' },
    { qty: 2, label: '2 Products + Free Delivery', price: '35500' },
    { qty: 3, label: '3 Products + Free Delivery', price: '52500' }
  ]);

  const currentCountryObj = AFRICAN_LOCATIONS.find(c => c.country === selectedCountry) || AFRICAN_LOCATIONS[0];
  const curr = currentCountryObj.currency;

  // Filtered Products
  const filteredProducts = products.filter(p => {
    const matchesFilter = !selectedProductFilter || p.id === selectedProductFilter;
    const matchesSearch = !searchTerm ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Select all checkbox
  const toggleSelectAll = () => {
    if (selectedProductIds.length === filteredProducts.length) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(filteredProducts.map(p => p.id));
    }
  };

  const toggleSelectProduct = (id) => {
    setSelectedProductIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Open Add Product Modal
  const openAddModal = () => {
    setFormProdName('');
    setFormCategory('kitchen wares');
    setFormCountry(selectedCountry || 'Nigeria');
    setFormCostPrice('');
    setFormBasePrice('');
    setFormSku('');
    setFormStock('50');
    setBundles([
      { qty: 1, label: '1 Item + Free Delivery', price: '18500' },
      { qty: 2, label: '2 Items + Free Delivery', price: '35500' }
    ]);
    setShowAddProductModal(true);
  };

  // Open Edit Product Modal
  const openEditModal = (p) => {
    setShowEditProductModal(p);
    setFormProdName(p.name);
    setFormCategory(p.category_name || 'kitchen wares');
    setFormCountry(p.country || selectedCountry || 'Nigeria');
    setFormCostPrice(p.cost_price || '');
    setFormBasePrice(p.base_price || '');
    setFormSku(p.sku || '');
    setFormStock(p.available_stock || '0');
    setBundles(p.price_bundles || [
      { qty: 1, label: `1 ${p.name} + Free Delivery`, price: p.base_price }
    ]);
    setActiveMenuProductId(null);
  };

  // Add Bundle Row
  const addBundleRow = () => {
    setBundles(prev => [...prev, { qty: prev.length + 1, label: `${prev.length + 1} Items + Free Delivery`, price: '' }]);
  };

  // Submit Create Product
  const handleCreateProduct = async (e) => {
    e.preventDefault();
    if (!formProdName || !formBasePrice) return;

    const payload = {
      store_id: storeId,
      name: formProdName,
      category_name: formCategory,
      country: formCountry,
      cost_price: Number(formCostPrice) || 0,
      base_price: Number(formBasePrice) || 0,
      sku: formSku || `${formProdName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8)}-${Date.now().toString().slice(-4)}`,
      initial_stock: Number(formStock) || 0,
      price_bundles: bundles.map(b => ({
        qty: Number(b.qty),
        label: b.label || `${b.qty} ${formProdName} + Free Delivery`,
        price: Number(b.price) || Number(formBasePrice)
      }))
    };

    try {
      const token = localStorage.getItem('gravity_crm_token');
      const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const created = await res.json();
        if (onProductCreated) onProductCreated(created);
      }
    } catch (err) {
      console.error('Error creating product:', err);
    }

    setShowAddProductModal(false);
  };

  // Submit Edit Product
  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    if (!showEditProductModal) return;

    const payload = {
      name: formProdName,
      category_name: formCategory,
      country: formCountry,
      cost_price: Number(formCostPrice) || 0,
      base_price: Number(formBasePrice) || 0,
      sku: formSku,
      available_stock: Number(formStock),
      price_bundles: bundles
    };

    try {
      const token = localStorage.getItem('gravity_crm_token');
      const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch(`/api/products/${showEditProductModal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const updated = await res.json();
        if (onProductUpdated) onProductUpdated(updated);
      }
    } catch (err) {
      console.error('Error updating product:', err);
    }

    setShowEditProductModal(null);
  };

  // Execute Delete Product
  const handleDeleteProduct = async (productId) => {
    try {
      const token = localStorage.getItem('gravity_crm_token');
      const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
        headers: authHeaders
      });
      if (res.ok && onProductDeleted) {
        onProductDeleted(productId);
      }
    } catch (err) {
      console.error('Error deleting product:', err);
    }
    setShowDeleteConfirmModal(null);
    setActiveMenuProductId(null);
  };

  // Bulk Delete
  const handleBulkDelete = async () => {
    if (selectedProductIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedProductIds.length} selected products?`)) return;

    for (const id of selectedProductIds) {
      await handleDeleteProduct(id);
    }
    setSelectedProductIds([]);
  };

  return (
    <div className="space-y-5 animate-fade-in text-slate-100">

      {/* Page Title & Total Count */}
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          Products ({products.length})
        </h2>
        <HelpCircle className="w-4 h-4 text-indigo-400 cursor-pointer" title="Manage products, variations, prices, and stock" />
      </div>

      {/* ── Toolbar Card (Filters & Action Buttons) ── */}
      <div className="glass p-4 rounded-2xl border-slate-800 flex flex-wrap items-center justify-between gap-3">
        {/* Left Filter Dropdown */}
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <select
            value={selectedProductFilter}
            onChange={e => setSelectedProductFilter(e.target.value)}
            className="select flex-1 py-2 text-xs"
          >
            <option value="">Select Product</option>
            {products.map(p => (
              <option key={p.id} value={p.id} className="bg-slate-900">{p.name}</option>
            ))}
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Search product..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="input py-2 text-xs w-36 sm:w-44 pr-8"
            />
            <Search className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          </div>

          {['owner', 'admin'].includes(user?.role) && (
            <button
              onClick={openAddModal}
              className="btn-primary py-2 px-4 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/30"
            >
              + Add Product
            </button>
          )}

          <button
            onClick={() => setShowDeliveryFeeModal(true)}
            className="btn-ghost py-2 px-3.5 text-xs text-indigo-300 border-indigo-500/30"
          >
            State Delivery Fee
          </button>

          <button
            onClick={() => alert('Custom States Configuration active for ' + selectedCountry)}
            className="btn-ghost py-2 px-3.5 text-xs text-slate-300"
          >
            Custom States
          </button>
        </div>
      </div>

      {/* ── Olistores-Style Products Data Table ── */}
      <div className="glass rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
        {/* Table Bulk Action Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <select
              value={selectedAction}
              onChange={e => {
                const action = e.target.value;
                if (action === 'delete') handleBulkDelete();
                setSelectedAction('');
              }}
              className="select text-xs py-1.5 px-3"
            >
              <option value="">Select Action</option>
              <option value="delete">Delete Selected ({selectedProductIds.length})</option>
              <option value="archive">Archive Selected</option>
            </select>
          </div>
          <span className="text-xs text-slate-400">
            Showing {filteredProducts.length} of {products.length} products
          </span>
        </div>

        {/* Main Table */}
        <div className="overflow-x-auto">
          <table className="data-table w-full text-xs">
            <thead>
              <tr className="bg-slate-950/90 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedProductIds.length === filteredProducts.length && filteredProducts.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3">PRODUCT NAME/CATEGORY/COUNTRY</th>
                <th className="px-4 py-3">VARIATION 1</th>
                <th className="px-4 py-3">VARIATION 2</th>
                <th className="px-4 py-3">COST PRICE</th>
                <th className="px-4 py-3">SELLING PRICE</th>
                <th className="px-4 py-3">STOCK LEFT</th>
                <th className="w-16 px-4 py-3 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-500 italic text-xs">
                    No products found. Click "+ Add Product" above to create your first product.
                  </td>
                </tr>
              ) : (
                filteredProducts.map(p => {
                  const isSelected = selectedProductIds.includes(p.id);
                  const isMenuOpen = activeMenuProductId === p.id;

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-slate-800/40 transition-colors ${isSelected ? 'bg-indigo-950/20' : ''}`}
                    >
                      {/* Checkbox */}
                      <td className="px-4 py-3.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectProduct(p.id)}
                          className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer"
                        />
                      </td>

                      {/* Product Name / Category / Country */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-0.5">
                          <p className="font-extrabold text-slate-100 text-xs tracking-wide uppercase">
                            {p.name}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            /{p.category_name || 'general'} ({p.country || selectedCountry})
                          </p>
                        </div>
                      </td>

                      {/* Variation 1 */}
                      <td className="px-4 py-3.5 text-slate-400 italic text-[11px]">
                        {p.variation_1 || '—'}
                      </td>

                      {/* Variation 2 */}
                      <td className="px-4 py-3.5 text-slate-400 italic text-[11px]">
                        {p.variation_2 || '—'}
                      </td>

                      {/* Cost Price */}
                      <td className="px-4 py-3.5 font-bold text-slate-300 font-mono">
                        {curr}{(p.cost_price || 0).toLocaleString()}
                      </td>

                      {/* Selling Price Bundles */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-1 font-mono text-[11px] text-slate-300">
                          {p.price_bundles && p.price_bundles.length > 0 ? (
                            p.price_bundles.map((b, i) => (
                              <div key={i} className="whitespace-nowrap">
                                <span className="text-slate-400 font-sans">{b.label || `${b.qty} ${p.name}`}</span>
                                <span className="text-slate-500 mx-1.5">-</span>
                                <span className="font-bold text-emerald-400">{curr}{Number(b.price).toLocaleString()}</span>
                              </div>
                            ))
                          ) : (
                            <span className="font-bold text-emerald-400">{curr}{(p.base_price || 0).toLocaleString()}</span>
                          )}
                        </div>
                      </td>

                      {/* Stock Left */}
                      <td className="px-4 py-3.5">
                        <span className={`font-extrabold font-mono text-xs ${
                          (p.available_stock || 0) > 0 ? 'text-slate-200' : 'text-rose-400'
                        }`}>
                          {p.available_stock || 0}
                        </span>
                      </td>

                      {/* Action Menu (3 Dots Popup) */}
                      <td className="px-4 py-3.5 text-right relative">
                        <button
                          onClick={() => setActiveMenuProductId(isMenuOpen ? null : p.id)}
                          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {/* Dropdown Menu matching Olistores screenshot */}
                        {isMenuOpen && (
                          <div className="absolute right-4 top-10 z-40 w-48 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl py-1 text-left animate-fade-in space-y-0.5">
                            <button
                              onClick={() => { setShowPriceVariationsModal(p); setActiveMenuProductId(null); }}
                              className="w-full px-3 py-2 text-[11px] font-semibold text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2"
                            >
                              <Tag className="w-3.5 h-3.5 text-indigo-400" /> PRICE VARIATIONS
                            </button>

                            <button
                              onClick={() => { alert(`Country Pricing active for ${p.name} (${selectedCountry})`); setActiveMenuProductId(null); }}
                              className="w-full px-3 py-2 text-[11px] font-semibold text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2"
                            >
                              <Globe className="w-3.5 h-3.5 text-cyan-400" /> COUNTRY PRICES
                            </button>

                            <button
                              onClick={() => { setShowStockHistoryModal(p); setActiveMenuProductId(null); }}
                              className="w-full px-3 py-2 text-[11px] font-semibold text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2"
                            >
                              <History className="w-3.5 h-3.5 text-amber-400" /> STOCK HISTORY
                            </button>

                            {['owner', 'admin'].includes(user?.role) && (
                              <>
                                <button
                                  onClick={() => openEditModal(p)}
                                  className="w-full px-3 py-2 text-[11px] font-semibold text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2"
                                >
                                  <Edit className="w-3.5 h-3.5 text-blue-400" /> EDIT
                                </button>

                                <button
                                  onClick={() => {
                                    handleCreateProduct({
                                      preventDefault: () => {},
                                    });
                                    alert(`Product "${p.name}" duplicated!`);
                                    setActiveMenuProductId(null);
                                  }}
                                  className="w-full px-3 py-2 text-[11px] font-semibold text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2"
                                >
                                  <Copy className="w-3.5 h-3.5 text-emerald-400" /> DUPLICATE
                                </button>

                                <button
                                  onClick={() => { alert(`Archived ${p.name}`); setActiveMenuProductId(null); }}
                                  className="w-full px-3 py-2 text-[11px] font-semibold text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2"
                                >
                                  <EyeOff className="w-3.5 h-3.5 text-slate-400" /> ARCHIVE
                                </button>

                                <div className="border-t border-slate-800 my-1"></div>

                                {/* DELETE BUTTON */}
                                <button
                                  onClick={() => { setShowDeleteConfirmModal(p); setActiveMenuProductId(null); }}
                                  className="w-full px-3 py-2 text-[11px] font-bold text-rose-400 hover:bg-rose-500/20 flex items-center gap-2"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-400" /> DELETE
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── ADD PRODUCT MODAL ── */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass w-full max-w-xl p-6 rounded-2xl border-slate-700 space-y-4 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Package className="w-5 h-5 text-indigo-400" /> + Add New Product
              </h3>
              <button onClick={() => setShowAddProductModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. POT LID HOLDER"
                  value={formProdName}
                  onChange={e => setFormProdName(e.target.value)}
                  className="input text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Category</label>
                  <input
                    type="text"
                    placeholder="e.g. kitchen wares"
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value)}
                    className="input text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Country</label>
                  <select
                    value={formCountry}
                    onChange={e => setFormCountry(e.target.value)}
                    className="select w-full text-xs py-2.5"
                  >
                    {AFRICAN_LOCATIONS.map(loc => (
                      <option key={loc.code} value={loc.country} className="bg-slate-900">{loc.country}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Cost Price ({curr})</label>
                  <input
                    type="number"
                    placeholder="3000"
                    value={formCostPrice}
                    onChange={e => setFormCostPrice(e.target.value)}
                    className="input text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Base Selling Price *</label>
                  <input
                    type="number"
                    required
                    placeholder="18500"
                    value={formBasePrice}
                    onChange={e => setFormBasePrice(e.target.value)}
                    className="input text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Stock Left</label>
                  <input
                    type="number"
                    value={formStock}
                    onChange={e => setFormStock(e.target.value)}
                    className="input text-xs"
                  />
                </div>
              </div>

              {/* Selling Price Variations / Quantity Bundles */}
              <div className="space-y-2 border-t border-slate-800 pt-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" /> Selling Price Bundles (Quantity Discounts)
                  </label>
                  <button
                    type="button"
                    onClick={addBundleRow}
                    className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300"
                  >
                    + Add Bundle Tier
                  </button>
                </div>

                {bundles.map((b, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800">
                    <input
                      type="number"
                      placeholder="Qty"
                      value={b.qty}
                      onChange={e => {
                        const val = e.target.value;
                        setBundles(prev => prev.map((item, i) => i === idx ? { ...item, qty: val } : item));
                      }}
                      className="w-14 input text-xs py-1"
                    />
                    <input
                      type="text"
                      placeholder="Bundle Label (e.g. 1 Item + Free Delivery)"
                      value={b.label}
                      onChange={e => {
                        const val = e.target.value;
                        setBundles(prev => prev.map((item, i) => i === idx ? { ...item, label: val } : item));
                      }}
                      className="flex-1 input text-xs py-1"
                    />
                    <input
                      type="number"
                      placeholder="Price"
                      value={b.price}
                      onChange={e => {
                        const val = e.target.value;
                        setBundles(prev => prev.map((item, i) => i === idx ? { ...item, price: val } : item));
                      }}
                      className="w-24 input text-xs py-1"
                    />
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-3">
                <button type="button" onClick={() => setShowAddProductModal(false)} className="w-1/2 btn-ghost py-2.5 text-xs">
                  Cancel
                </button>
                <button type="submit" className="w-1/2 btn-primary py-2.5 text-xs">
                  Save & Publish Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT PRODUCT MODAL ── */}
      {showEditProductModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass w-full max-w-xl p-6 rounded-2xl border-slate-700 space-y-4 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Edit className="w-5 h-5 text-blue-400" /> Edit Product: {showEditProductModal.name}
              </h3>
              <button onClick={() => setShowEditProductModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateProduct} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Product Name</label>
                <input
                  type="text"
                  required
                  value={formProdName}
                  onChange={e => setFormProdName(e.target.value)}
                  className="input text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Category</label>
                  <input
                    type="text"
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value)}
                    className="input text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Stock Left</label>
                  <input
                    type="number"
                    value={formStock}
                    onChange={e => setFormStock(e.target.value)}
                    className="input text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Cost Price ({curr})</label>
                  <input
                    type="number"
                    value={formCostPrice}
                    onChange={e => setFormCostPrice(e.target.value)}
                    className="input text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Base Price ({curr})</label>
                  <input
                    type="number"
                    value={formBasePrice}
                    onChange={e => setFormBasePrice(e.target.value)}
                    className="input text-xs"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button type="button" onClick={() => setShowEditProductModal(null)} className="w-1/2 btn-ghost py-2.5 text-xs">
                  Cancel
                </button>
                <button type="submit" className="w-1/2 btn-primary py-2.5 text-xs bg-blue-600 hover:bg-blue-500">
                  Update Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRMATION MODAL ── */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass w-full max-w-md p-6 rounded-2xl border-rose-500/40 space-y-4 animate-fade-in">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-3 bg-rose-500/10 rounded-xl border border-rose-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-100">Delete Product</h3>
                <p className="text-xs text-rose-300">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              Are you sure you want to permanently delete <strong className="text-white">"{showDeleteConfirmModal.name}"</strong>?
            </p>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowDeleteConfirmModal(null)}
                className="w-1/2 btn-ghost py-2.5 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteProduct(showDeleteConfirmModal.id)}
                className="w-1/2 btn-danger py-2.5 text-xs bg-rose-600 text-white font-bold"
              >
                Yes, Delete Product
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PRICE VARIATIONS MODAL ── */}
      {showPriceVariationsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass w-full max-w-md p-6 rounded-2xl border-slate-700 space-y-4">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Tag className="w-4 h-4 text-indigo-400" /> Price Variations: {showPriceVariationsModal.name}
            </h3>
            <div className="space-y-2">
              {showPriceVariationsModal.price_bundles?.map((b, i) => (
                <div key={i} className="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-xs">
                  <span className="text-slate-300">{b.label}</span>
                  <span className="font-bold font-mono text-emerald-400">{curr}{Number(b.price).toLocaleString()}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setShowPriceVariationsModal(null)} className="w-full btn-primary py-2 text-xs">
              Close
            </button>
          </div>
        </div>
      )}

      {/* ── STOCK HISTORY MODAL ── */}
      {showStockHistoryModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass w-full max-w-lg p-6 rounded-2xl border-slate-700 space-y-4">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <History className="w-4 h-4 text-amber-400" /> Stock Audit History: {showStockHistoryModal.name}
            </h3>
            <div className="space-y-2 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between">
                <span>Initial Restock</span>
                <span className="text-emerald-400 font-mono font-bold">+150 units</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between">
                <span>Order #OLI-10001 Dispatch</span>
                <span className="text-rose-400 font-mono font-bold">-1 unit</span>
              </div>
            </div>
            <button onClick={() => setShowStockHistoryModal(null)} className="w-full btn-primary py-2 text-xs">
              Close History
            </button>
          </div>
        </div>
      )}

      {/* ── STATE DELIVERY FEE MODAL ── */}
      {showDeliveryFeeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass w-full max-w-md p-6 rounded-2xl border-slate-700 space-y-4">
            <h3 className="text-base font-bold text-slate-100">State Delivery Fee Configuration</h3>
            <p className="text-xs text-slate-400">Set default COD delivery fees for each state in {selectedCountry}.</p>
            <div className="space-y-2">
              {['Lagos', 'Abuja (FCT)', 'Rivers', 'Kano', 'Oyo'].map(st => (
                <div key={st} className="flex items-center justify-between bg-slate-950 p-2 rounded-xl border border-slate-800 text-xs">
                  <span>{st}</span>
                  <input type="number" defaultValue="2000" className="w-24 input py-1 text-right text-xs" />
                </div>
              ))}
            </div>
            <button onClick={() => setShowDeliveryFeeModal(false)} className="w-full btn-primary py-2 text-xs">
              Save Delivery Fees
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
