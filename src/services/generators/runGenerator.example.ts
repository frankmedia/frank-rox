/**
 * Running Generator - Usage Examples
 * 
 * This file demonstrates how to use the runGenerator to create
 * running workouts for personalized training programmes.
 */

import { createRunSession, generateWeekOfRunning, type RunSessionOptions } from "./runGenerator";
import type { SupabaseClient } from "@supabase/supabase-js";

// ==================== Example 1: Single Long Run ====================

async function example1_LongRun(supabase: SupabaseClient, planDayId: string) {
  const options: RunSessionOptions = {
    sessionType: "long_run",
    distance: "8-10km",
    duration: "60-75min",
    pace: "Zone 2 (conversational)",
    effort: "easy",
    notes: "Build aerobic base. Stay conversational throughout.",
  };

  const result = await createRunSession(supabase, planDayId, options);
  
  if (result.warnings.length > 0) {
    console.warn("Warnings:", result.warnings);
  }
  
  console.log("✅ Long run created successfully");
}

// ==================== Example 2: Interval Session ====================

async function example2_Intervals(supabase: SupabaseClient, planDayId: string) {
  const options: RunSessionOptions = {
    sessionType: "intervals",
    reps: 6,
    repDistance: "500m",
    restDuration: "90s",
    pace: "Race pace",
    effort: "hard",
    notes: "Focus on maintaining consistent pace across all reps.",
  };

  const result = await createRunSession(supabase, planDayId, options);
  console.log("✅ Interval session created successfully");
}

// ==================== Example 3: Tempo Run ====================

async function example3_TempoRun(supabase: SupabaseClient, planDayId: string) {
  const options: RunSessionOptions = {
    sessionType: "tempo",
    distance: "5-6km",
    duration: "25-30min",
    pace: "Steady (Zone 3)",
    effort: "moderate",
    notes: "Comfortably hard pace. Should feel challenging but sustainable.",
  };

  const result = await createRunSession(supabase, planDayId, options);
  console.log("✅ Tempo run created successfully");
}

// ==================== Example 4: Hill Repeats ====================

async function example4_HillRepeats(supabase: SupabaseClient, planDayId: string) {
  const options: RunSessionOptions = {
    sessionType: "hills",
    reps: 8,
    repDistance: "200m",
    hillGradient: "5-8%",
    restDuration: "Jog down recovery",
    effort: "hard",
    notes: "Focus on power and form. Drive knees up, maintain posture.",
  };

  const result = await createRunSession(supabase, planDayId, options);
  console.log("✅ Hill repeats created successfully");
}

// ==================== Example 5: Recovery Run ====================

async function example5_RecoveryRun(supabase: SupabaseClient, planDayId: string) {
  const options: RunSessionOptions = {
    sessionType: "recovery",
    distance: "3-4km",
    duration: "20-25min",
    pace: "Very easy (Zone 1)",
    effort: "easy",
    notes: "Should feel effortless. Promotes adaptation.",
  };

  const result = await createRunSession(supabase, planDayId, options);
  console.log("✅ Recovery run created successfully");
}

// ==================== Example 6: Full Week of Running ====================

async function example6_FullWeek(supabase: SupabaseClient, planDayIds: string[]) {
  // planDayIds should be array of 7 IDs (Monday-Sunday)
  
  const result = await generateWeekOfRunning(supabase, planDayIds, {
    runsPerWeek: 3,
    includeHills: true,
    focus: "build",
  });

  if (result.warnings.length > 0) {
    console.warn("Warnings:", result.warnings);
  }

  console.log("✅ Full week of running created successfully");
  console.log("   - 3 runs per week");
  console.log("   - Includes: Long run, Intervals, Hills");
  console.log("   - Focus: Build phase");
}

// ==================== Example 7: Progressive Programme (Base → Build → Race Prep) ====================

async function example7_ProgressiveProgramme(supabase: SupabaseClient) {
  // Week 1-2: Base Phase
  const week1Options: RunSessionOptions[] = [
    {
      sessionType: "long_run",
      distance: "6-8km",
      pace: "Zone 2",
      effort: "easy",
    },
    {
      sessionType: "intervals",
      reps: 6,
      repDistance: "500m",
      pace: "Race pace",
      effort: "hard",
    },
  ];

  // Week 3-4: Build Phase (increased volume)
  const week3Options: RunSessionOptions[] = [
    {
      sessionType: "long_run",
      distance: "8-10km", // +2km
      pace: "Zone 2",
      effort: "easy",
    },
    {
      sessionType: "intervals",
      reps: 8, // +2 reps
      repDistance: "500m",
      pace: "Race pace",
      effort: "hard",
    },
    {
      sessionType: "tempo",
      distance: "5km",
      pace: "Steady",
      effort: "moderate",
    },
  ];

  // Week 5-6: Race Prep (increased intensity)
  const week5Options: RunSessionOptions[] = [
    {
      sessionType: "long_run",
      distance: "10-12km", // +2km
      pace: "Zone 2",
      effort: "easy",
    },
    {
      sessionType: "intervals",
      reps: 6,
      repDistance: "1km", // Longer reps
      pace: "Race pace",
      effort: "hard",
    },
    {
      sessionType: "tempo",
      distance: "6km", // +1km
      pace: "Steady",
      effort: "moderate",
    },
  ];

  console.log("✅ Progressive 6-week programme structure defined");
  console.log("   Week 1-2: Base (2 runs/week)");
  console.log("   Week 3-4: Build (3 runs/week, +volume)");
  console.log("   Week 5-6: Race Prep (3 runs/week, +intensity)");
}

// ==================== Example 8: Integration with Programme Builder ====================

async function example8_IntegrateWithProgramme(
  supabase: SupabaseClient,
  programmeSession: {
    day: string;
    type: "run";
    title: string;
    distance?: string;
    pace?: string;
    effort: "easy" | "moderate" | "hard";
    detail?: string;
  },
  planDayId: string
) {
  // Convert programme session to RunSessionOptions
  let options: RunSessionOptions;

  if (programmeSession.title.includes("Long Run")) {
    options = {
      sessionType: "long_run",
      distance: programmeSession.distance || "8-10km",
      pace: programmeSession.pace || "Zone 2",
      effort: programmeSession.effort,
      notes: programmeSession.detail,
    };
  } else if (programmeSession.title.includes("Intervals")) {
    // Parse "6×500m" from distance
    const match = programmeSession.distance?.match(/(\d+)×(\d+\w+)/);
    const reps = match ? parseInt(match[1]) : 6;
    const repDistance = match ? match[2] : "500m";

    options = {
      sessionType: "intervals",
      reps,
      repDistance,
      restDuration: "90s",
      pace: programmeSession.pace || "Race pace",
      effort: programmeSession.effort,
      notes: programmeSession.detail,
    };
  } else if (programmeSession.title.includes("Tempo")) {
    options = {
      sessionType: "tempo",
      distance: programmeSession.distance || "4-6km",
      pace: programmeSession.pace || "Steady",
      effort: programmeSession.effort,
      notes: programmeSession.detail,
    };
  } else if (programmeSession.title.includes("Hill")) {
    const match = programmeSession.distance?.match(/(\d+)×(\d+\w+)/);
    const reps = match ? parseInt(match[1]) : 6;
    const repDistance = match ? match[2] : "200m";

    options = {
      sessionType: "hills",
      reps,
      repDistance,
      hillGradient: "5-8%",
      restDuration: "Jog down",
      effort: programmeSession.effort,
      notes: programmeSession.detail,
    };
  } else if (programmeSession.title.includes("Recovery")) {
    options = {
      sessionType: "recovery",
      distance: programmeSession.distance || "3-4km",
      pace: "Very easy",
      effort: "easy",
      notes: programmeSession.detail,
    };
  } else {
    // Default to long run
    options = {
      sessionType: "long_run",
      distance: programmeSession.distance || "6km",
      pace: programmeSession.pace || "Easy",
      effort: programmeSession.effort,
      notes: programmeSession.detail,
    };
  }

  const result = await createRunSession(supabase, planDayId, options);
  console.log(`✅ Created ${programmeSession.title} for ${programmeSession.day}`);
  
  return result;
}

// ==================== Example 9: Adaptive Programme (Based on User Preferences) ====================

async function example9_AdaptiveProgramme(
  supabase: SupabaseClient,
  planDayIds: string[],
  userPreferences: {
    runSessionsPerWeek: number;
    trainingDaysPerWeek: number;
    hasHills: boolean;
    weeksToEvent?: number;
  }
) {
  // Determine focus based on weeks to event
  let focus: "base" | "build" | "race-prep" = "base";
  if (userPreferences.weeksToEvent) {
    if (userPreferences.weeksToEvent <= 2) {
      focus = "race-prep";
    } else if (userPreferences.weeksToEvent <= 6) {
      focus = "build";
    }
  }

  const result = await generateWeekOfRunning(supabase, planDayIds, {
    runsPerWeek: userPreferences.runSessionsPerWeek,
    includeHills: userPreferences.hasHills,
    focus,
  });

  console.log("✅ Adaptive programme created");
  console.log(`   - ${userPreferences.runSessionsPerWeek} runs per week`);
  console.log(`   - Focus: ${focus}`);
  console.log(`   - Hills: ${userPreferences.hasHills ? "Yes" : "No"}`);
  
  return result;
}

// ==================== Example 10: Week 2 Progressive Overload ====================

async function example10_ProgressiveOverload(
  supabase: SupabaseClient,
  week1PlanDayId: string,
  week2PlanDayId: string
) {
  // Week 1: Base interval session
  const week1Options: RunSessionOptions = {
    sessionType: "intervals",
    reps: 6,
    repDistance: "500m",
    restDuration: "90s",
    pace: "Race pace",
    effort: "hard",
  };

  await createRunSession(supabase, week1PlanDayId, week1Options);

  // Week 2: Progressive overload (+2 reps)
  const week2Options: RunSessionOptions = {
    sessionType: "intervals",
    reps: 8, // +2 reps = ~33% more volume
    repDistance: "500m",
    restDuration: "90s",
    pace: "Race pace",
    effort: "hard",
    notes: "Week 2 progression: +2 reps from last week",
  };

  await createRunSession(supabase, week2PlanDayId, week2Options);

  console.log("✅ Progressive overload applied");
  console.log("   Week 1: 6×500m");
  console.log("   Week 2: 8×500m (+33% volume)");
}

// ==================== Export Examples ====================

export const runGeneratorExamples = {
  example1_LongRun,
  example2_Intervals,
  example3_TempoRun,
  example4_HillRepeats,
  example5_RecoveryRun,
  example6_FullWeek,
  example7_ProgressiveProgramme,
  example8_IntegrateWithProgramme,
  example9_AdaptiveProgramme,
  example10_ProgressiveOverload,
};

// ==================== Quick Reference ====================

/*

QUICK REFERENCE: Session Types & Parameters

1. LONG RUN
   - sessionType: "long_run"
   - distance: "6-8km", "8-10km", "10-12km"
   - pace: "Zone 2 (conversational)"
   - effort: "easy"

2. INTERVALS
   - sessionType: "intervals"
   - reps: 6, 8, 10
   - repDistance: "400m", "500m", "1km"
   - restDuration: "60s", "90s", "2min"
   - pace: "Race pace", "5K pace"
   - effort: "hard"

3. TEMPO RUN
   - sessionType: "tempo"
   - distance: "4km", "5-6km", "6-8km"
   - pace: "Steady (Zone 3)", "Threshold"
   - effort: "moderate"

4. HILL REPEATS
   - sessionType: "hills"
   - reps: 6, 8, 10
   - repDistance: "100m", "200m", "300m"
   - hillGradient: "5-8%", "moderate", "steep"
   - restDuration: "Jog down", "Walk down"
   - effort: "hard"

5. RECOVERY RUN
   - sessionType: "recovery"
   - distance: "3-4km", "4-5km"
   - pace: "Very easy (Zone 1)"
   - effort: "easy"

6. FARTLEK
   - sessionType: "fartlek"
   - duration: "30-40min", "40-50min"
   - effort: "moderate"

7. PROGRESSION RUN
   - sessionType: "progression"
   - distance: "6-8km", "8-10km"
   - startPace: "Easy"
   - endPace: "Tempo", "Race pace"
   - effort: "moderate"

*/

