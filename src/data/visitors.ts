import { Visitor } from '../types';

export const mockVisitors: Visitor[] = [
  {
    id: "v1",
    fullName: "Tunde Bakare",
    phoneNumber: "+234 815 112 3344",
    gender: "Male",
    invitedBy: "Samuel Adebayo",
    dateVisited: "2026-06-14", // Sunday service visited recently
    prayerRequest: "Praying for financial breakthrough for school fees",
    status: "Pending"
  },
  {
    id: "v2",
    fullName: "Blessing Emmanuel",
    phoneNumber: "+234 802 334 5566",
    gender: "Female",
    invitedBy: "Esther Okafor",
    dateVisited: "2026-06-07",
    prayerRequest: "Quick recovery from a leg fracture",
    status: "Contacted"
  },
  {
    id: "v3",
    fullName: "Oluwaseun Ajayi",
    phoneNumber: "+234 703 555 8899",
    gender: "Male",
    invitedBy: "John Doe",
    dateVisited: "2026-05-31",
    prayerRequest: "Academic excellence in my upcoming exams",
    status: "Integrated"
  },
  {
    id: "v4",
    fullName: "Chinelo Obi",
    phoneNumber: "+234 905 999 0011",
    gender: "Female",
    invitedBy: "Victoria Nwosu",
    dateVisited: "2026-06-14",
    prayerRequest: "Wants to join the ushering department",
    status: "Pending"
  }
];
