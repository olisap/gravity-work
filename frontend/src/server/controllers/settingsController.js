import { supabase } from '../config/supabase.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SETTINGS_FILE = join(__dirname, '../../data/store_settings.json');

// ── Ensure data directory exists ──────────────────────────────────────────────
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
  low_stock_whatsapp: false,          // OFF by default
  reminder_email: true,
  reminder_whatsapp: false,           // OFF by default
  invoice_via_email: true,
  invoice_via_whatsapp: false,        // OFF by default
  whatsapp_order_confirmation: false, // OFF by default

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

export function getStoreSettings(storeId) {
  if (storeId && settingsCache[storeId]) {
    return { ...DEFAULT_SETTINGS, ...settingsCache[storeId] };
  }
  return { ...DEFAULT_SETTINGS };
}

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

// ── Cloud storage sync for store settings ─────────────────────────────────────
async function restoreSettingsFromCloud(storeId) {
  if (!supabase || !storeId) return null;
  try {
    const { data, error } = await supabase.storage
      .from('wa_sessions')
      .download(`stores/${storeId}/settings.json`);
    if (!error && data) {
      const text = await data.text();
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === 'object') {
        settingsCache[storeId] = { ...(settingsCache[storeId] || {}), ...parsed };
        saveSettingsFile();
        console.log(`☁️ [Settings] Restored cloud settings for store ${storeId}`);
        return settingsCache[storeId];
      }
    }
  } catch (e) {
    // silent fallback
  }
  return null;
}

async function syncSettingsToCloud(storeId, settingsObj) {
  if (!supabase || !storeId || !settingsObj) return;
  try {
    const buffer = Buffer.from(JSON.stringify(settingsObj, null, 2), 'utf8');
    await supabase.storage
      .from('wa_sessions')
      .upload(`stores/${storeId}/settings.json`, buffer, {
        upsert: true,
        contentType: 'application/json'
      });
    console.log(`☁️ [Settings] Synced settings for store ${storeId} to Supabase.`);
  } catch (e) {
    console.warn(`Could not sync settings to cloud for ${storeId}:`, e.message);
  }
}

// Load on startup
loadSettingsFile();

// ── Demo Audit Trail (preserves demo showcase without bleeding into real merchant accounts) ──
let demoAuditTrail = [
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

const storeAuditLogs = {};

export function recordAuditEvent({ store_id, action, order_number, customer_name, amount, performed_by, details }) {
  if (!store_id) return;
  if (!storeAuditLogs[store_id]) storeAuditLogs[store_id] = [];
  storeAuditLogs[store_id].unshift({
    id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    action: action || 'SYSTEM_EVENT',
    order_number: order_number || null,
    customer_name: customer_name || null,
    amount: amount || 0,
    performed_by: performed_by || 'Store User',
    timestamp: new Date().toISOString(),
    details: details || ''
  });
}

// ── GET /api/settings ─────────────────────────────────────────────────────────
export async function getSettings(req, res) {
  const store_id = req.storeId;

  // Start with defaults
  let currentSettings = { ...DEFAULT_SETTINGS };

  // Layer 1: load from persistent file cache or cloud
  if (store_id) {
    if (!settingsCache[store_id]) {
      await restoreSettingsFromCloud(store_id);
    }
    if (settingsCache[store_id]) {
      currentSettings = { ...currentSettings, ...settingsCache[store_id] };
    }
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

  // Persist to local JSON file
  saveSettingsFile();

  // ── Supabase sync ─────────────────────────────────────────────────────────
  if (supabase && storeId) {
    try {
      // 1. Sync store settings to cloud JSON
      await syncSettingsToCloud(storeId, merged);

      // 2. Sync store name + country to stores table
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

      // 3. Sync store_name to all users belonging to this store
      if (newSettings.store_name) {
        await supabase
          .from('users')
          .update({ store_name: newSettings.store_name })
          .eq('store_id', storeId);
      }

      // 4. Logo upload: if it's a base64 Data URI, upload to 'logos' bucket
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
                  saveSettingsFile();
                  await syncSettingsToCloud(storeId, settingsCache[storeId]);
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

  if (storeId) {
    recordAuditEvent({
      store_id: storeId,
      action: 'SETTINGS_UPDATED',
      performed_by: `${req.user?.full_name || req.user?.email || 'Store Owner'} (${req.user?.role || 'owner'})`,
      details: 'Store settings and preferences updated'
    });
  }

  // Return the final merged settings (with resolved logo URL if uploaded)
  const finalSettings = storeId ? settingsCache[storeId] : merged;
  res.json({ message: 'Settings saved successfully', settings: finalSettings });
}

// ── GET /api/audit-trail ──────────────────────────────────────────────────────
export async function getAuditTrail(req, res) {
  const storeId = req.storeId;
  const DEMO_STORE_IDS = ['00000000-0000-0000-0000-784637855674', '00000000-0000-0000-0000-000000000001'];

  // Keep demo showcase populated for visitors exploring the demo account
  if (!storeId || DEMO_STORE_IDS.includes(storeId)) {
    return res.json(demoAuditTrail);
  }

  const logs = storeAuditLogs[storeId] || [];
  res.json(logs);
}
