import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import { login, signup, getMe, getTeamMembers, createTeamMember, updateTeamMemberStatus } from './controllers/authController.js';
import { requireAuth, requireStoreContext, requireRole } from './middleware/authMiddleware.js';
import { getOrders, createOrUpdateDraftOrder, getDraftByResumeToken, updateOrderStatus, addUpsellToOrder, sendManualDraftReminder } from './controllers/orderController.js';
import { getProducts, getProductForPublicForm, getCategories, createProduct, updateProduct, deleteProduct, createCategory, getStockMovements, recordStockAdjustment } from './controllers/productController.js';
import { getForms, getFormByEmbedKey, createForm, updateForm, deleteForm } from './controllers/formController.js';
import { getDashboardStats } from './controllers/dashboardController.js';
import { getUpsellOffers, getUpsellOfferForProduct } from './controllers/upsellController.js';
import { getSettings, updateSettings, getAuditTrail } from './controllers/settingsController.js';
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier } from './controllers/suppliersController.js';
import { getDeliveryAgents, createDeliveryAgent, updateDeliveryAgent, deleteDeliveryAgent, assignStockToAgent } from './controllers/deliveryAgentsController.js';
import { getExpenses, createExpense, deleteExpense } from './controllers/expensesController.js';
import { AbandonmentWorker } from './services/abandonmentWorker.js';
import { BroadcastWorker } from './services/broadcastWorker.js';
import { NotificationService } from './services/notificationService.js';
import { whatsappService } from './services/whatsappService.js';
import { uploadMedia } from './controllers/uploadController.js';
import { supabase } from './config/supabase.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'online', service: 'Nigeria E-Commerce CRM API', timestamp: new Date().toISOString() });
});

// Authentication & Team Routes
app.post('/api/auth/login', login);
app.post('/api/auth/signup', signup);
app.get('/api/auth/me', requireAuth, getMe);
app.get('/api/team', requireAuth, requireStoreContext, requireRole(['owner', 'admin']), getTeamMembers);
app.post('/api/team', requireAuth, requireStoreContext, requireRole(['owner', 'admin']), createTeamMember);
app.patch('/api/team/:id/status', requireAuth, requireStoreContext, requireRole(['owner', 'admin']), updateTeamMemberStatus);

// Store Settings & Preferences Routes
app.get('/api/settings', requireAuth, requireStoreContext, getSettings);
app.post('/api/settings', requireAuth, requireStoreContext, requireRole(['owner', 'admin']), updateSettings);
app.get('/api/audit-trail', requireAuth, requireStoreContext, requireRole(['owner', 'admin']), getAuditTrail);

// Orders & Pipeline Routes (Draft submission & Resume routes are public for buyers)
app.get('/api/orders', requireAuth, requireStoreContext, getOrders);
app.post('/api/orders/draft', createOrUpdateDraftOrder);
app.get('/api/orders/resume/:token', getDraftByResumeToken);
app.get('/api/orders/draft/:token', getDraftByResumeToken);
app.patch('/api/orders/:id/status', requireAuth, requireStoreContext, requireRole(['owner', 'admin', 'confirmation_staff', 'sales_agent', 'logistics']), updateOrderStatus);
app.post('/api/orders/:id/upsell', requireAuth, requireStoreContext, requireRole(['owner', 'admin', 'confirmation_staff', 'sales_agent']), addUpsellToOrder);
app.post('/api/orders/:id/remind', requireAuth, requireStoreContext, requireRole(['owner', 'admin', 'confirmation_staff', 'sales_agent']), sendManualDraftReminder);

// Products & Stock Inventory Routes
app.get('/api/products', requireAuth, requireStoreContext, getProducts);
app.post('/api/products', requireAuth, requireStoreContext, requireRole(['owner', 'admin']), createProduct);
app.patch('/api/products/:id', requireAuth, requireStoreContext, requireRole(['owner', 'admin']), updateProduct);
app.delete('/api/products/:id', requireAuth, requireStoreContext, requireRole(['owner', 'admin']), deleteProduct);
app.get('/api/categories', requireAuth, requireStoreContext, getCategories);
app.post('/api/categories', requireAuth, requireStoreContext, requireRole(['owner', 'admin']), createCategory);
app.get('/api/stock-movements', requireAuth, requireStoreContext, getStockMovements);
app.post('/api/stock-movements', requireAuth, requireStoreContext, requireRole(['owner', 'admin', 'logistics']), recordStockAdjustment);
app.post('/api/upload', requireAuth, requireStoreContext, uploadMedia);

// Suppliers & Wholesale Partners Routes
app.get('/api/suppliers', requireAuth, requireStoreContext, getSuppliers);
app.post('/api/suppliers', requireAuth, requireStoreContext, requireRole(['owner', 'admin', 'logistics']), createSupplier);
app.patch('/api/suppliers/:id', requireAuth, requireStoreContext, requireRole(['owner', 'admin', 'logistics']), updateSupplier);
app.delete('/api/suppliers/:id', requireAuth, requireStoreContext, requireRole(['owner', 'admin']), deleteSupplier);

// Accounting & Business Expenses Routes
app.get('/api/expenses', requireAuth, requireStoreContext, getExpenses);
app.post('/api/expenses', requireAuth, requireStoreContext, requireRole(['owner', 'admin']), createExpense);
app.delete('/api/expenses/:id', requireAuth, requireStoreContext, requireRole(['owner', 'admin']), deleteExpense);

// Delivery Fleet & Courier Agents Routes
app.get('/api/delivery-agents', requireAuth, requireStoreContext, getDeliveryAgents);
app.post('/api/delivery-agents', requireAuth, requireStoreContext, requireRole(['owner', 'admin', 'logistics']), createDeliveryAgent);
app.patch('/api/delivery-agents/:id', requireAuth, requireStoreContext, requireRole(['owner', 'admin', 'logistics']), updateDeliveryAgent);
app.delete('/api/delivery-agents/:id', requireAuth, requireStoreContext, requireRole(['owner', 'admin']), deleteDeliveryAgent);
app.post('/api/delivery-agents/:id/stock', requireAuth, requireStoreContext, requireRole(['owner', 'admin', 'logistics']), assignStockToAgent);

// Forms Routes (Embed route remains public for checkout iframe)
app.get('/api/forms', requireAuth, requireStoreContext, getForms);
app.post('/api/forms', requireAuth, requireStoreContext, requireRole(['owner', 'admin']), createForm);
app.patch('/api/forms/:id', requireAuth, requireStoreContext, requireRole(['owner', 'admin']), updateForm);
app.delete('/api/forms/:id', requireAuth, requireStoreContext, requireRole(['owner', 'admin']), deleteForm);
app.get('/api/forms/embed/:embedKey', getFormByEmbedKey);
app.get('/api/forms/embed/:embedKey/product', getProductForPublicForm);

// Dashboard Analytics Routes
app.get('/api/dashboard', requireAuth, requireStoreContext, requireRole(['owner', 'admin', 'confirmation_staff', 'sales_agent']), getDashboardStats);

// Upsell Routes
app.get('/api/upsell', requireAuth, requireStoreContext, getUpsellOffers);
app.get('/api/upsell/trigger/:productId', requireAuth, requireStoreContext, getUpsellOfferForProduct);

// Marketing & Notification Logs Routes
app.get('/api/notification-logs', requireAuth, requireStoreContext, async (req, res) => {
  const storeId = req.storeId;
  const DEMO_STORE_IDS = ['00000000-0000-0000-0000-784637855674', '00000000-0000-0000-0000-000000000001'];
  if (!storeId || DEMO_STORE_IDS.includes(storeId)) {
    return res.json([
      { id: 1, channel: 'WhatsApp', recipient: 'Emeka Nwosu (+2348039988776)', status: 'Delivered', created_at: new Date(Date.now() - 10 * 60000).toISOString() },
      { id: 2, channel: 'SMS', recipient: 'Fatima Abubakar (+2348021122334)', status: 'Sent (Sandbox)', created_at: new Date(Date.now() - 45 * 60000).toISOString() },
      { id: 3, channel: 'Email', recipient: 'Kwame Mensah (kwame@ghana.com)', status: 'Opened', created_at: new Date(Date.now() - 120 * 60000).toISOString() }
    ]);
  }
  const logs = await NotificationService.getLogs(50);
  res.json(logs);
});

// WhatsApp Gateway Routes (Linked Device via Phone) - Strictly Scoped to Authenticated Store
app.get('/api/whatsapp/status', requireAuth, requireStoreContext, async (req, res) => {
  let status = whatsappService.getStatus(req.storeId);
  if (!status.authExists && supabase) {
    status.authExists = await whatsappService.hasCloudAuth(req.storeId);
  }
  // Auto-resume if status is disconnected but saved auth exists (e.g. after server reboot/deploy)
  if (status.status === 'disconnected' && status.authExists) {
    console.log(`🔄 [WhatsAppStatus] Store ${req.storeId} has saved session; initiating background reconnection...`);
    whatsappService.connect(req.storeId).catch(err => {
      console.warn(`[WhatsAppStatus] Auto-connect on status check failed:`, err.message);
    });
    status = whatsappService.getStatus(req.storeId);
    status.authExists = true;
  }
  res.json(status);
});

app.post('/api/whatsapp/connect', requireAuth, requireStoreContext, async (req, res) => {
  try {
    const status = await whatsappService.connect(req.storeId);
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/whatsapp/disconnect', requireAuth, requireStoreContext, async (req, res) => {
  try {
    const result = await whatsappService.disconnect(req.storeId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/whatsapp/test', requireAuth, requireStoreContext, async (req, res) => {
  const { phone, message } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone number is required' });
  const result = await whatsappService.sendMessage(phone, message || 'Hello! This is a test message from your Nigeria E-Commerce CRM.', req.storeId);
  res.json(result);
});

// Broadcast Campaign Worker Routes (Strictly Store-Scoped with Anti-Ban Pacing)
app.post('/api/broadcast/start', requireAuth, requireStoreContext, async (req, res) => {
  const { channel, template, audience, minDelaySec, maxDelaySec } = req.body;
  const result = BroadcastWorker.startCampaign(req.storeId, {
    channel,
    template,
    audience,
    minDelaySec,
    maxDelaySec
  });
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

app.get('/api/broadcast/status', requireAuth, requireStoreContext, (req, res) => {
  const status = BroadcastWorker.getStatus(req.storeId);
  res.json(status);
});

app.post('/api/broadcast/pause', requireAuth, requireStoreContext, (req, res) => {
  const result = BroadcastWorker.pauseCampaign(req.storeId);
  res.json(result);
});

app.post('/api/broadcast/resume', requireAuth, requireStoreContext, (req, res) => {
  const result = BroadcastWorker.resumeCampaign(req.storeId);
  res.json(result);
});

app.post('/api/broadcast/cancel', requireAuth, requireStoreContext, (req, res) => {
  const result = BroadcastWorker.cancelCampaign(req.storeId);
  res.json(result);
});

// Start background draft abandonment scanner (only in dedicated server mode)
if (!process.env.VERCEL) {
  AbandonmentWorker.startWorker(60000);

  // Auto-reconnect WhatsApp for all stores with saved local or cloud credentials
  (async () => {
    try {
      const storeIdsToScan = new Set(['00000000-0000-0000-0000-784723738041', '00000000-0000-0000-0000-784637855674']);
      if (supabase) {
        const { data: dbStores } = await supabase.from('stores').select('id');
        if (dbStores) {
          dbStores.forEach(s => storeIdsToScan.add(s.id));
        }
      }
      for (const sid of storeIdsToScan) {
        const hasLocal = whatsappService.hasLocalAuth(sid);
        const hasCloud = !hasLocal && (await whatsappService.hasCloudAuth(sid));
        if (hasLocal || hasCloud) {
          console.log(`🔄 [WhatsAppService] Saved auth found for store ${sid} (local: ${hasLocal}, cloud: ${hasCloud}); resuming connection...`);
          whatsappService.connect(sid).catch(err => {
            console.warn(`[WhatsAppService] Startup auto-connect failed for store ${sid}:`, err.message);
          });
        }
      }
    } catch (err) {
      console.error('Failed auto-reconnect WhatsApp on startup:', err.message);
    }
  })();
}

import { fileURLToPath } from 'url';

const isMainModule = process.argv[1] && (
  process.argv[1].endsWith('server.js') || 
  fileURLToPath(import.meta.url) === process.argv[1]
);

if (isMainModule) {
  app.listen(PORT, () => {
    console.log(`🚀 Nigeria E-Commerce CRM Backend running on port ${PORT}`);
  });
}

export default app;
