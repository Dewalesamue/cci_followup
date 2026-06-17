import { RecentActivity } from '../types';
import { authService } from './authService';

const STORAGE_KEY = 'futamap_activities';

const initialActivities: RecentActivity[] = [
  {
    id: "act1",
    churchId: "futamap",
    type: "attendance",
    description: "Samuel Adebayo attended Sunday Service.",
    timestamp: "2026-06-14",
    memberName: "Samuel Adebayo"
  },
  {
    id: "act2",
    churchId: "futamap",
    type: "prayer",
    description: "Esther Okafor submitted a prayer request regarding travel thanksgiving.",
    timestamp: "2026-06-15",
    memberName: "Esther Okafor"
  },
  {
    id: "act3",
    churchId: "futamap",
    type: "registration",
    description: "John Doe registered as a new member with MAP Alpha.",
    timestamp: "2026-02-14",
    memberName: "John Doe"
  },
  {
    id: "act4",
    churchId: "futamap",
    type: "followup",
    description: "Marked Tunde Bakare as Contacted and added a follow up call summary note.",
    timestamp: "2026-06-16"
  }
];

const initializeActivities = (): RecentActivity[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error("Error parsing activities list", e);
    }
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(initialActivities));
  return initialActivities;
};

export const activityService = {
  getActivities(): RecentActivity[] {
    const all = initializeActivities();
    const session = authService.getCurrentSession();
    if (session) {
      return all.filter(a => a.churchId === session.churchId);
    }
    return all.filter(a => a.churchId === 'futamap');
  },

  addActivity(activity: Omit<RecentActivity, 'id' | 'churchId'>, chosenChurchId?: string): RecentActivity {
    const currentChurchId = chosenChurchId || authService.getCurrentSession()?.churchId || 'futamap';
    const allActivities = initializeActivities();
    
    const newActivity: RecentActivity = {
      ...activity,
      id: 'act_' + Math.random().toString(36).substr(2, 9),
      churchId: currentChurchId
    };
    
    const updated = [newActivity, ...allActivities];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated.slice(0, 50))); // limit to 50 items
    return newActivity;
  }
};
