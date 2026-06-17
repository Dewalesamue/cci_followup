import React, { useState, useEffect } from 'react';
import { Member, Attendance, PrayerRequest, ChurchEvent } from '../../types';
import { memberService } from '../../services/memberService';
import { prayerService } from '../../services/prayerService';
import { settingsService } from '../../services/settingsService';
import { motion } from 'motion/react';
import {
  User, Check, Phone, Mail, Calendar, Compass, MapPin, 
  Plus, Edit, Clipboard, Sparkles, LogOut, CheckCircle, AlertCircle, HeartHandshake,
  Clock, ShieldAlert, Award, FileText, Gift, Info
} from 'lucide-react';

interface MemberDashboardViewProps {
  memberId: string;
  onLogout: () => void;
  attendanceHistory: Attendance[];
}

export default function MemberDashboardView({ memberId, onLogout, attendanceHistory }: MemberDashboardViewProps) {
  const [member, setMember] = useState<Member | null>(null);
  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
  const [allAttendance, setAllAttendance] = useState<Attendance[]>([]);
  
  // Tab control: 'dashboard' | 'prayers' | 'profile' | 'events'
  const [activeTab, setActiveTab] = useState<'dashboard' | 'prayers' | 'profile' | 'events'>('dashboard');

  // Input states for new prayer request
  const [newRequestText, setNewRequestText] = useState('');
  const [isSubmittingPrayer, setIsSubmittingPrayer] = useState(false);
  const [prayerSuccess, setPrayerSuccess] = useState('');

  // Editing profile details states
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editResidence, setEditResidence] = useState('');
  const [editPicture, setEditPicture] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // Sample Upcoming Events
  const events: ChurchEvent[] = [
    {
      id: 'e1',
      title: 'Global Communion Service',
      date: '2026-07-05',
      time: '09:00 AM',
      location: 'Celebration Dome, General HQ',
      category: 'program'
    },
    {
      id: 'e2',
      title: 'Departmental Strategy & Alignment',
      date: '2026-06-25',
      time: '06:00 PM',
      location: 'Main Auditorium / Zoom',
      category: 'meeting'
    },
    {
      id: 'e3',
      title: 'Believers Convention 2026',
      date: '2026-08-10',
      time: '05:00 PM',
      location: 'Eko Convention Centre & Virtual',
      category: 'special'
    },
    {
      id: 'e4',
      title: 'MAP Cell Intercessory Gathering',
      date: '2026-07-01',
      time: '06:30 PM',
      location: 'Centennial Hall',
      category: 'program'
    }
  ];

  // Load member and prayer requests
  useEffect(() => {
    loadMemberData();
  }, [memberId]);

  const loadMemberData = () => {
    const mem = memberService.getMemberById(memberId);
    if (mem) {
      setMember(mem);
      setEditPhone(mem.phoneNumber);
      setEditEmail(mem.email || '');
      setEditResidence(mem.residence);
      setEditPicture(mem.profilePicture || '');
      
      // Load prayers linked by phone number or email match
      const allPrayersStr = localStorage.getItem('futamap_prayer_requests') || '[]';
      try {
        const parsedPrayers: PrayerRequest[] = JSON.parse(allPrayersStr);
        // Match prayers belonging matching this member
        const matched = parsedPrayers.filter(p => {
          const cleanMemPhone = mem.phoneNumber.replace(/[^0-9]/g, '');
          const cleanPrPhone = p.phoneNumber.replace(/[^0-9]/g, '');
          const isPhoneMatch = cleanMemPhone === cleanPrPhone;
          const isEmailMatch = mem.email && p.fullName.toLowerCase().includes(mem.fullName.toLowerCase());
          return isPhoneMatch || p.fullName.toLowerCase() === mem.fullName.toLowerCase();
        });
        setPrayers(matched);
      } catch (e) {
        console.error('Error fetching member prayers', e);
      }

      // Filter attendance history
      const memberAttendance = attendanceHistory.filter(att => att.memberId === mem.id);
      setAllAttendance(memberAttendance);
    }
  };

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccess('');
    setProfileError('');
    setIsSavingProfile(true);

    try {
      if (!editPhone.trim()) {
        throw new Error('Phone number is required.');
      }
      
      // Save changes using memberService
      memberService.updateMember(memberId, {
        phoneNumber: editPhone,
        email: editEmail,
        residence: editResidence,
        profilePicture: editPicture
      });

      setProfileSuccess('Profile details saved successfully!');
      
      // Reload updated info
      const updated = memberService.getMemberById(memberId);
      if (updated) setMember(updated);
    } catch (err: any) {
      setProfileError(err.message || 'Error updating profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSubmitPrayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRequestText.trim()) return;

    setIsSubmittingPrayer(true);
    setPrayerSuccess('');

    try {
      // Simulate API latency
      await new Promise(resolve => setTimeout(resolve, 600));

      const newPr: PrayerRequest = {
        id: 'pr_' + Math.random().toString(36).substr(2, 9),
        churchId: member?.churchId || 'futamap',
        fullName: member?.fullName || 'Anonymous Member',
        phoneNumber: member?.phoneNumber || '',
        request: newRequestText,
        dateSubmitted: new Date().toISOString().split('T')[0],
        status: 'Praying'
      };

      // Read, append, write to localStorage
      const allPrayersStr = localStorage.getItem('futamap_prayer_requests') || '[]';
      const parsedPrayers = JSON.parse(allPrayersStr);
      parsedPrayers.unshift(newPr);
      localStorage.setItem('futamap_prayer_requests', JSON.stringify(parsedPrayers));

      // Update state
      setPrayers(prev => [newPr, ...prev]);
      setNewRequestText('');
      setPrayerSuccess('Your prayer request has been submitted to the intercessors team. We are praying with you!');
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmittingPrayer(false);
    }
  };

  if (!member) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center py-12 px-4 text-center">
        <AlertCircle className="w-12 h-12 text-slate-400 mb-2 animate-pulse" />
        <p className="text-sm font-semibold text-slate-600">Access Denied: Member profile could not be loaded.</p>
        <button onClick={onLogout} className="mt-4 px-4 py-2 bg-slate-200 rounded-xl text-xs font-bold hover:bg-slate-350 cursor-pointer">
          Go Log Out
        </button>
      </div>
    );
  }

  // Count attendance stats
  const sunServicesCount = allAttendance.filter(a => a.serviceType === 'Sunday Service').length;
  const midweekCount = allAttendance.filter(a => a.serviceType === 'Bible Study' || a.serviceType === 'MAP Meeting').length;
  const prayerMeetCount = allAttendance.filter(a => a.serviceType === 'Prayer Meeting').length;

  const churchSettings = settingsService.getSettings(member.churchId || 'futamap');

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col justify-between">
      {/* Top Banner Header */}
      <header className="bg-slate-900 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div>
              <span className="block font-bold text-sm tracking-wide text-blue-400 uppercase leading-none">{churchSettings.mapName} Personal Portal</span>
              <span className="block font-semibold text-white text-base font-sans mt-0.5">{churchSettings.churchName}</span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex items-center space-x-2 text-right">
              <span className="block text-xs font-bold text-slate-300">{member.fullName}</span>
              <span className="block text-[10px] text-emerald-400 font-mono font-semibold">MID: {member.id}</span>
            </div>

            {member.profilePicture ? (
              <img
                src={member.profilePicture}
                alt="Profile"
                className="w-10 h-10 rounded-full object-cover border-2 border-blue-500 shadow-sm"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-slate-800 text-blue-400 font-bold flex items-center justify-center border-2 border-slate-700">
                {member.fullName.charAt(0)}
              </div>
            )}

            <button
              onClick={onLogout}
              className="p-2 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded-xl transition-all cursor-pointer border border-slate-700"
              title="Logout Session"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Frame */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Profile Quick Strip */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xs p-6 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 text-slate-50/40 font-mono font-bold text-7xl select-none leading-none z-0">
            CCI
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4 relative z-10 w-full sm:w-auto">
            <div className="w-16 h-16 rounded-full bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center font-bold text-2xl">
              {member.profilePicture ? (
                <img src={member.profilePicture} alt="Profile" className="w-full h-full rounded-full object-cover" referrerPolicy="no-referrer" />
              ) : member.fullName.charAt(0)}
            </div>
            <div className="text-center sm:text-left">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center justify-center sm:justify-start gap-1.5">
                {member.fullName}
                <Award className="w-4 h-4 text-emerald-500" />
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                {member.department} • {member.level}
              </p>
            </div>
          </div>

          {/* Quick tab toggle bar */}
          <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-2xl w-full md:w-auto relative z-10">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex-1 sm:flex-auto px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'dashboard' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('prayers')}
              className={`flex-1 sm:flex-auto px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'prayers' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              My Prayers ({prayers.length})
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex-1 sm:flex-auto px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'profile' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Settings
            </button>
            <button
              onClick={() => setActiveTab('events')}
              className={`flex-1 sm:flex-auto px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'events' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Events
            </button>
          </div>
        </div>

        {/* Tab content renderer */}
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* 1. PERSONAL INFORMATION CARD (Read-only list representation) */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-3xl border border-gray-100 shadow-xs p-6 space-y-4">
                <div className="flex justify-between items-center border-b border-gray-50 pb-3">
                  <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-blue-600" />
                    Personal Directory Info
                  </h3>
                  <span className="text-[10px] px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-bold select-none font-mono">
                    Official Record
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1 p-3 bg-slate-50 rounded-xl">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest block">Full Name</span>
                    <span className="text-sm font-semibold text-slate-800 block">{member.fullName}</span>
                  </div>
                  <div className="space-y-1 p-3 bg-slate-50 rounded-xl">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest block">Unique Member ID</span>
                    <span className="text-sm font-mono font-bold text-indigo-600 block">{member.id}</span>
                  </div>
                  <div className="space-y-1 p-3 bg-slate-50 rounded-xl">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest block">Contact Phone</span>
                    <span className="text-sm font-semibold text-slate-800 block">{member.phoneNumber}</span>
                  </div>
                  <div className="space-y-1 p-3 bg-slate-50 rounded-xl">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest block">Email Address</span>
                    <span className="text-sm font-semibold text-slate-800 block">{member.email || 'None Registered'}</span>
                  </div>
                  <div className="space-y-1 p-3 bg-slate-50 rounded-xl">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest block">Birthday</span>
                    <span className="text-sm font-semibold text-slate-800 block flex items-center gap-1">
                      <Gift className="w-3.5 h-3.5 text-purple-500" />
                      {member.birthday}
                    </span>
                  </div>
                  <div className="space-y-1 p-3 bg-slate-50 rounded-xl">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest block">Faculty & Major</span>
                    <span className="text-sm font-semibold text-slate-800 block">{member.faculty} • {member.level}</span>
                  </div>
                  <div className="space-y-1 p-3 bg-slate-50 rounded-xl">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest block">Hostel Residence</span>
                    <span className="text-sm font-semibold text-slate-800 block flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-rose-500" />
                      {member.residence}
                    </span>
                  </div>
                  <div className="space-y-1 p-3 bg-slate-50 rounded-xl">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest block">Date Joined Fellowship</span>
                    <span className="text-sm font-semibold text-slate-800 block flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                      {member.dateJoined}
                    </span>
                  </div>
                </div>

                {/* Locked Administrative Alert */}
                <div className="p-3.5 bg-slate-55 border border-gray-150 rounded-2xl flex items-start space-x-3 text-xs text-slate-500">
                  <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-700 block">Strict Security Isolations Active</span>
                    Some fields (such as your <strong>Member ID</strong>, <strong>Joined Date</strong>, and <strong>Leadership Notes</strong>) can only be managed by administrators and church coordinators.
                  </div>
                </div>
              </div>

              {/* 2. ATTENDANCE HISTORY COMPONENT */}
              <div className="bg-white rounded-3xl border border-gray-100 shadow-xs p-6 space-y-4">
                <div className="flex justify-between items-center border-b border-gray-50 pb-3">
                  <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                    <Clipboard className="w-4 h-4 text-blue-600" />
                    My Attendance Summary
                  </h3>
                  <span className="text-xs text-slate-400 font-bold">{allAttendance.length} Total Services</span>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-4 bg-teal-50 border border-teal-100 rounded-2xl text-center">
                    <span className="block text-2xl font-black text-teal-600">{sunServicesCount}</span>
                    <span className="block text-[10px] text-teal-700 font-bold uppercase tracking-wider mt-0.5">Sunday Services</span>
                  </div>
                  <div className="p-4 bg-purple-50 border border-purple-100 rounded-2xl text-center">
                    <span className="block text-2xl font-black text-purple-600">{midweekCount}</span>
                    <span className="block text-[10px] text-purple-700 font-bold uppercase tracking-wider mt-0.5">Midweek Meetings</span>
                  </div>
                  <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl text-center">
                    <span className="block text-2xl font-black text-amber-600">{prayerMeetCount}</span>
                    <span className="block text-[10px] text-amber-700 font-bold uppercase tracking-wider mt-0.5">Prayer Gatherings</span>
                  </div>
                </div>

                {/* Actual attendance logs */}
                {allAttendance.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs font-medium bg-slate-50 rounded-2xl">
                    No logged attendance records found. Ensure to check in with the ushers during services!
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {allAttendance.map((att, i) => (
                      <div key={i} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl flex justify-between items-center transition-all">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-xs font-bold text-slate-700">{att.serviceType}</span>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-slate-400">{att.date}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* UPCOMING EVENTS & CARE PANEL */}
            <div className="space-y-6">
              
              {/* Leader Note Read-only display */}
              <div className="bg-slate-900 text-slate-200 rounded-3xl border border-slate-800 shadow-md p-6 space-y-4">
                <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
                  <FileText className="w-4 h-4 text-blue-400" />
                  <span className="font-bold text-sm tracking-wide uppercase text-white">Leadership Care Remarks</span>
                </div>
                <p className="text-xs text-slate-400 font-mono leading-relaxed bg-slate-950 p-4 rounded-xl border border-slate-800">
                  "Samuel is currently active in the Believers Academy. Continue supporting him with materials and prayer. He has a promising call."
                </p>
                <div className="flex items-center space-x-1 text-[9px] text-slate-500 font-medium">
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  <span>Only visible to you and your assigned cell coordinators.</span>
                </div>
              </div>

              {/* Sample Events List */}
              <div className="bg-white rounded-3xl border border-gray-100 shadow-xs p-6 space-y-4">
                <div className="flex justify-between items-center border-b border-gray-50 pb-3">
                  <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    Upcoming Events
                  </h3>
                  <button onClick={() => setActiveTab('events')} className="text-xs font-bold text-blue-650 hover:underline cursor-pointer">
                    View All
                  </button>
                </div>

                <div className="space-y-3">
                  {events.slice(0, 3).map((item) => (
                    <div key={item.id} className="p-3 bg-slate-50 hover:bg-white border hover:border-blue-150 rounded-xl transition-all space-y-1.5">
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-bold text-slate-800 line-clamp-1">{item.title}</span>
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-md ${
                          item.category === 'program' ? 'bg-blue-50 text-blue-600' :
                          item.category === 'meeting' ? 'bg-purple-50 text-purple-600' : 'bg-rose-50 text-rose-600'
                        }`}>
                          {item.category}
                        </span>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400 font-semibold font-mono">
                        <span>{item.date} • {item.time}</span>
                        <span className="text-[9px] max-w-28 truncate">{item.location}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PRAYER REQUESTS SUBMISSION & HISTORY */}
        {activeTab === 'prayers' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Submission Form */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-xs p-6 space-y-4">
              <div className="border-b border-gray-50 pb-3">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                  <HeartHandshake className="w-4 h-4 text-blue-600" />
                  New Intercession Request
                </h3>
                <p className="text-xs text-slate-400 mt-1">Our prayer partners and intercessory leaders lift every request up with devotion.</p>
              </div>

              {prayerSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span className="font-semibold">{prayerSuccess}</span>
                </div>
              )}

              <form onSubmit={handleSubmitPrayer} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="prayerText" className="block text-xs font-bold text-gray-400 uppercase tracking-widest">
                    Your Request Detail
                  </label>
                  <textarea
                    id="prayerText"
                    value={newRequestText}
                    onChange={(e) => setNewRequestText(e.target.value)}
                    placeholder="Write details about your prayer point, thanksgiving or testimony..."
                    rows={4}
                    className="block w-full px-3 py-2 border border-gray-200 rounded-xl text-sm transition-all focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 bg-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingPrayer || !newRequestText.trim()}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-750 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingPrayer ? 'Registering request...' : 'Submit Request'}
                </button>
              </form>
            </div>

            {/* Previous Requests List */}
            <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-xs p-6 space-y-4">
              <div className="border-b border-gray-50 pb-3">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                  <Clipboard className="w-4 h-4 text-blue-600" />
                  Prayers History & Tracker
                </h3>
                <p className="text-xs text-slate-400 mt-1">Monitor active follow-up intercession remarks.</p>
              </div>

              {prayers.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs font-medium bg-slate-50 rounded-2xl">
                  You haven't logger any prayer requests yet. Click on the left form to submit your first intercessions!
                </div>
              ) : (
                <div className="space-y-4 max-h-[450px] overflow-y-auto pr-1">
                  {prayers.map((pr) => (
                    <div key={pr.id} className="p-4 bg-slate-50 hover:bg-slate-55 border border-slate-100 rounded-2xl space-y-2 transition-all">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-mono font-bold text-slate-400">Submitted: {pr.dateSubmitted}</span>
                        
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${
                          pr.status === 'Answered' ? 'bg-emerald-50 text-emerald-700' :
                          pr.status === 'Ongoing' ? 'bg-indigo-50 text-indigo-700' : 'bg-blue-50 text-blue-700'
                        }`}>
                          <Clock className="w-3.5 h-3.5 animate-spin-slow" />
                          {pr.status}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-800 leading-relaxed font-sans">{pr.request}</p>
                      <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-1.5 p-2 bg-white border border-slate-100 rounded-xl">
                        <Check className="w-3.5 h-3.5" />
                        <span>Prayer intercessor updated status to: <strong>{pr.status}</strong>. Currently lifting you up.</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: PERSONAL SETTINGS & UPDATES */}
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Editable Profile Information Form */}
            <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-xs p-6 space-y-4">
              <div className="border-b border-gray-50 pb-3">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                  <Edit className="w-4 h-4 text-blue-600" />
                  Mutable Profile Parameters
                </h3>
                <p className="text-xs text-slate-400 mt-1">Keep contact info updated so pastors and care volunteers can reach you successfully.</p>
              </div>

              {profileSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span className="font-semibold">{profileSuccess}</span>
                </div>
              )}

              {profileError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="font-semibold">{profileError}</span>
                </div>
              )}

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="editPhone" className="block text-xs font-bold text-gray-400 uppercase tracking-widest">
                      Active Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <input
                        id="editPhone"
                        type="text"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="editEmail" className="block text-xs font-bold text-gray-400 uppercase tracking-widest">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <input
                        id="editEmail"
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label htmlFor="editResidence" className="block text-xs font-bold text-gray-400 uppercase tracking-widest">
                      Physical Residence / Hostel Address
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <input
                        id="editResidence"
                        type="text"
                        value={editResidence}
                        onChange={(e) => setEditResidence(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label htmlFor="editPicture" className="block text-xs font-bold text-gray-400 uppercase tracking-widest">
                      Profile Picture Image URL
                    </label>
                    <div className="relative">
                      <Compass className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <input
                        id="editPicture"
                        type="text"
                        value={editPicture}
                        onChange={(e) => setEditPicture(e.target.value)}
                        placeholder="https://example.com/avatar.jpg"
                        className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-50">
                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isSavingProfile ? 'Saving updates...' : 'Save Profile Changes'}
                  </button>
                </div>
              </form>
            </div>

            {/* Read-only Information Card */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-xs p-6 space-y-4">
              <div className="border-b border-gray-50 pb-3">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                  Locked Fellowship Fields
                </h3>
                <p className="text-xs text-slate-400 mt-1">These parameters are governed strictly by the church database registers.</p>
              </div>

              <div className="space-y-3">
                <div className="p-3 bg-slate-50 rounded-xl space-y-0.5">
                  <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest">Member ID Code</span>
                  <span className="block text-xs font-mono font-bold text-indigo-700">{member.id}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl space-y-0.5">
                  <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest">Date Joined Registry</span>
                  <span className="block text-xs font-bold text-slate-700">{member.dateJoined}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl space-y-0.5">
                  <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest">Assigned MAP Cell</span>
                  <span className="block text-xs font-bold text-slate-700">{member.mapName || 'Pending Assignment'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl space-y-0.5">
                  <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest">Leadership Care Notes</span>
                  <p className="block text-xs italic text-slate-500 font-medium">"Restricted. Contact administrative leader if coordinates change."</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: UPCOMING EVENTS */}
        {activeTab === 'events' && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-xs p-6 space-y-6">
            <div className="border-b border-gray-50 pb-3">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-blue-600" />
                Church Programs & Activities
              </h3>
              <p className="text-xs text-slate-400 mt-1">Participating in the local life of Celebration Church International ensures constant growth in Christ.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {events.map((ev) => (
                <div key={ev.id} className="p-5 bg-slate-50/70 border border-slate-100 hover:border-blue-150 rounded-2xl relative overflow-hidden transition-all flex flex-col justify-between h-40">
                  <div>
                    <div className="flex justify-between items-start">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        ev.category === 'program' ? 'bg-blue-100 text-blue-700' :
                        ev.category === 'meeting' ? 'bg-purple-100 text-purple-700' : 'bg-rose-100 text-rose-700'
                      }`}>
                        {ev.category}
                      </span>
                      <span className="text-xs text-slate-400 font-mono font-bold">{ev.date}</span>
                    </div>
                    <h4 className="text-base font-bold text-slate-800 tracking-tight mt-2.5 leading-snug">{ev.title}</h4>
                    <p className="text-xs text-slate-500 font-medium mt-1">🕒 {ev.time}</p>
                  </div>

                  <div className="text-xs font-bold text-slate-400 mt-3 flex items-center gap-1 truncate border-t border-slate-200/50 pt-2 pb-0.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span className="truncate">{ev.location}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

      {/* Footer Care Credits */}
      <footer className="bg-slate-900 border-t border-slate-800 py-6 text-center text-slate-550 text-xs">
        <p className="font-semibold text-slate-400">Celebration Church International • Secure Portal Access</p>
        <p className="text-[10px] text-slate-600 mt-1">All database registers are isolated for tenant privacy protection.</p>
      </footer>
    </div>
  );
}
