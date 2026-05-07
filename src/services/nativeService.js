import { registerPlugin } from '@capacitor/core';

const BackgroundService = registerPlugin('BackgroundService');

export const nativeService = {
  async startBackgroundService() {
    try {
      console.log('[NativeService] Starting background service');
      return await BackgroundService.startService();
    } catch (e) {
      console.error('Failed to start background service', e);
    }
  },

  async stopBackgroundService() {
    try {
      console.log('[NativeService] Stopping background service');
      return await BackgroundService.stopService();
    } catch (e) {
      console.error('Failed to stop background service', e);
    }
  },

  async getBackgroundServiceStatus() {
    try {
      const { enabled } = await BackgroundService.getStatus();
      return enabled;
    } catch (e) {
      console.warn('BackgroundService plugin not found or failed', e);
      return true; // Default to true if plugin fails
    }
  }
};
