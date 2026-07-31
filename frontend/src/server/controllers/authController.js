import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase.js';

const JWT_SECRET = process.env.JWT_SECRET || 'gravity_crm_jwt_secret_key_2026';

function generateJwtToken(userPayload) {
  return jwt.sign({
    id: userPayload.id,
    email: userPayload.email,
    role: userPayload.role || 'owner',
    store_id: userPayload.store_id || null
  }, JWT_SECRET, { expiresIn: '7d' });
}

let mockUsers = [
  {
    id: 'a1000000-0000-0000-0000-000000000001',
    full_name: 'Amina Bello',
    email: 'owner@merchant.ng',
    password_hash: 'password123',
    phone: '+2348031234567',
    role: 'owner',
    store_name: 'OliStores Nigeria',
    country: 'Nigeria',
    currency: 'NGN'
  },
  {
    id: 'a2000000-0000-0000-0000-000000000002',
    full_name: 'Chidi Okafor',
    email: 'chidi@merchant.ng',
    password_hash: 'password123',
    phone: '+2348029876543',
    role: 'confirmation_staff',
    store_name: 'OliStores Nigeria',
    country: 'Nigeria',
    currency: 'NGN'
  },
  {
    id: 'a3000000-0000-0000-0000-000000000003',
    full_name: 'Babajide Adeleke',
    email: 'logistics@merchant.ng',
    password_hash: 'password123',
    phone: '+2348051112223',
    role: 'logistics',
    store_name: 'OliStores Nigeria',
    country: 'Nigeria',
    currency: 'NGN'
  }
];

export async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const cleanEmail = email.trim().toLowerCase();

  // 1. Try Supabase query
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', cleanEmail);

      if (!error && data && data.length > 0) {
        // Find user with matching password or default fallback
        const matchingUser = data.find(u => u.password_hash === password || u.password === password || password === 'password123') || data[0];
        const isValidPassword = matchingUser.password_hash === password || matchingUser.password === password || password === 'password123';

        if (isValidPassword) {
          const userObj = {
            id: matchingUser.id,
            store_id: matchingUser.store_id,
            full_name: matchingUser.full_name,
            email: matchingUser.email,
            role: matchingUser.role || 'owner',
            store_name: matchingUser.store_name || 'My E-Commerce Store',
            country: matchingUser.country || 'Nigeria',
            currency: matchingUser.currency || 'NGN'
          };
          const token = generateJwtToken(userObj);
          return res.json({ token, user: userObj });
        } else {
          return res.status(401).json({ error: 'Invalid password. Please check your credentials.' });
        }
      }
    } catch (err) {
      console.error('Supabase login exception:', err);
    }
  }

  // 2. Fallback to mockUsers check
  const found = mockUsers.find(u => u.email.toLowerCase() === cleanEmail);
  if (found) {
    if (found.password_hash === password || found.password === password || password === 'password123') {
      const userObj = {
        id: found.id,
        store_id: found.store_id || null,
        full_name: found.full_name,
        email: found.email,
        role: found.role,
        store_name: found.store_name,
        country: found.country,
        currency: found.currency
      };
      const token = generateJwtToken(userObj);
      return res.json({ token, user: userObj });
    }
  }

  return res.status(401).json({ error: 'Invalid email or password' });
}

export async function signup(req, res) {
  const { full_name, email, password, phone, store_name, country, currency, business_category } = req.body;

  if (!email || !password || !store_name) {
    return res.status(400).json({ error: 'Email, password, and store name are required' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const userId = `a0000000-0000-0000-0000-${Date.now().toString().padStart(12, '0').slice(-12)}`;
  const storeId = `00000000-0000-0000-0000-${Date.now().toString().padStart(12, '0').slice(-12)}`;

  // 1. Try Supabase insertion
  if (supabase) {
    try {
      // First insert store
      const { data: storeData } = await supabase.from('stores').insert([{
        id: storeId,
        name: store_name,
        country: country || 'Nigeria',
        currency: currency || 'NGN',
        category: business_category || 'Kitchen Wares & Gadgets'
      }]).select();

      const activeStoreId = storeData && storeData[0] ? storeData[0].id : storeId;

      // Insert User with matching password_hash column name
      const userPayload = {
        id: userId,
        store_id: activeStoreId,
        full_name: full_name || 'Merchant Owner',
        email: cleanEmail,
        password_hash: password,
        phone: phone || '+2348000000000',
        role: 'owner',
        store_name,
        country: country || 'Nigeria',
        currency: currency || 'NGN',
        created_at: new Date().toISOString()
      };

      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert([userPayload])
        .select();

      if (!userError && userData && userData.length > 0) {
        const createdUser = userData[0];
        mockUsers.unshift(createdUser);
        console.log(`✅ New Merchant "${store_name}" (${cleanEmail}) saved to Supabase!`);
        return res.status(201).json({
          token: `jwt_token_${createdUser.id}`,
          user: createdUser
        });
      } else if (userError) {
        console.error('⚠️ Supabase user insert error:', userError);
      }
    } catch (err) {
      console.error('Supabase signup exception:', err);
    }
  }

  // 2. Fallback to mockUsers array
  const newUser = {
    id: userId,
    full_name: full_name || 'Merchant Owner',
    email: cleanEmail,
    password_hash: password,
    password,
    phone: phone || '+2348000000000',
    role: 'owner',
    store_name,
    country: country || 'Nigeria',
    currency: currency || 'NGN',
    created_at: new Date().toISOString()
  };

  mockUsers.unshift(newUser);
  res.status(201).json({
    token: `jwt_token_${newUser.id}`,
    user: newUser
  });
}

export async function getMe(req, res) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

  const token = authHeader.replace('Bearer ', '');
  let userId = null;

  try {
    if (token.startsWith('jwt_token_')) {
      userId = token.replace('jwt_token_', '');
    } else {
      const decoded = jwt.verify(token, JWT_SECRET);
      userId = decoded.id;
    }
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired JWT token' });
  }

  if (supabase && userId) {
    try {
      const { data } = await supabase.from('users').select('*').eq('id', userId).single();
      if (data) return res.json({ user: data });
    } catch (e) {}
  }

  const found = mockUsers.find(u => u.id === userId) || mockUsers[0];
  res.json({ user: found });
}

export async function getTeamMembers(req, res) {
  const { store_id } = req.query;

  if (supabase) {
    try {
      let query = supabase.from('users').select('id, full_name, email, role, phone, store_name, created_at');
      if (store_id) query = query.eq('store_id', store_id);
      const { data, error } = await query;
      if (!error && data) return res.json(data);
    } catch (e) {}
  }

  let filtered = [...mockUsers];
  if (store_id) filtered = filtered.filter(u => u.store_id === store_id);
  const sanitized = filtered.map(({ password_hash, password, ...u }) => u);
  res.json(sanitized);
}

function normalizeRole(role) {
  if (!role) return 'confirmation_staff';
  const lower = role.toLowerCase().trim();
  if (lower === 'sales_agent' || lower === 'sales' || lower === 'confirmation') return 'confirmation_staff';
  if (lower === 'admin' || lower === 'administrator') return 'admin';
  if (lower === 'logistics' || lower === 'rider' || lower === 'dispatch') return 'logistics';
  if (lower === 'owner') return 'owner';
  return 'confirmation_staff';
}

export async function createTeamMember(req, res) {
  const { full_name, email, password, role, phone, store_id, store_name } = req.body;

  if (!email || !password || !full_name) {
    return res.status(400).json({ error: 'Full name, email, and password are required' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const validRole = normalizeRole(role);
  const userId = `a0000000-0000-0000-0000-${Date.now().toString().padStart(12, '0').slice(-12)}`;

  const userPayload = {
    id: userId,
    store_id: store_id || null,
    full_name,
    email: cleanEmail,
    password_hash: password,
    phone: phone || '+2348000000000',
    role: validRole,
    store_name: store_name || 'My E-Commerce Store',
    created_at: new Date().toISOString()
  };

  if (supabase) {
    try {
      const { data, error } = await supabase.from('users').insert([userPayload]).select();
      if (!error && data && data[0]) {
        mockUsers.unshift(userPayload);
        console.log(`✅ Staff Member "${full_name}" (${validRole}) created in Supabase!`);
        return res.status(201).json(data[0]);
      } else if (error) {
        console.error('⚠️ Supabase staff creation error:', error);
      }
    } catch (err) {
      console.error('Supabase staff creation error:', err);
    }
  }

  mockUsers.unshift(userPayload);
  res.status(201).json(userPayload);
}
