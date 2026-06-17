import { AppSettings } from '../types';
import { authService } from './authService';

const STORAGE_KEY_PREFIX = 'futamap_settings_';

const getDefaultSettingsForChurch = (churchId: string): AppSettings => {
  const dynamicChurch = authService.getChurchById(churchId);
  if (dynamicChurch) {
    return {
      mapName: dynamicChurch.mapName,
      churchName: dynamicChurch.name,
      themeColor: churchId === 'rccg' ? "#16a34a" : churchId === 'winners' ? "#dc2626" : "#2563eb",
      logoName: dynamicChurch.logoName
    };
  }

  if (churchId === 'rccg') {
    return {
      mapName: "RCCG Area",
      churchName: "Redeemed Christian Church of God",
      themeColor: "#16a34a", // Emerald for RCCG
      logoName: "RCCG Admin"
    };
  } else if (churchId === 'winners') {
    return {
      mapName: "Winners Cell",
      churchName: "Winners Chapel International",
      themeColor: "#dc2626", // Red for Winners Chapel
      logoName: "Winners Admin"
    };
  } else {
    // Default Celebration Church International
    return {
      mapName: "Celebration Group",
      churchName: "Celebration Church International",
      themeColor: "#2563eb", // Blue for CCI
      logoName: "CCI Follow Up"
    };
  }
};

export const settingsService = {
  getSettings(chosenChurchId?: string): AppSettings {
    const activeChurchId = chosenChurchId || authService.getCurrentSession()?.churchId || 'futamap';
    const key = `${STORAGE_KEY_PREFIX}${activeChurchId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Migrate "FUTA Chaplaincy Fellowship" default or "FUTAMAP Follow Up" display logo to Celebration Church International
        if (parsed.churchName === "FUTA Chaplaincy Fellowship" || parsed.logoName === "FUTAMAP Follow Up") {
          const updated = getDefaultSettingsForChurch(activeChurchId);
          localStorage.setItem(key, JSON.stringify(updated));
          return updated;
        }
        return parsed;
      } catch (e) {
        console.error("Error parsing settings", e);
      }
    }
    return getDefaultSettingsForChurch(activeChurchId);
  },

  saveSettings(settings: AppSettings, chosenChurchId?: string): AppSettings {
    const activeChurchId = chosenChurchId || authService.getCurrentSession()?.churchId || 'futamap';
    const key = `${STORAGE_KEY_PREFIX}${activeChurchId}`;
    localStorage.setItem(key, JSON.stringify(settings));
    return settings;
  }
};
