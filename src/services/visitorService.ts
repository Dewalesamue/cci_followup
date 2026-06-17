import { Visitor } from '../types';
import { mockVisitors } from '../data/visitors';
import { activityService } from './activityService';
import { followUpService } from './followUpService';
import { authService } from './authService';

const STORAGE_KEY = 'futamap_visitors';

const initializeVisitors = (): Visitor[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error("Error parsing visitors list", e);
    }
  }
  const enriched = mockVisitors.map(v => ({ ...v, churchId: v.churchId || 'futamap' }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(enriched));
  return enriched;
};

export const visitorService = {
  getVisitors(): Visitor[] {
    const all = initializeVisitors();
    const session = authService.getCurrentSession();
    if (session) {
      return all.filter(v => v.churchId === session.churchId);
    }
    return all.filter(v => v.churchId === 'futamap');
  },

  addVisitor(visitor: Omit<Visitor, 'id' | 'status' | 'churchId'>, chosenChurchId?: string): Visitor {
    const currentChurchId = chosenChurchId || authService.getCurrentSession()?.churchId || 'futamap';
    const allVisitors = initializeVisitors();
    
    const newVisitor: Visitor = {
      ...visitor,
      id: 'v_' + Math.random().toString(36).substr(2, 9),
      churchId: currentChurchId,
      status: 'Pending'
    };

    const updated = [newVisitor, ...allVisitors];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    // Register a system activity
    activityService.addActivity({
      type: 'registration',
      description: `Visitor ${newVisitor.fullName} registered, invited by ${newVisitor.invitedBy}.`,
      timestamp: new Date().toISOString().split('T')[0],
      memberName: newVisitor.fullName
    }, currentChurchId);

    // Auto-create a Follow Up record for this visitor
    followUpService.addFollowUp({
      id: newVisitor.id, // Keep IDs matching so we can reference easily
      churchId: currentChurchId,
      name: newVisitor.fullName,
      phoneNumber: newVisitor.phoneNumber,
      reason: `First-time visitor on ${newVisitor.dateVisited}. Invited by ${newVisitor.invitedBy}.`,
      status: 'Needs Follow Up',
      notes: newVisitor.prayerRequest ? [{
        id: 'n_' + Math.random().toString(36).substr(2, 9),
        date: new Date().toISOString().split('T')[0],
        text: `Initial Prayer Request: ${newVisitor.prayerRequest}`,
        author: 'System'
      }] : []
    });

    return newVisitor;
  },

  updateVisitorStatus(id: string, status: Visitor['status']): Visitor {
    const allVisitors = initializeVisitors();
    const index = allVisitors.findIndex(v => v.id === id);
    if (index === -1) {
      throw new Error(`Visitor with id ${id} not found.`);
    }

    const session = authService.getCurrentSession();
    if (session && allVisitors[index].churchId !== session.churchId) {
      throw new Error("Access denied: Tenant mismatch.");
    }

    const updatedVisitor = { ...allVisitors[index], status };
    allVisitors[index] = updatedVisitor;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allVisitors));

    // Keep the follow up entry status in sync!
    try {
      const followUpStatusMap: Record<Visitor['status'], 'Needs Follow Up' | 'Contacted' | 'Visited' | 'Restored'> = {
        'Pending': 'Needs Follow Up',
        'Contacted': 'Contacted',
        'Integrated': 'Restored'
      };
      
      followUpService.syncStatus(id, followUpStatusMap[status]);
    } catch (e) {
      console.warn("Could not sync follow up status", e);
    }

    activityService.addActivity({
      type: 'followup',
      description: `Updated visitor ${updatedVisitor.fullName} status to ${status}.`,
      timestamp: new Date().toISOString().split('T')[0],
      memberName: updatedVisitor.fullName
    }, updatedVisitor.churchId);

    return updatedVisitor;
  }
};
