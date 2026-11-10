import React, { useState, useEffect } from 'react';
import { ShieldCheck, Link, Users, Layers, Truck, HelpCircle, Copy, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiUrl } from '../utils/apiUrl';

export default function GenericModuleView({ moduleKey }) {
  const { user } = useAuth();
  const [copiedKey, setCopiedKey] = useState(null);
  const [teamList, setTeamList] = useState([]);
  const [loadingTeam, setLoadingTeam] = useState(false);

  useEffect(() => {
    if (moduleKey === 'users') {
      setLoadingTeam(true);
      const token = localStorage.getItem('gravity_crm_token');
      const storeId = user?.store_id || user?.id || '';
      fetch(apiUrl(`/api/team?store_id=${encodeURIComponent(storeId)}`), {
        headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
      })
        .then(r => r.ok ? r.json() : [])
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            setTeamList(data.map(m => ({
              name: m.full_name,
              role: m.role?.replace('_', ' ')?.toUpperCase(),
              email: m.email,
              status: m.is_active !== false ? 'Active' : 'Disabled'
            })));
          } else {
            setTeamList([
              { name: user?.full_name || 'Store Owner', role: 'Owner / Admin', email: user?.email || 'owner@store.ng', status: 'Active' }
            ]);
          }
        })
        .catch(() => {
          setTeamList([
            { name: user?.full_name || 'Store Owner', role: 'Owner / Admin', email: user?.email || 'owner@store.ng', status: 'Active' }
          ]);
        })
        .finally(() => setLoadingTeam(false));
    }
  }, [moduleKey, user]);

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const webhookBase = typeof window !== 'undefined' ? window.location.origin : 'https://gravity-crm.ng';

  const configs = {
    users: {
      title: 'Users & CRM Staff Management',
      subtitle: 'Control roles, confirmation agent permissions, and owner access',
      icon: Users,
      items: teamList.length > 0 ? teamList : [
        { name: user?.full_name || 'Store Owner', role: 'Owner / Admin', email: user?.email || 'owner@store.ng', status: 'Active' }
      ]
    },
    webhooks: {
      title: 'Webhooks & External API Integrations',
      subtitle: 'POST real-time order submission payloads from WooCommerce, Shopify, Elementor, or custom forms',
      icon: Link,
      items: [
        { name: 'Standard Order Submission Webhook', role: 'POST (JSON)', email: `${webhookBase}/api/orders`, status: 'Live & Active' },
        { name: 'Draft / Abandoned Cart Ingestion', role: 'POST (JSON)', email: `${webhookBase}/api/orders/draft`, status: 'Live & Active' },
        { name: 'Public Form Embed & Catalog Endpoint', role: 'GET (JSON)', email: `${webhookBase}/api/forms/embed/:key`, status: 'Active' }
      ]
    },
    'payment-gateways': {
      title: 'Payment Settlement Methods',
      subtitle: 'Configure online prepayment options and Cash-on-Delivery (COD) reconciliation',
      icon: ShieldCheck,
      items: [
        { name: 'Cash On Delivery (COD)', role: 'Primary Settlement', email: 'Default active method for Nigerian deliveries', status: 'Active' },
        { name: 'Paystack Payment Gateway', role: 'Online Cards / USSD / Bank Transfer', email: 'Configurable in Store Settings', status: 'Available' },
        { name: 'Flutterwave Integration', role: 'Mobile Money / Bank Transfer / Barter', email: 'Configurable in Store Settings', status: 'Available' }
      ]
    }
  };

  const currConfig = configs[moduleKey] || configs.users;
  const IconComponent = currConfig.icon;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <h2 className="section-title">
            <IconComponent className="w-5 h-5 text-indigo-400" /> {currConfig.title}
          </h2>
          <p className="section-subtitle">{currConfig.subtitle}</p>
        </div>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800">
          <h3 className="text-sm font-bold text-slate-100">Configured Entries</h3>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Role / Type</th>
              <th>Endpoint / Contact</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {currConfig.items.map((item, idx) => (
              <tr key={idx}>
                <td className="font-semibold text-slate-200">{item.name}</td>
                <td className="text-slate-400">{item.role}</td>
                <td className="font-mono text-xs text-indigo-300">
                  <div className="flex items-center gap-2">
                    <span>{item.email}</span>
                    {moduleKey === 'webhooks' && (
                      <button
                        onClick={() => handleCopy(item.email, idx)}
                        className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                        title="Copy Webhook URL"
                      >
                        {copiedKey === idx ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </td>
                <td><span className="badge badge-delivered">{item.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
