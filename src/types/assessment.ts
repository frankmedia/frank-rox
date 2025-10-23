export interface AssessmentData {
  // Section 1: Athlete Info
  gender: string;
  category: string;
  hasCompeted: string;
  mainGoal: string;
  age: string; // Added age field
  
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
  injuryType: string; // Added injury type
  injurySeverity: string; // Added injury severity (1-5)
  mobilityFrequency: string;
  sleepHours: string;
  sleepQuality: string; // Added sleep quality
  
  // Section 6: Nutrition & Hydration
  dietType: string[];
  waterIntake: string;
  supplements: string[];
  proteinIntake: string; // Added protein intake (g/kg)
  fruitVegServings: string; // Added fruit/veg servings
  fiberIntake: string; // Added fiber intake
  nutritionUncertain: string; // Added "unsure" option
  
  // Section 7: Lifestyle & Mindset
  trainingFrequency: string;
  biggestWeakness: string[];
  stressLevel: string; // Added stress level
  workSchedule: string; // Added work schedule impact
  recoveryPractices: string[]; // Added recovery practices
  
  // Section 8: Experience & Competition
  hyroxRacesCompleted: string; // Added number of races
  functionalFitnessYears: string; // Added years of experience
  competitionLevel: string; // Added competition level
}


