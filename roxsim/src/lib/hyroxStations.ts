import { HyroxStation, HyroxType } from '@/types';

export const FULL_HYROX_STATIONS: HyroxStation[] = [
  { id: 1, name: 'Run 1km', type: 'run', distance: 1000, instructions: 'Start strong, find your pace' },
  { id: 2, name: 'SkiErg', type: 'station', distance: 1000, instructions: '1000m on the SkiErg' },
  { id: 3, name: 'Run 1km', type: 'run', distance: 1000, instructions: 'Maintain steady pace' },
  { id: 4, name: 'Sled Push', type: 'station', distance: 50, equipment: 'Sled', instructions: '50m Sled Push' },
  { id: 5, name: 'Run 1km', type: 'run', distance: 1000, instructions: 'Keep pushing through' },
  { id: 6, name: 'Sled Pull', type: 'station', distance: 50, equipment: 'Sled', instructions: '50m Sled Pull' },
  { id: 7, name: 'Run 1km', type: 'run', distance: 1000, instructions: 'Halfway there!' },
  { id: 8, name: 'Burpee Broad Jumps', type: 'station', distance: 80, instructions: '80m Burpee Broad Jumps' },
  { id: 9, name: 'Run 1km', type: 'run', distance: 1000, instructions: 'Stay focused' },
  { id: 10, name: 'Rowing', type: 'station', distance: 1000, instructions: '1000m Row' },
  { id: 11, name: 'Run 1km', type: 'run', distance: 1000, instructions: 'Push through the fatigue' },
  { id: 12, name: 'Farmers Carry', type: 'station', distance: 200, equipment: 'Kettlebells', instructions: '200m Farmers Carry' },
  { id: 13, name: 'Run 1km', type: 'run', distance: 1000, instructions: 'Almost there!' },
  { id: 14, name: 'Sandbag Lunges', type: 'station', distance: 100, equipment: 'Sandbag', instructions: '100m Sandbag Lunges' },
  { id: 15, name: 'Run 1km', type: 'run', distance: 1000, instructions: 'Final run - give it everything!' },
  { id: 16, name: 'Wall Balls', type: 'station', reps: 100, equipment: 'Medicine Ball', instructions: '100 Wall Balls' },
];

export const HALF_HYROX_STATIONS: HyroxStation[] = [
  { id: 1, name: 'Run 500m', type: 'run', distance: 500, instructions: 'Start strong, find your pace' },
  { id: 2, name: 'SkiErg', type: 'station', distance: 500, instructions: '500m on the SkiErg' },
  { id: 3, name: 'Run 500m', type: 'run', distance: 500, instructions: 'Maintain steady pace' },
  { id: 4, name: 'Sled Push', type: 'station', distance: 25, equipment: 'Sled', instructions: '25m Sled Push' },
  { id: 5, name: 'Run 500m', type: 'run', distance: 500, instructions: 'Keep pushing through' },
  { id: 6, name: 'Sled Pull', type: 'station', distance: 25, equipment: 'Sled', instructions: '25m Sled Pull' },
  { id: 7, name: 'Run 500m', type: 'run', distance: 500, instructions: 'Halfway there!' },
  { id: 8, name: 'Burpee Broad Jumps', type: 'station', distance: 40, instructions: '40m Burpee Broad Jumps' },
  { id: 9, name: 'Run 500m', type: 'run', distance: 500, instructions: 'Stay focused' },
  { id: 10, name: 'Rowing', type: 'station', distance: 500, instructions: '500m Row' },
  { id: 11, name: 'Run 500m', type: 'run', distance: 500, instructions: 'Push through the fatigue' },
  { id: 12, name: 'Farmers Carry', type: 'station', distance: 100, equipment: 'Kettlebells', instructions: '100m Farmers Carry' },
  { id: 13, name: 'Run 500m', type: 'run', distance: 500, instructions: 'Almost there!' },
  { id: 14, name: 'Sandbag Lunges', type: 'station', distance: 50, equipment: 'Sandbag', instructions: '50m Sandbag Lunges' },
  { id: 15, name: 'Run 500m', type: 'run', distance: 500, instructions: 'Final run - give it everything!' },
  { id: 16, name: 'Wall Balls', type: 'station', reps: 50, equipment: 'Medicine Ball', instructions: '50 Wall Balls' },
];

export const FRANK_TANK_STATIONS: HyroxStation[] = [
  { id: 1, name: 'Run 1.25km', type: 'run', distance: 1250, instructions: 'Open strong but in control' },
  { id: 2, name: 'SkiErg Sprint', type: 'station', distance: 600, instructions: '600m hard effort on the SkiErg' },
  { id: 3, name: 'Kettlebell Swing Ladder', type: 'station', reps: 60, equipment: 'Kettlebells', instructions: '60 American swings, add weight every 20 reps' },
  { id: 4, name: 'Run 1.25km', type: 'run', distance: 1250, instructions: 'Settle into race pace' },
  { id: 5, name: 'Chest-to-Bar Pull-Ups', type: 'station', reps: 30, equipment: 'Rig', instructions: 'Crisp reps, break before failure' },
  { id: 6, name: 'Assault Bike Push', type: 'station', reps: 35, equipment: 'Assault Bike', instructions: '35 calories all-out' },
  { id: 7, name: 'Run 1.25km', type: 'run', distance: 1250, instructions: 'Hold cadence, focus on breathing' },
  { id: 8, name: 'Kettlebell Front Rack Lunges', type: 'station', distance: 50, equipment: 'Kettlebells', instructions: '50m walking lunges in front rack' },
  { id: 9, name: 'Burpee Box Step-Overs', type: 'station', reps: 30, equipment: 'Box', instructions: '30 burpee box step-overs, controlled pace' },
  { id: 10, name: 'Run 1.25km', type: 'run', distance: 1250, instructions: 'Final run – empty the tank' },
  { id: 11, name: 'Devil Press', type: 'station', reps: 30, equipment: 'Dumbbells', instructions: 'Smooth cycle speed, breathe' },
  { id: 12, name: 'Farmers Carry', type: 'station', distance: 200, equipment: 'Heavy Kettlebells', instructions: '200m grip challenge to finish' },
];

export const SECRET_KETTLEBELL_STATIONS: HyroxStation[] = [
  { id: 1, name: 'Run 800m', type: 'run', distance: 800, instructions: 'Start controlled - you\'ll need energy!' },
  { id: 2, name: 'Kettlebell Snatch', type: 'station', reps: 50, equipment: 'Kettlebell', instructions: '50 alternating KB snatches (25 per arm)' },
  { id: 3, name: 'Run 800m', type: 'run', distance: 800, instructions: 'Hold steady pace' },
  { id: 4, name: 'Kettlebell Clean & Press', type: 'station', reps: 40, equipment: 'Kettlebells', instructions: '40 double KB clean & press' },
  { id: 5, name: 'Run 800m', type: 'run', distance: 800, instructions: 'Dig deep' },
  { id: 6, name: 'Kettlebell Swing', type: 'station', reps: 100, equipment: 'Kettlebell', instructions: '100 American KB swings - unbroken if possible!' },
  { id: 7, name: 'Run 800m', type: 'run', distance: 800, instructions: 'Push through the burn' },
  { id: 8, name: 'Kettlebell Goblet Squat', type: 'station', reps: 50, equipment: 'Kettlebell', instructions: '50 goblet squats - full depth' },
  { id: 9, name: 'Run 800m', type: 'run', distance: 800, instructions: 'Final stretch!' },
  { id: 10, name: 'Kettlebell Turkish Get-Up', type: 'station', reps: 20, equipment: 'Kettlebell', instructions: '20 alternating TGUs (10 per side)' },
];

// Block 1: Bodyweight Conditioning (10 min)
export const CIRCUIT_BLOCK_1: HyroxStation[] = [
  { id: 1, name: 'Run in Place / High Knees', type: 'station', instructions: 'Cardio Engine - Keep knees high' },
  { id: 2, name: 'Air Squats', type: 'station', instructions: 'Legs / Mobility - Full depth' },
  { id: 3, name: 'Mountain Climbers', type: 'station', instructions: 'Core + Cardio - Fast pace' },
  { id: 4, name: 'Push-Ups', type: 'station', instructions: 'Upper Body Push - Chest to floor' },
  { id: 5, name: 'Alternating Reverse Lunges', type: 'station', instructions: 'Legs / Balance - Control the descent' },
  { id: 6, name: 'Burpees', type: 'station', instructions: 'Full Body Conditioning - Stay explosive' },
  { id: 7, name: 'Plank Shoulder Taps', type: 'station', instructions: 'Core / Stability - Minimize hip rotation' },
  { id: 8, name: 'Jumping Jacks', type: 'station', instructions: 'Cardio Recovery - Light and fast' },
  { id: 9, name: 'Sit-Ups', type: 'station', instructions: 'Core - Full range' },
  { id: 10, name: 'Squat Jumps', type: 'station', instructions: 'Legs / Explosive Finish - Land soft' },
];

// Rest period
export const CIRCUIT_REST_1: HyroxStation = { 
  id: 11, 
  name: '2 Min Rest', 
  type: 'station', 
  instructions: 'Grab your dumbbells. Shake out arms & legs. Get ready!' 
};

// Block 2: Dumbbell Functional Strength (10 min)
export const CIRCUIT_BLOCK_2: HyroxStation[] = [
  { id: 12, name: 'DB Thrusters', type: 'station', equipment: 'Dumbbells', instructions: 'Full Body Power - Squat to press' },
  { id: 13, name: 'DB Goblet Squats', type: 'station', equipment: 'Dumbbells', instructions: 'Legs / Quads - Deep squat' },
  { id: 14, name: 'DB Deadlift to High Pull', type: 'station', equipment: 'Dumbbells', instructions: 'Sled-pull Pattern - Explosive pull' },
  { id: 15, name: 'DB Push Press', type: 'station', equipment: 'Dumbbells', instructions: 'Upper Body - Drive through legs' },
  { id: 16, name: 'DB Reverse Lunges', type: 'station', equipment: 'Dumbbells', instructions: 'Legs / Core - Alternate legs' },
  { id: 17, name: 'DB Renegade Rows', type: 'station', equipment: 'Dumbbells', instructions: 'Pull + Core - Plank position' },
  { id: 18, name: 'DB Bear Crawl', type: 'station', equipment: 'Dumbbells', instructions: 'Hyrox Functional Movement - Forward/back' },
  { id: 19, name: 'DB Russian Twists', type: 'station', equipment: 'Dumbbells', instructions: 'Core Rotation - Controlled twists' },
  { id: 20, name: 'DB Squat Clean to Press', type: 'station', equipment: 'Dumbbells', instructions: 'Race Simulation - Full body' },
  { id: 21, name: 'DB Suitcase Carry', type: 'station', equipment: 'Dumbbells', instructions: 'Core Anti-Rotation - Switch halfway' },
];

// Rest period
export const CIRCUIT_REST_2: HyroxStation = { 
  id: 22, 
  name: '2 Min Rest', 
  type: 'station', 
  instructions: 'Drop dumbbells. Shake it out. Final push coming!' 
};

// Block 3: Bodyweight Race-Style Finisher (10 min)
export const CIRCUIT_BLOCK_3: HyroxStation[] = [
  { id: 23, name: 'Burpees', type: 'station', instructions: 'Full Body Race Effort - All out' },
  { id: 24, name: 'Wide Stance Air Squats', type: 'station', instructions: 'Hyrox Quad Fatigue - Wide stance' },
  { id: 25, name: 'High Knees (Fast Pace)', type: 'station', instructions: 'Running Engine - Race pace' },
  { id: 26, name: 'Plank', type: 'station', instructions: 'Core Control - Hold tight' },
  { id: 27, name: 'Jump Lunges', type: 'station', instructions: 'Explosive Legs - Switch mid-air' },
  { id: 28, name: 'Sit-Ups / Crunches', type: 'station', instructions: 'Core Strength - Contract hard' },
  { id: 29, name: 'Cross-Body Mountain Climbers', type: 'station', instructions: 'Core + Cardio - Knee to elbow' },
  { id: 30, name: 'Static Squat Hold', type: 'station', instructions: 'Leg Endurance - Stay low' },
  { id: 31, name: 'Burpee Tuck Jumps', type: 'station', instructions: 'Power Output - Explosive jumps' },
  { id: 32, name: 'Run in Place (Race Pace)', type: 'station', instructions: 'Finish Effort - Leave it all here!' },
];

// Combined circuit stations
export const CIRCUIT_HIIT_STATIONS: HyroxStation[] = [
  ...CIRCUIT_BLOCK_1,
  CIRCUIT_REST_1,
  ...CIRCUIT_BLOCK_2,
  CIRCUIT_REST_2,
  ...CIRCUIT_BLOCK_3,
];

export function getStations(type: HyroxType): HyroxStation[] {
  if (type === 'frank') return FRANK_TANK_STATIONS;
  if (type === 'secret') return SECRET_KETTLEBELL_STATIONS;
  if (type === 'circuit') return CIRCUIT_HIIT_STATIONS;
  if (type === 'deka') return DEKA_STRONG_STATIONS;
  if (type === 'deka_half') return DEKA_HALF_STATIONS;
  return type === 'full' ? FULL_HYROX_STATIONS : HALF_HYROX_STATIONS;
}

// DEKA HALF - First 5 zones
export const DEKA_HALF_STATIONS: HyroxStation[] = [
  { id: 1, name: 'RAM Alt Reverse Lunge', type: 'station', reps: 30, equipment: 'RAM Bar', instructions: '30 alternating reverse lunges' },
  { id: 2, name: 'Row', type: 'station', distance: 500, equipment: 'Rowing Machine', instructions: '500m Row' },
  { id: 3, name: 'Box Jump/Step Over', type: 'station', reps: 20, equipment: 'Plyo Box', instructions: '20 box jumps or step overs' },
  { id: 4, name: 'Row', type: 'station', distance: 500, equipment: 'Rowing Machine', instructions: '500m Row' },
  { id: 5, name: 'Med Ball Sit-Up Throw', type: 'station', reps: 25, equipment: 'Medicine Ball', instructions: '25 sit-up throws to target' },
  { id: 6, name: 'Row', type: 'station', distance: 500, equipment: 'Rowing Machine', instructions: '500m Row' },
  { id: 7, name: 'Ski Erg', type: 'station', distance: 500, equipment: 'Ski Erg', instructions: '500m on Ski Erg' },
  { id: 8, name: 'Row', type: 'station', distance: 500, equipment: 'Rowing Machine', instructions: '500m Row' },
  { id: 9, name: 'Farmers Carry', type: 'station', distance: 100, equipment: 'Dumbbells/Kettlebells', instructions: '100m farmers carry' },
];

// DEKA STRONG - 10 zones with 500m rows between
export const DEKA_STRONG_STATIONS: HyroxStation[] = [
  { id: 1, name: 'RAM Alt Reverse Lunge', type: 'station', reps: 30, equipment: 'RAM Bar', instructions: '30 alternating reverse lunges' },
  { id: 2, name: 'Row', type: 'station', distance: 500, equipment: 'Rowing Machine', instructions: '500m Row' },
  { id: 3, name: 'Box Jump/Step Over', type: 'station', reps: 20, equipment: 'Plyo Box', instructions: '20 box jumps or step overs' },
  { id: 4, name: 'Row', type: 'station', distance: 500, equipment: 'Rowing Machine', instructions: '500m Row' },
  { id: 5, name: 'Med Ball Sit-Up Throw', type: 'station', reps: 25, equipment: 'Medicine Ball', instructions: '25 sit-up throws to target' },
  { id: 6, name: 'Row', type: 'station', distance: 500, equipment: 'Rowing Machine', instructions: '500m Row' },
  { id: 7, name: 'Ski Erg', type: 'station', distance: 500, equipment: 'Ski Erg', instructions: '500m on Ski Erg' },
  { id: 8, name: 'Row', type: 'station', distance: 500, equipment: 'Rowing Machine', instructions: '500m Row' },
  { id: 9, name: 'Farmers Carry', type: 'station', distance: 100, equipment: 'Dumbbells/Kettlebells', instructions: '100m farmers carry' },
  { id: 10, name: 'Row', type: 'station', distance: 500, equipment: 'Rowing Machine', instructions: '500m Row' },
  { id: 11, name: 'Air Bike', type: 'station', reps: 25, equipment: 'Air Bike', instructions: '25 calories on air bike' },
  { id: 12, name: 'Row', type: 'station', distance: 500, equipment: 'Rowing Machine', instructions: '500m Row' },
  { id: 13, name: 'Dead Ball Wall Over', type: 'station', reps: 20, equipment: 'Dead Ball', instructions: '20 dead ball over wall' },
  { id: 14, name: 'Row', type: 'station', distance: 500, equipment: 'Rowing Machine', instructions: '500m Row' },
  { id: 15, name: 'Tank Push/Pull', type: 'station', distance: 100, equipment: 'Tank/Sled', instructions: '100m tank push and pull' },
  { id: 16, name: 'Row', type: 'station', distance: 500, equipment: 'Rowing Machine', instructions: '500m Row' },
  { id: 17, name: 'RAM Burpee', type: 'station', reps: 20, equipment: 'RAM Bar', instructions: '20 RAM burpees' },
  { id: 18, name: 'Row', type: 'station', distance: 500, equipment: 'Rowing Machine', instructions: '500m Final Row' },
];



