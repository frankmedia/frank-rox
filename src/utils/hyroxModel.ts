import { AssessmentData } from "@/types/assessment";

// Helper functions
const clamp = (x: number, a: number, b: number): number => Math.max(a, Math.min(b, x));
const lin = (x: number, lo: number, hi: number): number => clamp((x - lo) / (hi - lo), 0, 1);
const invLin = (x: number, lo: number, hi: number): number => 1 - lin(x, lo, hi);
const to10 = (z: number): number => Math.round(z * 10 * 10) / 10;

// Convert mm:ss to seconds
const mmssToSec = (timeStr: string): number => {
  if (!timeStr || timeStr.trim() === "" || !timeStr.includes(":")) return 0;
  const parts = timeStr.split(":");
  const mins = parseInt(parts[0]) || 0;
  const secs = parseInt(parts[1]) || 0;
  // Validate: if either part is missing or invalid, return 0
  if (parts[0] === "" || parts[1] === "" || isNaN(mins) || isNaN(secs)) return 0;
  return mins * 60 + secs;
};

// Convert seconds to HH:MM:SS format
const secToHHMMSS = (sec: number): string => {
  const hours = Math.floor(sec / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  const secs = Math.floor(sec % 60);
  return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

// Map run frequency to numeric
const mapRunFrequency = (freq: string): number => {
  switch (freq) {
    case "0-1": return 0.5;
    case "2-3": return 2.5;
    case "4-5": return 4.5;
    case "6+": return 6;
    default: return 2.5;
  }
};

// Map mobility frequency
const mapMobilityFrequency = (freq: string): number => {
  switch (freq) {
    case "Never": return 0;
    case "1-2× week": return 2;
    case "3-4× week": return 3.5;
    case "Daily": return 5;
    default: return 2;
  }
};

// Calculate Running Index
const calculateRunningIndex = (
  km1Sec: number,
  dist30Min: number,
  runFreq: number,
  enduranceLevel: number
): number => {
  const z1 = invLin(km1Sec, 210, 330); // 3:30-5:30 min/km
  const z2 = lin(dist30Min, 4.0, 7.0);
  const z3 = lin(runFreq, 0, 6);
  const z4 = lin(enduranceLevel, 1, 5);
  return to10(0.45 * z1 + 0.30 * z2 + 0.15 * z3 + 0.10 * z4);
};

// Calculate Strength Index
const calculateStrengthIndex = (
  sledPush: number,
  sledPull: number,
  wallBalls: number,
  deadlift: number,
  lunges: number,
  farmerCarry: number
): number => {
  const zPush = lin(sledPush, 70, 140);
  const zPull = lin(sledPull, 45, 90);
  const zWb = lin(wallBalls, 10, 40);
  const zDl = lin(deadlift, 60, 120);
  const zLunge = lin(lunges, 12, 30);
  const zFarm = lin(farmerCarry, 30, 100);
  return to10(0.20 * zPush + 0.15 * zPull + 0.15 * zWb + 0.20 * zDl + 0.15 * zLunge + 0.15 * zFarm);
};

// Calculate Engine Index
const calculateEngineIndex = (
  row500Sec: number,
  ski500Sec: number,
  bikePower: number,
  engineLevel: number
): number => {
  const zRow = invLin(row500Sec, 95, 140); // 1:35-2:20
  const zSki = invLin(ski500Sec, 105, 155); // 1:45-2:35
  const zBike = lin(bikePower, 120, 300);
  const zSelf = lin(engineLevel, 1, 5);
  return to10(0.35 * zRow + 0.35 * zSki + 0.20 * zBike + 0.10 * zSelf);
};

// Calculate Mobility Index
const calculateMobilityIndex = (
  mobilityFreq: number,
  sleepHours: number,
  hasInjuries: boolean
): number => {
  const zMob = lin(mobilityFreq, 0, 5);
  const zSleep = lin(sleepHours, 5, 9);
  const zInj = hasInjuries ? 0.5 : 1;
  return to10(0.45 * zMob + 0.45 * zSleep + 0.10 * zInj);
};

// Calculate Nutrition Index
const calculateNutritionIndex = (
  waterLiters: number,
  dietType: string[],
  supplements: string[]
): number => {
  const zWater = lin(waterLiters, 1, 3);
  
  // Diet score
  let zDiet = 0.3; // Default if nothing selected
  if (dietType.includes("Balanced") || dietType.includes("High Protein")) {
    zDiet = 1;
  } else if (dietType.includes("Low Carb") || dietType.includes("Vegetarian") || dietType.includes("Vegan")) {
    zDiet = 0.8;
  } else if (dietType.includes("Unstructured")) {
    zDiet = 0.1; // Very low score for unstructured
  }
  
  // Supplements score
  const zSupp = (supplements.includes("Creatine") || supplements.includes("Protein") || supplements.includes("Electrolytes")) ? 1 : 0.6;
  
  return to10(0.5 * zWater + 0.3 * zDiet + 0.2 * zSupp);
};

// Calculate Lifestyle Index
const calculateLifestyleIndex = (
  sessionsPerWeek: number,
  hasBiggestWeakness: boolean
): number => {
  const zSess = lin(sessionsPerWeek, 2, 7);
  const zWeak = hasBiggestWeakness ? 1 : 0.6;
  return to10(0.8 * zSess + 0.2 * zWeak);
};

// Station time interpolation
const interpTime = (score: number, slow: number, fast: number): number => {
  return slow - (score / 10.0) * (slow - fast);
};

// Determine archetype
const getArchetype = (runIdx: number, strIdx: number, engIdx: number): string => {
  if (runIdx >= engIdx && runIdx >= strIdx) return "Runner-Led";
  if (engIdx > runIdx && engIdx >= strIdx) return "Engine-Led";
  return "Strength-Led";
};

export interface HyroxResults {
  profile: {
    archetype: string;
    strengths: string[];
    limiters: string[];
  };
  indices: {
    Running: number;
    Strength: number;
    Engine: number;
    Mobility: number;
    Nutrition: number;
    Lifestyle: number;
    TotalScore: number;
  };
  predictedTime: {
    estimate: string;
    lowRisk: string;
    highRisk: string;
  };
  prescriptions: {
    trainingDaysPerWeek: number;
    runsPerWeek: number;
    recommendedBlockWeeks: number;
  };
  weakStations: string[];
}

export const calculateHyroxResults = (data: AssessmentData): HyroxResults => {
  // Parse inputs with conservative defaults (average female athlete)
  const km1Sec = mmssToSec(data.km1Time) || 360; // Default to 6:00 min/km (average, not competitive)
  const dist30Min = parseFloat(data.distance30Min) || 4.5; // Conservative running fitness
  const runFreq = mapRunFrequency(data.runFrequency);
  const enduranceLevel = parseInt(data.enduranceLevel) || 2; // Below average if not specified
  
  console.log("🔍 HYROX Calculation Debug:", {
    km1Time: data.km1Time,
    km1Sec,
    row500: data.row500,
    row500Sec: mmssToSec(data.row500),
    ski500: data.skiErg500,
    ski500Sec: mmssToSec(data.skiErg500)
  });
  
  const sledPush = parseFloat(data.sledPushMax) || 70; // Average female beginner
  const sledPull = parseFloat(data.sledPullMax) || 40; // Average female beginner
  const wallBalls = parseFloat(data.wallBallsMax) || 12; // Conservative
  const deadlift = parseFloat(data.deadlift5RM) || 50; // Beginner-friendly
  const lunges = parseFloat(data.weightedLunges) || 10; // Light
  const farmerCarry = parseFloat(data.farmerCarry) || 30; // Conservative
  
  const row500Sec = mmssToSec(data.row500) || 150; // Default to 2:30 (average recreational)
  const ski500Sec = mmssToSec(data.skiErg500) || 160; // Default to 2:40 (average recreational)
  const bikePower = parseFloat(data.bikePower) || 150; // Lower power output
  const engineLevel = parseInt(data.engineLevel) || 2; // Below average if not specified
  
  const mobilityFreq = mapMobilityFrequency(data.mobilityFrequency);
  const sleepHours = parseFloat(data.sleepHours) || 7;
  const hasInjuries = data.hasInjuries === "Yes";
  
  const waterLiters = parseFloat(data.waterIntake) || 2;
  const dietType = data.dietType || [];
  const supplements = data.supplements || [];
  
  const sessionsPerWeek = parseFloat(data.trainingFrequency) || 4;
  const biggestWeakness = data.biggestWeakness || [];
  
  // Calculate indices
  const RunningIndex = calculateRunningIndex(km1Sec, dist30Min, runFreq, enduranceLevel);
  const StrengthIndex = calculateStrengthIndex(sledPush, sledPull, wallBalls, deadlift, lunges, farmerCarry);
  const EngineIndex = calculateEngineIndex(row500Sec, ski500Sec, bikePower, engineLevel);
  const MobilityIndex = calculateMobilityIndex(mobilityFreq, sleepHours, hasInjuries);
  const NutritionIndex = calculateNutritionIndex(waterLiters, dietType, supplements);
  const LifestyleIndex = calculateLifestyleIndex(sessionsPerWeek, biggestWeakness.length > 0);
  
  const TotalScore = Math.round(((RunningIndex + StrengthIndex + EngineIndex + MobilityIndex + NutritionIndex + LifestyleIndex) / 6) * 10) / 10;
  
  // Station scores
  const ScoreSki = to10(invLin(ski500Sec, 105, 155));
  const ScorePush = to10(lin(sledPush, 70, 140));
  const ScorePull = to10(lin(sledPull, 45, 90));
  const ScoreBurps = EngineIndex; // No specific burpee metric
  const ScoreRow = to10(invLin(row500Sec, 95, 140));
  const ScoreCarry = to10(lin(farmerCarry, 30, 100));
  const ScoreLunge = to10(lin(lunges, 12, 30));
  const ScoreWB = to10(lin(wallBalls, 10, 40));
  
  // Fatigue factor
  let fat = 1.0;
  if (EngineIndex < 5) fat += 0.05;
  if (StrengthIndex < 5) fat += 0.05;
  fat = clamp(fat, 1.0, 1.12);
  
  // Station time anchors (slow, fast) in seconds
  const anchors: { [key: string]: [number, number] } = {
    ski: [340, 250],
    push: [240, 150],
    pull: [220, 135],
    burps: [300, 210],
    row: [330, 230],
    carry: [160, 100],
    lunges: [270, 180],
    wb: [360, 240],
  };
  
  const stationTimes = {
    ski: interpTime(ScoreSki, ...anchors.ski) * fat,
    push: interpTime(ScorePush, ...anchors.push) * fat,
    pull: interpTime(ScorePull, ...anchors.pull) * fat,
    burps: interpTime(ScoreBurps, ...anchors.burps) * fat,
    row: interpTime(ScoreRow, ...anchors.row) * fat,
    carry: interpTime(ScoreCarry, ...anchors.carry) * fat,
    lunges: interpTime(ScoreLunge, ...anchors.lunges) * fat,
    wb: interpTime(ScoreWB, ...anchors.wb) * fat,
  };
  
  const StationsTotal = Object.values(stationTimes).reduce((sum, time) => sum + time, 0);
  
  console.log("🏋️ Station Times (seconds):", {
    "SkiErg": Math.floor(stationTimes.ski),
    "Sled Push": Math.floor(stationTimes.push),
    "Sled Pull": Math.floor(stationTimes.pull),
    "Burpees": Math.floor(stationTimes.burps),
    "Row": Math.floor(stationTimes.row),
    "Farmer's Carry": Math.floor(stationTimes.carry),
    "Lunges": Math.floor(stationTimes.lunges),
    "Wall Balls": Math.floor(stationTimes.wb),
    "TOTAL": Math.floor(StationsTotal),
    "Fatigue Factor": fat.toFixed(2)
  });
  
  // Run total
  const FM = clamp(1.12 - 0.01 * (EngineIndex - 5) - 0.005 * (StrengthIndex - 5), 1.02, 1.20);
  const RunTotal = 8 * km1Sec * FM;
  
  // Transitions
  let Transitions = 120;
  if (data.hasCompeted === "Yes") Transitions -= 20;
  if (hasInjuries) Transitions += 20;
  Transitions = clamp(Transitions, 80, 180);
  
  // Estimated time
  const estSec = RunTotal + StationsTotal + Transitions;
  const lowSec = estSec * 1.03;
  const highSec = estSec * 1.08;
  
  console.log("⏱️ Race Time Breakdown:", {
    "1km pace (sec)": km1Sec,
    "Fade Multiplier (FM)": FM.toFixed(2),
    "Run Total (8km)": `${Math.floor(RunTotal / 60)}:${Math.floor(RunTotal % 60).toString().padStart(2, '0')} (${Math.floor(RunTotal)}s)`,
    "Stations Total": `${Math.floor(StationsTotal / 60)}:${Math.floor(StationsTotal % 60).toString().padStart(2, '0')} (${Math.floor(StationsTotal)}s)`,
    "Transitions": `${Math.floor(Transitions / 60)}:${Math.floor(Transitions % 60).toString().padStart(2, '0')} (${Transitions}s)`,
    "TOTAL TIME": `${Math.floor(estSec / 60)}:${Math.floor(estSec % 60).toString().padStart(2, '0')} (${Math.floor(estSec)}s)`,
    "Indices": { RunningIndex, StrengthIndex, EngineIndex }
  });
  
  // Prescriptions
  let days = clamp(sessionsPerWeek, 3, 6);
  if (TotalScore < 5.0) days = Math.max(days, 4);
  if (data.mainGoal === "Podium") days = Math.min(6, days + 1);
  if (hasInjuries) days = Math.max(4, days - 1);
  days = Math.round(days);
  
  let runs = 2 + (RunningIndex < 5 ? 1 : 0) + (EngineIndex < 5 ? 0.5 : 0);
  if (biggestWeakness.includes("Running")) runs = Math.max(runs, 3);
  runs = Math.round(clamp(runs, 2, 4));
  
  let weeks = 8;
  if (TotalScore >= 8.0) weeks = 8;
  else if (TotalScore >= 6.0) weeks = 10;
  else if (TotalScore >= 4.0) weeks = 12;
  else weeks = 16;
  if (data.hasCompeted === "No") weeks = Math.max(weeks, 10);
  
  // Weak stations
  const stationScores = {
    "SkiErg": ScoreSki,
    "Sled Push": ScorePush,
    "Sled Pull": ScorePull,
    "Burpees": ScoreBurps,
    "Row": ScoreRow,
    "Farmer's Carry": ScoreCarry,
    "Lunges": ScoreLunge,
    "Wall Balls": ScoreWB,
  };
  
  const weakStations = Object.entries(stationScores)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 2)
    .map(([name]) => name);
  
  // Top strengths
  const indexScores = [
    { name: "Running", score: RunningIndex },
    { name: "Strength", score: StrengthIndex },
    { name: "Engine", score: EngineIndex },
  ];
  const strengths = indexScores
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((s) => s.name);
  
  const archetype = getArchetype(RunningIndex, StrengthIndex, EngineIndex);
  
  return {
    profile: {
      archetype,
      strengths,
      limiters: weakStations,
    },
    indices: {
      Running: RunningIndex,
      Strength: StrengthIndex,
      Engine: EngineIndex,
      Mobility: MobilityIndex,
      Nutrition: NutritionIndex,
      Lifestyle: LifestyleIndex,
      TotalScore,
    },
    predictedTime: {
      estimate: secToHHMMSS(estSec),
      lowRisk: secToHHMMSS(lowSec),
      highRisk: secToHHMMSS(highSec),
    },
    prescriptions: {
      trainingDaysPerWeek: days,
      runsPerWeek: runs,
      recommendedBlockWeeks: weeks,
    },
    weakStations,
  };
};

