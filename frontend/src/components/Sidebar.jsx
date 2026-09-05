import React from 'react';
import {
  LayoutDashboard, Package, FileText, ShoppingBag,
  Truck, Clock, Layers, Send, Zap, Wallet,
  Settings, Link, LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ activeTab, setActiveTab, activeRole, isOpen }) {
  const { user, logoutUser } = useAuth();
  const rawRole = activeRole || user?.role || 'owner';
  const effectiveRole = rawRole === 'sales_agent' ? 'confirmation_staff' : rawRole;

  const navGroups = [
    {
      group: 'Overview',
      items: [
        { id: 'dashboard',  label: 'Dashboard',         icon: LayoutDashboard,
          roles: ['owner', 'admin', 'confirmation_staff', 'sales_agent'] },
      ]
    },
    {
      group: 'Products',
      items: [
        { id: 'products',      label: 'Products & Catalog', icon: Package,
          roles: ['owner', 'admin', 'confirmation_staff', 'sales_agent'] },
        { id: 'form-builder',  label: 'Order Forms',        icon: FileText,
          roles: ['owner', 'admin', 'confirmation_staff', 'sales_agent'] },
        { id: 'webhooks',      label: 'Webhooks',           icon: Link,
          roles: ['owner', 'admin'] },
      ]
    },
    {
      group: 'Orders',
      items: [
        { id: 'orders',          label: 'Orders Pipeline',  icon: ShoppingBag,
          roles: ['owner', 'admin', 'confirmation_staff', 'sales_agent', 'logistics'] },
        { id: 'dispatch',        label: 'Dispatch & Tasks', icon: Truck,
          roles: ['owner', 'admin', 'confirmation_staff', 'sales_agent', 'logistics'] },
        { id: 'draft-reminders', label: 'Abandoned Drafts', icon: Clock,
          roles: ['owner', 'admin', 'confirmation_staff', 'sales_agent'] },
      ]
    },
    {
      group: 'Fleet & Fulfillment',
      items: [
        { id: 'products-inventory', label: 'Stock Inventory',   icon: Layers,
          roles: ['owner', 'admin', 'logistics'] },
        { id: 'suppliers',          label: 'Suppliers',         icon: Package,
          roles: ['owner', 'admin', 'logistics'] },
        { id: 'agents',             label: 'Delivery Agents',   icon: Truck,
          roles: ['owner', 'admin', 'logistics'] },
      ]
    },
    {
      group: 'Finance',
      items: [
        { id: 'accounting', label: 'Expenses & Margins', icon: Wallet,
          roles: ['owner', 'admin'] },
        { id: 'upsells',    label: 'Upsell Engine',     icon: Zap,
          roles: ['owner', 'admin', 'confirmation_staff', 'sales_agent'] },
      ]
    },
    {
      group: 'Marketing',
      items: [
        { id: 'marketing', label: 'Marketing Hub', icon: Send,
          roles: ['owner', 'admin', 'confirmation_staff', 'sales_agent'] },
      ]
    },
    {
      group: 'Settings',
      items: [
        { id: 'settings', label: 'Store Settings', icon: Settings,
          roles: ['owner', 'admin'] },
      ]
    },
  ];

  const visibleGroups = navGroups
    .map(g => ({
      ...g,
      items: g.items.filter(item =>
        !item.roles || item.roles.includes(effectiveRole) || effectiveRole === 'owner'
      )
    }))
    .filter(g => g.items.length > 0);

  const roleLabel = {
    owner:              'Owner / Admin',
    admin:              'Store Admin',
    confirmation_staff: 'Confirmation Staff',
    sales_agent:        'Confirmation Staff',
    logistics:          'Logistics Rider',
  }[effectiveRole] || effectiveRole;

  return (
    <aside 
      className={`fixed md:relative w-60 shrink-0 h-screen top-0 flex flex-col z-50 overflow-hidden transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      style={{ background: 'rgba(10, 14, 22, 0.97)', borderRight: '1px solid var(--border)' }}>

      {/* ── Brand Header ── */}
      <div className="flex items-center gap-3 px-4 py-3.5 shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="w-8 h-8 rounded-xl overflow-hidden shrink-0 flex items-center justify-center bg-slate-900 border border-slate-700/80">
          <img
            src={user?.company_logo || '/logo.png'}
            alt={user?.store_name || "Gravity Commerce"}
            className="w-full h-full object-contain p-0.5"
            onError={e => { e.target.onerror = null; e.target.src = '/logo.png'; }}
          />
        </div>
        <div className="min-w-0">
          <h1 className="font-bold text-slate-100 text-sm tracking-tight truncate leading-tight">
            {user?.store_name || 'Gravity Commerce'}
          </h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="live-dot"></span>
            <span className="text-[10px] font-medium" style={{ color: '#34d399' }}>Live</span>
          </div>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto scrollbar-none px-3 py-3 space-y-4">
        {visibleGroups.map((group, idx) => (
          <div key={idx} className="space-y-0.5">
            <p className="px-3 mb-1 text-label" style={{ color: 'var(--text-3)' }}>
              {group.group}
            </p>
            {group.items.map(({ id, label, icon: Icon }) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`nav-item w-full text-left${active ? ' active' : ''}`}
                >
                  <Icon className="w-4 h-4 shrink-0" style={{ opacity: active ? 1 : 0.6 }} />
                  <span className="truncate">{label}</span>
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* ── User Footer ── */}
      <div className="px-3 py-3 shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2.5 px-2 py-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0"
            style={{
              background: 'var(--brand-dim)',
              border: '1px solid rgba(99,102,241,0.35)',
              color: '#a5b4fc'
            }}
          >
            {user?.full_name?.slice(0, 2).toUpperCase() || 'GC'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-100 truncate leading-tight">
              {user?.full_name || 'CRM User'}
            </p>
            <p className="text-[10px] truncate" style={{ color: 'var(--text-3)' }}>{roleLabel}</p>
          </div>
          <button
            onClick={logoutUser}
            title="Sign out"
            className="p-1 rounded-lg transition-colors text-slate-500 hover:text-rose-400"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
