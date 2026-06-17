import { PrayerRequest } from '../types';

export const mockPrayerRequests: PrayerRequest[] = [
  {
    id: "pr1",
    fullName: "Samuel Adebayo",
    phoneNumber: "+234 812 345 6789",
    request: "Pray that God will grant me retention and wisdom for my upcoming final semester exams, and favor for my project defense.",
    dateSubmitted: "2026-06-16",
    status: "Praying"
  },
  {
    id: "pr2",
    fullName: "Esther Okafor",
    phoneNumber: "+234 803 456 7890",
    request: "Thanksgiving for safety during my travel back to campus. Also asking for God's provision for my accommodation fee renewal.",
    dateSubmitted: "2026-06-15",
    status: "Answered"
  },
  {
    id: "pr3",
    fullName: "Tunde Bakare",
    phoneNumber: "+234 815 112 3344",
    request: "I am a first-time visitor. Please pray that God will heal my mother who is currently diagnosed with severe malaria back in Ondo state.",
    dateSubmitted: "2026-06-14",
    status: "Ongoing"
  },
  {
    id: "pr4",
    fullName: "Caleb Williams",
    phoneNumber: "+234 709 876 5432",
    request: "Pray against stagnation and backsliding. Ask for restoration of spiritual hunger and passion for service.",
    dateSubmitted: "2026-06-02",
    status: "Praying"
  }
];
