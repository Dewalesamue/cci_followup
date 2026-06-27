import { PrayerRequest } from '../types';
import { authService } from './authService.ts';
import { activityService } from './activityService.ts';

const STORAGE_KEY = 'futamap_prayer_requests';

export const prayerService = {
  getPrayerRequests(): PrayerRequest[] {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const all = JSON.parse(stored);
        const activeChurchId = authService.getCurrentChurchId();
        return all.filter((p: any) => p.churchId === activeChurchId);
      } catch (e) {
        console.error("Error parsing prayer requests cache", e);
      }
    }
    return [];
  },

  async fetchPrayerRequests(): Promise<PrayerRequest[]> {
    try {
      const activeChurchId = authService.getCurrentChurchId();
      const url = `/api/prayer-requests?churchId=${activeChurchId}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        
        const stored = localStorage.getItem(STORAGE_KEY);
        let allRequests: PrayerRequest[] = [];
        if (stored) {
          try {
            allRequests = JSON.parse(stored);
          } catch {}
        }
        
        allRequests = allRequests.filter(p => p.churchId !== activeChurchId);
        allRequests = [...data, ...allRequests];
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(allRequests));
        return data;
      }
    } catch (err) {
      console.error('Failed to fetch prayer requests:', err);
    }
    return this.getPrayerRequests();
  },

  async addPrayerRequest(
    prayerRequest: Omit<PrayerRequest, 'id' | 'status' | 'dateSubmitted' | 'churchId'>, 
    chosenChurchId?: string
  ): Promise<PrayerRequest> {
    const currentChurchId = chosenChurchId || authService.getCurrentSession()?.churchId || 'futamap';
    
    const newRequest: PrayerRequest = {
      ...prayerRequest,
      id: 'pr_' + Math.random().toString(36).substring(2, 11),
      churchId: currentChurchId,
      dateSubmitted: new Date().toISOString().split('T')[0],
      status: 'Praying'
    };

    const res = await fetch('/api/prayer-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRequest)
    });

    if (!res.ok) {
      throw new Error('Failed to record prayer request on backend.');
    }

    // Log the recent activity
    await activityService.addActivity({
      type: 'prayer',
      description: `${newRequest.fullName} submitted a prayer request.`,
      timestamp: newRequest.dateSubmitted,
      memberName: newRequest.fullName
    }, currentChurchId);

    await this.fetchPrayerRequests();
    return newRequest;
  },

  async updatePrayerRequestStatus(id: string, status: PrayerRequest['status']): Promise<PrayerRequest> {
    const res = await fetch(`/api/prayer-requests/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });

    if (!res.ok) {
      throw new Error('Failed to update prayer request on backend.');
    }

    const updated = await res.json();

    // Log update activity
    await activityService.addActivity({
      type: 'prayer',
      description: `Marked prayer request from ${updated.fullName} as ${status}.`,
      timestamp: new Date().toISOString().split('T')[0],
      memberName: updated.fullName
    }, updated.churchId);

    await this.fetchPrayerRequests();
    return updated;
  }
};
