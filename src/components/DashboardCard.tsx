import React from 'react';

interface DashboardCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
  iconBgColor?: string;
  onClick?: () => void;
}

export default function DashboardCard({
  title,
  value,
  description,
  icon,
  iconBgColor = "bg-blue-50 text-blue-600",
  onClick
}: DashboardCardProps) {
  return (
    <div 
      onClick={onClick}
      className={`bg-white p-6 rounded-2xl border border-gray-100 shadow-xs hover:shadow-md transition-all duration-300 flex items-center justify-between ${
        onClick ? 'cursor-pointer transform hover:-translate-y-1' : ''
      }`}
    >
      <div className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 font-sans">
          {title}
        </span>
        <div className="text-3xl font-bold text-gray-900 tracking-tight font-sans">
          {value}
        </div>
        <p className="text-xs text-gray-400 font-medium">
          {description}
        </p>
      </div>
      <div className={`p-4 rounded-xl ${iconBgColor} shrink-0`}>
        {icon}
      </div>
    </div>
  );
}
