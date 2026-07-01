import { RecentActivity } from '../types';

const STORAGE_KEY = 'futamap_activities';
const SESSION_STORAGE_KEY = 'futamap_saas_session';
const MEMBER_SESSION_STORAGE_KEY = 'futamap_saas_member_session';

function getLocalChurchId(): string {
  const sessionLocal = localStorage.getItem(SESSION_STORAGE_KEY);
  if (sessionLocal) {
    try {
      const parsed = JSON.parse(sessionLocal);
      if (parsed?.churchId) return parsed.churchId;
    } catch {}
  }
  const sessionSession = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (sessionSession) {
    try {
      const parsed = JSON.parse(sessionSession);
      if (parsed?.churchId) return parsed.churchId;
    } catch {}
  }
  const memberLocal = localStorage.getItem(MEMBER_SESSION_STORAGE_KEY);
  if (memberLocal) {
    try {
      const parsed = JSON.parse(memberLocal);
      if (parsed?.churchId) return parsed.churchId;
    } catch {}
  }
  const memberSession = sessionStorage.getItem(MEMBER_SESSION_STORAGE_KEY);
  if (memberSession) {
    try {
      const parsed = JSON.parse(memberSession);
      if (parsed?.churchId) return parsed.churchId;
    } catch {}
  }
  return 'futamap';
}

export const activityService = {
  getActivities(): RecentActivity[] {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const all = JSON.parse(stored);
        const activeChurchId = getLocalChurchId();
        return all.filter((a: any) => a.churchId === activeChurchId);
      } catch (e) {
        console.error("Error parsing activities cache", e);
      }
    }
    return [];
  },

  async fetchActivities(): Promise<RecentActivity[]> {
    try {
      const activeChurchId = getLocalChurchId();
      const url = `/api/activities?churchId=${activeChurchId}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        
        const stored = localStorage.getItem(STORAGE_KEY);
        let allActivities: RecentActivity[] = [];
        if (stored) {
          try {
            allActivities = JSON.parse(stored);
          } catch {}
        }
        
        allActivities = allActivities.filter(a => a.churchId !== activeChurchId);
        allActivities = [...data, ...allActivities];
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(allActivities.slice(0, 100)));
        return data;
      }
    } catch (err) {
      console.error('Failed to fetch activities:', err);
    }
    return this.getActivities();
  },

  async addActivity(activity: Omit<RecentActivity, 'id' | 'churchId'>, chosenChurchId?: string): Promise<RecentActivity> {
    const currentChurchId = chosenChurchId || getLocalChurchId();
    
    const newActivity: RecentActivity = {
      ...activity,
      id: 'act_' + Math.random().toString(36).substring(2, 11),
      churchId: currentChurchId
    };

    try {
      await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newActivity)
      });
      await this.fetchActivities();
    } catch (err) {
      console.error('Failed to post activity:', err);
    }

    return newActivity;
  },

  async logAudit(type: 'registration' | 'login' | 'settings' | 'audit_log', description: string, details?: string, churchId?: string): Promise<RecentActivity> {
    const timestamp = new Date().toISOString().split('T')[0];
    const newActivity = await this.addActivity({
      type,
      description,
      timestamp,
      details
    }, churchId);
    console.log(`[Audit Log - ${type.toUpperCase()}] ${description}`, details ? `| Details: ${details}` : '');
    return newActivity;
  },

  async logRegistration(churchName: string, mapName: string, churchId: string): Promise<RecentActivity> {
    return this.logAudit(
      'registration',
      `Church Registered: "${churchName}" successfully created.`,
      `ID: ${churchId}, MAP: ${mapName}`,
      churchId
    );
  },

  async logLogin(userRole: string, username: string, churchId: string, success: boolean, errorMessage?: string): Promise<RecentActivity> {
    return this.logAudit(
      'login',
      `${userRole} Login: ${success ? 'Successful' : 'Failed'} for "${username}".`,
      success ? `Authenticated at ${new Date().toISOString()}` : `Error: ${errorMessage}`,
      churchId
    );
  },

  async logSettingsChange(churchId: string, settingsName: string, previousValue: string, newValue: string): Promise<RecentActivity> {
    return this.logAudit(
      'settings',
      `Settings Updated: "${settingsName}" changed.`,
      `Prev: "${previousValue}" -> New: "${newValue}"`,
      churchId
    );
  }
};
