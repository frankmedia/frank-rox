export type StrengthInputs = {
  bench5rm?: string | null;
  squat5rm?: string | null;
  deadlift5rm?: string | null;
  ohp5rm?: string | null;
};

export type RunningInputs = {
  weekly_run_band?: "0" | "0–60 min" | "1–2 hours" | "2–4 hours" | "4+ hours";
  intervals?: "Yes" | "No" | "Both";
  hills?: "Yes" | "No";
  best5k?: string | null;  // "mm:ss"
  best10k?: string | null; // "hh:mm:ss" or "mm:ss"
};

export type CardioConditioningInputs = {
  sessions_per_week?: number; // 0..5+
  avg_duration_band?: "<20" | "20–40" | "40–60" | "60+";
  modalities?: string[]; // ["row","ski","bike","circuits","other"]
  interval_or_z2?: "Yes" | "No" | "Both";
};

export type MobilityInputs = {
  mobility_band?: "None" | "1–2" | "3+";
  yoga?: "Yes" | "No";
};

export type CompetitionInputs = {
  experience?: "No" | "Once" | "2–3 times" | "4+ times";
  result?: "DNF" | "Finished" | "Podium";
};

function bandIndex(val: string | undefined | null, opts: string[]): number {
  if (!val) return -1;
  return opts.indexOf(val);
}

function intervalScore(choice?: string | null): number {
  const c = (choice || "").toLowerCase();
  if (c === "both") return 20;
  if (c === "yes" || c === "intervals" || c === "zone2") return 10;
  return 0;
}

function varietyBonus(modalities?: string[] | null): number {
  if (!modalities || modalities.length === 0) return 0;
  const count = new Set(modalities.map((m) => (m || "").toLowerCase())).size;
  if (count <= 1) return 0;
  if (count === 2) return 5;
  return 10;
}

export function scoreCardioConditioning(i: CardioConditioningInputs): number {
  const freqMap: Record<number, number> = { 0: 0, 1: 30, 2: 50, 3: 70, 4: 85 };
  const sessions = Math.max(0, Math.floor(i.sessions_per_week ?? 0));
  const freq = sessions >= 5 ? 100 : (freqMap[sessions] ?? 0);

  const dIdx = bandIndex(i.avg_duration_band, ["<20", "20–40", "40–60", "60+"]);
  const dur = dIdx >= 0 ? [30, 60, 80, 100][dIdx] : 60;

  const intervals = intervalScore(i.interval_or_z2);
  const variety = varietyBonus(i.modalities);

  const score = 0.5 * freq + 0.3 * dur + 0.1 * intervals + 0.1 * variety;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function parseHhMmSsToSeconds(input?: string | null): number | null {
  if (!input) return null;
  const s = input.trim();
  if (!s) return null;
  const parts = s.split(":").map((p) => p.trim());
  if (parts.some((p) => p === "" || isNaN(Number(p)))) return null;
  let seconds = 0;
  if (parts.length === 3) {
    seconds = Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number(parts[2]);
  } else if (parts.length === 2) {
    seconds = Number(parts[0]) * 60 + Number(parts[1]);
  } else if (parts.length === 1) {
    seconds = Number(parts[0]);
  } else {
    return null;
  }
  return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
}

function scoreFromTime(seconds: number, best: number, worst: number): number {
  // Linear map: best -> 100, worst -> 10 (clamped to 0..100)
  if (!Number.isFinite(seconds)) return 0;
  const clamped = Math.max(best, Math.min(worst, seconds));
  const t = (clamped - best) / (worst - best); // 0 at best, 1 at worst
  const score = 100 - t * 90; // 100 down to 10
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function scoreRunning(i: RunningInputs): number {
  // Weekly running volume (lower weight now)
  const idx = bandIndex(i.weekly_run_band, ["0", "0–60 min", "1–2 hours", "2–4 hours", "4+ hours"]);
  const weekly = idx >= 0 ? [0, 50, 70, 85, 100][idx] : 50;

  // Time-based performance (heavily weighted)
  const t5k = parseHhMmSsToSeconds(i.best5k);
  const t10k = parseHhMmSsToSeconds(i.best10k);
  const s5k = t5k != null ? scoreFromTime(t5k, 16 * 60, 40 * 60) : null;     // 16:00 -> 100, 40:00 -> 10
  const s10k = t10k != null ? scoreFromTime(t10k, 32 * 60, 75 * 60) : null;  // 32:00 -> 100, 75:00 -> 10
  let timeScore: number | null = null;
  if (s5k != null && s10k != null) {
    timeScore = (s5k + s10k) / 2;
  } else {
    timeScore = s5k != null ? s5k : s10k;
  }
  // If no valid times, fall back to weekly volume strength a bit more
  const perf = timeScore != null ? timeScore : weekly;

  // Intervals/Hills bonus (small)
  let bonus = 0;
  const intv = intervalScore(i.intervals);
  if (intv > 0) bonus += Math.floor(intv / 2); // up to +10
  if ((i.hills || "").toLowerCase() === "yes") bonus += 5;

  // Final: emphasize times a lot more
  const score = 0.7 * perf + 0.2 * weekly + 0.1 * bonus;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function liftLevel(choice: string | undefined | null, values: string[]): number | null {
  if (!choice || choice.toLowerCase().includes("not")) return null;
  const idx = values.indexOf(choice);
  if (idx < 0) return null;
  if (idx <= 1) return 0; // beginner
  if (idx >= values.length - 2) return 2; // advanced
  return 1; // intermediate
}

export function scoreStrength(inputs: StrengthInputs): { strength_score: number; strength_level: "Beginner" | "Intermediate" | "Advanced" } {
  const benches = ["20", "40", "60", "80", "100", "120+"];
  const squats = ["20", "40", "60", "80", "100", "120", "120+"];
  const deads = ["20", "40", "60", "80", "100", "120", "140+"];
  const ohps = ["5", "10", "20", "30", "40", "50", "60+"];

  const levels: number[] = [];
  const push = liftLevel(inputs.bench5rm, benches);
  const squat = liftLevel(inputs.squat5rm, squats);
  const dead = liftLevel(inputs.deadlift5rm, deads);
  const ohp = liftLevel(inputs.ohp5rm, ohps);
  [push, squat, dead, ohp].forEach((l) => {
    if (l !== null) levels.push(l);
  });

  const avg = levels.length ? levels.reduce((a, b) => a + b, 0) / levels.length : 0;
  let level: "Beginner" | "Intermediate" | "Advanced";
  let score: number;
  if (avg < 0.66) {
    level = "Beginner";
    score = 40;
  } else if (avg < 1.5) {
    level = "Intermediate";
    score = 70;
  } else {
    level = "Advanced";
    score = 90;
  }
  return { strength_score: score, strength_level: level };
}

export function scoreMobilityRecovery(i?: MobilityInputs): number {
  if (!i) return 60;
  const idx = bandIndex(i.mobility_band, ["None", "1–2", "3+"]);
  let base = idx >= 0 ? [30, 60, 85][idx] : 60;
  if (((i.yoga as string) || "").toLowerCase() === "yes") base += 5;
  return Math.max(0, Math.min(100, base));
}

export function scoreCompetition(i: CompetitionInputs): number {
  let base = 0;
  switch (i.experience) {
    case "Once": base = 40; break;
    case "2–3 times": base = 70; break;
    case "4+ times": base = 90; break;
    default: base = 0;
  }
  let bonus = 0;
  switch (i.result) {
    case "Finished": bonus = 10; break;
    case "Podium": bonus = 20; break;
    default: bonus = 0;
  }
  return Math.min(100, base + bonus);
}

export function computeAthleteProfile(params: {
  cardio: CardioConditioningInputs;
  running: RunningInputs;
  strength: StrengthInputs;
  mobility: MobilityInputs;
  competition?: CompetitionInputs;
}) {
  const cardioInputs: CardioConditioningInputs = params.cardio ?? {
    sessions_per_week: 0,
    avg_duration_band: "20–40",
    modalities: [],
    interval_or_z2: "No",
  };
  const runningInputs: RunningInputs = params.running ?? {
    weekly_run_band: "0",
    intervals: "No",
    hills: "No",
  };
  const strengthInputs: StrengthInputs = params.strength ?? {};
  const mobilityInputs: MobilityInputs | undefined = params.mobility ?? { mobility_band: "None", yoga: "No" };

  const cardioConditioning = scoreCardioConditioning(cardioInputs);
  const running = scoreRunning(runningInputs);
  const enduranceIndex = Math.round(0.6 * running + 0.4 * cardioConditioning);
  // Cardio display score as requested: 50% running + 50% cardio questions
  const cardioComposite = Math.round(0.5 * running + 0.5 * cardioConditioning);
  const strength = scoreStrength(strengthInputs);
  const mobilityRecovery = scoreMobilityRecovery(mobilityInputs);
  const competition = params.competition ? scoreCompetition(params.competition) : 0;

  // Overall readiness (stress removed; redistributed weight)
  let overall =
    0.25 * strength.strength_score + // unchanged
    0.35 * enduranceIndex +          // +0.05 from removed stress
    0.30 * cardioConditioning +      // +0.05 from removed stress
    0.10 * mobilityRecovery;         // unchanged
  // Add small competition bonus
  overall += 0.10 * competition;

  return {
    running_score: running,
    cardio_conditioning_score: cardioConditioning,
    cardio_composite_score: cardioComposite,
    endurance_index: enduranceIndex,
    strength_score: strength.strength_score,
    strength_level: strength.strength_level,
    mobility_recovery_score: mobilityRecovery,
    competition_score: competition,
    overall_score: Math.round(overall),
  };
}


