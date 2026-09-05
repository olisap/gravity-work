import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase.js';

const JWT_SECRET = process.env.JWT_SECRET || 'gravity_crm_jwt_secret_key_2026';

/**
 * JWT Authentication Middleware
 */
export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    // If token starts with jwt_token_, look up user from Supabase to get store_id
    if (token.startsWith('jwt_token_')) {
      const userId = token.replace('jwt_token_', '');
      if (supabase) {
        const { data: user, error } = await supabase
          .from('users')
          .select('id, email, role, store_id, store_name')
          .eq('id', userId)
          .single();
        if (!error && user) {
          req.user = user;
          return next();
        }
      }
      // Fallback if Supabase unavailable
      req.user = { id: userId, role: 'owner' };
      return next();
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session token.' });
  }
}

/**
 * Role-Based Access Control (RBAC) Middleware
 * @param {Array<string>} allowedRoles e.g. ['owner', 'admin']
 */
export function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized. User session missing.' });
    }

    const rawRole = req.user.role || 'owner';
    const userRole = rawRole === 'sales_agent' ? 'confirmation_staff' : rawRole;

    // Owners and Admins have full access across all endpoints
    if (userRole === 'owner' || userRole === 'admin') {
      return next();
    }

    if (!allowedRoles.includes(userRole) && !allowedRoles.includes(rawRole)) {
      return res.status(403).json({ error: `Access denied. Requires role: ${allowedRoles.join(' or ')}` });
    }

    next();
  };
}
