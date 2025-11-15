export type GoalType = "first-time" | "improve-time" | "return-from-break";
export type BlockType = "onboarding" | "base" | "build" | "peak";
export type RunKind =
  | "easy-z2"
  | "steady-aerobic"
  | "hyrox-intervals-500m"
  | "hyrox-intervals-1k"
  | "peak-sharpen";

export type HyroxProfile = {
  hasRacedHyrox: boolean;
  hyroxBestTime?: string;
  weakStations?: string[];
  goalType: GoalType;
  weeksToRace?: number | null;
};

export type RunPlan = {
  kind: RunKind;
  distanceKm: number;
  distanceLabel?: string;
  description: string;
};

export function getRunPlanForIndex(
  runIndex: 0 | 1,
  blockType: BlockType,
  profile: HyroxProfile
): RunPlan {
  const hasRaced = profile?.hasRacedHyrox ?? false;
  const fallback: RunPlan = {
    kind: "easy-z2",
    distanceKm: 5,
    description: "Easy run.",
  };

  if (runIndex === 0) {
    switch (blockType) {
      case "onboarding":
        return {
          kind: "easy-z2",
          distanceKm: 5,
          distanceLabel: "4-6km",
          description: "Easy Z2 run, 4–6 km at conversational pace.",
        };
      case "base":
        return {
          kind: "easy-z2",
          distanceKm: 7,
          distanceLabel: "6-8km",
          description: "Easy Z2 run, 6–8 km. Keep it comfortable and relaxed.",
        };
      case "build":
        return {
          kind: "easy-z2",
          distanceKm: 9,
          distanceLabel: "8-10km",
          description: "Long easy Z2 run, 8–10 km. Stay relaxed and smooth.",
        };
      case "peak":
        return {
          kind: "easy-z2",
          distanceKm: 6,
          distanceLabel: "5-7km",
          description: "Easy Z2 run, 5–7 km. Keep legs loose heading into race week.",
        };
      default:
        return fallback;
    }
  }

  if (runIndex === 1) {
    switch (blockType) {
      case "onboarding":
        return {
          kind: "easy-z2",
          distanceKm: 4,
          distanceLabel: "3-5km",
          description: "Easy run, 3–5 km. Focus on habit building.",
        };
      case "base":
        if (!hasRaced) {
          return {
            kind: "steady-aerobic",
            distanceKm: 6,
            distanceLabel: "5-6km",
            description: "Steady aerobic run, 5–6 km at RPE ~6/10.",
          };
        }
        return {
          kind: "hyrox-intervals-500m",
          distanceKm: 5,
          description: "Intro intervals: 2 km easy + 4×500 m moderate + 1 km easy.",
        };
      case "build":
        if (hasRaced) {
          return {
            kind: "hyrox-intervals-1k",
            distanceKm: 6,
            description: "HYROX 1 km reps: 2 km easy + 3×1 km controlled hard + 1 km easy.",
          };
        }
        return {
          kind: "hyrox-intervals-500m",
          distanceKm: 5,
          description:
            "Progressive 500 m intervals: 2 km easy + 5×500 m moderate-hard + cool-down.",
        };
      case "peak":
        return {
          kind: "peak-sharpen",
          distanceKm: 5,
          description:
            "Short sharpen: 2 km easy + 6×200 m quick with full recovery + easy cool-down.",
        };
      default:
        return fallback;
    }
  }

  return fallback;
}

export function getRunTitleForKind(kind: RunKind): string {
  switch (kind) {
    case "easy-z2":
      return "Long Run";
    case "steady-aerobic":
      return "Steady Run";
    case "hyrox-intervals-500m":
      return "Run Intervals (500m)";
    case "hyrox-intervals-1k":
      return "Run Intervals (1km)";
    case "peak-sharpen":
      return "Race Sharpen Run";
    default:
      return "Run";
  }
}

export function getRunEffortForKind(kind: RunKind): "easy" | "moderate" | "hard" {
  switch (kind) {
    case "easy-z2":
      return "easy";
    case "steady-aerobic":
    case "peak-sharpen":
      return "moderate";
    default:
      return "hard";
  }
}

