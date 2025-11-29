import { WorkoutDefinition, WorkoutId } from '@/types';
import { FULL_HYROX_STATIONS, HALF_HYROX_STATIONS, DEKA_STRONG_STATIONS, DEKA_HALF_STATIONS } from './hyroxStations';
import { PRODUCT_IDS } from './iap';

export const WORKOUTS: WorkoutDefinition[] = [
  {
    id: 'hyrox_full',
    title: 'Full Hyrox',
    subtitle: 'Official Competition Format',
    description: 'Test your limits with the complete race experience',
    category: 'official',
    hyroxType: 'full',
    stations: FULL_HYROX_STATIONS,
    requiresPurchase: true,
    hasFreeTrial: true,
    priceText: '$7.99',
    iapProductId: PRODUCT_IDS.HYROX_FULL,
  },
  {
    id: 'hyrox_half',
    title: 'Half Hyrox',
    subtitle: 'Training & Preparation',
    description: 'Build your fitness with a scaled simulation',
    category: 'official',
    hyroxType: 'half',
    stations: HALF_HYROX_STATIONS,
    requiresPurchase: true,
    hasFreeTrial: true,
    priceText: '$7.99',
    iapProductId: PRODUCT_IDS.HYROX_FULL, // Same pack as full
  },
  {
    id: 'frank_tank',
    title: 'Frank the Tank',
    subtitle: 'Extreme Military Workout',
    description: 'Pull-ups, sled work, and brutal cardio intervals',
    category: 'custom',
    hyroxType: 'frank',
    stations: [], // Will be defined when implementing frank workout
    requiresPurchase: true,
    hasFreeTrial: false,
    priceText: '$4.99',
    iapProductId: PRODUCT_IDS.FRANK_TANK,
  },
  {
    id: 'deka_strong',
    title: 'DEKA Strong',
    subtitle: 'Full 10 Zones',
    description: '10 functional zones with 500m rows. Test your all-around fitness!',
    category: 'deka',
    hyroxType: 'deka',
    stations: DEKA_STRONG_STATIONS,
    requiresPurchase: true,
    hasFreeTrial: true,
    priceText: '$7.99',
    iapProductId: PRODUCT_IDS.HYROX_FULL, // Same pack as Hyrox
  },
  {
    id: 'deka_half',
    title: 'DEKA Half',
    subtitle: 'First 5 Zones',
    description: 'Scaled DEKA with 5 zones. Perfect for training!',
    category: 'deka',
    hyroxType: 'deka_half',
    stations: DEKA_HALF_STATIONS,
    requiresPurchase: true,
    hasFreeTrial: true,
    priceText: '$7.99',
    iapProductId: PRODUCT_IDS.HYROX_FULL, // Same pack as Hyrox
  },
  {
    id: 'circuit_hiit',
    title: 'Hyrox HIIT',
    subtitle: '50/10 Intervals',
    description: '3 blocks of 10-min intervals. 50s work, 10s rest.',
    category: 'custom',
    hyroxType: 'circuit',
    stations: [], // Circuit exercises defined in hyroxStations.ts
    requiresPurchase: false,
    hasFreeTrial: false,
    priceText: 'FREE',
  },
  {
    id: 'kettlebell_secret',
    title: 'Secret Workout',
    subtitle: 'Exclusive Achievement Challenge',
    description: 'Brutal kettlebell stations. You earned this!',
    category: 'custom',
    hyroxType: 'secret',
    stations: [], // Defined in hyroxStations.ts
    requiresPurchase: false,
    hasFreeTrial: false,
    priceText: 'FREE',
  },
];

export function getWorkoutById(id: WorkoutId): WorkoutDefinition | undefined {
  return WORKOUTS.find((w) => w.id === id);
}
