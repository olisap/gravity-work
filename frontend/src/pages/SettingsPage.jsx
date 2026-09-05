import React, { useState, useEffect, useRef } from 'react';
import {
  Settings, Building, Bell, Users, History, ShieldAlert,
  Save, CheckCircle, X, Plus, UserPlus, Lock, Mail, Phone,
  Loader2, AlertTriangle, Globe, MapPin, Upload, Image as ImageIcon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiUrl } from '../utils/apiUrl';

// ── Inline Toggle Switch ──────────────────────────────────
function Toggle({ checked, onChange, id }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="toggle-track shrink-0"
      style={{ background: checked ? 'var(--brand)' : '' }}
    >
      <span
        className="toggle-thumb"
        style={{ transform: checked ? 'translateX(16px)' : 'translateX(0)' }}
      />
    </button>
  );
}

// ── Skeleton row ──────────────────────────────────────────
function SkeletonRow({ cols = 3 }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="skeleton h-3.5 rounded" style={{ width: i === 0 ? '120px' : '80px' }} />
        </td>
      ))}
    </tr>
  );
}

// ── Sub-tabs ──────────────────────────────────────────────
const TABS = [
  { id: 'profile',      label: 'Store Profile',   icon: Building },
  { id: 'pipeline',     label: 'Pipeline',         icon: Settings },
  { id: 'notifications',label: 'Notifications',    icon: Bell },
  { id: 'team',         label: 'Team & Staff',     icon: Users },
  { id: 'audit',        label: 'Audit Trail',      icon: History },
];

export default function SettingsPage({ onSettingsUpdated }) {
  const { user, updateUser } = useAuth();
  const [activeSection, setActiveSection] = useState('profile');

  // ── Settings state ──
  const [settings, setSettings]         = useState(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings]   = useState(false);
  const [saveSuccess, setSaveSuccess]         = useState(false);
  const [saveError, setSaveError]             = useState('');
  const fileInputRef                          = useRef(null);

  // ── Team state ──
  const [teamMembers, setTeamMembers]   = useState([]);
  const [loadingTeam, setLoadingTeam]   = useState(false);
  const [showAddForm, setShowAddForm]   = useState(false);
  const [newName,     setNewName]       = useState('');
  const [newEmail,    setNewEmail]      = useState('');
  const [newPassword, setNewPassword]   = useState('');
  const [newRole,     setNewRole]       = useState('sales_agent');
  const [newPhone,    setNewPhone]      = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [teamMsg, setTeamMsg]           = useState({ type: '', text: '' });

  // ── Audit state ──
  const [auditLogs, setAuditLogs]       = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  const token = () => localStorage.getItem('gravity_crm_token');
  const authH = () => ({ 'Authorization': `Bearer ${token()}` });

  // ── Fetch settings ──
  useEffect(() => {
    const fetchSettings = async () => {
      setLoadingSettings(true);
      try {
        const res = await fetch(apiUrl('/api/settings'), { headers: authH() });
        if (res.ok) setSettings(await res.json());
      } catch (e) {
        console.error('Settings fetch error:', e);
      } finally {
        setLoadingSettings(false);
      }
    };
    fetchSettings();
  }, [user]);

  // ── Fetch team when section active ──
  useEffect(() => {
    if (activeSection !== 'team') return;
    const fetchTeam = async () => {
      setLoadingTeam(true);
      try {
        const storeId = user?.store_id || user?.id || '';
        const res = await fetch(
          apiUrl(`/api/team?store_id=${encodeURIComponent(storeId)}`),
          { headers: authH() }
        );
        if (res.ok) { const d = await res.json(); if (Array.isArray(d)) setTeamMembers(d); }
      } catch (e) {
        console.error('Team fetch error:', e);
      } finally {
        setLoadingTeam(false);
      }
    };
    fetchTeam();
  }, [activeSection, user]);

  // ── Fetch audit when section active ──
  useEffect(() => {
    if (activeSection !== 'audit') return;
    const fetchAudit = async () => {
      setLoadingAudit(true);
      try {
        const res = await fetch(apiUrl('/api/audit-trail'), { headers: authH() });
        if (res.ok) { const d = await res.json(); if (Array.isArray(d)) setAuditLogs(d); }
      } catch (e) {
        console.error('Audit fetch error:', e);
      } finally {
        setLoadingAudit(false);
      }
    };
    fetchAudit();
  }, [activeSection, user]);

  // ── Save settings ──
  const handleSave = async () => {
    if (!settings) return;
    setSavingSettings(true);
    setSaveError('');
    setSaveSuccess(false);
    try {
      const res = await fetch(apiUrl('/api/settings'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authH() },
        body: JSON.stringify(settings),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || errData.details || 'Save failed');
      }
      setSaveSuccess(true);
      if (updateUser && settings.store_name) {
        updateUser({
          store_name: settings.store_name,
          country: settings.store_country,
          company_logo: settings.company_logo
        });
      }
      if (onSettingsUpdated) onSettingsUpdated();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      setSaveError(e.message || 'Settings could not be saved. Please try again.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setSaveError('Image file is too large. Please select an image under 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSetting('company_logo', reader.result);
      setSaveError('');
    };
    reader.onerror = () => {
      setSaveError('Failed to read image file.');
    };
    reader.readAsDataURL(file);
  };

  const setSetting = (key, val) => setSettings(prev => ({ ...prev, [key]: val }));

  // ── Add team member ──
  const handleAddMember = async (e) => {
    e.preventDefault();
    setTeamMsg({ type: '', text: '' });
    setAddingMember(true);
    try {
      const storeId = user?.store_id || user?.id || '';
      const res = await fetch(apiUrl('/api/team'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authH() },
        body: JSON.stringify({
          full_name: newName, email: newEmail, password: newPassword,
          role: newRole, phone: newPhone, store_id: storeId,
          store_name: user?.store_name || 'Store',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create account');
      setTeamMsg({ type: 'success', text: `Account created for ${newName}.` });
      setNewName(''); setNewEmail(''); setNewPassword(''); setNewPhone('');
      setShowAddForm(false);
      // Refresh team
      const r2 = await fetch(apiUrl(`/api/team?store_id=${user?.store_id || user?.id || ''}`), { headers: authH() });
      if (r2.ok) { const d = await r2.json(); if (Array.isArray(d)) setTeamMembers(d); }
    } catch (err) {
      setTeamMsg({ type: 'error', text: err.message });
    } finally {
      setAddingMember(false);
    }
  };

  // ── Toggle member status ──
  const handleToggleStatus = async (member) => {
    try {
      const res = await fetch(apiUrl(`/api/team/${member.id}/status`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authH() },
        body: JSON.stringify({ is_active: !member.is_active }),
      });
      if (res.ok) {
        setTeamMembers(prev =>
          prev.map(m => m.id === member.id ? { ...m, is_active: !m.is_active } : m)
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  const roleLabel = { owner: 'Owner', admin: 'Admin', sales_agent: 'Confirmation Staff', confirmation_staff: 'Confirmation Staff', logistics: 'Logistics' };

  return (
    <div className="space-y-5 animate-fade-in text-slate-100">

      {/* Page header */}
      <div className="flex items-center justify-between pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <div>
          <h2 className="section-title">
            <Settings className="w-5 h-5" style={{ color: 'var(--brand)' }} />
            Store Settings
          </h2>
          <p className="section-subtitle">Configure your store profile, pipeline, notifications, and team access.</p>
        </div>
        {(activeSection === 'profile' || activeSection === 'pipeline' || activeSection === 'notifications') && (
          <button
            onClick={handleSave}
            disabled={savingSettings || loadingSettings}
            className="btn-primary text-xs gap-2"
          >
            {savingSettings
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</>
              : saveSuccess
              ? <><CheckCircle className="w-3.5 h-3.5" /> Saved</>
              : <><Save className="w-3.5 h-3.5" /> Save Changes</>
            }
          </button>
        )}
      </div>

      {saveError && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-semibold text-rose-400"
          style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.25)' }}>
          <AlertTriangle className="w-4 h-4 shrink-0" /> {saveError}
        </div>
      )}

      {/* ── Section tabs ── */}
      <div className="flex gap-1 p-1 rounded-xl"
        style={{ background: 'rgba(15, 22, 33, 0.70)', border: '1px solid var(--border)' }}>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveSection(id)}
            className={`segment-btn flex-1${activeSection === id ? ' active' : ''}`}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* ────────────── STORE PROFILE ────────────── */}
      {activeSection === 'profile' && (
        <div className="glass p-6 space-y-5 animate-fade-in">
          {loadingSettings ? (
            <div className="space-y-3">
              {[140, 200, 160, 180, 200].map((w, i) => (
                <div key={i} className="skeleton h-8 rounded-xl" style={{ width: `${w + 80}px`, maxWidth: '100%' }} />
              ))}
            </div>
          ) : !settings ? (
            <p className="text-xs text-slate-500 text-center py-8">Unable to load settings.</p>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-label text-slate-400 block mb-1.5">Store Name</label>
                  <input className="input" value={settings.store_name || ''} onChange={e => setSetting('store_name', e.target.value)} placeholder="My E-Commerce Store" />
                </div>
                <div>
                  <label className="text-label text-slate-400 block mb-1.5">Store Logo</label>
                  <div className="flex items-center gap-3">
                    {/* Logo Preview */}
                    <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                      {settings.company_logo ? (
                        <img
                          src={settings.company_logo}
                          alt="Logo Preview"
                          className="w-full h-full object-contain"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <ImageIcon className="w-5 h-5 text-slate-500" />
                      )}
                    </div>
                    
                    {/* URL Input */}
                    <input
                      className="input font-mono text-xs flex-1"
                      value={settings.company_logo || ''}
                      onChange={e => setSetting('company_logo', e.target.value)}
                      placeholder="Image URL or upload file..."
                    />

                    {/* File Upload Button */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleLogoUpload}
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      title="Upload image from device"
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
                    >
                      <Upload className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="hidden sm:inline">Upload</span>
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-label text-slate-400 block mb-1.5">Country</label>
                  <input className="input" value={settings.store_country || ''} onChange={e => setSetting('store_country', e.target.value)} placeholder="Nigeria" />
                </div>
                <div>
                  <label className="text-label text-slate-400 block mb-1.5">Office State</label>
                  <input className="input" value={settings.office_state || ''} onChange={e => setSetting('office_state', e.target.value)} placeholder="Lagos" />
                </div>
                <div>
                  <label className="text-label text-slate-400 block mb-1.5">Warehouse State</label>
                  <input className="input" value={settings.warehouse_state || ''} onChange={e => setSetting('warehouse_state', e.target.value)} placeholder="Lagos" />
                </div>
                <div>
                  <label className="text-label text-slate-400 block mb-1.5">Store Address</label>
                  <input className="input" value={settings.store_address || ''} onChange={e => setSetting('store_address', e.target.value)} placeholder="Full business address" />
                </div>
                <div>
                  <label className="text-label text-slate-400 block mb-1.5">Phone Number</label>
                  <input className="input" value={settings.phone_number || ''} onChange={e => setSetting('phone_number', e.target.value)} placeholder="+234..." />
                </div>
                <div>
                  <label className="text-label text-slate-400 block mb-1.5">WhatsApp Number</label>
                  <input className="input" value={settings.whatsapp_number || ''} onChange={e => setSetting('whatsapp_number', e.target.value)} placeholder="+234..." />
                </div>
                <div>
                  <label className="text-label text-slate-400 block mb-1.5">Business Email</label>
                  <input type="email" className="input" value={settings.email || ''} onChange={e => setSetting('email', e.target.value)} placeholder="support@store.com" />
                </div>
              </div>
              <div>
                <label className="text-label text-slate-400 block mb-1.5">Invoice Footer Message</label>
                <textarea rows={2} className="input resize-none" value={settings.invoice_footer_message || ''} onChange={e => setSetting('invoice_footer_message', e.target.value)} placeholder="e.g. All prices include VAT" />
              </div>
            </>
          )}
        </div>
      )}

      {/* ────────────── PIPELINE SETTINGS ────────────── */}
      {activeSection === 'pipeline' && (
        <div className="glass p-6 space-y-4 animate-fade-in">
          <div>
            <h3 className="text-sm font-bold text-slate-200 mb-1">Order Pipeline Stage Visibility</h3>
            <p className="text-xs text-slate-400 mb-4">Control which status columns are shown on the Orders Pipeline.</p>
          </div>
          {loadingSettings ? (
            <div className="space-y-3">
              {[1,2,3,4,5].map(i => <div key={i} className="skeleton h-12 rounded-xl" />)}
            </div>
          ) : !settings ? null : (
            <div className="space-y-2">
              {[
                { key: 'tab_confirmed',  label: 'Confirmed',   desc: 'Show Confirmed status column' },
                { key: 'tab_shipped',    label: 'Shipped',     desc: 'Show Shipped status column' },
                { key: 'tab_returned',   label: 'Returned',    desc: 'Show Returned status column' },
                { key: 'tab_after_sale', label: 'After-Sale',  desc: 'Show After-Sale Call column' },
                { key: 'tab_failed',     label: 'Failed',      desc: 'Show Failed Delivery column' },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between px-4 py-3 rounded-xl"
                  style={{ background: 'rgba(15, 22, 33, 0.60)', border: '1px solid var(--border)' }}>
                  <div>
                    <p className="text-sm font-semibold text-slate-200">{label}</p>
                    <p className="text-xs text-slate-400">{desc}</p>
                  </div>
                  <Toggle checked={!!settings[key]} onChange={v => setSetting(key, v)} id={key} />
                </div>
              ))}
              {[
                { key: 'prevent_duplicate_orders', label: 'Block Duplicate Orders', desc: 'Reject orders from the same phone within 24h' },
                { key: 'manage_inventory',         label: 'Track Inventory',        desc: 'Deduct stock when orders are Scheduled' },
                { key: 'whatsapp_notify_agents',   label: 'Notify Agents via WhatsApp', desc: 'Send dispatch assignment messages to riders' },
                { key: 'show_performance_bar',     label: 'Show Performance Bar',   desc: 'Display team close rate progress bar' },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between px-4 py-3 rounded-xl"
                  style={{ background: 'rgba(15, 22, 33, 0.60)', border: '1px solid var(--border)' }}>
                  <div>
                    <p className="text-sm font-semibold text-slate-200">{label}</p>
                    <p className="text-xs text-slate-400">{desc}</p>
                  </div>
                  <Toggle checked={!!settings[key]} onChange={v => setSetting(key, v)} id={key} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ────────────── NOTIFICATIONS ────────────── */}
      {activeSection === 'notifications' && (
        <div className="glass p-6 space-y-4 animate-fade-in">
          <div>
            <h3 className="text-sm font-bold text-slate-200 mb-1">Notification Preferences</h3>
            <p className="text-xs text-slate-400 mb-4">Choose which automated messages are sent to customers and staff.</p>
          </div>
          {loadingSettings ? (
            <div className="space-y-3">
              {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton h-12 rounded-xl" />)}
            </div>
          ) : !settings ? null : (
            <div className="space-y-2">
              {[
                { key: 'email_on_login',      label: 'Login Alert Email',       desc: 'Email staff when their account signs in' },
                { key: 'low_stock_email',     label: 'Low Stock: Email',        desc: 'Alert when product stock falls to ≤10 units' },
                { key: 'low_stock_sms',       label: 'Low Stock: SMS',          desc: 'SMS alert for critical stock thresholds' },
                { key: 'low_stock_whatsapp',  label: 'Low Stock: WhatsApp',     desc: 'WhatsApp alert for critical stock' },
                { key: 'reminder_email',      label: 'Draft Reminder: Email',   desc: 'Send resume link to abandoned form customers' },
                { key: 'reminder_whatsapp',   label: 'Draft Reminder: WhatsApp',desc: 'WhatsApp reminder for abandoned checkouts' },
                { key: 'invoice_via_email',   label: 'Invoice: Email',          desc: 'Send delivery receipt via email on delivery' },
                { key: 'invoice_via_whatsapp',label: 'Invoice: WhatsApp',       desc: 'Send delivery receipt via WhatsApp on delivery' },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between px-4 py-3 rounded-xl"
                  style={{ background: 'rgba(15, 22, 33, 0.60)', border: '1px solid var(--border)' }}>
                  <div>
                    <p className="text-sm font-semibold text-slate-200">{label}</p>
                    <p className="text-xs text-slate-400">{desc}</p>
                  </div>
                  <Toggle checked={!!settings[key]} onChange={v => setSetting(key, v)} id={key} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ────────────── TEAM & STAFF ────────────── */}
      {activeSection === 'team' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-200">Team Members</h3>
              <p className="text-xs text-slate-400">Manage staff access, roles, and account status.</p>
            </div>
            <button onClick={() => { setShowAddForm(v => !v); setTeamMsg({ type: '', text: '' }); }} className="btn-primary text-xs">
              <UserPlus className="w-3.5 h-3.5" /> Add Staff
            </button>
          </div>

          {teamMsg.text && (
            <div className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
              teamMsg.type === 'success'
                ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/25'
                : 'text-rose-400 bg-rose-500/10 border border-rose-500/25'
            }`}>
              {teamMsg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              {teamMsg.text}
            </div>
          )}

          {showAddForm && (
            <form onSubmit={handleAddMember} className="glass p-5 space-y-4 animate-fade-in">
              <h4 className="text-sm font-bold text-slate-200">New Staff Account</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-label text-slate-400 block mb-1">Full Name *</label>
                  <input required className="input text-xs" value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Chidi Okafor" />
                </div>
                <div>
                  <label className="text-label text-slate-400 block mb-1">Email *</label>
                  <input required type="email" className="input text-xs" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="staff@store.com" />
                </div>
                <div>
                  <label className="text-label text-slate-400 block mb-1">Password *</label>
                  <input required type="password" className="input text-xs" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min 8 characters" />
                </div>
                <div>
                  <label className="text-label text-slate-400 block mb-1">Phone</label>
                  <input type="tel" className="input text-xs" value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="+234..." />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-label text-slate-400 block mb-1">Role *</label>
                  <select className="select w-full text-sm py-2.5" value={newRole} onChange={e => setNewRole(e.target.value)}>
                    <option value="sales_agent">Confirmation Staff</option>
                    <option value="logistics">Logistics Rider</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowAddForm(false)} className="btn-ghost text-xs">Cancel</button>
                <button type="submit" disabled={addingMember} className="btn-primary text-xs">
                  {addingMember ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating…</> : <><UserPlus className="w-3.5 h-3.5" /> Create Account</>}
                </button>
              </div>
            </form>
          )}

          <div className="glass overflow-hidden">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loadingTeam ? (
                  Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} cols={5} />)
                ) : teamMembers.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-10 text-xs text-slate-500 italic">
                    No staff accounts yet.
                  </td></tr>
                ) : teamMembers.map(m => (
                  <tr key={m.id}>
                    <td className="font-semibold text-slate-200">{m.full_name}</td>
                    <td className="text-slate-400 font-mono text-[11px]">{m.email}</td>
                    <td><span className="badge badge-scheduled">{roleLabel[m.role] || m.role}</span></td>
                    <td>
                      <span className={`badge ${m.is_active !== false ? 'badge-delivered' : 'badge-cancelled'}`}>
                        {m.is_active !== false ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td>
                      {m.role !== 'owner' && (
                        <button
                          onClick={() => handleToggleStatus(m)}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                            m.is_active !== false
                              ? 'text-rose-400 hover:bg-rose-500/15'
                              : 'text-emerald-400 hover:bg-emerald-500/15'
                          }`}
                        >
                          {m.is_active !== false ? 'Disable' : 'Enable'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ────────────── AUDIT TRAIL ────────────── */}
      {activeSection === 'audit' && (
        <div className="space-y-4 animate-fade-in">
          <div>
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" style={{ color: 'var(--brand)' }} />
              Audit Trail
            </h3>
            <p className="text-xs text-slate-400">A tamper-evident log of order deletions and system configuration changes.</p>
          </div>
          <div className="glass overflow-hidden">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Reference</th>
                  <th>Performed By</th>
                  <th>Timestamp</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {loadingAudit ? (
                  Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} cols={5} />)
                ) : auditLogs.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-10 text-xs text-slate-500 italic">
                    No audit events recorded yet.
                  </td></tr>
                ) : auditLogs.map(log => (
                  <tr key={log.id}>
                    <td>
                      <span className={`badge ${log.action === 'ORDER_DELETED' ? 'badge-cancelled' : 'badge-scheduled'}`}>
                        {log.action?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="font-mono text-xs font-bold" style={{ color: '#a5b4fc' }}>
                      {log.order_number || 'SYSTEM'}
                    </td>
                    <td className="text-slate-300 text-xs">{log.performed_by}</td>
                    <td className="text-slate-400 text-[11px] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="text-slate-300 text-xs">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}