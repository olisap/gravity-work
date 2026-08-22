// Central place that decides where the frontend sends API requests.
//
// In production/preview on Vercel, set VITE_API_BASE to your Render backend URL,
// e.g. VITE_API_BASE=https://nigeria-ecommerce-crm-api.onrender.com
//
// If VITE_API_BASE is not set (e.g. local dev with a Vite proxy, or the old
// Vercel-serverless-backend setup), requests fall back to relative paths so
// existing behavior is unaffected.
const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '');

/**
 * Build a full request URL for a given API path.
 * @param {string} path - Should start with '/', e.g. '/api/orders/draft'
 * @returns {string}
 */
export function apiUrl(path) {
  if (!path.startsWith('/')) path = `/${path}`;
  return `${API_BASE}${path}`;
}