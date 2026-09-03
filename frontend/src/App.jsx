import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import OrdersPipeline from './pages/OrdersPipeline';
import ProductsInventory from './pages/ProductsInventory';
import StockInventory from './pages/StockInventory';
import SuppliersManager from './pages/SuppliersManager';
import DeliveryAgentsManager from './pages/DeliveryAgentsManager';
import FormBuilder from './pages/FormBuilder';
import DraftReminders from './pages/DraftReminders';

import UpsellManager from './pages/UpsellManager';
import ExpensesAccounting from './pages/ExpensesAccounting';
import DeliveriesFollowups from './pages/DeliveriesFollowups';
import MarketingHub from './pages/MarketingHub';
import GenericModuleView from './pages/GenericModuleView';
import ConfirmationCallModal from './components/ConfirmationCallModal';
import LoginPage from './pages/LoginPage';
import OnboardingPage from './pages/OnboardingPage';
import CheckoutPage from './pages/CheckoutPage';
import SettingsPage from './pages/SettingsPage';

import TeamManagementModal from './components/TeamManagementModal';
import { apiUrl } from './utils/apiUrl';

function CrmAppContent() {
  const { user, isAuthenticated } = useAuth();
  
  // Standalone checkout route for embedded forms
  const isCheckoutRoute = window.location.pathname === '/checkout' || window.location.pathname === '/p/checkout';
  if (isCheckoutRoute) {
    return <CheckoutPage />;
  }

  const [viewMode, setViewMode] = useState('crm'); // 'crm', 'login', 'onboarding'
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [selectedCountry, setSelectedCountry] = useState('Nigeria');
  const [selectedState, setSelectedState] = useState('All Regions');
  const [activeRole, setActiveRole] = useState(user?.role || 'owner');

  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [forms, setForms] = useState([]);
  const [activeModalOrder, setActiveModalOrder] = useState(null);
  const [showTeamModal, setShowTeamModal] = useState(false);

  // Sync role when user updates and enforce tab permission safeguards
  useEffect(() => {
    if (user) {
      const userRole = user.role || 'owner';
      // Non-owner users cannot switch role
      if (userRole !== 'owner') {
        setActiveRole(userRole);
      } else {
        setActiveRole(user.role || 'owner');
      }
      if (user.country) setSelectedCountry(user.country);
    }
  }, [user]);

  // Tab authorization safeguard
  useEffect(() => {
    const rawRole = activeRole || user?.role || 'owner';
    const effectiveRole = rawRole === 'sales_agent' ? 'confirmation_staff' : rawRole;

    const roleTabPermissions = {
      owner: null, // Full access
      admin: null, // Full access
      confirmation_staff: [
        'dashboard', 'products', 'form-builder',
        'dispatch', 'orders', 'draft-reminders',
        'marketing', 'upsells'
      ],
      logistics: [
        'dispatch', 'orders',
        'suppliers', 'agents', 'products-inventory', 'products'
      ]
    };

    const allowedTabs = roleTabPermissions[effectiveRole];
    if (allowedTabs && !allowedTabs.includes(activeTab)) {
      const fallbackTab = effectiveRole === 'logistics' ? 'dispatch' : 'dashboard';
      console.warn(`Tab "${activeTab}" not authorized for "${effectiveRole}". Falling back to "${fallbackTab}".`);
      setActiveTab(fallbackTab);
    }
  }, [activeRole, activeTab, user]);

  // Data Fetch
  const fetchData = async () => {
    try {
      const storeId = user?.store_id || user?.id || '';
      const queryStr = storeId ? `?store_id=${encodeURIComponent(storeId)}` : '';
      const storedToken = localStorage.getItem('gravity_crm_token');
      const headers = storedToken ? { 'Authorization': `Bearer ${storedToken}` } : {};

      const [ordersRes, productsRes, formsRes] = await Promise.all([
        fetch(apiUrl(`/api/orders${queryStr}`), { headers }).then(r => r.ok ? r.json() : []).catch(() => []),
        fetch(apiUrl(`/api/products${queryStr}`), { headers }).then(r => r.ok ? r.json() : []).catch(() => []),
        fetch(apiUrl(`/api/forms${queryStr}`), { headers }).then(r => r.ok ? r.json() : []).catch(() => [])
      ]);

      if (Array.isArray(ordersRes)) setOrders(ordersRes);
      if (Array.isArray(productsRes)) setProducts(productsRes);
      if (Array.isArray(formsRes)) setForms(formsRes);
    } catch (err) {
      console.error('Error fetching API data:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleUpdateStatus = async (orderId, newStatus, notes, scheduleData) => {
    try {
      const token = localStorage.getItem('gravity_crm_token');
      const res = await fetch(apiUrl(`/api/orders/${orderId}/status`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          status: newStatus,
          confirmation_notes: notes,
          ...(scheduleData || {})
        })
      });
      const updated = await res.json();
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updated } : o));
    } catch (err) {
      setOrders(prev => prev.map(o => o.id === orderId ? {
        ...o,
        status: newStatus,
        confirmation_call_notes: notes,
        ...(newStatus === 'Delivered' ? { delivered_at: new Date().toISOString() } : {})
      } : o));
    }
  };

  const handleAddUpsell = async (orderId, upsellItem, source) => {
    try {
      const res = await fetch(apiUrl(`/api/orders/${orderId}/upsell`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ upsell_item: upsellItem, upsell_source: source })
      });
      const updated = await res.json();
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updated } : o));
    } catch (err) {
      setOrders(prev => prev.map(o => {
        if (o.id === orderId) {
          const items = [...(o.items || []), { ...upsellItem, is_upsell: true }];
          const subtotal = (o.subtotal || 0) + (upsellItem.unit_price_at_time_of_order * upsellItem.quantity);
          return {
            ...o,
            items,
            subtotal,
            total_amount: subtotal + (o.delivery_fee || 2000),
            upsell_source: source
          };
        }
        return o;
      }));
    }
  };

  const handleProductCreated = (newProd) => {
    setProducts(prev => [newProd, ...prev]);
  };

  const handleProductDeleted = (deletedId) => {
    setProducts(prev => prev.filter(p => p.id !== deletedId));
  };

  const handleProductUpdated = (updatedProd) => {
    setProducts(prev => prev.map(p => p.id === updatedProd.id ? { ...p, ...updatedProd } : p));
  };

  const handleFormCreated = (newForm) => {
    setForms(prev => [newForm, ...prev]);
  };

  const handleFormUpdated = (updatedForm) => {
    setForms(prev => prev.map(f => f.id === updatedForm.id ? { ...f, ...updatedForm } : f));
  };

  const handleFormDeleted = (deletedId) => {
    setForms(prev => prev.filter(f => f.id !== deletedId));
  };

  // If user clicks "Start Onboarding"
  if (viewMode === 'onboarding') {
    return (
      <OnboardingPage
        onOnboardingCompleted={() => setViewMode('crm')}
      />
    );
  }

  // If unauthenticated and on login view
  if (!isAuthenticated && viewMode !== 'onboarding') {
    return (
      <LoginPage
        onNavigateToOnboarding={() => setViewMode('onboarding')}
      />
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#090d16] text-slate-100">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar activeTab={activeTab} setActiveTab={(tab) => { setActiveTab(tab); setIsSidebarOpen(false); }} activeRole={activeRole} isOpen={isSidebarOpen} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          selectedCountry={selectedCountry}
          setSelectedCountry={setSelectedCountry}
          selectedState={selectedState}
          setSelectedState={setSelectedState}
          activeRole={activeRole}
          setActiveRole={setActiveRole}
          onRefresh={fetchData}
          onOpenTeamModal={() => setShowTeamModal(true)}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />

        <main className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-none">
          {activeTab === 'dashboard' && (
            <Dashboard
              selectedCountry={selectedCountry}
              selectedState={selectedState}
              orders={orders}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsPage
              onSettingsUpdated={fetchData}
            />
          )}

          {activeTab === 'orders' && (
            <OrdersPipeline
              orders={orders}
              selectedCountry={selectedCountry}
              selectedState={selectedState}
              onOpenConfirmationModal={(order) => setActiveModalOrder(order)}
              onUpdateStatus={handleUpdateStatus}
            />
          )}

          {activeTab === 'products' && (
            <ProductsInventory
              products={products}
              selectedCountry={selectedCountry}
              onProductCreated={handleProductCreated}
              onProductDeleted={handleProductDeleted}
              onProductUpdated={handleProductUpdated}
              onNavigateToFormBuilder={(form) => {
                setForms(prev => [form, ...prev]);
                setActiveTab('form-builder');
              }}
            />
          )}


          {activeTab === 'form-builder' && (
            <FormBuilder
              products={products}
              forms={forms}
              onFormCreated={handleFormCreated}
              onFormUpdated={handleFormUpdated}
              onFormDeleted={handleFormDeleted}
            />
          )}

          {activeTab === 'draft-reminders' && (
            <DraftReminders
              orders={orders}
              selectedCountry={selectedCountry}
            />
          )}


          {activeTab === 'upsells' && (
            <UpsellManager selectedCountry={selectedCountry} />
          )}

          {activeTab === 'accounting' && (
            <ExpensesAccounting
              selectedCountry={selectedCountry}
              orders={orders}
            />
          )}

          {activeTab === 'dispatch' && (
            <DeliveriesFollowups
              orders={orders}
              selectedCountry={selectedCountry}
              onOpenConfirmationModal={(order) => setActiveModalOrder(order)}
              onUpdateStatus={handleUpdateStatus}
            />
          )}

          {activeTab === 'marketing' && (
            <MarketingHub selectedCountry={selectedCountry} />
          )}

          {activeTab === 'products-inventory' && (
            <StockInventory
              products={products}
              selectedCountry={selectedCountry}
              onProductUpdated={handleProductUpdated}
            />
          )}

          {activeTab === 'suppliers' && (
            <SuppliersManager />
          )}

          {activeTab === 'agents' && (
            <DeliveryAgentsManager
              products={products}
              selectedCountry={selectedCountry}
            />
          )}

          {['users', 'webhooks', 'payment-gateways'].includes(activeTab) && (
            <GenericModuleView moduleKey={activeTab} />
          )}
        </main>
      </div>

      {/* Confirmation Call Modal */}
      {activeModalOrder && (
        <ConfirmationCallModal
          order={activeModalOrder}
          onClose={() => setActiveModalOrder(null)}
          onUpdateStatus={handleUpdateStatus}
          onAddUpsell={handleAddUpsell}
        />
      )}

      {/* Team & Staff Management Modal */}
      {showTeamModal && (
        <TeamManagementModal
          user={user}
          onClose={() => setShowTeamModal(false)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CrmAppContent />
    </AuthProvider>
  );
}
