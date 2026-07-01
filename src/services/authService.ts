// Client auth service powered by PostgreSQL server-side routes.

import { Church, ChurchSession } from '../types';
import { activityService } from './activityService.ts';

// Deterministic hashing function representing bcrypt (same as server-side)
export function hashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `mock_bcrypt_pbkdf2_${Math.abs(hash).toString(16)}`;
}

const TENANTS_STORAGE_KEY = 'futamap_saas_tenants';
const SESSION_STORAGE_KEY = 'futamap_saas_session';
const MEMBER_SESSION_STORAGE_KEY = 'futamap_saas_member_session';

// Synchronizes the tenant registry from our server to LocalStorage
export async function syncChurches(): Promise<void> {
  try {
    const res = await fetch('/api/churches');
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem(TENANTS_STORAGE_KEY, JSON.stringify(data));
    }
  } catch (err) {
    console.error('Failed to sync churches from backend:', err);
  }
}

// Proactive trigger to sync on load
syncChurches();

const DEFAULT_CHURCHES: Church[] = [
  {
    id: 'futamap',
    name: 'Celebration Church International',
    passwordHash: 'mock_bcrypt_pbkdf2_2ec9aec',
    mapName: 'Celebration Group',
    logoName: 'CCI Admin'
  },
  {
    id: 'rccg',
    name: 'RCCG',
    passwordHash: 'mock_bcrypt_pbkdf2_660194d7',
    mapName: 'RCCG Area',
    logoName: 'RCCG Admin'
  },
  {
    id: 'winners',
    name: 'Winners Chapel',
    passwordHash: 'mock_bcrypt_pbkdf2_68615316',
    mapName: 'Winners Cell',
    logoName: 'Winners Admin'
  }
];

function getChurches(): Church[] {
  const stored = localStorage.getItem(TENANTS_STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch {
      // Fallback
    }
  }
  return DEFAULT_CHURCHES;
}

export const authService = {
  async syncChurches(): Promise<void> {
    await syncChurches();
  },

  getChurchesList(): { id: string; name: string; mapName: string }[] {
    return getChurches().map(c => ({ id: c.id, name: c.name, mapName: c.mapName }));
  },

  getChurchById(id: string): Church | undefined {
    return getChurches().find(c => c.id === id);
  },

  async registerChurch(name: string, mapName: string, logoName: string, passwordString: string): Promise<{ id: string; name: string }> {
    const id = name.toLowerCase().trim().replace(/[^a-z0-9]/g, '-') + '-' + Math.floor(Math.random() * 1000);
    const passwordHash = hashPassword(passwordString || 'welcome2026');

    const res = await fetch('/api/churches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name, mapName, logoName: logoName || `${name} Admin`, passwordHash })
    });

    if (!res.ok) {
      const errData = await res.json();
      const errMsg = errData.error || 'A church with this name is already registered.';
      throw new Error(errMsg);
    }

    // Refresh memory cache
    await syncChurches();

    // Log the registration event in the audit system
    try {
      await activityService.logRegistration(name, mapName, id);
    } catch (e) {
      console.error('Audit logging registration failed', e);
    }

    return { id, name };
  },

  async login(churchName: string, password: string, rememberMe = false): Promise<ChurchSession> {
    const passwordHash = hashPassword(password);
    let attempts = 0;
    const maxAttempts = 5;
    let delayMs = 200;

    while (true) {
      attempts++;
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ churchName, passwordHash })
        });

        if (res.ok) {
          const session: ChurchSession = await res.json();

          const sessionStr = JSON.stringify(session);
          if (rememberMe) {
            localStorage.setItem(SESSION_STORAGE_KEY, sessionStr);
          } else {
            sessionStorage.setItem(SESSION_STORAGE_KEY, sessionStr);
          }

          // Log successful login audit
          try {
            await activityService.logLogin('Admin', churchName, session.churchId, true);
          } catch (e) {
            console.error('Audit logging admin login success failed', e);
          }

          return session;
        }

        const errData = await res.json();
        const errMsg = errData.error || 'Login failed.';

        // Backoff retry if church not indexed yet or is temporarily not found, but we know registration was attempted
        const isNotRegisteredError = errMsg.toLowerCase().includes('church not registered') || errMsg.toLowerCase().includes('not found');
        if (isNotRegisteredError && attempts < maxAttempts) {
          console.warn(`Church lookup failed: "${errMsg}". Retrying in ${delayMs}ms (attempt ${attempts}/${maxAttempts}) with exponential backoff...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          delayMs *= 2;
          continue;
        }

        // Log failed login audit
        try {
          await activityService.logLogin('Admin', churchName, 'futamap', false, errMsg);
        } catch (e) {
          console.error('Audit logging admin login failure failed', e);
        }

        throw new Error(errMsg);
      } catch (err: any) {
        if (attempts >= maxAttempts) {
          // Log failed login audit on exception
          try {
            await activityService.logLogin('Admin', churchName, 'futamap', false, err.message);
          } catch (e) {
            console.error('Audit logging admin login error failed', e);
          }
          throw err;
        }
        // Retry on connection errors
        console.warn(`Connection error during login: ${err.message || err}. Retrying in ${delayMs}ms (attempt ${attempts}/${maxAttempts})...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        delayMs *= 2;
      }
    }
  },

  getCurrentSession(): ChurchSession | null {
    const sessionLocal = localStorage.getItem(SESSION_STORAGE_KEY);
    if (sessionLocal) {
      try {
        return JSON.parse(sessionLocal);
      } catch {
        // Fallback
      }
    }

    const sessionSession = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (sessionSession) {
      try {
        return JSON.parse(sessionSession);
      } catch {
        // Fallback
      }
    }

    return null;
  },

  isAuthenticated(): boolean {
    return this.getCurrentSession() !== null;
  },

  logout(): void {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  },

  async memberLogin(emailOrPhone: string, password: string, rememberMe = false): Promise<any> {
    const passwordHash = hashPassword(password);

    try {
      const res = await fetch('/api/auth/member-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrPhone, passwordHash, rawPassword: password })
      });

      if (!res.ok) {
        const errData = await res.json();
        const errMsg = errData.error || 'Authentication failed.';
        
        // Log member login failure audit
        try {
          await activityService.logLogin('Member', emailOrPhone, 'futamap', false, errMsg);
        } catch (e) {
          console.error('Audit logging member login failure failed', e);
        }
        
        throw new Error(errMsg);
      }

      const memberSession = await res.json();

      const sessionStr = JSON.stringify(memberSession);
      if (rememberMe) {
        localStorage.setItem(MEMBER_SESSION_STORAGE_KEY, sessionStr);
      } else {
        sessionStorage.setItem(MEMBER_SESSION_STORAGE_KEY, sessionStr);
      }

      // Log member login success audit
      try {
        await activityService.logLogin('Member', memberSession.fullName || emailOrPhone, memberSession.churchId || 'futamap', true);
      } catch (e) {
        console.error('Audit logging member login success failed', e);
      }

      return memberSession;
    } catch (err: any) {
      if (!err.message || !err.message.includes('Authentication failed.')) {
        try {
          await activityService.logLogin('Member', emailOrPhone, 'futamap', false, err.message);
        } catch (e) {
          console.error('Audit logging member login exception failed', e);
        }
      }
      throw err;
    }
  },

  getCurrentMemberSession(): any | null {
    const sessionLocal = localStorage.getItem(MEMBER_SESSION_STORAGE_KEY);
    if (sessionLocal) {
      try {
        return JSON.parse(sessionLocal);
      } catch {}
    }

    const sessionSession = sessionStorage.getItem(MEMBER_SESSION_STORAGE_KEY);
    if (sessionSession) {
      try {
        return JSON.parse(sessionSession);
      } catch {}
    }

    return null;
  },

  isMemberAuthenticated(): boolean {
    return this.getCurrentMemberSession() !== null;
  },

  logoutMember(): void {
    localStorage.removeItem(MEMBER_SESSION_STORAGE_KEY);
    sessionStorage.removeItem(MEMBER_SESSION_STORAGE_KEY);
  },

  getCurrentChurchId(): string {
    const adminSession = this.getCurrentSession();
    if (adminSession?.churchId) return adminSession.churchId;
    const memberSession = this.getCurrentMemberSession();
    if (memberSession?.churchId) return memberSession.churchId;
    return 'futamap';
  },

  async resetMemberPassword(emailOrPhone: string, newPassword: string): Promise<void> {
    const passwordHash = hashPassword(newPassword);

    const res = await fetch('/api/auth/member-reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrPhone, passwordHash })
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || 'Failed to update member credentials.');
    }
  }
};
