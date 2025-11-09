import type { SupabaseClient } from "@supabase/supabase-js";

type TemplateResult = {
  warnings: string[];
};

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
  if (res.error || !res.data?.id) {
    throw res.error ?? new Error("Failed to create session");
  }
  return String(res.data.id);
}

async function createBlock(
  supabase: SupabaseClient,
  sessionId: string,
  blockType: "circuit" | "simulation" | "strength" | "cardio",
  title: string,
  parameters: Record<string, any> = {},
  rounds = 1
): Promise<string> {
  const res = await supabase
    .from("session_blocks")
    .insert({
      session_id: sessionId,
      block_type: blockType,
      title,
      rounds,
      parameters,
    })
    .select("id")
    .single();
  if (res.error || !res.data?.id) {
    throw res.error ?? new Error("Failed to create block");
  }
  return String(res.data.id);
}

async function addBlockItem(
  supabase: SupabaseClient,
  blockId: string,
  exerciseId: string,
  itemOrder: number,
  extra: Record<string, any> = {}
) {
  const res = await supabase
    .from("session_block_items")
    .insert({
      block_id: blockId,
      exercise_id: exerciseId,
      status: "draft",
      item_order: itemOrder,
      extra: Object.keys(extra).length ? extra : undefined,
    });
  if (res.error) throw res.error;
}

async function findExerciseId(
  supabase: SupabaseClient,
  searchTerms: string[],
  excludePatterns: string[] = []
): Promise<string | null> {
  for (const term of searchTerms) {
    const query = await supabase
      .from("exercises")
      .select("id,name")
      .ilike("name", `%${term}%`);

    if (query.data && query.data.length > 0) {
      const match = query.data.find((row: any) => {
        const name = (row.name || "").toLowerCase();
        return !excludePatterns.some((pattern) => name.includes(pattern));
      });
      if (match?.id) {
        return String(match.id);
      }
    }
  }
  return null;
}

export async function createHyroxFullSimulationInDay(
  supabase: SupabaseClient,
  planDayId: string
): Promise<TemplateResult> {
  const warnings: string[] = [];

  const hyroxStations = [
    { name: "SkiErg 1000m", searchTerms: ["SkiErg", "Ski Erg"], distance: 1000 },
    { name: "Sled Push", searchTerms: ["Sled Push", "Hyrox Sled Push"], distance: 50, weight: "152kg" },
    { name: "Sled Pull", searchTerms: ["Sled Pull", "Hyrox Sled Pull"], distance: 50, weight: "103kg" },
    { name: "Burpee Broad Jump", searchTerms: ["Burpee Broad Jump"], distance: 80 },
    { name: "Row 1000m", searchTerms: ["Row 1000", "Row 1km", "Row - 1000"], distance: 1000 },
    { name: "Farmer Carry", searchTerms: ["Farmer Carry Hyrox", "KB Farmer Carry"], distance: 200, weight: "2x24kg" },
    { name: "Sandbag Lunges", searchTerms: ["Sandbag Lunge Hyrox", "Sandbag Lunge"], distance: 100, weight: "30kg" },
    { name: "Wall Balls", searchTerms: ["Wall Ball"], reps: 100, weight: "6kg" },
  ];

  const sessionId = await createSession(supabase, planDayId, "Hyrox Simulation (Open)");
  const blockId = await createBlock(
    supabase,
    sessionId,
    "simulation",
    "Hyrox Sim - 8 Stations + Runs",
    { format: "simulation", race_type: "hyrox", sequential: true, track_splits: true },
    1
  );

  const runExerciseId =
    (await findExerciseId(supabase, ["1km Run Hyrox Pace", "1km Run", "1km"], [])) ??
    (await findExerciseId(supabase, ["400m Run", "600m Run"], []));

  if (!runExerciseId) {
    warnings.push("Could not find a 1km run exercise.");
  }

  let itemOrder = 0;

  for (const station of hyroxStations) {
    if (runExerciseId) {
      await addBlockItem(supabase, blockId, runExerciseId, itemOrder++, { distance: 1 });
    }

    const stationId = await findExerciseId(
      supabase,
      station.searchTerms,
      ["hold", "knees", "assisted", "trx", "deficit", "broad jump"] // filter variants
    );
    if (!stationId) {
      warnings.push(`Missing station exercise: ${station.name}`);
      continue;
    }

    const extra: Record<string, any> = {};
    if (station.distance !== undefined) {
      extra.distance = station.distance / 1000; // meters to km
    }
    if (station.reps !== undefined) {
      extra.reps = station.reps;
      extra.sets = 1;
    }
    if (station.weight) {
      extra.weight = station.weight;
    }

    await addBlockItem(supabase, blockId, stationId, itemOrder++, extra);
  }

  await supabase
    .from("plan_days")
    .update({
      is_rest: false,
      description: "Hyrox Simulation: 1km runs between the 8 stations (Open weights).",
    })
    .eq("id", planDayId);

  return { warnings };
}

export async function createHyroxHalfSimulationInDay(
  supabase: SupabaseClient,
  planDayId: string
): Promise<TemplateResult> {
  const warnings: string[] = [];

  // ½ Hyrox specification: 500m run between stations, station distances/reps halved
  const stations = [
    { name: "SkiErg 500m", searchTerms: ["SkiErg 500", "SkiErg", "Ski Erg"], distance: 500 },
    { name: "Sled Push 25m", searchTerms: ["Sled Push", "Hyrox Sled Push"], distance: 25 },
    { name: "Sled Pull 25m", searchTerms: ["Sled Pull", "Hyrox Sled Pull"], distance: 25 },
    { name: "Burpee Broad Jump 40m", searchTerms: ["Burpee Broad Jump"], distance: 40 },
    { name: "Row 500m", searchTerms: ["Row 500", "Row 500m", "Row 0.5km", "Row 1km", "Row 1000"], distance: 500 },
    { name: "Farmer Carry 100m", searchTerms: ["Farmer Carry Hyrox", "KB Farmer Carry", "Farmer Carry"], distance: 100 },
    { name: "Sandbag Lunges 50m", searchTerms: ["Sandbag Lunge Hyrox", "Sandbag Lunge"], distance: 50 },
    { name: "Wall Balls 50", searchTerms: ["Wall Ball"], reps: 50 },
  ];

  const sessionId = await createSession(supabase, planDayId, "Hyrox Simulation (Half)");
  const blockId = await createBlock(
    supabase,
    sessionId,
    "simulation",
    "Hyrox Half Sim - 8 Stations + Runs",
    { format: "simulation", race_type: "hyrox-half", sequential: true, track_splits: true },
    1
  );

  const runId =
    (await findExerciseId(supabase, ["500m Run", "0.5km Run"], [])) ??
    (await findExerciseId(supabase, ["400m Run", "600m Run", "1km Run"], []));

  if (!runId) {
    warnings.push("Could not find a 500m run exercise for the half simulation.");
  }

  let itemOrder = 0;
  for (const station of stations) {
    if (runId) {
      await addBlockItem(supabase, blockId, runId, itemOrder++, { distance: 0.5 });
    }
    const stationId = await findExerciseId(supabase, station.searchTerms, ["hold", "knees", "assisted", "trx", "deficit"]);
    if (!stationId) {
      warnings.push(`Missing station: ${station.name}`);
      continue;
    }
    const extra: Record<string, any> = {};
    if (station.distance !== undefined) extra.distance = station.distance / 1000;
    if (station.weight) extra.weight = station.weight;
    if (station.reps !== undefined) {
      extra.reps = station.reps;
      extra.sets = 1;
    }
    await addBlockItem(supabase, blockId, stationId, itemOrder++, extra);
  }

  await supabase
    .from("plan_days")
    .update({
      is_rest: false,
      description: "Hyrox Half Simulation: 500m runs between 8 halved stations.",
    })
    .eq("id", planDayId);

  return { warnings };
}

export async function createGeorgeWorkoutInDay(
  supabase: SupabaseClient,
  planDayId: string
): Promise<TemplateResult> {
  const warnings: string[] = [];

  const exercises = [
    { name: "Squats", searchTerms: ["Air Squat", "Bodyweight Squat", "BW Squat"], reps: 20 },
    { name: "Burpees", searchTerms: ["Burpee"], reps: 20 },
    { name: "Sit-ups", searchTerms: ["Sit-up", "Abmat Sit-up"], reps: 20 },
    { name: "Push-ups", searchTerms: ["Push-up", "Standard Push"], reps: 20 },
  ];

  const sessionId = await createSession(supabase, planDayId, "George (For Time)");
  const blockId = await createBlock(
    supabase,
    sessionId,
    "simulation",
    "George - For Time",
    { format: "simulation", race_type: "george", sequential: true },
    1
  );

  const runId =
    (await findExerciseId(supabase, ["1km Run", "1km"], [])) ??
    (await findExerciseId(supabase, ["Run"], ["walk"]));
  if (!runId) {
    warnings.push("Could not find 1km run for George workout.");
  }

  let itemOrder = 0;
  if (runId) {
    await addBlockItem(supabase, blockId, runId, itemOrder++, { distance: 1 });
  }

  const ids: Record<string, string> = {};
  for (const entry of exercises) {
    const id = await findExerciseId(
      supabase,
      entry.searchTerms,
      ["hold", "knees", "assisted", "elevated", "deficit", "trx"]
    );
    if (!id) {
      warnings.push(`Could not find ${entry.name}.`);
    } else {
      ids[entry.name] = id;
    }
  }

  for (let round = 0; round < 5; round++) {
    for (const entry of exercises) {
      const id = ids[entry.name];
      if (!id) continue;
      await addBlockItem(supabase, blockId, id, itemOrder++, { sets: 1, reps: entry.reps });
    }
  }

  if (runId) {
    await addBlockItem(supabase, blockId, runId, itemOrder++, { distance: 1 });
  }

  await supabase
    .from("plan_days")
    .update({
      is_rest: false,
      description: "George: 1km run, 5 rounds of 20 Squats/Burpees/Sit-ups/Push-ups, 1km run.",
    })
    .eq("id", planDayId);

  return { warnings };
}

export async function createDominoWorkoutInDay(
  supabase: SupabaseClient,
  planDayId: string
): Promise<TemplateResult> {
  const warnings: string[] = [];

  const sessionId = await createSession(supabase, planDayId, "Domino (For Time)");
  const blockId = await createBlock(
    supabase,
    sessionId,
    "simulation",
    "Domino - For Time",
    { format: "simulation", race_type: "domino", sequential: true },
    1
  );

  const runId =
    (await findExerciseId(supabase, ["1km Run", "Run"], ["walk"])) ??
    (await findExerciseId(supabase, ["800m Run"], []));
  if (!runId) warnings.push("Could not find a 1km run exercise for Domino.");

  const squatId = await findExerciseId(supabase, ["Air Squat", "Bodyweight Squat"], ["hold", "jump"]);
  if (!squatId) warnings.push("Could not find Squat exercise for Domino.");
  const burpeeId = await findExerciseId(supabase, ["Burpee"], ["pull", "box"]);
  if (!burpeeId) warnings.push("Could not find Burpee exercise for Domino.");
  const pushupId = await findExerciseId(supabase, ["Push-up"], ["ring", "assisted"]);
  if (!pushupId) warnings.push("Could not find Push-up exercise for Domino.");
  const situpId = await findExerciseId(supabase, ["Sit-up", "Abmat"], ["hold"]);
  if (!situpId) warnings.push("Could not find Sit-up exercise for Domino.");

  let itemOrder = 0;

  const addRun = async () => {
    if (runId) {
      await addBlockItem(supabase, blockId, runId, itemOrder++, { distance: 1 });
    }
  };

  await addRun();

  const addStrength = async (id: string | null, reps: number) => {
    if (!id) return;
    await addBlockItem(supabase, blockId, id, itemOrder++, { sets: 1, reps });
  };

  await addStrength(squatId, 50);
  await addStrength(burpeeId, 50);
  await addRun();
  await addStrength(pushupId, 50);
  await addStrength(situpId, 50);
  await addRun();

  await supabase
    .from("plan_days")
    .update({
      is_rest: false,
      description: "Domino: 1km run between sets of 50 squats, burpees, push-ups, sit-ups.",
    })
    .eq("id", planDayId);

  return { warnings };
}

export async function createCombsWorkoutInDay(
  supabase: SupabaseClient,
  planDayId: string
): Promise<TemplateResult> {
  const warnings: string[] = [];

  const sessionId = await createSession(supabase, planDayId, "Combs (For Time)");
  const blockId = await createBlock(
    supabase,
    sessionId,
    "simulation",
    "Combs - For Time",
    { format: "simulation", race_type: "combs", sequential: true },
    1
  );

  const squatId = await findExerciseId(supabase, ["Air Squat", "Squat"], ["hold", "jump", "wall"]);
  if (!squatId) warnings.push("Could not find Squat exercise for Combs.");

  const run400 = await findExerciseId(supabase, ["400m Run"], []);
  const run800 = await findExerciseId(supabase, ["800m Run"], []);
  const run1600 =
    (await findExerciseId(supabase, ["1600m Run", "1 Mile Run"], [])) ??
    (await findExerciseId(supabase, ["1 Mile"], []));

  if (!run400) warnings.push("Missing 400m run for Combs.");
  if (!run800) warnings.push("Missing 800m run for Combs.");
  if (!run1600) warnings.push("Missing 1600m run for Combs.");

  let itemOrder = 0;

  if (squatId) {
    await addBlockItem(supabase, blockId, squatId, itemOrder++, { sets: 1, reps: 60 });
  }
  if (run400) {
    await addBlockItem(supabase, blockId, run400, itemOrder++, { distance: 0.4 });
  }
  if (squatId) {
    await addBlockItem(supabase, blockId, squatId, itemOrder++, { sets: 1, reps: 40 });
  }
  if (run800) {
    await addBlockItem(supabase, blockId, run800, itemOrder++, { distance: 0.8 });
  }
  if (squatId) {
    await addBlockItem(supabase, blockId, squatId, itemOrder++, { sets: 1, reps: 20 });
  }
  if (run1600) {
    await addBlockItem(supabase, blockId, run1600, itemOrder++, { distance: 1.6 });
  }

  await supabase
    .from("plan_days")
    .update({
      is_rest: false,
      description: "Combs: 60/40/20 squats broken up by 400m, 800m, 1600m runs (for time).",
    })
    .eq("id", planDayId);

  return { warnings };
}

export async function createBenningtonWorkoutInDay(
  supabase: SupabaseClient,
  planDayId: string
): Promise<TemplateResult> {
  const warnings: string[] = [];

  const sessionId = await createSession(supabase, planDayId, "Bennington (For Time)");
  const blockId = await createBlock(
    supabase,
    sessionId,
    "simulation",
    "Bennington - For Time",
    { format: "simulation", race_type: "bennington", sequential: true },
    1
  );

  const runId =
    (await findExerciseId(supabase, ["2km Run", "2 km Run"], [])) ??
    (await findExerciseId(supabase, ["1km Run"], []));
  if (!runId) warnings.push("Could not find 2km run for Bennington.");

  const pushUpId = await findExerciseId(supabase, ["Push-up"], ["ring", "assisted"]);
  if (!pushUpId) warnings.push("Could not find Push-up exercise for Bennington.");
  const squatId = await findExerciseId(supabase, ["Air Squat", "Bodyweight Squat"], ["hold", "jump"]);
  if (!squatId) warnings.push("Could not find Squat exercise for Bennington.");

  let itemOrder = 0;

  if (runId) await addBlockItem(supabase, blockId, runId, itemOrder++, { distance: 2 });
  if (pushUpId) await addBlockItem(supabase, blockId, pushUpId, itemOrder++, { sets: 1, reps: 100 });
  if (squatId) await addBlockItem(supabase, blockId, squatId, itemOrder++, { sets: 1, reps: 200 });
  if (runId) await addBlockItem(supabase, blockId, runId, itemOrder++, { distance: 2 });

  await supabase
    .from("plan_days")
    .update({
      is_rest: false,
      description: "Bennington: 2km run, 100 push-ups, 200 squats, 2km run (for time).",
    })
    .eq("id", planDayId);

  return { warnings };
}


