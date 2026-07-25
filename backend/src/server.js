import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import { login, signup, getMe, getTeamMembers, createTeamMember } from './controllers/authController.js';
import { requireAuth, requireRole } from './middleware/authMiddleware.js';
import { getOrders, createOrUpdateDraftOrder, updateOrderStatus, addUpsellToOrder } from './controllers/orderController.js';
import { getProducts, getCategories, createProduct, updateProduct, deleteProduct, createCategory } from './controllers/productController.js';
import { getForms, getFormByEmbedKey, createForm, updateForm, deleteForm } from './controllers/formController.js';
import { getDashboardStats } from './controllers/dashboardController.js';
import { getUpsellOffers, getUpsellOfferForProduct } from './controllers/upsellController.js';
import { getSettings, updateSettings, getAuditTrail } from './controllers/settingsController.js';
import { AbandonmentWorker } from './services/abandonmentWorker.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: '*' }));
app.use(express.json());

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'online', service: 'Nigeria E-Commerce CRM API', timestamp: new Date().toISOString() });
});

// Authentication & Team Routes
app.post('/api/auth/login', login);
app.post('/api/auth/signup', signup);
app.get('/api/auth/me', requireAuth, getMe);
app.get('/api/team', requireAuth, requireRole(['owner', 'admin']), getTeamMembers);
app.post('/api/team', requireAuth, requireRole(['owner', 'admin']), createTeamMember);

// Store Settings & Preferences Routes
app.get('/api/settings', requireAuth, getSettings);
app.post('/api/settings', requireAuth, requireRole(['owner', 'admin']), updateSettings);
app.get('/api/audit-trail', requireAuth, requireRole(['owner', 'admin']), getAuditTrail);

// Orders & Pipeline Routes (Draft submission remains public for checkout forms)
app.get('/api/orders', requireAuth, getOrders);
app.post('/api/orders/draft', createOrUpdateDraftOrder);
app.patch('/api/orders/:id/status', requireAuth, requireRole(['owner', 'admin', 'confirmation_staff', 'sales_agent', 'logistics']), updateOrderStatus);
app.post('/api/orders/:id/upsell', requireAuth, requireRole(['owner', 'admin', 'confirmation_staff', 'sales_agent']), addUpsellToOrder);

// Products & Inventory Routes (GET is public for checkout forms; mutations require admin auth)
app.get('/api/products', getProducts);
app.post('/api/products', requireAuth, requireRole(['owner', 'admin']), createProduct);
app.patch('/api/products/:id', requireAuth, requireRole(['owner', 'admin']), updateProduct);
app.delete('/api/products/:id', requireAuth, requireRole(['owner', 'admin']), deleteProduct);
app.get('/api/categories', getCategories);
app.post('/api/categories', requireAuth, requireRole(['owner', 'admin']), createCategory);

// Forms Routes (Embed route remains public for checkout iframe)
app.get('/api/forms', requireAuth, getForms);
app.post('/api/forms', requireAuth, requireRole(['owner', 'admin']), createForm);
app.patch('/api/forms/:id', requireAuth, requireRole(['owner', 'admin']), updateForm);
app.delete('/api/forms/:id', requireAuth, requireRole(['owner', 'admin']), deleteForm);
app.get('/api/forms/embed/:embedKey', getFormByEmbedKey);

// Dashboard Analytics Routes
app.get('/api/dashboard', requireAuth, requireRole(['owner', 'admin', 'confirmation_staff', 'sales_agent']), getDashboardStats);

// Upsell Routes
app.get('/api/upsell', requireAuth, getUpsellOffers);
app.get('/api/upsell/trigger/:productId', getUpsellOfferForProduct);

// Start background draft abandonment scanner
AbandonmentWorker.startWorker(60000);

app.listen(PORT, () => {
  console.log(`🚀 Nigeria E-Commerce CRM Backend running on port ${PORT}`);
});
