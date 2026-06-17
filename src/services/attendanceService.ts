import { Attendance, ServiceType } from '../types';
import { mockAttendance } from '../data/attendance';
import { activityService } from './activityService';
import { authService } from './authService';

const STORAGE_KEY = 'futamap_attendance';

const initializeAttendance = (): Attendance[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error("Error parsing attendance list", e);
    }
  }
  const enriched = mockAttendance.map(a => ({ ...a, churchId: a.churchId || 'futamap' }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(enriched));
  return enriched;
};

export const attendanceService = {
  getAttendance(): Attendance[] {
    const all = initializeAttendance();
    const session = authService.getCurrentSession();
    if (session) {
      return all.filter(a => a.churchId === session.churchId);
    }
    return all.filter(a => a.churchId === 'futamap');
  },

  getAttendanceHistoryForMember(memberId: string): Attendance[] {
    const records = this.getAttendance();
    return records.filter(r => r.memberId === memberId);
  },

  addAttendance(
    memberId: string, 
    memberName: string, 
    serviceType: ServiceType, 
    date: string,
    chosenChurchId?: string
  ): Attendance {
    const currentChurchId = chosenChurchId || authService.getCurrentSession()?.churchId || 'futamap';
    const allRecords = initializeAttendance();
    
    // Check if attendance already recorded today for this service for this member
    const existing = allRecords.find(
      r => r.memberId === memberId && r.date === date && r.serviceType === serviceType && r.churchId === currentChurchId
    );
    if (existing) {
      return existing;
    }

    const newRecord: Attendance = {
      id: 'att_' + Math.random().toString(36).substr(2, 9),
      churchId: currentChurchId,
      memberId,
      date,
      serviceType
    };

    const updated = [newRecord, ...allRecords];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    // Log the recent activity
    activityService.addActivity({
      type: 'attendance',
      description: `${memberName} attended ${serviceType}.`,
      timestamp: date,
      memberName: memberName
    }, currentChurchId);

    return newRecord;
  },

  removeAttendance(id: string) {
    const allRecords = initializeAttendance();
    
    const index = allRecords.findIndex(r => r.id === id);
    if (index === -1) return;

    const session = authService.getCurrentSession();
    if (session && allRecords[index].churchId !== session.churchId) {
      throw new Error("Access denied: Tenant mismatch.");
    }

    const updated = allRecords.filter(r => r.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }
};
