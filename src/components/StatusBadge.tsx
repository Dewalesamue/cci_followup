import React from 'react';

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  let bgClass = 'bg-gray-100 text-gray-800 border-gray-200';
  
  switch (status) {
    // Member statuses
    case 'Active':
      bgClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      break;
    case 'Inactive':
      bgClass = 'bg-rose-50 text-rose-700 border-rose-200';
      break;

    // Visitor statuses
    case 'Pending':
      bgClass = 'bg-amber-50 text-amber-700 border-amber-200';
      break;
    case 'Contacted':
      bgClass = 'bg-blue-50 text-blue-700 border-blue-200';
      break;
    case 'Integrated':
      bgClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      break;

    // Prayer request statuses
    case 'Praying':
      bgClass = 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100';
      break;
    case 'Answered':
      bgClass = 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200';
      break;
    case 'Ongoing':
      bgClass = 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100';
      break;

    // Follow up statuses
    case 'Needs Follow Up':
      bgClass = 'bg-rose-50 text-rose-700 border-rose-200';
      break;
    case 'Visited':
      bgClass = 'bg-indigo-50 text-indigo-700 border-indigo-200';
      break;
    case 'Restored':
      bgClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      break;

    default:
      break;
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${bgClass}`}>
      <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-current"></span>
      {status}
    </span>
  );
}
