import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Shield, Key, Mail, Phone, CheckCircle, X, Lock } from 'lucide-react';

export default function TeamManagementModal({ user, onClose }) {
  const [teamMembers, setTeamMembers] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('sales_agent');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchTeam = async () => {
    setIsLoading(true);
    try {
      const storeId = user?.store_id || user?.id || '';
      const token = localStorage.getItem('gravity_crm_token');
      const res = await fetch(`/api/team?store_id=${encodeURIComponent(storeId)}`, {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      if (Array.isArray(data)) setTeamMembers(data);
    } catch (err) {
      console.error('Failed to fetch team members:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, [user]);

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmitting(true);

    try {
      const storeId = user?.store_id || user?.id || '';
      const storeName = user?.store_name || 'My E-Commerce Store';
      const token = localStorage.getItem('gravity_crm_token');
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          full_name: fullName,
          email,
          password,
          role,
          phone,
          store_id: storeId,
          store_name: storeName
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create staff account');

      setSuccessMsg(`✅ Account created for ${fullName} (${role})!`);
      setFullName('');
      setEmail('');
      setPassword('');
      setPhone('');
      setShowAddForm(false);
      fetchTeam();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-2xl p-6 rounded-2xl border-slate-700 space-y-5 shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto scrollbar-none">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <span className="text-[10px] uppercase font-black text-indigo-400 tracking-wider flex items-center gap-1">
              <Shield className="w-3.5 h-3.5" /> Role-Based Access Control (RBAC)
            </span>
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-400" /> Team Accounts & Staff Credentials
            </h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alerts */}
        {successMsg && (
          <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl font-bold">
            {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="p-3 bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs rounded-xl font-bold">
            {errorMsg}
          </div>
        )}

        {/* Action Toolbar */}
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Active Team Members ({teamMembers.length})
          </span>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn-primary py-2 px-3 text-xs flex items-center gap-1.5 shadow"
          >
            <UserPlus className="w-4 h-4" /> {showAddForm ? 'Close Form' : 'Add Team Member'}
          </button>
        </div>

        {/* Add Staff Form */}
        {showAddForm && (
          <form onSubmit={handleCreateStaff} className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-3">
            <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5" /> Create New Staff Account
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:border-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Email Address (Login ID)</label>
                <input
                  type="email"
                  required
                  placeholder="staff@store.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:border-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Password</label>
                <input
                  type="password"
                  required
                  placeholder="Set account password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:border-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Assigned Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:border-indigo-500 outline-none font-bold"
                >
                  <option value="sales_agent">Sales / Confirmation Agent</option>
                  <option value="logistics">Logistics / Dispatch Officer</option>
                  <option value="admin">Store Admin</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="+2348000000000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:border-indigo-500 outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all"
            >
              <CheckCircle className="w-4 h-4" /> Save Account & Generate Credentials
            </button>
          </form>
        )}

        {/* Staff Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3">Staff Name</th>
                <th className="p-3">Email ID</th>
                <th className="p-3">Role</th>
                <th className="p-3">Phone</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr><td colSpan={4} className="text-center py-6 text-slate-500 italic">Loading team members...</td></tr>
              ) : teamMembers.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-6 text-slate-500 italic">No team accounts added yet.</td></tr>
              ) : (
                teamMembers.map(m => (
                  <tr key={m.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-bold text-slate-200">{m.full_name}</td>
                    <td className="p-3 font-mono text-indigo-400">{m.email}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        m.role === 'owner' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                        m.role === 'admin' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                        m.role === 'logistics' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                        'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}>
                        {m.role?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-3 text-slate-400">{m.phone || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
