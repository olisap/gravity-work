import React, { useState, useEffect } from 'react';
import { Layers, Plus, Search, Trash2, Edit, X, Globe, Mail, Phone, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function SuppliersManager() {
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(null);

  // Form State
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('China');
  const [leadTimeDays, setLeadTimeDays] = useState('14');

  const fetchSuppliers = async () => {
    try {
      const token = localStorage.getItem('gravity_crm_token');
      const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};
      const storeId = user?.store_id || user?.id || '';
      const res = await fetch(`/api/suppliers?store_id=${storeId}`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setSuppliers(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching suppliers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [user]);

  const openAdd = () => {
    setName('');
    setContactPerson('');
    setEmail('');
    setPhone('');
    setCountry('China');
    setLeadTimeDays('14');
    setShowAddModal(true);
  };

  const openEdit = (sup) => {
    setShowEditModal(sup);
    setName(sup.name || '');
    setContactPerson(sup.contact_person || '');
    setEmail(sup.email || '');
    setPhone(sup.phone || '');
    setCountry(sup.country || 'China');
    setLeadTimeDays(String(sup.lead_time_days || 14));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name) return;

    try {
      const token = localStorage.getItem('gravity_crm_token');
      const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};
      const storeId = user?.store_id || user?.id || '';
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          store_id: storeId,
          name,
          contact_person: contactPerson,
          email,
          phone,
          country,
          lead_time_days: Number(leadTimeDays) || 14,
          status: 'Active'
        })
      });

      if (res.ok) {
        fetchSuppliers();
        setShowAddModal(false);
      }
    } catch (err) {
      console.error('Error creating supplier:', err);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!showEditModal) return;

    try {
      const token = localStorage.getItem('gravity_crm_token');
      const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch(`/api/suppliers/${showEditModal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          name,
          contact_person: contactPerson,
          email,
          phone,
          country,
          lead_time_days: Number(leadTimeDays)
        })
      });

      if (res.ok) {
        fetchSuppliers();
        setShowEditModal(null);
      }
    } catch (err) {
      console.error('Error updating supplier:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this supplier record?')) return;
    try {
      const token = localStorage.getItem('gravity_crm_token');
      const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch(`/api/suppliers/${id}`, { method: 'DELETE', headers: authHeaders });
      if (res.ok) {
        setSuppliers(prev => prev.filter(s => s.id !== id));
      }
    } catch (err) {
      console.error('Error deleting supplier:', err);
    }
  };

  const filtered = suppliers.filter(s =>
    !searchTerm ||
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.country?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" /> Suppliers & Manufacturing Partners
          </h2>
          <p className="text-xs text-slate-400">
            Manage wholesale suppliers, Guangzhou factory contacts, import lead times, and status
          </p>
        </div>
        <button onClick={openAdd} className="btn-primary py-2 px-4 text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto">
          <Plus className="w-4 h-4" /> + Register Supplier
        </button>
      </div>

      {/* Main Table */}
      <div className="glass p-5 rounded-2xl border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Configured Suppliers</h3>
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
            <input
              type="text"
              placeholder="Search suppliers..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="input pl-9 text-xs py-1.5"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400 animate-pulse">Loading supplier directory...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 italic bg-slate-950/40 rounded-xl">No suppliers registered. Click "+ Register Supplier" above.</div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3">Company Name</th>
                  <th className="p-3">Contact Person</th>
                  <th className="p-3">Email & Phone</th>
                  <th className="p-3">Origin Country</th>
                  <th className="p-3">Lead Time</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map(s => (
                  <tr key={s.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-3 font-bold text-slate-100">{s.name}</td>
                    <td className="p-3 text-slate-300 font-semibold">{s.contact_person || 'N/A'}</td>
                    <td className="p-3 text-slate-300 space-y-0.5">
                      <span className="block text-indigo-400 font-mono text-[11px]"><Mail className="w-3 h-3 inline mr-1" />{s.email || 'N/A'}</span>
                      <span className="block text-slate-400 text-[10px]"><Phone className="w-3 h-3 inline mr-1" />{s.phone || 'N/A'}</span>
                    </td>
                    <td className="p-3 font-semibold text-slate-200"><Globe className="w-3.5 h-3.5 inline mr-1 text-slate-400" />{s.country}</td>
                    <td className="p-3 font-bold text-amber-300"><Clock className="w-3.5 h-3.5 inline mr-1" />{s.lead_time_days} Days</td>
                    <td className="p-3"><span className="badge badge-delivered font-bold">{s.status || 'Active'}</span></td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => openEdit(s)} className="btn-ghost py-1 px-2 text-[11px]">
                          <Edit className="w-3.5 h-3.5 text-blue-400" /> Edit
                        </button>
                        <button onClick={() => handleDelete(s.id)} className="btn-danger py-1 px-2 text-[11px]">
                          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add / Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass w-full max-w-md p-6 rounded-2xl border-slate-700 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-400" /> {showEditModal ? 'Edit Supplier' : 'Register New Supplier'}
              </h3>
              <button onClick={() => { setShowAddModal(false); setShowEditModal(null); }} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={showEditModal ? handleUpdate : handleCreate} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Company / Supplier Name *</label>
                <input type="text" required placeholder="e.g. Guangzhou Kitchenware Ltd" value={name} onChange={e => setName(e.target.value)} className="input text-xs" />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Contact Person</label>
                <input type="text" placeholder="e.g. Lin Wei" value={contactPerson} onChange={e => setContactPerson(e.target.value)} className="input text-xs" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Email Address</label>
                  <input type="email" placeholder="contact@supplier.com" value={email} onChange={e => setEmail(e.target.value)} className="input text-xs font-mono" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Phone Number</label>
                  <input type="text" placeholder="+8613800..." value={phone} onChange={e => setPhone(e.target.value)} className="input text-xs" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Country of Origin</label>
                  <input type="text" placeholder="e.g. China" value={country} onChange={e => setCountry(e.target.value)} className="input text-xs" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Lead Time (Days)</label>
                  <input type="number" placeholder="14" value={leadTimeDays} onChange={e => setLeadTimeDays(e.target.value)} className="input text-xs font-bold" />
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button type="button" onClick={() => { setShowAddModal(false); setShowEditModal(null); }} className="w-1/2 btn-ghost py-2.5 text-xs">
                  Cancel
                </button>
                <button type="submit" className="w-1/2 btn-primary py-2.5 text-xs">
                  {showEditModal ? 'Update Supplier' : 'Save Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
