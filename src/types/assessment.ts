export interface AssessmentData {
  // Section 1: Athlete Info
  gender: string;
  category: string;
  hasCompeted: string;
  mainGoal: string;
  
  // Section 2: Running Fitness
  km1Time: string; // min:sec format
  distance30Min: string;
  runFrequency: string;
  enduranceLevel: string;
  
  // Section 3: Strength & Power
  sledPushMax: string;
  sledPullMax: string;
  wallBallsMax: string;
  deadlift5RM: string;
  weightedLunges: string;
  farmerCarry: string;
  
  // Section 4: Engine & Cardio
  row500: string;
  skiErg500: string;
  bikePower: string;
  engineLevel: string;
  
  // Section 5: Mobility & Recovery
  hasInjuries: string;
  injuryDetails: string;
  mobilityFrequency: string;
  sleepHours: string;
  
  // Section 6: Nutrition & Hydration
  dietType: string[];
  waterIntake: string;
  supplements: string[];
  
  // Section 7: Lifestyle & Mindset
  trainingFrequency: string;
  biggestWeakness: string[];
}


