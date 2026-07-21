import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('gravity_crm_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [token, setToken] = useState(() => localStorage.getItem('gravity_crm_token') || null);
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
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      setUser(data.user);
      setToken(data.token);
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
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(onboardingData)
      });
      const data = await res.json();
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

  const switchDemoRole = (role, email, name) => {
    const updated = {
      ...user,
      role,
      email: email || user?.email || 'user@merchant.ng',
      full_name: name || user?.full_name || 'CRM Staff'
    };
    setUser(updated);
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
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
