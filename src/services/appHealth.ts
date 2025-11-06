import { registerPlugin } from '@capacitor/core';

export interface AppHealthPlugin {
  isAvailable(): Promise<{
    available: boolean;
    platform: 'android' | 'ios';
    status?: string;
  }>;

  requestHealthPermissions(): Promise<{
    granted: boolean;
  }>;

  openHealthConnectSettings(): Promise<void>;

  getSteps(options: {
    start: string;
    end: string;
  }): Promise<{
    total: number;
    platform: 'android' | 'ios';
  }>;

  getHeartRate(options: {
    start: string;
    end: string;
  }): Promise<{
    average: number;
    max: number;
    min: number;
    samples: number;
    platform: 'android' | 'ios';
  }>;

  getDistance(options: {
    start: string;
    end: string;
  }): Promise<{
    kilometers: number;
    meters: number;
    platform: 'android' | 'ios';
  }>;

  getCalories(options: {
    start: string;
    end: string;
  }): Promise<{
    calories: number;
    platform: 'android' | 'ios';
  }>;

  getSleep(options: {
    start: string;
    end: string;
  }): Promise<{
    hours: number;
    minutes: number;
    inBedHours: number;
    inBedMinutes: number;
    efficiency: number;
    sleepScore: number;
    stages: {
      awakeMinutes: number;
      lightMinutes: number;
      deepMinutes: number;
      remMinutes: number;
      outOfBedMinutes: number;
    };
    platform: 'android' | 'ios';
  }>;
}

const plugin = registerPlugin<AppHealthPlugin>('AppHealth', {
  web: () => ({
    isAvailable: async () => {
      console.log('[AppHealth Web] isAvailable called - returning false');
      return { available: false, platform: 'android' as const };
    },
    requestHealthPermissions: async () => {
      console.log('[AppHealth Web] requestHealthPermissions called');
      return { granted: false };
    },
    openHealthConnectSettings: async () => {
      console.log('[AppHealth Web] openHealthConnectSettings called');
    },
    getSteps: async () => {
      console.log('[AppHealth Web] getSteps called');
      return { total: 0, platform: 'android' as const };
    },
    getHeartRate: async () => {
      console.log('[AppHealth Web] getHeartRate called');
      return { average: 0, max: 0, min: 0, samples: 0, platform: 'android' as const };
    },
    getDistance: async () => {
      console.log('[AppHealth Web] getDistance called');
      return { kilometers: 0, meters: 0, platform: 'android' as const };
    },
    getCalories: async () => {
      console.log('[AppHealth Web] getCalories called');
      return { calories: 0, platform: 'android' as const };
    },
    getSleep: async () => {
      console.log('[AppHealth Web] getSleep called');
      return {
        hours: 0,
        minutes: 0,
        inBedHours: 0,
        inBedMinutes: 0,
        efficiency: 0,
        sleepScore: 0,
        stages: {
          awakeMinutes: 0,
          lightMinutes: 0,
          deepMinutes: 0,
          remMinutes: 0,
          outOfBedMinutes: 0,
        },
        platform: 'android' as const,
      };
    },
  }),
});

console.log('[AppHealth] Plugin registered:', plugin);

export const AppHealth = plugin;

