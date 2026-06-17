import React from 'react';
import { HelpCircle } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actionButton?: React.ReactNode;
}

export default function EmptyState({ title, description, icon, actionButton }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-white rounded-2xl border border-gray-100 shadow-xs max-w-lg mx-auto my-12">
      <div className="p-4 bg-blue-50/55 text-blue-600 rounded-full mb-4">
        {icon || <HelpCircle className="w-8 h-8" />}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 mb-6 max-w-sm">{description}</p>
      {actionButton}
    </div>
  );
}
