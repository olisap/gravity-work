import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'gravity_crm_jwt_secret_key_2026';

/**
 * JWT Authentication Middleware
 */
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    // If token starts with jwt_token_, handle legacy fallback
    if (token.startsWith('jwt_token_')) {
      const userId = token.replace('jwt_token_', '');
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

    const userRole = req.user.role || 'owner';
    if (!allowedRoles.includes(userRole) && userRole !== 'owner') {
      return res.status(403).json({ error: `Access denied. Requires role: ${allowedRoles.join(' or ')}` });
    }

    next();
  };
}
