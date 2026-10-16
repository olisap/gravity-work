import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import pino from 'pino';
import path from 'path';
import fs from 'fs';
import { supabase } from '../config/supabase.js';

export const DEFAULT_STORE_ID = '00000000-0000-0000-0000-784723738041';

class WhatsAppService {
  constructor() {
    // Multi-tenant session state map: storeId -> { sock, status, qrCode, connectedUser, isInitializing, reconnectAttempts, cloudSyncTimer }
    this.sessions = new Map();
    this.baseAuthDir = path.resolve(process.cwd(), '.wa_auth');
    this.storageBucket = 'wa_sessions';
  }

  // Resolve storeId with safe fallback to active default store
  resolveStoreId(storeId) {
    if (storeId && typeof storeId === 'string' && storeId.trim().length > 0) {
      return storeId.trim();
    }
    return DEFAULT_STORE_ID;
  }

  // Retrieve or initialize the in-memory session object for a store
  getSession(storeId) {
    const sid = this.resolveStoreId(storeId);
    if (!this.sessions.has(sid)) {
      this.sessions.set(sid, {
        sock: null,
        status: 'disconnected', // 'disconnected' | 'connecting' | 'connected'
        qrCode: null,
        connectedUser: null,
        isInitializing: false,
        reconnectAttempts: 0,
        cloudSyncTimer: null
      });
    }
    return this.sessions.get(sid);
  }

  // Format Nigerian or international phone numbers to WhatsApp JID
  formatPhoneToJid(phone) {
    if (!phone) return null;
    let clean = String(phone).replace(/[^0-9]/g, '');
    if (clean.startsWith('234')) {
      // already has Nigerian country code
    } else if (clean.startsWith('0')) {
      clean = '234' + clean.slice(1);
    } else if (clean.length === 10) {
      clean = '234' + clean;
    }
    if (clean.length < 10) return null;
    return `${clean}@s.whatsapp.net`;
  }

  // Isolated local auth directory for the specific store
  getAuthDir(storeId) {
    const sid = this.resolveStoreId(storeId);
    const storeDir = path.join(this.baseAuthDir, 'stores', sid);
    return storeDir;
  }

  // Isolated cloud storage path in Supabase private bucket
  getCloudStoragePath(storeId) {
    const sid = this.resolveStoreId(storeId);
    return `stores/${sid}/session_bundle.json`;
  }

  // Check if valid, registered local auth credentials exist for this store
  hasLocalAuth(storeId) {
    const authDir = this.getAuthDir(storeId);
    const credsPath = path.join(authDir, 'creds.json');
    if (!fs.existsSync(credsPath)) return false;
    try {
      const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
      return !!(creds && creds.registered === true);
    } catch {
      return false;
    }
  }

  // Check if valid credentials bundle exists in Supabase Storage
  async hasCloudAuth(storeId) {
    if (!supabase) return false;
    const sid = this.resolveStoreId(storeId);
    try {
      const { data, error } = await supabase.storage.from(this.storageBucket).list(`stores/${sid}`);
      return !error && Array.isArray(data) && data.some(f => f.name === 'session_bundle.json');
    } catch {
      return false;
    }
  }

  // Get current status summary scoped strictly to the calling store
  getStatus(storeId) {
    const sid = this.resolveStoreId(storeId);
    const session = this.getSession(sid);
    const authExists = this.hasLocalAuth(sid);
    return {
      storeId: sid,
      status: session.status,
      qrCode: session.qrCode,
      user: session.connectedUser,
      authExists
    };
  }

  // ── Supabase Cloud Session Serialization (Strictly Store-Scoped) ──

  // Restore auth files from Supabase Storage for this store
  async restoreAuthFromSupabase(storeId) {
    if (!supabase) return false;
    const sid = this.resolveStoreId(storeId);
    const storagePath = this.getCloudStoragePath(sid);
    const authDir = this.getAuthDir(sid);

    try {
      console.log(`☁️ [WhatsAppService] Checking Supabase Storage for store ${sid} session (${storagePath})...`);
      const { data, error } = await supabase.storage
        .from(this.storageBucket)
        .download(storagePath);

      if (error || !data) {
        console.log(`ℹ️ [WhatsAppService] No cloud session bundle found for store ${sid}.`);
        return false;
      }

      const text = await data.text();
      const bundle = JSON.parse(text);

      // Verify that the cloud bundle actually contains a registered session
      if (bundle['creds.json']) {
        try {
          const creds = JSON.parse(bundle['creds.json']);
          if (!creds || creds.registered !== true) {
            console.log(`ℹ️ [WhatsAppService] Cloud session for store ${sid} is not registered yet. Ignoring.`);
            return false;
          }
        } catch {
          return false;
        }
      } else {
        return false;
      }

      if (!fs.existsSync(authDir)) {
        fs.mkdirSync(authDir, { recursive: true });
      }

      let restoredCount = 0;
      for (const [filename, content] of Object.entries(bundle)) {
        const filePath = path.join(authDir, filename);
        fs.writeFileSync(filePath, content, 'utf8');
        restoredCount++;
      }

      console.log(`✅ [WhatsAppService] Restored ${restoredCount} WhatsApp auth keys for store ${sid} from cloud storage!`);
      return true;
    } catch (e) {
      console.warn(`⚠️ [WhatsAppService] Error restoring cloud session for store ${sid}:`, e.message);
      return false;
    }
  }

  // Schedule a debounced cloud sync to avoid hammering Supabase during handshakes
  scheduleCloudSync(storeId) {
    const sid = this.resolveStoreId(storeId);
    const session = this.getSession(sid);
    if (session.cloudSyncTimer) clearTimeout(session.cloudSyncTimer);
    session.cloudSyncTimer = setTimeout(() => {
      this.syncAuthToSupabase(sid).catch(err => {
        console.warn(`⚠️ [WhatsAppService] Cloud sync error for store ${sid}:`, err.message);
      });
    }, 3000);
  }

  // Upload local auth directory bundle to Supabase Storage strictly when registered === true
  async syncAuthToSupabase(storeId) {
    if (!supabase) return false;
    const sid = this.resolveStoreId(storeId);
    const authDir = this.getAuthDir(sid);

    if (!fs.existsSync(authDir)) return false;

    // Strict validation: never overwrite cloud storage with an unregistered or partial state
    const credsPath = path.join(authDir, 'creds.json');
    if (!fs.existsSync(credsPath)) return false;

    try {
      const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
      if (!creds || creds.registered !== true) {
        console.log(`ℹ️ [WhatsAppService] Skipping cloud backup for store ${sid} because credentials are not yet registered.`);
        return false;
      }

      const files = fs.readdirSync(authDir);
      if (files.length === 0) return false;

      const bundle = {};
      for (const file of files) {
        const filePath = path.join(authDir, file);
        if (fs.statSync(filePath).isFile()) {
          bundle[file] = fs.readFileSync(filePath, 'utf8');
        }
      }

      const payloadString = JSON.stringify(bundle);
      const buffer = Buffer.from(payloadString, 'utf8');
      const storagePath = this.getCloudStoragePath(sid);

      const { error } = await supabase.storage
        .from(this.storageBucket)
        .upload(storagePath, buffer, {
          upsert: true,
          contentType: 'application/json'
        });

      if (error) {
        console.warn(`⚠️ [WhatsAppService] Failed to upload session bundle for store ${sid}:`, error.message);
        return false;
      }

      console.log(`☁️ [WhatsAppService] Synced WhatsApp session bundle (${files.length} keys) for store ${sid} to Supabase Storage.`);
      return true;
    } catch (e) {
      console.warn(`⚠️ [WhatsAppService] Failed to serialize session to Supabase for store ${sid}:`, e.message);
      return false;
    }
  }

  // Delete cloud session bundle from Supabase Storage for this specific store
  async clearCloudSession(storeId) {
    if (!supabase) return;
    const sid = this.resolveStoreId(storeId);
    const storagePath = this.getCloudStoragePath(sid);
    try {
      await supabase.storage.from(this.storageBucket).remove([storagePath]);
      console.log(`🗑️ [WhatsAppService] Cleared WhatsApp cloud session bundle for store ${sid} from Supabase.`);
    } catch (e) {
      console.warn(`Error removing cloud session bundle for store ${sid}:`, e.message);
    }
  }

  // Clear session files locally for this specific store
  clearAuthFiles(storeId) {
    const sid = this.resolveStoreId(storeId);
    const authDir = this.getAuthDir(sid);
    try {
      if (fs.existsSync(authDir)) {
        fs.rmSync(authDir, { recursive: true, force: true });
        console.log(`🗑️ [WhatsAppService] Cleared local auth files for store ${sid}.`);
      }
    } catch (e) {
      console.error(`Failed to clear auth directory for store ${sid}:`, e);
    }
  }

  // Initialize and connect socket for a specific store
  async connect(storeId) {
    const sid = this.resolveStoreId(storeId);
    const session = this.getSession(sid);

    if (session.status === 'connected' && session.sock) {
      return this.getStatus(sid);
    }

    // Clean up any existing socket to avoid conflict/replacement errors
    if (session.sock) {
      try {
        session.sock.end(undefined);
      } catch {}
      session.sock = null;
    }

    session.isInitializing = true;
    session.status = 'connecting';
    session.qrCode = null;

    try {
      const authDir = this.getAuthDir(sid);

      // 1. If local folder is not registered, attempt to restore from Supabase Storage
      if (!this.hasLocalAuth(sid)) {
        await this.restoreAuthFromSupabase(sid);
      }

      if (!fs.existsSync(authDir)) {
        fs.mkdirSync(authDir, { recursive: true });
      }

      const { state, saveCreds } = await useMultiFileAuthState(authDir);

      session.sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        browser: ['Nigeria E-Commerce CRM', 'Chrome', '1.0.0'],
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 25000,
      });

      session.sock.ev.on('creds.update', () => {
        saveCreds();
        // If credentials just became registered, back up immediately
        if (state.creds?.registered) {
          this.scheduleCloudSync(sid);
        }
      });

      session.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          try {
            session.qrCode = await QRCode.toDataURL(qr, { margin: 2, scale: 6 });
            session.status = 'connecting';
            console.log(`📲 [WhatsAppService] New QR code generated for store ${sid}.`);
          } catch (err) {
            console.error('Failed to generate QR data URL:', err);
          }
        }

        if (connection === 'close') {
          const statusCode = lastDisconnect?.error?.output?.statusCode;
          const isLoggedOut = statusCode === DisconnectReason.loggedOut;

          console.log(`⚠️ [WhatsAppService] Store ${sid} connection closed. Code: ${statusCode}. Logged out: ${isLoggedOut}`);
          session.connectedUser = null;
          session.qrCode = null;

          if (!isLoggedOut) {
            // Reconnect with exponential backoff up to 30s
            const delay = Math.min(3000 * Math.pow(1.4, session.reconnectAttempts), 30000);
            session.reconnectAttempts++;
            session.status = 'connecting';
            console.log(`🔄 [WhatsAppService] Auto-reconnecting store ${sid} in ${Math.round(delay / 1000)}s (attempt ${session.reconnectAttempts})...`);
            setTimeout(() => {
              session.isInitializing = false;
              this.connect(sid).catch(err => console.warn('Reconnect failed:', err.message));
            }, delay);
          } else {
            session.status = 'disconnected';
            session.isInitializing = false;
            session.reconnectAttempts = 0;
            console.log(`🚪 [WhatsAppService] Store ${sid} device logged out on WhatsApp. Clearing auth.`);
            this.clearAuthFiles(sid);
            this.clearCloudSession(sid);
          }
        } else if (connection === 'open') {
          console.log(`✅ [WhatsAppService] Connected successfully to WhatsApp Web Gateway for store ${sid}!`);
          session.status = 'connected';
          session.qrCode = null;
          session.reconnectAttempts = 0;
          session.isInitializing = false;

          const user = session.sock.user;
          const phone = user?.id ? user.id.split(':')[0] : 'Connected Phone';
          session.connectedUser = {
            id: user?.id,
            name: user?.name || 'Store Phone',
            phone: phone
          };

          // Save registered credentials and back up to Supabase immediately
          saveCreds();
          this.syncAuthToSupabase(sid);
        }
      });

      session.isInitializing = false;
      return this.getStatus(sid);
    } catch (error) {
      console.error(`❌ [WhatsAppService] Failed to start connection for store ${sid}:`, error);
      session.status = 'disconnected';
      session.isInitializing = false;
      throw error;
    }
  }

  // Disconnect & unpair device for a specific store
  async disconnect(storeId) {
    const sid = this.resolveStoreId(storeId);
    const session = this.getSession(sid);

    try {
      if (session.sock) {
        await session.sock.logout().catch(() => {});
        session.sock.end(undefined);
        session.sock = null;
      }
    } catch (e) {
      // ignore close errors
    } finally {
      session.status = 'disconnected';
      session.qrCode = null;
      session.connectedUser = null;
      this.clearAuthFiles(sid);
      await this.clearCloudSession(sid);
    }
    return { success: true, message: `WhatsApp disconnected and cloud session cleared for store ${sid}.` };
  }

  // Direct send message scoped to a specific store
  async sendMessage(phone, messageText, storeId = null) {
    const sid = this.resolveStoreId(storeId);
    const session = this.getSession(sid);

    if (session.status !== 'connected' || !session.sock) {
      return { success: false, error: `WhatsApp is not connected for this store (${sid}). Please scan QR in Settings or Marketing Hub.` };
    }

    const jid = this.formatPhoneToJid(phone);
    if (!jid) {
      return { success: false, error: `Invalid phone number format: "${phone}"` };
    }

    try {
      await session.sock.sendMessage(jid, { text: messageText });
      return { success: true, jid, phone, storeId: sid };
    } catch (err) {
      console.error(`❌ [WhatsAppService] Error sending to ${jid} (store ${sid}):`, err);
      return { success: false, error: err.message };
    }
  }

  // Send Order Confirmation automatically scoped to the order's store
  async sendOrderConfirmation(order, storeName = 'iSmartyShop', storeId = null) {
    if (!order || !order.customer_phone) {
      return { success: false, skipped: true, error: 'No customer phone provided' };
    }

    const sid = this.resolveStoreId(storeId || order.store_id);
    const session = this.getSession(sid);

    if (session.status !== 'connected') {
      console.log(`ℹ️ [WhatsAppService] WhatsApp not connected for store ${sid}; skipped automated order confirmation for #${order.order_number}`);
      return { success: false, skipped: true, error: 'WhatsApp is not connected for this store' };
    }

    const itemsSummary = (order.items && order.items.length > 0)
      ? order.items.map(i => `${i.quantity || 1}x ${i.product_name || i.name}`).join(', ')
      : (order.product_name || 'Your Ordered Item');

    const totalFormatted = Number(order.total_amount || 0).toLocaleString();
    const address = order.delivery_address ? `${order.delivery_address}, ${order.state || ''}` : `${order.state || 'Nigeria'}`;

    const messageText = 
`🛍️ *Order Confirmation — ${storeName}*

Hi *${order.customer_name || 'Valued Customer'}*,

Thank you for placing your order with us! We have received your details:

📦 *Order Number:* #${order.order_number}
🛒 *Item(s):* ${itemsSummary}
💰 *Total Payable on Delivery (COD):* ₦${totalFormatted}
📍 *Delivery Address:* ${address}

📞 Our dispatch team will call you shortly on *${order.customer_phone}* to confirm your delivery schedule.

👉 *Please reply "CONFIRM" to this message if you are available to receive your order!*`;

    const result = await this.sendMessage(order.customer_phone, messageText, sid);

    if (result.success && supabase) {
      try {
        await supabase.from('notification_logs').insert([{
          template_name: 'order_confirmed_whatsapp',
          recipient: `${order.customer_name} (${order.customer_phone})`,
          channel: 'whatsapp',
          status: 'sent',
          payload: { order_id: order.id, order_number: order.order_number, total: totalFormatted, store_id: sid },
          created_at: new Date().toISOString()
        }]);
      } catch (logErr) {
        console.error('Failed to log WhatsApp notification to DB:', logErr);
      }
    }

    return result;
  }
}

export const whatsappService = new WhatsAppService();
export default whatsappService;
