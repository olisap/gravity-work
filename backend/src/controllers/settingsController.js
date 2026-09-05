import { supabase } from '../config/supabase.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SETTINGS_FILE = join(__dirname, '../../data/store_settings.json');

// ── Ensure data directory exists ──────────────────────────────────────────────
import { mkdirSync } from 'fs';
try { mkdirSync(join(__dirname, '../../data'), { recursive: true }); } catch {}

// ── Default Store Settings ────────────────────────────────────────────────────
const DEFAULT_SETTINGS = {
  store_name: 'My Store',
  company_logo: '',
  store_country: 'Nigeria',
  office_state: 'Lagos',
  warehouse_state: 'Lagos',
  store_address: '',
  phone_number: '',
  whatsapp_number: '',
  email: '',
  invoice_footer_message: 'Thank you for your order!',

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

// ── Per-store settings cache (keyed by store_id) ──────────────────────────────
let settingsCache = {};

function loadSettingsFile() {
  try {
    if (existsSync(SETTINGS_FILE)) {
      const raw = readFileSync(SETTINGS_FILE, 'utf8');
      settingsCache = JSON.parse(raw) || {};
    }
  } catch (e) {
    console.warn('Could not load settings file, using defaults:', e.message);
    settingsCache = {};
  }
}

function saveSettingsFile() {
  try {
    writeFileSync(SETTINGS_FILE, JSON.stringify(settingsCache, null, 2), 'utf8');
  } catch (e) {
    console.warn('Could not write settings file:', e.message);
  }
}

// Load on startup
loadSettingsFile();

// ── Mock Audit Trail ───────────────────────────────────────────────────────────
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

// ── GET /api/settings ─────────────────────────────────────────────────────────
export async function getSettings(req, res) {
  const store_id = req.storeId;

  // Start with defaults
  let currentSettings = { ...DEFAULT_SETTINGS };

  // Layer 1: load from persistent file cache
  if (store_id && settingsCache[store_id]) {
    currentSettings = { ...currentSettings, ...settingsCache[store_id] };
  }

  // Layer 2: overlay from Supabase stores table (authoritative for name/country)
  if (supabase && store_id) {
    try {
      const { data: storeData, error: stErr } = await supabase
        .from('stores')
        .select('name, country, currency, default_delivery_fee, category')
        .eq('id', store_id)
        .single();

      if (!stErr && storeData) {
        if (storeData.name)    currentSettings.store_name    = storeData.name;
        if (storeData.country) currentSettings.store_country = storeData.country;
        if (storeData.currency) currentSettings.currency     = storeData.currency;
        if (storeData.default_delivery_fee != null) currentSettings.default_delivery_fee = storeData.default_delivery_fee;
      }
    } catch (e) {
      console.error('Supabase settings fetch error:', e.message);
    }
  }

  res.json(currentSettings);
}

// ── POST /api/settings ────────────────────────────────────────────────────────
export async function updateSettings(req, res) {
  const newSettings = req.body;
  const storeId = req.storeId;

  // Merge into cache (per-store)
  const existing = storeId ? (settingsCache[storeId] || {}) : {};
  const merged = { ...DEFAULT_SETTINGS, ...existing, ...newSettings };

  if (storeId) {
    settingsCache[storeId] = merged;
  }

  // Add audit trail event
  mockAuditTrail.unshift({
    id: `aud-${Date.now()}`,
    action: 'SETTINGS_UPDATED',
    performed_by: req.user?.email || 'Store Owner',
    timestamp: new Date().toISOString(),
    details: `Settings updated: ${Object.keys(newSettings).join(', ')}`
  });

  // ── Supabase sync ─────────────────────────────────────────────────────────
  if (supabase && storeId) {
    try {
      // 1. Sync store name + country to stores table
      const storeUpdates = {};
      if (newSettings.store_name)    storeUpdates.name    = newSettings.store_name;
      if (newSettings.store_country) storeUpdates.country = newSettings.store_country;
      if (newSettings.currency)      storeUpdates.currency = newSettings.currency;
      if (newSettings.default_delivery_fee != null) storeUpdates.default_delivery_fee = newSettings.default_delivery_fee;

      if (Object.keys(storeUpdates).length > 0) {
        const { error: stErr } = await supabase
          .from('stores')
          .update(storeUpdates)
          .eq('id', storeId);
        if (stErr) console.warn('stores update error:', stErr.message);
        else console.log('✅ Store updated in Supabase:', storeUpdates);
      }

      // 2. Sync store_name to all users belonging to this store
      if (newSettings.store_name) {
        await supabase
          .from('users')
          .update({ store_name: newSettings.store_name })
          .eq('store_id', storeId);
      }

      // 3. Logo upload: if it's a base64 Data URI, upload to 'logos' bucket
      if (newSettings.company_logo && newSettings.company_logo.startsWith('data:image/')) {
        try {
          const matches = newSettings.company_logo.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
          if (matches) {
            const mimeType = matches[1];
            const ext = mimeType.replace('jpeg', 'jpg').replace('svg+xml', 'svg');
            const base64Data = matches[2];
            const buffer = Buffer.from(base64Data, 'base64');
            const fileName = `store_${storeId}/logo_${Date.now()}.${ext}`;

            const { data: uploadData, error: upErr } = await supabase.storage
              .from('logos')
              .upload(fileName, buffer, {
                contentType: `image/${mimeType}`,
                upsert: true
              });

            if (upErr) {
              console.warn('Logo upload error:', upErr.message);
            } else if (uploadData) {
              const { data: pubUrlData } = supabase.storage.from('logos').getPublicUrl(fileName);
              if (pubUrlData?.publicUrl) {
                merged.company_logo = pubUrlData.publicUrl;
                if (storeId) {
                  settingsCache[storeId] = { ...merged, company_logo: pubUrlData.publicUrl };
                }
                console.log('✅ Logo uploaded:', pubUrlData.publicUrl);
              }
            }
          }
        } catch (storageErr) {
          console.warn('Logo upload exception:', storageErr.message);
        }
      }
    } catch (e) {
      console.warn('Supabase settings sync error:', e.message);
    }
  }

  // Persist to file
  saveSettingsFile();

  // Return the final merged settings (with resolved logo URL if uploaded)
  const finalSettings = storeId ? settingsCache[storeId] : merged;
  res.json({ message: 'Settings saved successfully', settings: finalSettings });
}

// ── GET /api/audit-trail ──────────────────────────────────────────────────────
export async function getAuditTrail(req, res) {
  res.json(mockAuditTrail);
}
