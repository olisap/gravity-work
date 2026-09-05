import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiUrl } from '../utils/apiUrl';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('gravity_crm_user');
      if (!saved || saved === 'undefined' || saved === 'null') return null;
      return JSON.parse(saved);
    } catch (e) {
      console.warn('Corrupted session data cleared from localStorage');
      localStorage.removeItem('gravity_crm_user');
      return null;
    }
  });

  const [token, setToken] = useState(() => {
    const savedToken = localStorage.getItem('gravity_crm_token');
    return (savedToken && savedToken !== 'undefined') ? savedToken : null;
  });
  const [loading, setLoading] = useState(false);

  // Sync to localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem('gravity_crm_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('gravity_crm_user');
    }
  }, [user]);

  useEffect(() => {
    if (token) {
      localStorage.setItem('gravity_crm_token', token);
    } else {
      localStorage.removeItem('gravity_crm_token');
    }
  }, [token]);

  const loginUser = async (email, password) => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      let data = {};
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(text || `Server returned status ${res.status}`);
      }

      if (!res.ok) throw new Error(data.error || 'Login failed');

      if (data.token) {
        localStorage.setItem('gravity_crm_token', data.token);
        setToken(data.token);
      }
      if (data.user) {
        localStorage.setItem('gravity_crm_user', JSON.stringify(data.user));
        setUser(data.user);
      }

      setLoading(false);
      return data.user;
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const signupUser = async (onboardingData) => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/auth/signup'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(onboardingData)
      });
      
      let data = {};
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(text || `Server returned status ${res.status}`);
      }

      if (!res.ok) throw new Error(data.error || 'Signup failed');

      setUser(data.user);
      setToken(data.token);
      setLoading(false);
      return data.user;
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const logoutUser = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('gravity_crm_user');
    localStorage.removeItem('gravity_crm_token');
  };

  const switchDemoRole = (role, email, name, id, store_id) => {
    const updated = {
      id: id || user?.id || 'demo-user-id',
      store_id: store_id || user?.store_id || '00000000-0000-0000-0000-784637855674',
      role,
      email: email || user?.email || 'user@merchant.ng',
      full_name: name || user?.full_name || 'CRM Staff'
    };
    setUser(updated);
  };

  const updateUser = (fields) => {
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...fields };
      localStorage.setItem('gravity_crm_user', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      loginUser,
      signupUser,
      logoutUser,
      switchDemoRole,
      updateUser,
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}