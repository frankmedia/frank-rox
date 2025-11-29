// Haptics bridge for Capacitor
// This file is aliased in vite.config.ts to handle Capacitor haptics

import { Capacitor } from '@capacitor/core';

let Haptics: any;

if (Capacitor.isNativePlatform()) {
  import('@capacitor/haptics').then((module) => {
    Haptics = module.Haptics;
  });
}

export const HapticsImpactStyle = {
  Heavy: 'HEAVY',
  Medium: 'MEDIUM',
  Light: 'LIGHT',
};

export const hapticImpact = async (style = HapticsImpactStyle.Medium) => {
  if (Haptics && Capacitor.isNativePlatform()) {
    try {
      await Haptics.impact({ style });
    } catch (e) {
      console.warn('Haptics not available');
    }
  }
};

export const hapticVibrate = async () => {
  if (Haptics && Capacitor.isNativePlatform()) {
    try {
      await Haptics.vibrate();
    } catch (e) {
      console.warn('Haptics not available');
    }
  }
};






