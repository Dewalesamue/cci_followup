import React, { useState } from 'react';
import { AppSettings } from '../../types';
import { settingsService } from '../../services/settingsService';
import { Settings, Save, Sparkles, Sliders, ShieldCheck, RefreshCw } from 'lucide-react';

interface SettingsViewProps {
  settings: AppSettings;
  onSave: (updated: AppSettings) => void;
}

export default function SettingsView({ settings, onSave }: SettingsViewProps) {
  const [formData, setFormData] = useState<AppSettings>({
    mapName: settings.mapName,
    churchName: settings.churchName,
    themeColor: settings.themeColor,
    logoName: settings.logoName
  });

  const [isSaved, setIsSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      settingsService.saveSettings(formData);
      onSave(formData);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  // Preset Colors for testing color maps
  const colorPresets = [
    { name: 'Classic Church Blue', value: '#2563eb' },
    { name: 'Eco Emerald Green', value: '#10b981' },
    { name: 'Royal Indigo', value: '#4f46e5' },
    { name: 'Sunset Amber', value: '#f59e0b' },
    { name: 'Deep Crimson', value: '#dc2626' }
  ];

  return (
    <div className="space-y-6 max-w-2xl mx-auto animate-fade-in font-sans">
      {/* Heading */}
      <div>
        <h1 className="text-2xl font-bold text-slate-150 tracking-tight font-sans">Platform Preferences Configuration</h1>
        <p className="text-xs text-gray-500 font-medium">Fine-tune church titles, default small grouping map identifiers, and theme behaviors.</p>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-xs">
        <div className="border-b border-gray-100 pb-4 mb-5 flex items-center space-x-2">
          <Sliders className="w-5 h-5 text-gray-400 font-mono" />
          <h3 className="text-sm font-bold text-slate-900">Customizable Options Registry</h3>
        </div>

        {isSaved && (
          <div className="p-4 bg-emerald-50 text-emerald-800 rounded-2xl border border-emerald-100 flex items-center space-x-2.5 text-xs font-semibold mb-5 animate-fade-in">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>Success! Platform preferences have been saved and applied system-wide.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Logo Name & MAP small group name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="set-logoName" className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 font-mono">Platform Branding Label</label>
              <input
                id="set-logoName"
                type="text"
                value={formData.logoName}
                onChange={(e) => setFormData(prev => ({ ...prev, logoName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-150 rounded-xl text-xs font-semibold text-gray-800 bg-white"
                required
              />
            </div>

            <div>
              <label htmlFor="set-mapName" className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 font-mono">Primary MAP Identify</label>
              <input
                id="set-mapName"
                type="text"
                value={formData.mapName}
                onChange={(e) => setFormData(prev => ({ ...prev, mapName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-150 rounded-xl text-xs font-semibold text-gray-800 bg-white"
                required
              />
            </div>
          </div>

          {/* Church assembly Name */}
          <div>
            <label htmlFor="set-churchName" className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 font-mono">Corporate Church Assembly Name</label>
            <input
              id="set-churchName"
              type="text"
              value={formData.churchName}
              onChange={(e) => setFormData(prev => ({ ...prev, churchName: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-150 rounded-xl text-xs font-semibold text-gray-800 bg-white"
              required
            />
          </div>

          {/* Theme choices */}
          <div className="space-y-3.5 pt-2">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest leading-none font-mono">Platform Color Styling</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {colorPresets.map((col, index) => (
                <div
                  key={index}
                  onClick={() => setFormData(prev => ({ ...prev, themeColor: col.value }))}
                  className={`p-3 rounded-2xl border text-xs font-bold flex items-center space-x-2.5 cursor-pointer hover:border-gray-300 transition-all ${
                    formData.themeColor === col.value
                      ? 'border-blue-500 bg-blue-50/10 text-slate-900 ring-2 ring-blue-500/20'
                      : 'border-gray-100 text-slate-500'
                  }`}
                >
                  <span className="w-5 h-5 rounded-full border border-gray-200 shrink-0" style={{ backgroundColor: col.value }} />
                  <span className="truncate">{col.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Save trigger button */}
          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <button
              type="submit"
              className="px-4.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl flex items-center shadow-md shadow-blue-500/10 cursor-pointer transition-all"
            >
              <Save className="w-4 h-4 mr-1.5 animate-none shrink-0" />
              Apply Platform Changes
            </button>
          </div>
        </form>
      </div>

      {/* Supabase details layout panel */}
      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-start space-x-3 text-xs text-gray-650 leading-relaxed font-sans">
        <RefreshCw className="w-5 h-5 text-gray-450 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-gray-850">Swap Mock-Data layer with Supabase Database</p>
          <p className="text-gray-500 leading-normal mt-1">
            Setting up live Cloud persistence is supported. You can configure of your Supabase URL & keys in the Environment, and replace our local services with supabase calls inside <code>/src/services/*</code> files.
          </p>
        </div>
      </div>

    </div>
  );
}
