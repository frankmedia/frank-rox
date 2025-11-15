import {
  getRunPlanForIndex,
  type BlockType,
  type HyroxProfile,
  type RunPlan,
} from "../src/lib/runPlanConfig";

type ScenarioConfig = {
  name: string;
  description: string;
  blockType: BlockType;
  hyroxProfile: HyroxProfile;
};

const blockTypeToFocus: Record<BlockType, "base" | "build" | "race-prep"> = {
  onboarding: "base",
  base: "base",
  build: "build",
  peak: "race-prep",
};

const scenarios: ScenarioConfig[] = [
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

function summarizeRun(label: string, plan: RunPlan): string {
  const distance = plan.distanceLabel ?? `${plan.distanceKm}km`;
  return `${label}: ${plan.kind} • ${distance} • ${plan.description}`;
}

function runScenario(config: ScenarioConfig) {
  const run1 = getRunPlanForIndex(0, config.blockType, config.hyroxProfile);
  const run2 = getRunPlanForIndex(1, config.blockType, config.hyroxProfile);
  return [run1, run2];
}

async function main() {
  console.log("🧪 Phase-aware run scenarios\n");

  for (const scenario of scenarios) {
    console.log(`=== ${scenario.name} (${scenario.blockType}) ===`);
    console.log(scenario.description);
    const [run1, run2] = runScenario(scenario);
    console.log(`  ${summarizeRun("Run 1", run1)}`);
    console.log(`  ${summarizeRun("Run 2", run2)}\n`);
  }
}

main().catch((err) => {
  console.error("❌ Scenario test failed:", err);
  process.exit(1);
});

