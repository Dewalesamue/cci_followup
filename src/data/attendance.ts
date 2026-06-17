import { Attendance } from '../types';

export const mockAttendance: Attendance[] = [
  // Sunday Service - June 14
  { id: "att1", memberId: "m1", date: "2026-06-14", serviceType: "Sunday Service" },
  { id: "att2", memberId: "m2", date: "2026-06-14", serviceType: "Sunday Service" },
  { id: "att3", memberId: "m3", date: "2026-06-14", serviceType: "Sunday Service" },
  { id: "att4", memberId: "m4", date: "2026-06-14", serviceType: "Sunday Service" },
  { id: "att5", memberId: "m6", date: "2026-06-14", serviceType: "Sunday Service" },
  { id: "att6", memberId: "m7", date: "2026-06-14", serviceType: "Sunday Service" },

  // MAP Meeting - June 13
  { id: "att7", memberId: "m1", date: "2026-06-13", serviceType: "MAP Meeting" },
  { id: "att8", memberId: "m2", date: "2026-06-13", serviceType: "MAP Meeting" },
  { id: "att9", memberId: "m3", date: "2026-06-13", serviceType: "MAP Meeting" },

  // Prayer Meeting - June 12
  { id: "att10", memberId: "m1", date: "2026-06-12", serviceType: "Prayer Meeting" },
  { id: "att11", memberId: "m2", date: "2026-06-12", serviceType: "Prayer Meeting" },

  // Bible Study - June 10
  { id: "att12", memberId: "m1", date: "2026-06-10", serviceType: "Bible Study" },
  { id: "att13", memberId: "m3", date: "2026-06-10", serviceType: "Bible Study" },
  { id: "att14", memberId: "m6", date: "2026-06-10", serviceType: "Bible Study" },

  // Sunday Service - June 7
  { id: "att15", memberId: "m1", date: "2026-06-07", serviceType: "Sunday Service" },
  { id: "att16", memberId: "m2", date: "2026-06-07", serviceType: "Sunday Service" },
  { id: "att17", memberId: "m3", date: "2026-06-07", serviceType: "Sunday Service" },
  { id: "att18", memberId: "m4", date: "2026-06-07", serviceType: "Sunday Service" },
  { id: "att19", memberId: "m6", date: "2026-06-07", serviceType: "Sunday Service" },
  { id: "att20", memberId: "m7", date: "2026-06-07", serviceType: "Sunday Service" },

  // Caleb (m5) - Last attendance was some time ago (May 17)
  { id: "att21", memberId: "m5", date: "2026-05-17", serviceType: "Sunday Service" }
];
