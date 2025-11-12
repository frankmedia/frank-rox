import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Running Generator
 * Creates structured running workouts for personalized training programmes
 */

export type RunSessionType = 
  | "long_run"
  | "intervals" 
  | "tempo"
  | "hills"
  | "recovery"
  | "fartlek"
  | "progression";

export type RunSessionOptions = {
  sessionType: RunSessionType;
  distance?: string; // e.g., "6-8km", "5km"
  duration?: string; // e.g., "45-60min", "30min"
  pace?: string; // e.g., "Zone 2", "Race pace", "Easy"
  effort?: "easy" | "moderate" | "hard";
  
  // For intervals
  reps?: number; // e.g., 6
  repDistance?: string; // e.g., "500m", "1km"
  restDuration?: string; // e.g., "90s", "2min"
  
  // For hills
  hillGradient?: string; // e.g., "5-8%", "moderate"
  
  // For progression runs
  startPace?: string;
  endPace?: string;
  
  // Optional
  notes?: string;
};

type WarningResult = { warnings: string[] };

// ==================== Helper Functions ====================

/**
 * Parse rest duration string to seconds (e.g., "90s" -> 90, "2min" -> 120)
 */
function parseRestToSeconds(rest: string): number {
  const match = rest.match(/(\d+)\s*(s|sec|min)/i);
  if (match) {
    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    return unit.startsWith('min') ? value * 60 : value;
  }
  return 90; // Default 90 seconds
}

async function getNextSessionOrder(supabase: SupabaseClient, planDayId: string): Promise<number> {
  const { data } = await supabase
    .from("sessions")
    .select("order_index")
    .eq("plan_day_id", planDayId)
    .order("order_index", { ascending: false })
    .limit(1);
  return data?.[0]?.order_index ?? 0;
}

async function createSession(
  supabase: SupabaseClient,
  planDayId: string,
  name: string
): Promise<string> {
  const order = await getNextSessionOrder(supabase, planDayId);
  const res = await supabase
    .from("sessions")
    .insert({ plan_day_id: planDayId, name, order_index: order + 1 })
    .select("id")
    .single();
  if (res.error || !res.data?.id) throw res.error ?? new Error("Failed to create session");
  return String(res.data.id);
}

async function createBlock(
  supabase: SupabaseClient,
  sessionId: string,
  blockType: "cardio" | "intervals" | "strength",
  title: string,
  parameters: Record<string, any> = {}
): Promise<string> {
  const res = await supabase
    .from("session_blocks")
    .insert({
      session_id: sessionId,
      block_type: blockType,
      title,
      rounds: parameters.rounds || 1,
      parameters,
    })
    .select("id")
    .single();
  if (res.error || !res.data?.id) throw res.error ?? new Error("Failed to create block");
  return String(res.data.id);
}

async function addItem(
  supabase: SupabaseClient,
  blockId: string,
  exerciseId: string,
  order: number,
  extra: Record<string, any> = {}
) {
  console.log(`🔧 addItem called with extra:`, extra);
  
  const payload: Record<string, any> = {
    block_id: blockId,
    exercise_id: exerciseId,
    status: "draft",
    item_order: order,
  };
  
  // Parse and populate actual columns from extra data
  if (extra.sets) {
    payload.sets = extra.sets;
    console.log(`  ✓ sets: ${payload.sets}`);
  }
  if (extra.reps) payload.reps = extra.reps;
  if (extra.distance) {
    // Convert distance string to meters (e.g., "500m" -> 500, "5km" -> 5000, "8-10km" -> 9000)
    const distStr = String(extra.distance);
    const rangeMatch = distStr.match(/(\d+(?:\.\d+)?)\s*[-–—]\s*(\d+(?:\.\d+)?)\s*(m|km)/i);
    if (rangeMatch) {
      // Handle range (e.g., "8-10km")
      const min = parseFloat(rangeMatch[1]);
      const max = parseFloat(rangeMatch[2]);
      const unit = rangeMatch[3].toLowerCase();
      const avg = (min + max) / 2;
      payload.distance_m = Math.round(unit === 'km' ? avg * 1000 : avg);
      console.log(`📊 Parsed distance range: "${distStr}" -> ${payload.distance_m} meters`);
    } else {
      // Handle single value (e.g., "500m", "5km")
      const distMatch = distStr.match(/(\d+(?:\.\d+)?)\s*(m|km)/i);
      if (distMatch) {
        const value = parseFloat(distMatch[1]);
        const unit = distMatch[2].toLowerCase();
        payload.distance_m = Math.round(unit === 'km' ? value * 1000 : value);
        console.log(`📊 Parsed distance: "${distStr}" -> ${payload.distance_m} meters`);
      } else {
        // Last resort: try to extract any number and assume km
        const numMatch = distStr.match(/(\d+(?:\.\d+)?)/);
        if (numMatch) {
          const value = parseFloat(numMatch[1]);
          // Guess: if < 100, probably km; if >= 100, probably meters
          payload.distance_m = Math.round(value < 100 ? value * 1000 : value);
          console.log(`📊 Parsed distance (fallback): "${distStr}" -> ${payload.distance_m} meters`);
        } else {
          console.warn(`⚠️ Could not parse distance: "${distStr}"`);
        }
      }
    }
  }
  if (extra.duration) {
    // Convert duration string to SECONDS (e.g., "10min" -> 600, "45-60min" -> 3150)
    const durStr = String(extra.duration);
    console.log(`🔍 Parsing duration: "${durStr}"`);
    const durMatch = durStr.match(/(\d+)(?:[-–—](\d+))?\s*min/i);
    if (durMatch) {
      const min = parseInt(durMatch[1]);
      const max = durMatch[2] ? parseInt(durMatch[2]) : min;
      const avgMinutes = (min + max) / 2; // Average if range
      payload.duration_sec = Math.round(avgMinutes * 60); // Convert minutes to SECONDS
      console.log(`✅ Parsed duration: "${durStr}" -> ${avgMinutes} min -> ${payload.duration_sec} seconds`);
      console.log(`   Type check: ${typeof payload.duration_sec}`);
    } else {
      console.error(`❌ FAILED to parse duration: "${durStr}"`);
      console.error(`   Regex did not match!`);
    }
  } else {
    console.log(`⚠️ No duration in extra`);
  }
  if (extra.rest) {
    // Convert rest string to seconds (e.g., "90s" -> 90, "2min" -> 120)
    const restMatch = extra.rest.match(/(\d+)\s*(s|sec|min)/i);
    if (restMatch) {
      const value = parseInt(restMatch[1]);
      const unit = restMatch[2].toLowerCase();
      payload.rest_sec = unit.startsWith('min') ? value * 60 : value;
    }
  }
  if (extra.notes) payload.notes = extra.notes;
  if (extra.pace) {
    // Store pace in extra since there's no dedicated column
    payload.extra = { ...extra, pace: extra.pace };
  } else if (Object.keys(extra).length) {
    payload.extra = extra;
  }
  
  console.log(`💾 Inserting session_block_item:`, {
    sets: payload.sets,
    reps: payload.reps,
    distance_m: payload.distance_m,
    duration_sec: payload.duration_sec,
    rest_sec: payload.rest_sec,
    notes: payload.notes?.substring(0, 50) + '...',
  });
  
  const res = await supabase.from("session_block_items").insert(payload);
  if (res.error) {
    console.error(`❌ Insert failed:`, res.error);
    throw res.error;
  }
  console.log(`✅ Insert successful`);
}

async function findRunExerciseId(supabase: SupabaseClient): Promise<string | null> {
  // Try exact match first
  const exact = await supabase
    .from("exercises")
    .select("id,name")
    .eq("name", "Run")
    .limit(1);
  
  if (!exact.error && exact.data && exact.data.length > 0) {
    return String(exact.data[0].id);
  }

  // Fallback to fuzzy search
  const { data } = await supabase
    .from("exercises")
    .select("id,name")
    .ilike("name", "%run%")
    .limit(20);
  
  if (data && data.length > 0) {
    // Prefer simple "Run" or "Running"
    const simple = data.find((ex: any) => {
      const lower = (ex.name || "").trim().toLowerCase();
      return lower === "run" || lower === "running";
    });
    if (simple) return String(simple.id);

    // Exclude specialized runs
    const sanitized = data.filter((ex: any) => {
      const lower = (ex.name || "").toLowerCase();
      return (
        lower.includes("run") &&
        !lower.includes("interval") &&
        !lower.includes("tempo") &&
        !lower.includes("pace") &&
        !lower.includes("hyrox") &&
        !lower.includes("sprint")
      );
    });
    if (sanitized.length > 0) return String(sanitized[0].id);
  }

  return null;
}

// ==================== Session Builders ====================

async function buildLongRun(
  supabase: SupabaseClient,
  sessionId: string,
  runExerciseId: string,
  options: RunSessionOptions,
  warnings: string[]
) {
  const distance = options.distance || "8km";
  const pace = options.pace || "Zone 2 (conversational)";
  
  // Calculate duration based on distance if not provided
  // Assume ~6:00 min/km pace for Zone 2 running (conversational)
  let duration = options.duration;
  if (!duration && distance) {
    const distanceMatch = distance.match(/(\d+(?:\.\d+)?)/);
    if (distanceMatch) {
      const km = parseFloat(distanceMatch[1]);
      const minutes = Math.round(km * 6); // 6 min/km pace
      duration = `${minutes}min`;
      console.log(`📏 Calculated duration for ${distance}: ${duration} (@ 6:00/km pace)`);
    } else {
      duration = "60min"; // Fallback
    }
  } else if (!duration) {
    duration = "60min"; // Fallback if no distance either
  }

  // Main block
  const blockId = await createBlock(
    supabase,
    sessionId,
    "cardio",
    `Long Run · ${distance}`,
    {
      format: "continuous",
      distance,
      pace,
      duration,
      intensity: "easy",
    }
  );

  await addItem(supabase, blockId, runExerciseId, 0, {
    sets: 1,
    distance, // e.g., "9km"
    pace,
    duration, // e.g., "68min"
    notes: options.notes || "Build aerobic base with steady-state running. Stay conversational.",
  });
}

async function buildIntervals(
  supabase: SupabaseClient,
  sessionId: string,
  runExerciseId: string,
  options: RunSessionOptions,
  warnings: string[]
) {
  const reps = options.reps || 6;
  const repDistance = options.repDistance || "500m";
  const restDuration = options.restDuration || "90s";
  const pace = options.pace || "Race pace";

  // Warm-up
  const warmupId = await createBlock(
    supabase,
    sessionId,
    "cardio",
    "Warm-up · 10min easy",
    { format: "warmup", duration: 10 }
  );
  await addItem(supabase, warmupId, runExerciseId, 0, {
    sets: 1,
    duration: "10min",
    pace: "Easy",
    notes: "Easy jog to prepare for intervals",
  });

  // Main intervals - Create as a CIRCUIT so it uses CircuitWorkoutTimer
  const mainId = await createBlock(
    supabase,
    sessionId,
    "intervals",
    `Intervals · ${reps}×${repDistance}`,
    {
      format_group: true, // Mark as a format group
      format: "circuit", // Use circuit format for interval timer
      rounds: reps, // Number of intervals
      rest_between_rounds: parseRestToSeconds(restDuration), // Rest between intervals in seconds
      intensity: "hard",
    }
  );
  await addItem(supabase, mainId, runExerciseId, 0, {
    sets: 1, // Each round is 1 set
    reps: 1,
    distance: repDistance, // e.g., "500m"
    pace,
    notes: `${repDistance} at ${pace}. Target RPE 8/10 (hard effort). Week 2: Same rounds, but your 8/10 effort will naturally be faster as you adapt. Focus on consistent pacing across all intervals.`,
  });

  // Cool-down
  const cooldownId = await createBlock(
    supabase,
    sessionId,
    "cardio",
    "Cool-down · 5min easy",
    { format: "cooldown", duration: 5 }
  );
  await addItem(supabase, cooldownId, runExerciseId, 0, {
    sets: 1,
    duration: "5min",
    pace: "Easy",
    notes: "Easy jog to flush out lactate",
  });
}

async function buildTempoRun(
  supabase: SupabaseClient,
  sessionId: string,
  runExerciseId: string,
  options: RunSessionOptions,
  warnings: string[]
) {
  const distance = options.distance || "5km";
  const pace = options.pace || "Steady (Zone 3)";
  const duration = options.duration || "25min";

  // Warm-up
  const warmupId = await createBlock(
    supabase,
    sessionId,
    "cardio",
    "Warm-up · 10min easy",
    { format: "warmup", duration: 10 }
  );
  await addItem(supabase, warmupId, runExerciseId, 0, {
    sets: 1,
    duration: "10min",
    pace: "Easy",
    notes: "Gradual warm-up",
  });

  // Tempo block
  const tempoId = await createBlock(
    supabase,
    sessionId,
    "cardio",
    `Tempo Run · ${distance}`,
    {
      format: "tempo",
      distance,
      pace,
      duration,
      intensity: "moderate",
    }
  );
  await addItem(supabase, tempoId, runExerciseId, 0, {
    sets: 1,
    distance,
    pace,
    duration,
    notes: options.notes || "Continuous run at comfortably hard pace. Should feel challenging but sustainable.",
  });

  // Cool-down
  const cooldownId = await createBlock(
    supabase,
    sessionId,
    "cardio",
    "Cool-down · 5min easy",
    { format: "cooldown", duration: 5 }
  );
  await addItem(supabase, cooldownId, runExerciseId, 0, {
    sets: 1,
    duration: "5min",
    pace: "Easy",
  });
}

async function buildHillRepeats(
  supabase: SupabaseClient,
  sessionId: string,
  runExerciseId: string,
  options: RunSessionOptions,
  warnings: string[]
) {
  const reps = options.reps || 6;
  const repDistance = options.repDistance || "200m";
  const gradient = options.hillGradient || "5-8%";
  const restDuration = options.restDuration || "Jog down recovery";

  // Warm-up
  const warmupId = await createBlock(
    supabase,
    sessionId,
    "cardio",
    "Warm-up · 10min easy",
    { format: "warmup", duration: 10 }
  );
  await addItem(supabase, warmupId, runExerciseId, 0, {
    duration: "10min",
    pace: "Easy",
    notes: "Easy jog on flat ground",
  });

  // Hill repeats
  const hillId = await createBlock(
    supabase,
    sessionId,
    "intervals",
    `Hill Repeats · ${reps}×${repDistance}`,
    {
      format: "hills",
      reps,
      distance: repDistance,
      gradient,
      rest: restDuration,
      intensity: "hard",
    }
  );
  await addItem(supabase, hillId, runExerciseId, 0, {
    sets: reps,
    distance: repDistance,
    pace: "Hard effort uphill",
    rest: restDuration,
    notes: `${reps} reps of ${repDistance} uphill (${gradient} gradient). Focus on power and form. ${restDuration}.`,
  });

  // Cool-down
  const cooldownId = await createBlock(
    supabase,
    sessionId,
    "cardio",
    "Cool-down · 5min easy",
    { format: "cooldown", duration: 5 }
  );
  await addItem(supabase, cooldownId, runExerciseId, 0, {
    duration: "5min",
    pace: "Easy",
  });
}

async function buildRecoveryRun(
  supabase: SupabaseClient,
  sessionId: string,
  runExerciseId: string,
  options: RunSessionOptions,
  warnings: string[]
) {
  const distance = options.distance || "3.5km";
  const duration = options.duration || "25min";
  const pace = options.pace || "Very easy (Zone 1)";

  const blockId = await createBlock(
    supabase,
    sessionId,
    "cardio",
    `Recovery Run · ${distance}`,
    {
      format: "recovery",
      distance,
      pace,
      duration,
      intensity: "easy",
    }
  );

  await addItem(supabase, blockId, runExerciseId, 0, {
    distance,
    pace,
    duration,
    notes: options.notes || "Very easy pace. Should feel effortless. Promotes adaptation and active recovery.",
  });
}

async function buildFartlek(
  supabase: SupabaseClient,
  sessionId: string,
  runExerciseId: string,
  options: RunSessionOptions,
  warnings: string[]
) {
  const duration = options.duration || "35min";

  // Warm-up
  const warmupId = await createBlock(
    supabase,
    sessionId,
    "cardio",
    "Warm-up · 10min easy",
    { format: "warmup", duration: 10 }
  );
  await addItem(supabase, warmupId, runExerciseId, 0, {
    duration: "10min",
    pace: "Easy",
  });

  // Fartlek
  const fartlekId = await createBlock(
    supabase,
    sessionId,
    "cardio",
    `Fartlek · ${duration}`,
    {
      format: "fartlek",
      duration,
      intensity: "moderate",
    }
  );
  await addItem(supabase, fartlekId, runExerciseId, 0, {
    duration,
    notes: options.notes || "Unstructured speed play. Mix easy running with surges of 30s-3min at faster paces. Go by feel.",
  });

  // Cool-down
  const cooldownId = await createBlock(
    supabase,
    sessionId,
    "cardio",
    "Cool-down · 5min easy",
    { format: "cooldown", duration: 5 }
  );
  await addItem(supabase, cooldownId, runExerciseId, 0, {
    duration: "5min",
    pace: "Easy",
  });
}

async function buildProgressionRun(
  supabase: SupabaseClient,
  sessionId: string,
  runExerciseId: string,
  options: RunSessionOptions,
  warnings: string[]
) {
  // Randomize between 5-6km if no distance provided
  const randomKm = Math.random() < 0.5 ? 5 : 6;
  const distance = options.distance || `${randomKm}km`;
  const startPace = options.startPace || "Easy";
  const endPace = options.endPace || "Tempo";

  const blockId = await createBlock(
    supabase,
    sessionId,
    "cardio",
    `Progression Run · ${distance}`,
    {
      format: "progression",
      distance,
      startPace,
      endPace,
      intensity: "moderate",
    }
  );

  await addItem(supabase, blockId, runExerciseId, 0, {
    distance,
    notes: options.notes || `Start at ${startPace} and gradually increase pace to ${endPace} by the end. Teaches pacing control.`,
  });
}

// ==================== Main Generator Function ====================

export async function createRunSession(
  supabase: SupabaseClient,
  planDayId: string,
  options: RunSessionOptions
): Promise<WarningResult> {
  const warnings: string[] = [];

  // Find Run exercise in database
  const runExerciseId = await findRunExerciseId(supabase);
  if (!runExerciseId) {
    return { warnings: ["Could not find 'Run' exercise in database. Please add it first."] };
  }

  // Create session name
  const sessionNames: Record<RunSessionType, string> = {
    long_run: "Long Run",
    intervals: "Running Intervals",
    tempo: "Tempo Run",
    hills: "Hill Repeats",
    recovery: "Recovery Run",
    fartlek: "Fartlek",
    progression: "Progression Run",
  };

  const sessionName = sessionNames[options.sessionType] || "Running Session";
  const sessionId = await createSession(supabase, planDayId, sessionName);

  // Build appropriate session type
  try {
    switch (options.sessionType) {
      case "long_run":
        await buildLongRun(supabase, sessionId, runExerciseId, options, warnings);
        break;
      case "intervals":
        await buildIntervals(supabase, sessionId, runExerciseId, options, warnings);
        break;
      case "tempo":
        await buildTempoRun(supabase, sessionId, runExerciseId, options, warnings);
        break;
      case "hills":
        await buildHillRepeats(supabase, sessionId, runExerciseId, options, warnings);
        break;
      case "recovery":
        await buildRecoveryRun(supabase, sessionId, runExerciseId, options, warnings);
        break;
      case "fartlek":
        await buildFartlek(supabase, sessionId, runExerciseId, options, warnings);
        break;
      case "progression":
        await buildProgressionRun(supabase, sessionId, runExerciseId, options, warnings);
        break;
      default:
        warnings.push(`Unknown session type: ${options.sessionType}`);
    }
  } catch (error: any) {
    warnings.push(`Error creating session: ${error.message}`);
  }

  return { warnings };
}

// ==================== Convenience Functions ====================

/**
 * Generate a complete week of running based on user preferences
 */
export async function generateWeekOfRunning(
  supabase: SupabaseClient,
  planDayIds: string[], // Array of 7 plan_day IDs (Mon-Sun)
  preferences: {
    runsPerWeek: number; // 1-5
    includeHills?: boolean;
    focus?: "base" | "build" | "race-prep";
  }
): Promise<WarningResult> {
  const warnings: string[] = [];
  const { runsPerWeek, includeHills, focus } = preferences;

  // Define run schedule based on runs per week
  const schedules: Record<number, RunSessionType[]> = {
    1: ["long_run"],
    2: ["long_run", "intervals"],
    3: ["long_run", "intervals", "tempo"],
    4: ["long_run", "intervals", "tempo", includeHills ? "hills" : "recovery"],
    5: ["long_run", "intervals", "tempo", "hills", "recovery"],
  };

  const sessionTypes = schedules[Math.min(runsPerWeek, 5)] || schedules[1];

  // Day assignments (prefer spreading throughout week)
  const dayAssignments: Record<number, number[]> = {
    1: [5], // Saturday
    2: [1, 5], // Tuesday, Saturday
    3: [1, 3, 5], // Tuesday, Thursday, Saturday
    4: [0, 2, 4, 5], // Monday, Wednesday, Friday, Saturday
    5: [0, 1, 3, 4, 6], // Monday, Tuesday, Thursday, Friday, Sunday
  };

  const days = dayAssignments[Math.min(runsPerWeek, 5)] || [5];

  // Create sessions
  for (let i = 0; i < sessionTypes.length && i < days.length; i++) {
    const sessionType = sessionTypes[i];
    const dayIndex = days[i];
    const planDayId = planDayIds[dayIndex];

    // Adjust parameters based on focus
    const options: RunSessionOptions = {
      sessionType,
      effort: sessionType === "recovery" ? "easy" : sessionType === "long_run" ? "easy" : "hard",
    };

    // Customize based on focus phase
    if (focus === "base") {
      if (sessionType === "long_run") {
        options.distance = "5km";
        options.duration = "40min";
      } else if (sessionType === "intervals") {
        options.reps = 6;
        options.repDistance = "500m";
      }
    } else if (focus === "build") {
      if (sessionType === "long_run") {
        options.distance = "8km";
        options.duration = "60min";
      } else if (sessionType === "intervals") {
        options.reps = 8;
        options.repDistance = "500m";
      }
    } else if (focus === "race-prep") {
      if (sessionType === "long_run") {
        options.distance = "10km";
        options.duration = "75min";
      } else if (sessionType === "intervals") {
        options.reps = 6;
        options.repDistance = "1km";
      }
    }

    const result = await createRunSession(supabase, planDayId, options);
    warnings.push(...result.warnings);
  }

  return { warnings };
}

