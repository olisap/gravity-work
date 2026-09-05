import { supabase } from '../config/supabase.js';

// Default Store Settings
let mockStoreSettings = {
  store_name: 'olistores',
  company_logo: '/logo.png',
  store_country: 'Nigeria',
  office_state: 'Lagos',
  warehouse_state: 'Lagos',
  store_address: 'LAGOS',
  phone_number: '2349068609892',
  whatsapp_number: '2349068609892',
  email: 'olisapaul1@gmail.com',
  invoice_footer_message: 'eg: Grand Total includes 7.5% VAT',

  // Optional Tabs to show on Orders page
  tab_confirmed: true,
  tab_shipped: true,
  tab_returned: true,
  tab_after_sale: true,
  tab_failed: true,

  // Security & Notifications
  email_on_login: true,
  show_performance_bar: true,
  force_delivered_qty_selection: false,
  low_stock_sms: false,
  low_stock_email: true,
  low_stock_whatsapp: true,
  reminder_email: true,
  reminder_whatsapp: true,
  invoice_via_email: true,
  invoice_via_whatsapp: true,

  // Dispatch & Inventory Rules
  prevent_duplicate_orders: true,
  whatsapp_notify_agents: true,
  select_closer_on_delivered: false,
  state_selection_option: 'Select State',
  manage_inventory: true,
  round_robin_assignment: 'No'
};

// Mock Audit Trail Logs
let mockAuditTrail = [
  {
    id: 'aud-001',
    action: 'ORDER_DELETED',
    order_number: 'OLI-10088',
    customer_name: 'David Mark',
    amount: 25000,
    performed_by: 'Amina Bello (Owner)',
    timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
    details: 'Order manually deleted from draft pipeline'
  },
  {
    id: 'aud-002',
    action: 'ORDER_DELETED',
    order_number: 'OLI-10042',
    customer_name: 'Blessing Okon',
    amount: 18500,
    performed_by: 'Chidi Okafor (Confirmation)',
    timestamp: new Date(Date.now() - 14 * 3600000).toISOString(),
    details: 'Duplicate submission cancelled and removed'
  },
  {
    id: 'aud-003',
    action: 'SETTINGS_UPDATED',
    performed_by: 'Amina Bello (Owner)',
    timestamp: new Date(Date.now() - 24 * 3600000).toISOString(),
    details: 'Updated store contact number and invoice footer message'
  }
];

export async function getSettings(req, res) {
  const store_id = req.storeId;

  let currentSettings = { ...mockStoreSettings };

  if (supabase && store_id) {
    try {
      // 1. Check if stores table has store record to sync name and country
      const { data: storeData } = await supabase.from('stores').select('*').eq('id', store_id).single();
      if (storeData) {
        currentSettings.store_name = storeData.name || currentSettings.store_name;
        currentSettings.store_country = storeData.country || currentSettings.store_country;
      }

      // 2. Try settings table if present
      const { data: settingsData, error } = await supabase.from('settings').select('*').eq('store_id', store_id);
      if (!error && settingsData && settingsData[0]) {
        currentSettings = { ...currentSettings, ...settingsData[0] };
      }
    } catch (e) {
      console.error('Supabase settings fetch error:', e);
    }
  }

  res.json(currentSettings);
}

export async function updateSettings(req, res) {
  const newSettings = req.body;

  mockStoreSettings = {
    ...mockStoreSettings,
    ...newSettings
  };

  // Add audit trail event for settings change
  mockAuditTrail.unshift({
    id: `aud-${Date.now()}`,
    action: 'SETTINGS_UPDATED',
    performed_by: req.user?.email || 'Store Owner',
    timestamp: new Date().toISOString(),
    details: 'Store settings configuration saved'
  });

  if (supabase) {
    try {
      const storeId = req.storeId;
      if (storeId) {
        // 1. Sync store name, country to the stores table in Supabase
        if (newSettings.store_name || newSettings.store_country) {
          const storeUpdates = {};
          if (newSettings.store_name) storeUpdates.name = newSettings.store_name;
          if (newSettings.store_country) storeUpdates.country = newSettings.store_country;
          await supabase.from('stores').update(storeUpdates).eq('id', storeId);
        }

        // 2. Sync store_name to users belonging to this store
        if (newSettings.store_name) {
          await supabase.from('users').update({ store_name: newSettings.store_name }).eq('store_id', storeId);
        }

        // 3. Try to persist full settings record if settings table exists
        await supabase.from('settings').upsert([{ store_id: storeId, ...mockStoreSettings }]);
      }
    } catch (e) {
      console.warn('Supabase settings update notice:', e.message || e);
    }
  }

  res.json({ message: 'Settings saved successfully', settings: mockStoreSettings });
}

export async function getAuditTrail(req, res) {
  res.json(mockAuditTrail);
}
