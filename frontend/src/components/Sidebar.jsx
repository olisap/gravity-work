import React from 'react';
import {
  LayoutDashboard, ShoppingBag, Package,
  FileText, Clock, BellRing, Zap, Users, Tags,
  Truck, PhoneCall, Wallet, Send, Link, ShieldCheck,
  HelpCircle, Layers, LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ activeTab, setActiveTab, activeRole }) {
  const { user, logoutUser } = useAuth();
  const rawRole = activeRole || user?.role || 'owner';
  const effectiveRole = rawRole === 'sales_agent' ? 'confirmation_staff' : rawRole;

  const navGroups = [
    {
      group: 'Core Overview',
      roles: ['owner', 'admin', 'confirmation_staff', 'sales_agent', 'logistics'],
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'users', label: 'Users & Staff', icon: Users },
      ]
    },
    {
      group: 'Products & Forms',
      roles: ['owner', 'admin', 'confirmation_staff', 'sales_agent'],
      items: [
        { id: 'categories', label: 'Product Categories', icon: Tags },
        { id: 'products', label: 'Products Catalog', icon: Package, badge: 'Catalog' },
        { id: 'form-builder', label: 'Order Forms', icon: FileText, badge: 'Embed' },
        { id: 'webhooks', label: 'Webhooks (NEW)', icon: Link, badge: 'API' },
      ]
    },
    {
      group: 'Fulfillment & Fleet',
      roles: ['owner', 'admin', 'logistics'],
      items: [
        { id: 'suppliers', label: 'Suppliers', icon: Layers },
        { id: 'agents', label: 'Agents & Fleet', icon: Truck },
        { id: 'products-inventory', label: 'Stock Inventory', icon: Package },
      ]
    },
    {
      group: 'Orders & Dispatch',
      roles: ['owner', 'admin', 'confirmation_staff', 'sales_agent', 'logistics'],
      items: [
        { id: 'todays-deliveries', label: "Today's Deliveries", icon: Truck, badge: 'Today' },
        { id: 'todays-followups', label: "Today's Followups", icon: PhoneCall },
        { id: 'orders', label: 'Orders Pipeline', icon: ShoppingBag, badge: 'COD' },
        { id: 'draft-reminders', label: 'Abandoned Drafts', icon: Clock, badge: 'Auto' },
      ]
    },
    {
      group: 'Finance & Accounts',
      roles: ['owner', 'admin'],
      items: [
        { id: 'accounting', label: 'Expenses & Margins', icon: Wallet },
        { id: 'payment-gateways', label: 'Payment Gateways', icon: ShieldCheck },
      ]
    },
    {
      group: 'Marketing Automation',
      roles: ['owner', 'admin', 'confirmation_staff', 'sales_agent'],
      items: [
        { id: 'whatsapp-marketing', label: 'WhatsApp Marketing', icon: Send },
        { id: 'notifications', label: 'SMS Marketing', icon: BellRing },
        { id: 'email-marketing', label: 'Email Marketing', icon: Send },
        { id: 'upsells', label: 'Upsell Engine', icon: Zap },
      ]
    }
  ];

  // Filter groups by effectiveRole
  const visibleGroups = navGroups.filter(g => g.roles.includes(effectiveRole) || effectiveRole === 'owner');

  return (
    <aside className="w-64 shrink-0 bg-slate-900/95 backdrop-blur-xl border-r border-slate-800/80 h-screen sticky top-0 flex flex-col z-30 overflow-hidden">

      {/* Brand Header */}
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-800/80 shrink-0 bg-slate-950/40">
        <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center overflow-hidden shrink-0 shadow-lg">
          <img
            src="/logo.png"
            alt="Gravity Commerce"
            className="w-full h-full object-contain p-0.5"
            onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/40?text=GC'; }}
          />
        </div>
        <div className="min-w-0">
          <h1 className="font-extrabold text-slate-100 text-sm tracking-tight truncate">
            {user?.store_name || 'OLISTORES CRM'}
          </h1>
          <span className="flex items-center gap-1.5 text-[9px] text-emerald-400 font-semibold uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Active Session
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto scrollbar-none px-3 py-3 space-y-4">
        {visibleGroups.map((group, idx) => (
          <div key={idx} className="space-y-1">
            <p className="px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              {group.group}
            </p>
            {group.items.map(({ id, label, icon: Icon, badge }) => {
              const active = activeTab === id || (id === 'products-inventory' && activeTab === 'products');
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id === 'products-inventory' ? 'products' : id)}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-all duration-150 ${
                    active
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 font-bold'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-slate-400'}`} />
                    <span className="truncate">{label}</span>
                  </span>
                  {badge && (
                    <span className={`shrink-0 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-widest ${
                      active ? 'bg-indigo-800 text-indigo-100' : 'bg-slate-800 text-slate-500 border border-slate-700/60'
                    }`}>
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User Profile Footer */}
      <div className="px-3 py-3 border-t border-slate-800/80 shrink-0 bg-slate-950/40">
        <div className="glass px-3 py-2 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 flex items-center justify-center font-bold text-xs shrink-0">
              {user?.full_name?.slice(0, 2).toUpperCase() || 'OL'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-100 truncate">{user?.full_name || 'CRM User'}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wide truncate">
                {userRole === 'owner' ? 'Owner / Admin' : userRole === 'confirmation_staff' ? 'Confirmation Staff' : 'Logistics Rider'}
              </p>
            </div>
          </div>
          <button onClick={logoutUser} title="Log Out" className="text-slate-500 hover:text-rose-400 transition-colors p-1">
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
