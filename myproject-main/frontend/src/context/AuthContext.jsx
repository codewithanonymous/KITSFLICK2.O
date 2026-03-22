import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const USER_KEY = 'kitsflick.user';
const TOKEN_KEY = 'kitsflick.token';
const ADMIN_KEY = 'kitsflick.admin';
const ADMIN_TOKEN_KEY = 'kitsflick.adminToken';
const ANON_KEY = 'kitsflick.anonymousSnapIds';

const AuthContext = createContext(null);

function readJson(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readJson(USER_KEY, null));
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || '');
  const [admin, setAdmin] = useState(() => readJson(ADMIN_KEY, null));
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem(ADMIN_TOKEN_KEY) || '');
  const [anonymousSnapIds, setAnonymousSnapIds] = useState(() => readJson(ANON_KEY, []));

  useEffect(() => {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  }, [user]);

  useEffect(() => {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  }, [token]);

  useEffect(() => {
    if (admin) {
      localStorage.setItem(ADMIN_KEY, JSON.stringify(admin));
    } else {
      localStorage.removeItem(ADMIN_KEY);
    }
  }, [admin]);

  useEffect(() => {
    if (adminToken) {
      localStorage.setItem(ADMIN_TOKEN_KEY, adminToken);
    } else {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
    }
  }, [adminToken]);

  useEffect(() => {
    localStorage.setItem(ANON_KEY, JSON.stringify(anonymousSnapIds));
  }, [anonymousSnapIds]);

  const value = useMemo(() => ({
    user,
    token,
    admin,
    adminToken,
    anonymousSnapIds,
    login(nextUser, nextToken) {
      setUser(nextUser);
      setToken(nextToken);
    },
    logout() {
      setUser(null);
      setToken('');
    },
    loginAdmin(nextAdmin, nextToken) {
      setAdmin(nextAdmin);
      setAdminToken(nextToken);
    },
    logoutAdmin() {
      setAdmin(null);
      setAdminToken('');
    },
    markAnonymous(ids) {
      setAnonymousSnapIds((current) => [...new Set([...current, ...ids])]);
    },
  }), [admin, adminToken, anonymousSnapIds, token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
