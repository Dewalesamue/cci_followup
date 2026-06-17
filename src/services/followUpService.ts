import { FollowUp, FollowUpNote } from '../types';
import { activityService } from './activityService';
import { authService } from './authService';

const STORAGE_KEY = 'futamap_followups';

const initialFollowUps: FollowUp[] = [
  {
    id: "v1", // First-time visitor Tunde Bakare
    churchId: "futamap",
    name: "Tunde Bakare",
    phoneNumber: "+234 815 112 3344",
    reason: "First-time visitor on 2026-06-14. Invited by Samuel Adebayo.",
    lastAttendanceDate: "2026-06-14",
    status: "Needs Follow Up",
    notes: []
  },
  {
    id: "v2", // Visitor Blessing Emmanuel
    churchId: "futamap",
    name: "Blessing Emmanuel",
    phoneNumber: "+234 802 334 5566",
    reason: "First-time visitor on 2026-06-07. Invited by Esther Okafor.",
    lastAttendanceDate: "2026-06-07",
    status: "Contacted",
    notes: [
      {
        id: "n1",
        date: "2026-06-09",
        text: "Called him on Tuesday evening. He was traveling, but expressed interest in coming back. Promised to attend next Sunday.",
        author: "MAP Leader"
      }
    ]
  },
  {
    id: "m5", // Inactive member Caleb Williams
    churchId: "futamap",
    name: "Caleb Williams",
    phoneNumber: "+234 709 876 5432",
    reason: "Member has missed the last 3 weekly meetings. Flagged as Inactive.",
    lastAttendanceDate: "2026-05-17",
    status: "Needs Follow Up",
    notes: [
      {
        id: "n2",
        date: "2026-06-12",
        text: "Sent encouragement WhatsApp message. Not yet read.",
        author: "Admin"
      }
    ]
  }
];

const initializeFollowUps = (): FollowUp[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error("Error parsing followups list", e);
    }
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(initialFollowUps));
  return initialFollowUps;
};

export const followUpService = {
  getFollowUps(): FollowUp[] {
    const all = initializeFollowUps();
    const session = authService.getCurrentSession();
    if (session) {
      return all.filter(f => f.churchId === session.churchId);
    }
    return all.filter(f => f.churchId === 'futamap');
  },

  addFollowUp(followUp: FollowUp): FollowUp {
    const allFollowups = initializeFollowUps();
    // Check if it already exists
    if (allFollowups.some(f => f.id === followUp.id)) {
      return followUp;
    }
    const updated = [...allFollowups, followUp];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return followUp;
  },

  addNote(followUpId: string, text: string, author: string = "Leader"): FollowUpNote {
    const allFollowups = initializeFollowUps();
    const index = allFollowups.findIndex(f => f.id === followUpId);
    if (index === -1) {
      throw new Error(`Follow-up entry ${followUpId} not found.`);
    }

    const session = authService.getCurrentSession();
    if (session && allFollowups[index].churchId !== session.churchId) {
      throw new Error("Access denied: Tenant mismatch.");
    }

    const newNote: FollowUpNote = {
      id: 'n_' + Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString().split('T')[0],
      text,
      author
    };

    allFollowups[index].notes = [newNote, ...allFollowups[index].notes];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allFollowups));

    // Register a system activity
    activityService.addActivity({
      type: 'followup',
      description: `Added feedback note on ${allFollowups[index].name}'s details: "${text.substring(0, 40)}${text.length > 40 ? '...' : ''}"`,
      timestamp: new Date().toISOString().split('T')[0],
      memberName: allFollowups[index].name
    }, allFollowups[index].churchId);

    return newNote;
  },

  updateStatus(id: string, status: FollowUp['status']): FollowUp {
    const allFollowups = initializeFollowUps();
    const index = allFollowups.findIndex(f => f.id === id);
    if (index === -1) {
      throw new Error(`Follow-up entry with id ${id} not found.`);
    }

    const session = authService.getCurrentSession();
    if (session && allFollowups[index].churchId !== session.churchId) {
      throw new Error("Access denied: Tenant mismatch.");
    }

    const updated = { ...allFollowups[index], status };
    allFollowups[index] = updated;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allFollowups));

    // Log the update activity
    activityService.addActivity({
      type: 'followup',
      description: `Updated follow up card status for ${updated.name} to "${status}".`,
      timestamp: new Date().toISOString().split('T')[0],
      memberName: updated.name
    }, updated.churchId);

    return updated;
  },

  syncStatus(id: string, status: FollowUp['status']) {
    try {
      const allFollowups = initializeFollowUps();
      const index = allFollowups.findIndex(f => f.id === id);
      if (index !== -1 && allFollowups[index].status !== status) {
        allFollowups[index].status = status;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(allFollowups));
      }
    } catch (e) {
      console.warn("syncStatus error", e);
    }
  }
};
