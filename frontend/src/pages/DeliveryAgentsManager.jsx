import React, { useState, useEffect } from 'react';
import {
  Truck, Plus, Search, Trash2, Edit, X, Phone, Trophy, CheckCircle,
  AlertCircle, DollarSign, Package, Send, ShieldCheck, MapPin
} from 'lucide-react';
import { AFRICAN_LOCATIONS } from '../data/africanLocations';
import { useAuth } from '../context/AuthContext';
import { apiUrl } from '../utils/apiUrl';

export default function DeliveryAgentsManager({ products = [], selectedCountry }) {
  const { user } = useAuth();
  const currentCountryObj = AFRICAN_LOCATIONS.find(c => c.country === selectedCountry) || AFRICAN_LOCATIONS[0];
  const curr = currentCountryObj.currency;

  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(null);
  const [showAssignStockModal, setShowAssignStockModal] = useState(null);

  // Form State
  const [name, setName] = useState('');
  const [fleetType, setFleetType] = useState('Internal Rider');
  const [phone, setPhone] = useState('');
  const [coverageStates, setCoverageStates] = useState('Lagos');
  const [successfulFee, setSuccessfulFee] = useState('2000');
  const [failedFee, setFailedFee] = useState('1000');

  // Assign Stock Form State
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [assignQty, setAssignQty] = useState('10');

  const fetchAgents = async () => {
    try {
      const token = localStorage.getItem('gravity_crm_token');
      const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};
      const storeId = user?.store_id || user?.id || '';
      const res = await fetch(apiUrl(`/api/delivery-agents?store_id=${storeId}`), { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setAgents(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching delivery agents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, [user]);

  useEffect(() => {
    if (products.length > 0 && !selectedProductId) {
      setSelectedProductId(products[0].id);
    }
  }, [products]);

  // Compute Best Performing Agent Analytics
  const rankedAgents = [...agents].map(a => {
    const del = Number(a.delivered_orders_count) || 0;
    const fail = Number(a.failed_orders_count) || 0;
    const total = del + fail;
    const rate = total > 0 ? ((del / total) * 100).toFixed(1) : '95.0';
    return { ...a, success_rate_num: parseFloat(rate), success_rate_str: `${rate}%` };
  }).sort((a, b) => b.success_rate_num - a.success_rate_num);

  const topAgent = rankedAgents[0] || null;

  const totalCodCollected = agents.reduce((sum, a) => sum + (Number(a.total_cod_collected) || 0), 0);
  const totalDeliveredPayouts = agents.reduce((sum, a) => sum + ((Number(a.delivered_orders_count) || 0) * (Number(a.successful_delivery_fee) || 2000)), 0);
  const totalFailedCharges = agents.reduce((sum, a) => sum + ((Number(a.failed_orders_count) || 0) * (Number(a.failed_delivery_fee) || 1000)), 0);

  const openAdd = () => {
    setName('');
    setFleetType('Internal Rider');
    setPhone('');
    setCoverageStates('Lagos');
    setSuccessfulFee('2000');
    setFailedFee('1000');
    setShowAddModal(true);
  };

  const openEdit = (a) => {
    setShowEditModal(a);
    setName(a.name || '');
    setFleetType(a.fleet_type || 'Internal Rider');
    setPhone(a.phone || '');
    setCoverageStates(Array.isArray(a.coverage_states) ? a.coverage_states.join(', ') : a.coverage_states || 'Lagos');
    setSuccessfulFee(String(a.successful_delivery_fee || 2000));
    setFailedFee(String(a.failed_delivery_fee || 1000));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name) return;

    const statesArr = coverageStates.split(',').map(s => s.trim()).filter(Boolean);

    try {
      const token = localStorage.getItem('gravity_crm_token');
      const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};
      const storeId = user?.store_id || user?.id || '';
      const res = await fetch(apiUrl('/api/delivery-agents'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          store_id: storeId,
          name,
          fleet_type: fleetType,
          phone,
          coverage_states: statesArr,
          successful_delivery_fee: Number(successfulFee),
          failed_delivery_fee: Number(failedFee),
          status: 'Active'
        })
      });

      if (res.ok) {
        fetchAgents();
        setShowAddModal(false);
      }
    } catch (err) {
      console.error('Error creating delivery agent:', err);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!showEditModal) return;

    const statesArr = coverageStates.split(',').map(s => s.trim()).filter(Boolean);

    try {
      const token = localStorage.getItem('gravity_crm_token');
      const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch(apiUrl(`/api/delivery-agents/${showEditModal.id}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          name,
          fleet_type: fleetType,
          phone,
          coverage_states: statesArr,
          successful_delivery_fee: Number(successfulFee),
          failed_delivery_fee: Number(failedFee)
        })
      });

      if (res.ok) {
        fetchAgents();
        setShowEditModal(null);
      }
    } catch (err) {
      console.error('Error updating delivery agent:', err);
    }
  };

  const handleAssignStockSubmit = async (e) => {
    e.preventDefault();
    if (!showAssignStockModal || !selectedProductId || !assignQty) return;

    const targetProd = products.find(p => p.id === selectedProductId);
    const prodName = targetProd ? targetProd.name : 'Product Item';

    try {
      const token = localStorage.getItem('gravity_crm_token');
      const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch(apiUrl(`/api/delivery-agents/${showAssignStockModal.id}/stock`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          product_id: selectedProductId,
          product_name: prodName,
          quantity: Number(assignQty)
        })
      });

      if (res.ok) {
        fetchAgents();
        setShowAssignStockModal(null);
        setAssignQty('10');
      }
    } catch (err) {
      console.error('Error assigning stock to agent:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this delivery agent/courier?')) return;
    try {
      const token = localStorage.getItem('gravity_crm_token');
      const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch(apiUrl(`/api/delivery-agents/${id}`), { method: 'DELETE', headers: authHeaders });
      if (res.ok) {
        setAgents(prev => prev.filter(a => a.id !== id));
      }
    } catch (err) {
      console.error('Error deleting agent:', err);
    }
  };

  const filtered = agents.filter(a =>
    !searchTerm ||
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.fleet_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (Array.isArray(a.coverage_states) && a.coverage_states.some(s => s.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Truck className="w-5 h-5 text-indigo-400" /> Delivery Fleet & Courier Agents
          </h2>
          <p className="text-xs text-slate-400">
            Dispatch riders, rider stock-in-hand, performance analytics, and custom delivery fees
          </p>
        </div>
        <button onClick={openAdd} className="btn-primary py-2 px-4 text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto">
          <Plus className="w-4 h-4" /> + Register Dispatch Agent
        </button>
      </div>

      {/* 🏆 Best Performing Agent Analytics & Performance Leaderboard Banner */}
      {topAgent && (
        <div className="glass-panel p-5 rounded-2xl border-emerald-500/30 bg-emerald-950/10 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
          <div className="md:col-span-2 space-y-1 border-b md:border-b-0 md:border-r border-slate-800 pb-3 md:pb-0 md:pr-4">
            <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-widest flex items-center gap-1">
              <Trophy className="w-4 h-4 text-amber-400 fill-amber-400 inline" /> #1 Best Performing Courier Agent
            </span>
            <h3 className="text-xl font-extrabold text-slate-100">{topAgent.name}</h3>
            <p className="text-xs text-slate-300">
              <span className="badge badge-delivered font-bold mr-2">{topAgent.success_rate_str || '95.0%'} Success Rate</span>
              {topAgent.delivered_orders_count || 0} Delivered Orders | {topAgent.fleet_type}
            </p>
          </div>

          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total COD Cash Collected</span>
            <h4 className="text-xl font-extrabold text-emerald-400">{curr}{totalCodCollected.toLocaleString()}</h4>
            <p className="text-[10px] text-slate-500">Collected from COD buyers</p>
          </div>

          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Net Delivery Payouts</span>
            <h4 className="text-xl font-extrabold text-indigo-400">{curr}{totalDeliveredPayouts.toLocaleString()}</h4>
            <p className="text-[10px] text-slate-500">Failed Waybill Fees: {curr}{totalFailedCharges.toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* Main Courier Fleet & Rider Stock Table */}
      <div className="glass p-5 rounded-2xl border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-400" /> Active Dispatch Riders & Courier Partners
          </h3>
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
            <input
              type="text"
              placeholder="Search agents or states..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="input pl-9 text-xs py-1.5"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400 animate-pulse">Loading courier agents...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 italic bg-slate-950/40 rounded-xl">No delivery agents registered. Click "+ Register Dispatch Agent" above.</div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3">Agent / Fleet Name</th>
                  <th className="p-3">Coverage States</th>
                  <th className="p-3">Delivery Fee (Success / Fail)</th>
                  <th className="p-3">Performance Rate</th>
                  <th className="p-3">Stock Available with Agent (Rider Stock)</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map(a => {
                  const del = Number(a.delivered_orders_count) || 0;
                  const fail = Number(a.failed_orders_count) || 0;
                  const total = del + fail;
                  const rateStr = total > 0 ? `${((del / total) * 100).toFixed(1)}%` : '95.0%';

                  const stockItems = Array.isArray(a.assigned_stock) ? a.assigned_stock : [];

                  return (
                    <tr key={a.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-3">
                        <span className="font-bold text-slate-100 block">{a.name}</span>
                        <span className="text-[10px] text-indigo-400 font-medium block">{a.fleet_type}</span>
                        <span className="text-[10px] text-slate-400 font-mono"><Phone className="w-3 h-3 inline mr-1" />{a.phone || 'N/A'}</span>
                      </td>
                      <td className="p-3 text-slate-300">
                        <div className="flex gap-1 flex-wrap max-w-xs">
                          {(Array.isArray(a.coverage_states) ? a.coverage_states : [a.coverage_states]).map((st, i) => (
                            <span key={i} className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-semibold text-slate-300 border border-slate-700">
                              <MapPin className="w-2.5 h-2.5 inline mr-0.5 text-indigo-400" />{st}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3 space-y-1">
                        <div className="text-emerald-400 font-bold">
                          Success Fee: {curr}{(Number(a.successful_delivery_fee) || 2000).toLocaleString()}
                        </div>
                        <div className="text-rose-400 font-semibold text-[10px]">
                          Failed Fee: {curr}{(Number(a.failed_delivery_fee) || 1000).toLocaleString()}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="badge badge-delivered font-extrabold text-xs">{rateStr}</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">{del} Del / {fail} Fail</span>
                      </td>
                      <td className="p-3">
                        {stockItems.length === 0 ? (
                          <span className="text-[11px] text-slate-500 italic">No stock currently assigned</span>
                        ) : (
                          <div className="space-y-1">
                            {stockItems.map((item, idx) => (
                              <div key={idx} className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                                <Package className="w-3 h-3 text-indigo-400 shrink-0" />
                                <span>{item.quantity} x {item.product_name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setShowAssignStockModal(a)}
                            className="btn-primary py-1 px-2 text-[11px] font-bold"
                            title="Assign stock to rider"
                          >
                            + Assign Stock
                          </button>
                          <button onClick={() => openEdit(a)} className="btn-ghost py-1 px-2 text-[11px]">
                            <Edit className="w-3.5 h-3.5 text-blue-400" /> Edit
                          </button>
                          <button onClick={() => handleDelete(a.id)} className="btn-danger py-1 px-2 text-[11px]">
                            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add / Edit Agent Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass w-full max-w-md p-6 rounded-2xl border-slate-700 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Truck className="w-5 h-5 text-indigo-400" /> {showEditModal ? 'Edit Delivery Agent' : 'Register New Delivery Agent'}
              </h3>
              <button onClick={() => { setShowAddModal(false); setShowEditModal(null); }} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={showEditModal ? handleUpdate : handleCreate} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Agent / Courier Name *</label>
                <input type="text" required placeholder="e.g. Inland Bikers Fleet (Lagos Rider)" value={name} onChange={e => setName(e.target.value)} className="input text-xs" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Fleet Type</label>
                  <select value={fleetType} onChange={e => setFleetType(e.target.value)} className="select w-full text-xs py-2.5">
                    <option value="Internal Rider">Internal Rider</option>
                    <option value="Nationwide Courier">Nationwide Courier (Speedaf)</option>
                    <option value="Pan-African Logistics">Pan-African Logistics (GIGL)</option>
                    <option value="3PL Freelancer">3PL Freelancer Rider</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Phone Number</label>
                  <input type="text" placeholder="+23480..." value={phone} onChange={e => setPhone(e.target.value)} className="input text-xs" />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Coverage States / Cities (Comma Separated)</label>
                <input type="text" placeholder="Lagos, Abuja (FCT), Oyo, Ogun" value={coverageStates} onChange={e => setCoverageStates(e.target.value)} className="input text-xs font-mono" />
              </div>

              {/* Manual Delivery & Failed Delivery Fees */}
              <div className="grid grid-cols-2 gap-3 border-t border-slate-800 pt-3">
                <div>
                  <label className="text-xs font-bold text-emerald-400 block mb-1">Successful Delivery Fee ({curr}) *</label>
                  <input type="number" required placeholder="2000" value={successfulFee} onChange={e => setSuccessfulFee(e.target.value)} className="input text-xs font-bold" />
                </div>
                <div>
                  <label className="text-xs font-bold text-rose-400 block mb-1">Failed Delivery Fee ({curr}) *</label>
                  <input type="number" required placeholder="1000" value={failedFee} onChange={e => setFailedFee(e.target.value)} className="input text-xs font-bold" />
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button type="button" onClick={() => { setShowAddModal(false); setShowEditModal(null); }} className="w-1/2 btn-ghost py-2.5 text-xs">
                  Cancel
                </button>
                <button type="submit" className="w-1/2 btn-primary py-2.5 text-xs">
                  {showEditModal ? 'Update Agent' : 'Save Agent'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Stock Modal */}
      {showAssignStockModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass w-full max-w-md p-6 rounded-2xl border-slate-700 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Package className="w-5 h-5 text-indigo-400" /> Dispatch Stock to {showAssignStockModal.name}
              </h3>
              <button onClick={() => setShowAssignStockModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignStockSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Select Product Item *</label>
                <select value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)} className="select w-full text-xs py-2.5">
                  {products.map(p => (
                    <option key={p.id} value={p.id} className="bg-slate-900">{p.name} (In Warehouse: {p.available_stock || 0})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Quantity to Handover to Rider *</label>
                <input type="number" required min="1" value={assignQty} onChange={e => setAssignQty(e.target.value)} className="input text-xs font-bold" />
              </div>

              <div className="flex gap-2 pt-3">
                <button type="button" onClick={() => setShowAssignStockModal(null)} className="w-1/2 btn-ghost py-2.5 text-xs">
                  Cancel
                </button>
                <button type="submit" className="w-1/2 btn-primary py-2.5 text-xs">
                  Confirm Handover to Agent
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}