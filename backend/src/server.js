import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import { login, signup, getMe, getTeamMembers, createTeamMember, updateTeamMemberStatus } from './controllers/authController.js';
import { requireAuth, requireStoreContext, requireRole } from './middleware/authMiddleware.js';
import { getOrders, createOrUpdateDraftOrder, updateOrderStatus, addUpsellToOrder } from './controllers/orderController.js';
import { getProducts, getProductForPublicForm, getCategories, createProduct, updateProduct, deleteProduct, createCategory, getStockMovements, recordStockAdjustment } from './controllers/productController.js';
import { getForms, getFormByEmbedKey, createForm, updateForm, deleteForm } from './controllers/formController.js';
import { getDashboardStats } from './controllers/dashboardController.js';
import { getUpsellOffers, getUpsellOfferForProduct } from './controllers/upsellController.js';
import { getSettings, updateSettings, getAuditTrail } from './controllers/settingsController.js';
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier } from './controllers/suppliersController.js';
import { getDeliveryAgents, createDeliveryAgent, updateDeliveryAgent, deleteDeliveryAgent, assignStockToAgent } from './controllers/deliveryAgentsController.js';
import { AbandonmentWorker } from './services/abandonmentWorker.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

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
app.get('/api/audit-trail', requireAuth, requireRole(['owner', 'admin']), getAuditTrail);

// Orders & Pipeline Routes
app.get('/api/orders', requireAuth, requireStoreContext, getOrders);
app.post('/api/orders/draft', createOrUpdateDraftOrder);
app.patch('/api/orders/:id/status', requireAuth, requireStoreContext, requireRole(['owner', 'admin', 'confirmation_staff', 'sales_agent', 'logistics']), updateOrderStatus);
app.post('/api/orders/:id/upsell', requireAuth, requireStoreContext, requireRole(['owner', 'admin', 'confirmation_staff', 'sales_agent']), addUpsellToOrder);

// Products & Stock Inventory Routes
app.get('/api/products', requireAuth, requireStoreContext, getProducts);
app.post('/api/products', requireAuth, requireStoreContext, requireRole(['owner', 'admin']), createProduct);
app.patch('/api/products/:id', requireAuth, requireStoreContext, requireRole(['owner', 'admin']), updateProduct);
app.delete('/api/products/:id', requireAuth, requireStoreContext, requireRole(['owner', 'admin']), deleteProduct);
app.get('/api/categories', requireAuth, requireStoreContext, getCategories);
app.post('/api/categories', requireAuth, requireStoreContext, requireRole(['owner', 'admin']), createCategory);
app.get('/api/stock-movements', requireAuth, requireStoreContext, getStockMovements);
app.post('/api/stock-movements', requireAuth, requireStoreContext, requireRole(['owner', 'admin', 'logistics']), recordStockAdjustment);

// Suppliers & Wholesale Partners Routes
app.get('/api/suppliers', requireAuth, requireStoreContext, getSuppliers);
app.post('/api/suppliers', requireAuth, requireStoreContext, requireRole(['owner', 'admin', 'logistics']), createSupplier);
app.patch('/api/suppliers/:id', requireAuth, requireStoreContext, requireRole(['owner', 'admin', 'logistics']), updateSupplier);
app.delete('/api/suppliers/:id', requireAuth, requireStoreContext, requireRole(['owner', 'admin']), deleteSupplier);

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

// Start background draft abandonment scanner (only in dedicated server mode)
if (!process.env.VERCEL) {
  AbandonmentWorker.startWorker(60000);
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
