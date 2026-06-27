import { RecentActivity } from '../types';
import { authService } from './authService.ts';

const STORAGE_KEY = 'futamap_activities';

export const activityService = {
  getActivities(): RecentActivity[] {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const all = JSON.parse(stored);
        const activeChurchId = authService.getCurrentChurchId();
        return all.filter((a: any) => a.churchId === activeChurchId);
      } catch (e) {
        console.error("Error parsing activities cache", e);
      }
    }
    return [];
  },

  async fetchActivities(): Promise<RecentActivity[]> {
    try {
      const activeChurchId = authService.getCurrentChurchId();
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
    const currentChurchId = chosenChurchId || authService.getCurrentSession()?.churchId || 'futamap';
    
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
  }
};
