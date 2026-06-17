import { PrayerRequest } from '../types';
import { mockPrayerRequests } from '../data/prayerRequests';
import { activityService } from './activityService';
import { authService } from './authService';

const STORAGE_KEY = 'futamap_prayer_requests';

const initializePrayerRequests = (): PrayerRequest[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error("Error parsing prayer requests list", e);
    }
  }
  const enriched = mockPrayerRequests.map(p => ({ ...p, churchId: p.churchId || 'futamap' }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(enriched));
  return enriched;
};

export const prayerService = {
  getPrayerRequests(): PrayerRequest[] {
    const all = initializePrayerRequests();
    const session = authService.getCurrentSession();
    if (session) {
      return all.filter(p => p.churchId === session.churchId);
    }
    return all.filter(p => p.churchId === 'futamap');
  },

  addPrayerRequest(
    prayerRequest: Omit<PrayerRequest, 'id' | 'status' | 'dateSubmitted' | 'churchId'>, 
    chosenChurchId?: string
  ): PrayerRequest {
    const currentChurchId = chosenChurchId || authService.getCurrentSession()?.churchId || 'futamap';
    const allRequests = initializePrayerRequests();
    
    const newRequest: PrayerRequest = {
      ...prayerRequest,
      id: 'pr_' + Math.random().toString(36).substr(2, 9),
      churchId: currentChurchId,
      dateSubmitted: new Date().toISOString().split('T')[0],
      status: 'Praying'
    };

    const updated = [newRequest, ...allRequests];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    // Log the recent activity
    activityService.addActivity({
      type: 'prayer',
      description: `${newRequest.fullName} submitted a prayer request.`,
      timestamp: newRequest.dateSubmitted,
      memberName: newRequest.fullName
    }, currentChurchId);

    return newRequest;
  },

  updatePrayerRequestStatus(id: string, status: PrayerRequest['status']): PrayerRequest {
    const allRequests = initializePrayerRequests();
    const index = allRequests.findIndex(r => r.id === id);
    if (index === -1) {
      throw new Error(`Prayer request with id ${id} not found.`);
    }

    const session = authService.getCurrentSession();
    if (session && allRequests[index].churchId !== session.churchId) {
      throw new Error("Access denied: Tenant mismatch.");
    }

    const updated = { ...allRequests[index], status };
    allRequests[index] = updated;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allRequests));

    // Log update activity
    activityService.addActivity({
      type: 'prayer',
      description: `Marked prayer request from ${updated.fullName} as ${status}.`,
      timestamp: new Date().toISOString().split('T')[0],
      memberName: updated.fullName
    }, updated.churchId);

    return updated;
  }
};
