import React from 'react';
import { ShieldCheck, Link, Users, Layers, Truck, HelpCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function GenericModuleView({ moduleKey }) {
  const { user } = useAuth();

  const userList = [
    { name: user?.full_name || 'Merchant Owner', role: user?.role === 'owner' ? 'Owner / Admin' : user?.role || 'Owner', email: user?.email || 'owner@merchant.ng', status: 'Active' },
    { name: 'Chidi Okafor', role: 'Confirmation Staff', email: 'chidi@merchant.ng', status: 'Active' },
    { name: 'Babajide Adeleke', role: 'Logistics Manager', email: 'logistics@merchant.ng', status: 'Active' }
  ];

  const configs = {
    users: {
      title: 'Users & CRM Staff Management',
      subtitle: 'Control roles, confirmation agent permissions, and owner access',
      icon: Users,
      items: userList
    },
    webhooks: {
      title: 'Webhooks & API Integration (NEW)',
      subtitle: 'Receive real-time order submission HTTP POST payloads for WooCommerce/Shopify',
      icon: Link,
      items: [
        { name: 'Facebook Lead Ads Integration', role: 'Webhook Active', email: '/api/orders/draft', status: 'Active' },
        { name: 'WooCommerce Order Sync', role: 'Webhook Active', email: '/api/orders', status: 'Active' }
      ]
    },
    suppliers: {
      title: 'Suppliers & Manufacturing Partners',
      subtitle: 'Manage wholesale suppliers, import shipments, and cost invoices',
      icon: Layers,
      items: [
        { name: 'Guangzhou Kitchenware Ltd', role: 'Wholesale Supplier', email: 'contact@guangzhouware.com', status: 'Active' },
        { name: 'Shenzhen Tech Electronics', role: 'Gadgets Manufacturer', email: 'sales@sztech.cn', status: 'Active' }
      ]
    },
    agents: {
      title: 'Delivery Fleet & Courier Agents',
      subtitle: 'Assign dispatch riders, Speedaf, GIG Logistics, or internal drivers',
      icon: Truck,
      items: [
        { name: 'Speedaf Logistics Courier', role: 'Nationwide Courier', email: 'dispatch@speedaf.com', status: 'Active' },
        { name: 'GIG Logistics (GIGL)', role: 'Pan-African Logistics', email: 'express@gigl.com', status: 'Active' },
        { name: 'Inland Bikers Fleet', role: 'Last-mile Rider Fleet', email: 'riders@delivery.ng', status: 'Active' }
      ]
    },
    'payment-gateways': {
      title: 'Payment Gateways & Paystack / Flutterwave',
      subtitle: 'Configure online prepayment options and Cash-on-Delivery (COD) reconciliation',
      icon: ShieldCheck,
      items: [
        { name: 'Cash On Delivery (COD)', role: 'Primary Settlement', email: 'Default active method for 90% African sales', status: 'Active' },
        { name: 'Paystack Payment Gateway', role: 'Online Cards / USSD', email: 'pk_live_xxxxxx', status: 'Configured' },
        { name: 'Flutterwave Integration', role: 'Mobile Money / Bank Transfer', email: 'FLWSECK_TEST_xxxxxx', status: 'Configured' }
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
                <td className="font-mono text-xs text-indigo-300">{item.email}</td>
                <td><span className="badge badge-delivered">{item.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
