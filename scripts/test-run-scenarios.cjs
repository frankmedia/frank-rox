require("ts-node/register/transpile-only");

const { getRunPlanForIndex } = require("../src/lib/runPlanConfig.ts");

const equipment = ["SkiErg", "RowErg", "Assault Bike", "Wall balls", "Heavy dumbbells"];

const scenarios = [
  {
    name: "Onboarding Newbie",
    description: "Never raced HYROX, far from event",
    blockType: "onboarding",
    hyroxProfile: {
      hasRacedHyrox: false,
      hyroxBestTime: undefined,
      weakStations: [],
      goalType: "first-time",
      weeksToRace: 24,
    },
  },
  {
    name: "Base Phase Returner",
    description: "HYROX returner ~15 weeks out",
    blockType: "base",
    hyroxProfile: {
      hasRacedHyrox: true,
      hyroxBestTime: "1:35",
      weakStations: ["wall-balls"],
      goalType: "improve-time",
      weeksToRace: 15,
    },
  },
  {
    name: "Build Phase Returner",
    description: "HYROX returner 7 weeks out",
    blockType: "build",
    hyroxProfile: {
      hasRacedHyrox: true,
      hyroxBestTime: "1:32",
      weakStations: ["sled-push"],
      goalType: "improve-time",
      weeksToRace: 7,
    },
  },
  {
    name: "Peak Phase Returner",
    description: "Race in ~2 weeks, taper time",
    blockType: "peak",
    hyroxProfile: {
      hasRacedHyrox: true,
      hyroxBestTime: "1:30",
      weakStations: [],
      goalType: "improve-time",
      weeksToRace: 2,
    },
  },
];

const blockTypeToFocus = {
  onboarding: "base",
  base: "base",
  build: "build",
  peak: "race-prep",
};

function createPrefs(config) {
  const focus = blockTypeToFocus[config.blockType] ?? "base";
  const weeksToEvent = config.hyroxProfile.weeksToRace ?? null;
  const isTaper = config.blockType === "peak";

  return {
    trainingDaysPerWeek: 6,
    runSessionsPerWeek: 2,
    cardioSessionsPerWeek: 2,
    focusAreas: ["Running", "Strength", "Cardio"],
    hasHills: false,
    focus,
    blockNumber: 1,
    weeksToEvent,
    isDeload: false,
    isTaper,
    taperWeek: isTaper ? 1 : undefined,
    equipment,
    blockType: config.blockType,
    hyroxProfile: config.hyroxProfile,
  };
}

function runScenario(config) {
  const prefs = createPrefs(config);
  const run1 = getRunPlanForIndex(0, prefs.blockType, prefs.hyroxProfile);
  const run2 = getRunPlanForIndex(1, prefs.blockType, prefs.hyroxProfile);
  return [run1, run2];
}

function main() {
  console.log("🧪 Phase-aware run scenarios\n");

  for (const scenario of scenarios) {
    console.log(`=== ${scenario.name} (${scenario.blockType}) ===`);
    console.log(scenario.description);

    const [run1, run2] = runScenario(scenario);
    const runs = [run1, run2].filter(Boolean);

    if (runs.length === 0) {
      console.log("  ❌ No run plan generated\n");
      continue;
    }

    runs.forEach((run, idx) => {
      console.log(
        `  Run ${idx + 1}: ${run.kind} • ${run.distanceLabel ?? `${run.distanceKm}km`} • ${
          run.description
        }`
      );
    });
    console.log("");
  }
}

main();

