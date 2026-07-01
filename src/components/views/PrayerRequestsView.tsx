import React, { useState, useMemo } from 'react';
import { PrayerRequest } from '../../types';
import { prayerService } from '../../services/prayerService';
import SearchBar from '../SearchBar';
import StatusBadge from '../StatusBadge';
import EmptyState from '../EmptyState';
import { 
  HeartHandshake, 
  Search, 
  Calendar, 
  Phone, 
  CheckCircle, 
  Clock, 
  HelpCircle,
  Sparkles,
  Check,
  RotateCcw
} from 'lucide-react';

interface PrayerRequestsViewProps {
  prayerRequests: PrayerRequest[];
  onUpdatePrayerRequests: () => void; // Trigger state refresh in parent App
}

export default function PrayerRequestsView({
  prayerRequests,
  onUpdatePrayerRequests
}: PrayerRequestsViewProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Praying' | 'Ongoing' | 'Answered'>('All');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  // Filter list
  const filteredRequests = useMemo(() => {
    return prayerRequests.filter(item => {
      const matchesSearch = 
        item.fullName.toLowerCase().includes(search.toLowerCase()) ||
        item.request.toLowerCase().includes(search.toLowerCase()) ||
        (item.phoneNumber && item.phoneNumber.includes(search));
      
      const matchesStatus = statusFilter === 'All' || item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [prayerRequests, search, statusFilter]);

  // Active Selected Request
  const activeRequest = useMemo(() => {
    if (!selectedRequestId) return null;
    return prayerRequests.find(r => r.id === selectedRequestId) || null;
  }, [prayerRequests, selectedRequestId]);

  const handleStatusUpdate = async (status: PrayerRequest['status']) => {
    if (!activeRequest) return;
    try {
      await prayerService.updatePrayerRequestStatus(activeRequest.id, status);
      onUpdatePrayerRequests();
    } catch (err) {
      console.error('Error updating prayer request status:', err);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-150/70 shadow-xs">
        <div>
          <div className="flex items-center space-x-2 text-blue-600 mb-1.5">
            <HeartHandshake className="w-5 h-5 shrink-0" />
            <span className="text-xs font-bold uppercase tracking-widest font-mono">MAP Intercession Desk</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Prayer Requests Hub</h1>
          <p className="text-xs sm:text-sm text-gray-500 font-medium mt-0.5">
            Manage, intercede, and track corporate and personal prayer petitions.
          </p>
        </div>
        
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-4 py-2.5 rounded-2xl shrink-0">
          <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
          <span className="text-xs font-bold text-slate-700 font-mono">
            Active Petitions: {prayerRequests.filter(p => p.status !== 'Answered').length}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Search & List */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-gray-150/70 shadow-xs space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, request details, or phone number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50/50 border border-slate-200 rounded-2xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 font-medium text-gray-800 placeholder:text-gray-400"
              />
            </div>

            {/* Status Filter Tabs */}
            <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-2xl text-xs font-bold">
              {(['All', 'Praying', 'Ongoing', 'Answered'] as const).map((tab) => {
                const count = tab === 'All' 
                  ? prayerRequests.length 
                  : prayerRequests.filter(r => r.status === tab).length;
                return (
                  <button
                    key={tab}
                    onClick={() => setStatusFilter(tab)}
                    className={`flex-1 min-w-[70px] text-center py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                      statusFilter === tab 
                        ? 'bg-white text-blue-600 shadow-2xs font-bold' 
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    {tab} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Requests Grid List */}
          {filteredRequests.length === 0 ? (
            <div className="bg-white p-8 rounded-3xl border border-gray-150/70 shadow-xs text-center">
              <EmptyState
                title="No Prayer Petitions Found"
                description={
                  search || statusFilter !== 'All'
                    ? "Adjust your search parameters or filter options to see matching results."
                    : "No prayer petitions logged in the system yet."
                }
              />
            </div>
          ) : (
            <div className="space-y-3.5 max-h-[550px] overflow-y-auto pr-1">
              {filteredRequests.map((req) => {
                const isSelected = selectedRequestId === req.id;
                return (
                  <div
                    key={req.id}
                    onClick={() => setSelectedRequestId(req.id)}
                    className={`p-4 sm:p-5 bg-white border rounded-3xl cursor-pointer transition-all duration-250 flex flex-col justify-between gap-3 ${
                      isSelected
                        ? 'border-blue-500 shadow-md ring-2 ring-blue-500/5'
                        : 'border-gray-150/75 hover:border-gray-300 hover:shadow-xs shadow-2xs'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h4 className="text-sm font-bold text-gray-900 leading-snug">{req.fullName}</h4>
                        <div className="flex items-center text-[10px] text-gray-400 font-mono font-bold mt-1 gap-2">
                          <Calendar className="w-3 h-3 text-gray-300 shrink-0" />
                          <span>{req.dateSubmitted}</span>
                          <span className="text-gray-250">•</span>
                          <span>{req.phoneNumber}</span>
                        </div>
                      </div>
                      <StatusBadge status={req.status} />
                    </div>

                    <p className="text-xs text-gray-650 leading-relaxed font-sans line-clamp-2 italic bg-slate-50/50 p-3 rounded-2xl border border-slate-100/50">
                      "{req.request}"
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Detail & Action Panel */}
        <div className="lg:col-span-5">
          {activeRequest ? (
            <div className="bg-white rounded-3xl border border-gray-150/70 shadow-xs p-6 space-y-6 sticky top-20 animate-fade-in">
              {/* Header Details */}
              <div className="border-b border-gray-100 pb-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full uppercase tracking-wider font-mono shadow-3xs">
                    Petition Details
                  </span>
                  <StatusBadge status={activeRequest.status} />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-gray-900 mt-3">{activeRequest.fullName}</h3>
                <p className="text-xs text-gray-400 font-mono mt-1 font-bold">{activeRequest.phoneNumber}</p>
              </div>

              {/* Main Prayer Text Box */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest font-mono">Prayer Petition Details</h4>
                <div className="bg-amber-50/20 border border-amber-100/50 p-4 rounded-2xl italic text-xs sm:text-sm text-gray-800 leading-relaxed">
                  "{activeRequest.request}"
                </div>
              </div>

              {/* Status Update Quick Desk */}
              <div className="space-y-3.5 pt-2 border-t border-gray-50">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest font-mono">Update Intercessory Status</h4>
                <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold">
                  <button
                    onClick={() => handleStatusUpdate('Praying')}
                    className={`py-2 px-1 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      activeRequest.status === 'Praying'
                        ? 'bg-blue-50 text-blue-700 border-blue-200 ring-2 ring-blue-500/5'
                        : 'border-gray-200 hover:bg-slate-50 text-gray-650'
                    }`}
                  >
                    <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Praying</span>
                  </button>
                  <button
                    onClick={() => handleStatusUpdate('Ongoing')}
                    className={`py-2 px-1 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      activeRequest.status === 'Ongoing'
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200 ring-2 ring-indigo-500/5'
                        : 'border-gray-200 hover:bg-slate-50 text-gray-650'
                    }`}
                  >
                    <RotateCcw className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>Ongoing</span>
                  </button>
                  <button
                    onClick={() => handleStatusUpdate('Answered')}
                    className={`py-2 px-1 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      activeRequest.status === 'Answered'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-2 ring-emerald-500/5'
                        : 'border-gray-200 hover:bg-slate-50 text-gray-650'
                    }`}
                  >
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Answered</span>
                  </button>
                </div>
              </div>

              {/* Quick Communication Trigger */}
              <div className="space-y-3 pt-4 border-t border-gray-50">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest font-mono">Outreach Actions</h4>
                <div className="flex gap-2.5">
                  <a
                    href={`tel:${activeRequest.phoneNumber}`}
                    className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-gray-150 transition-colors"
                  >
                    <Phone className="w-4 h-4 mr-1.5 text-slate-500" />
                    Call Petitioner
                  </a>
                  <a
                    href={`https://wa.me/${activeRequest.phoneNumber.replace(/[^0-9]/g, '').replace(/^0/, '234')}?text=${encodeURIComponent(`Hello ${activeRequest.fullName}, we are standing in prayer with you regarding your petition.`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-150 transition-colors"
                  >
                    <Check className="w-4 h-4 mr-1.5 text-emerald-600" />
                    WhatsApp Stand
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-gray-150/70 shadow-xs p-8 text-center text-gray-400 sticky top-20">
              <div className="p-4 bg-slate-50 rounded-full w-14 h-14 flex items-center justify-center mx-auto text-slate-350 border border-slate-100">
                <HeartHandshake className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-gray-700 mt-4">Select a Prayer Petition</h3>
              <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
                Click any card in the list on the left to see full details, update status, and manage the petition.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
