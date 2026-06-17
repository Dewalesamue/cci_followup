import React, { useState, useMemo } from 'react';
import { Member } from '../../types';
import MemberTable from '../MemberTable';
import SearchBar from '../SearchBar';
import { Filter, UserPlus, UserCheck, ShieldAlert } from 'lucide-react';

interface MembersViewProps {
  members: Member[];
  onSelectMember: (memberId: string) => void;
  onNavigateToRegister: () => void;
}

export default function MembersView({
  members,
  onSelectMember,
  onNavigateToRegister
}: MembersViewProps) {
  // Filters State
  const [search, setSearch] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('All');
  const [selectedDepartment, setSelectedDepartment] = useState('All');

  // List of levels and departments dynamically
  const levelsList = useMemo(() => {
    const list = new Set(members.map(m => m.level));
    return ['All', ...Array.from(list)];
  }, [members]);

  const departmentsList = useMemo(() => {
    const list = new Set(members.map(m => m.department));
    return ['All', ...Array.from(list)];
  }, [members]);

  // Filtered members
  const filteredMembers = useMemo(() => {
    return members.filter(member => {
      const matchesSearch = member.fullName.toLowerCase().includes(search.toLowerCase()) || 
                            member.phoneNumber.includes(search) || 
                            (member.email && member.email.toLowerCase().includes(search.toLowerCase()));
      
      const matchesLevel = selectedLevel === 'All' || member.level === selectedLevel;
      const matchesDept = selectedDepartment === 'All' || member.department === selectedDepartment;

      return matchesSearch && matchesLevel && matchesDept;
    });
  }, [members, search, selectedLevel, selectedDepartment]);

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Heading */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-950 font-sans tracking-tight">MAP Member Registry</h1>
          <p className="text-xs text-gray-500 font-medium">Query, filter, and review profiles of everyone in {members[0]?.mapName || 'the church'}.</p>
        </div>
        <button
          onClick={onNavigateToRegister}
          className="flex items-center text-xs font-semibold px-4.5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-sm shadow-blue-500/10 cursor-pointer text-center"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Register New Member
        </button>
      </div>

      {/* Filter and Search Bar Row */}
      <div className="bg-white p-4.5 rounded-2xl border border-gray-100 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search */}
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by name, phone, or email..."
        />

        {/* Filters Selectors */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="text-xs font-semibold text-gray-500 font-mono">Level:</span>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="block w-full sm:w-36 px-2.5 py-1.5 border border-gray-150 rounded-lg text-xs font-semibold bg-white focus:outline-hidden text-gray-700"
            >
              {levelsList.map(level => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="text-xs font-semibold text-gray-500 font-mono">Dept:</span>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="block w-full sm:w-44 px-2.5 py-1.5 border border-gray-150 rounded-lg text-xs font-semibold bg-white focus:outline-hidden text-gray-700 whitespace-nowrap"
            >
              {departmentsList.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table Element */}
      <MemberTable 
        members={filteredMembers} 
        onSelectMember={onSelectMember} 
      />

      {/* Summary indicators */}
      <div className="flex items-center space-x-2.5 text-xs text-slate-500 justify-end pt-1 font-mono">
        <span>Records count:</span>
        <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
          {filteredMembers.length} displayed
        </span>
      </div>
    </div>
  );
}
