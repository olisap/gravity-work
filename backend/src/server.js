import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import { login, signup, getMe } from './controllers/authController.js';
import { getOrders, createOrUpdateDraftOrder, updateOrderStatus, addUpsellToOrder } from './controllers/orderController.js';
import { getProducts, getCategories, createProduct, updateProduct, deleteProduct, createCategory } from './controllers/productController.js';
import { getForms, getFormByEmbedKey, createForm, updateForm, deleteForm } from './controllers/formController.js';
import { getDashboardStats } from './controllers/dashboardController.js';
import { getUpsellOffers, getUpsellOfferForProduct } from './controllers/upsellController.js';
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

// Authentication Routes
app.post('/api/auth/login', login);
app.post('/api/auth/signup', signup);
app.get('/api/auth/me', getMe);

// Orders & Pipeline Routes
app.get('/api/orders', getOrders);
app.post('/api/orders/draft', createOrUpdateDraftOrder);
app.patch('/api/orders/:id/status', updateOrderStatus);
app.post('/api/orders/:id/upsell', addUpsellToOrder);

// Products & Inventory Routes
app.get('/api/products', getProducts);
app.post('/api/products', createProduct);
app.patch('/api/products/:id', updateProduct);
app.delete('/api/products/:id', deleteProduct);
app.get('/api/categories', getCategories);
app.post('/api/categories', createCategory);

// Forms Routes
app.get('/api/forms', getForms);
app.post('/api/forms', createForm);
app.patch('/api/forms/:id', updateForm);
app.delete('/api/forms/:id', deleteForm);
app.get('/api/forms/embed/:embedKey', getFormByEmbedKey);

// Dashboard Analytics Routes
app.get('/api/dashboard', getDashboardStats);

// Upsell Routes
app.get('/api/upsell', getUpsellOffers);
app.get('/api/upsell/trigger/:productId', getUpsellOfferForProduct);

// Start background draft abandonment scanner
AbandonmentWorker.startWorker(60000);

app.listen(PORT, () => {
  console.log(`🚀 Nigeria E-Commerce CRM Backend running on port ${PORT}`);
});
