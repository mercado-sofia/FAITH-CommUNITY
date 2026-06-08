/**
 * Portal demo mode — frontend-only auth + mock data (no backend required).
 * Enable with NEXT_PUBLIC_PORTAL_DEMO_MODE=true in .env.local
 */

import { getDemoAdminUser, getDemoSuperadminUser } from '@/data/demoUsers';

export const PORTAL_DEMO_SESSION_KEY = 'portalDemoSession';

export const DEMO_READONLY_MESSAGE = 'Demo mode: changes are not saved.';

export const DEMO_CREDENTIALS = {
  admin: {
    email: 'demo.admin@faith.edu.ph',
    password: 'Demo@FAITH123',
  },
  superadmin: {
    email: 'demo.superadmin@faith.edu.ph',
    password: 'Demo@FAITH123',
  },
};

export const isPortalDemoEnabled = () =>
  process.env.NEXT_PUBLIC_PORTAL_DEMO_MODE === 'true';

export const getPortalDemoSessionRole = () => {
  if (typeof window === 'undefined') return null;
  try {
    const role = sessionStorage.getItem(PORTAL_DEMO_SESSION_KEY);
    return role === 'admin' || role === 'superadmin' ? role : null;
  } catch {
    return null;
  }
};

export const isPortalDemoSession = () => Boolean(getPortalDemoSessionRole());

export const isPortalDemoActive = () =>
  isPortalDemoEnabled() && isPortalDemoSession();

export const matchDemoCredentials = (email, password) => {
  if (!isPortalDemoEnabled()) return null;

  const normalizedEmail = (email || '').trim().toLowerCase();
  const { admin, superadmin } = DEMO_CREDENTIALS;

  if (
    normalizedEmail === admin.email.toLowerCase() &&
    password === admin.password
  ) {
    return 'admin';
  }

  if (
    normalizedEmail === superadmin.email.toLowerCase() &&
    password === superadmin.password
  ) {
    return 'superadmin';
  }

  return null;
};

export const getDemoUserForRole = (role) => {
  if (role === 'admin') return getDemoAdminUser();
  if (role === 'superadmin') return getDemoSuperadminUser();
  return null;
};

export const getActiveDemoUser = () => {
  const role = getPortalDemoSessionRole();
  return role ? getDemoUserForRole(role) : null;
};

export const startPortalDemoSession = (role) => {
  if (typeof window === 'undefined') return null;
  const user = getDemoUserForRole(role);
  if (!user) return null;

  try {
    sessionStorage.setItem(PORTAL_DEMO_SESSION_KEY, role);
    sessionStorage.removeItem('logoutInProgress');
  } catch {
    // ignore storage errors
  }

  if (role === 'admin') {
    localStorage.setItem('adminData', JSON.stringify(user));
    localStorage.removeItem('superAdminData');
    localStorage.removeItem('userData');
    document.cookie = 'userRole=admin; path=/; max-age=86400; SameSite=Lax';
  } else if (role === 'superadmin') {
    localStorage.setItem('superAdminData', JSON.stringify(user));
    localStorage.removeItem('adminData');
    localStorage.removeItem('userData');
    document.cookie = 'userRole=superadmin; path=/; max-age=86400; SameSite=Lax';
  }

  return user;
};

export const clearPortalDemoSession = () => {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(PORTAL_DEMO_SESSION_KEY);
  } catch {
    // ignore
  }
};

export class DemoReadOnlyError extends Error {
  constructor(message = DEMO_READONLY_MESSAGE) {
    super(message);
    this.name = 'DemoReadOnlyError';
    this.status = 'DEMO_READONLY';
  }
}

export const assertNotDemoMutation = (method) => {
  const upper = (method || 'GET').toUpperCase();
  if (upper !== 'GET' && isPortalDemoActive()) {
    throw new DemoReadOnlyError();
  }
};
