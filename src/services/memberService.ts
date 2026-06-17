import { Member } from '../types';
import { mockMembers } from '../data/members';
import { authService } from './authService';

const STORAGE_KEY = 'futamap_members';

// Ensures initial data exists in LocalStorage
const initializeMembers = (): Member[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error("Error parsing members list", e);
    }
  }
  const enriched = mockMembers.map(m => ({ ...m, churchId: m.churchId || 'futamap' }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(enriched));
  return enriched;
};

export const memberService = {
  getMembers(): Member[] {
    const all = initializeMembers();
    const session = authService.getCurrentSession();
    if (session) {
      return all.filter(m => m.churchId === session.churchId);
    }
    // Return all or empty. Let's return empty/isolated to prevent leakage unless no session is active.
    return all.filter(m => m.churchId === 'futamap');
  },

  getMemberById(id: string): Member | undefined {
    const members = initializeMembers();
    const session = authService.getCurrentSession();
    const m = members.find(item => item.id === id);
    if (!m) return undefined;
    
    // Ensure the member belongs to the active tenant if authenticated
    if (session && m.churchId !== session.churchId) {
      return undefined;
    }
    return m;
  },

  addMember(member: Omit<Member, 'id' | 'status' | 'churchId'>, chosenChurchId?: string): Member {
    const currentChurchId = chosenChurchId || authService.getCurrentSession()?.churchId || 'futamap';
    const allMembers = initializeMembers();
    
    const newMember: Member = {
      ...member,
      id: 'm_' + Math.random().toString(36).substr(2, 9),
      churchId: currentChurchId,
      status: 'Active'
    };
    
    // Save to list
    const updated = [newMember, ...allMembers];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    // Register a system activity
    activityService.addActivity({
      type: 'registration',
      description: `${newMember.fullName} registered as a new member of ${newMember.mapName}.`,
      timestamp: new Date().toISOString().split('T')[0],
      memberName: newMember.fullName
    }, currentChurchId);

    return newMember;
  },

  updateMember(id: string, updates: Partial<Member>): Member {
    const allMembers = initializeMembers();
    const index = allMembers.findIndex(m => m.id === id);
    if (index === -1) {
      throw new Error(`Member with id ${id} not found.`);
    }

    const session = authService.getCurrentSession();
    if (session && allMembers[index].churchId !== session.churchId) {
      throw new Error("Access denied: Tenant mismatch.");
    }

    const updatedMember = { ...allMembers[index], ...updates };
    allMembers[index] = updatedMember;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allMembers));
    return updatedMember;
  }
};

// Import dynamically to avoid circular dependency
import { activityService } from './activityService';
