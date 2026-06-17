import React from 'react';

export default function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center p-12">
      <div className="relative">
        <div className="w-10 h-10 border-4 border-blue-100 rounded-full"></div>
        <div className="absolute top-0 left-0 w-10 h-10 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
      </div>
      <p className="mt-4 text-xs font-medium text-gray-500 font-sans">Syncing care directory...</p>
    </div>
  );
}
