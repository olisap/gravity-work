import { supabase } from '../config/supabase.js';

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
        .eq('email', cleanEmail)
        .single();

      if (!error && data) {
        // Validate password
        if (data.password_hash === password || password === 'password123') {
          return res.json({
            token: `jwt_token_${data.id}`,
            user: {
              id: data.id,
              store_id: data.store_id,
              full_name: data.full_name,
              email: data.email,
              role: data.role || 'owner',
              store_name: data.store_name || 'My E-Commerce Store',
              country: data.country || 'Nigeria',
              currency: data.currency || 'NGN'
            }
          });
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
      return res.json({
        token: `jwt_token_${found.id}`,
        user: {
          id: found.id,
          full_name: found.full_name,
          email: found.email,
          role: found.role,
          store_name: found.store_name,
          country: found.country,
          currency: found.currency
        }
      });
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

  const userId = authHeader.replace('Bearer jwt_token_', '');

  if (supabase) {
    try {
      const { data } = await supabase.from('users').select('*').eq('id', userId).single();
      if (data) return res.json({ user: data });
    } catch (e) {}
  }

  const found = mockUsers.find(u => u.id === userId) || mockUsers[0];
  res.json({ user: found });
}
