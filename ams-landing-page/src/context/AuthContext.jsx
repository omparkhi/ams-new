import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('ams_token'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Restore authenticated session on mount
  useEffect(() => {
    async function checkAuth() {
      const storedToken = localStorage.getItem('ams_token');
      if (storedToken) {
        try {
          const res = await api.getCurrentUser();
          setUser({
            username: res.username,
            role: res.role,
            company_id: res.company_id,
            company_name: res.company_name,
            details: res.details
          });
          setToken(storedToken);
        } catch (err) {
          console.error("Session expired or invalid:", err);
          logout();
        }
      }
      setLoading(false);
    }
    checkAuth();
  }, []);

  const login = async (username, password) => {
    setError(null);
    try {
      const data = await api.login({ username, password });
      api.setToken(data.token);
      setToken(data.token);
      setUser(data.user);
      return data.user;
    } catch (err) {
      setError(err.message || 'Login failed');
      throw err;
    }
  };

  const register = async (formData) => {
    setError(null);
    try {
      const data = await api.register(formData);
      api.setToken(data.token);
      setToken(data.token);
      setUser(data.user);
      return data.user;
    } catch (err) {
      setError(err.message || 'Registration failed');
      throw err;
    }
  };

  const logout = () => {
    api.setToken(null);
    setToken(null);
    setUser(null);
    localStorage.removeItem('ams_token');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        loading,
        error,
        login,
        register,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

