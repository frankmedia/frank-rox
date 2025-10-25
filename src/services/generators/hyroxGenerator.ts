import { SupabaseClient } from "@supabase/supabase-js";

export type GenerateOptions = {
  template?: "balanced" | "strength" | "engine";
  trainingDays?: number; // how many training days in the visible period
};

// Helper to get or create a session for a plan day
async function getOrCreateSession(supabase: SupabaseClient, planDayId: string, name: string): Promise<string> {
  const existing = await supabase.from("sessions").select("id").eq("plan_day_id", planDayId).limit(1);
  if (!existing.error && existing.data && existing.data[0]) return String(existing.data[0].id);
  const ins = await supabase.from("sessions").insert({ plan_day_id: planDayId, name }).select("id").single();
  if (ins.error) throw ins.error;
  return String(ins.data!.id);
}

// Create a block and return id
async function createBlock(
  supabase: SupabaseClient,
  sessionId: string,
  blockType: "strength" | "cardio" | "intervals" | "circuit",
  title: string
): Promise<string> {
  const res = await supabase
    .from("session_blocks")
    .insert({ session_id: sessionId, block_type: blockType, title, status: "draft" })
    .select("id")
    .single();
  if (res.error) throw res.error;
  return String(res.data!.id);
}

// Insert one item referencing an exercise
async function addItem(
  supabase: SupabaseClient,
  blockId: string,
  exerciseId: string,
  itemOrder = 0
) {
  const res = await supabase
    .from("session_block_items")
    .insert({ block_id: blockId, exercise_id: exerciseId, status: "draft", item_order: itemOrder })
    .select("id")
    .single();
  if (res.error) throw res.error;
  return String(res.data!.id);
}

// Insert only if not already used in the current day
async function addUniqueItem(
  supabase: SupabaseClient,
  blockId: string,
  exerciseId: string,
  usedIds: Set<string>,
  itemOrder = 0
) {
  const idStr = String(exerciseId);
  if (usedIds.has(idStr)) return null;
  const created = await addItem(supabase, blockId, idStr, itemOrder);
  usedIds.add(idStr);
  return created;
}

// Helper: add 2–4 random cardio/erg items (excluding hyrox-run)
async function addRandomCardio(
  supabase: SupabaseClient,
  sessionId: string,
  title = "Cardio Mix",
  usedIds?: Set<string>
) {
  const blockId = await createBlock(supabase, sessionId, "cardio", title);
  const q = await supabase
    .from("exercises")
    .select("id,name,tags,modality")
    .or("modality.eq.cardio,modality.eq.erg")
    .not("tags","ilike","%hyrox-run%")
    .limit(20);
  let list = (q.data || []).map((r:any)=>String(r.id));
  if (usedIds && usedIds.size > 0) list = list.filter(id => !usedIds.has(id));
  if (list.length === 0) return;
  const k = 2 + Math.floor(Math.random() * 3); // 2..4
  // simple shuffle
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  for (let i = 0; i < Math.min(k, list.length); i++) {
    await addUniqueItem(supabase, blockId, list[i], usedIds ?? new Set<string>(), i);
  }
}

// Pick a random exercise id by SQL criteria
async function pickExerciseId(supabase: SupabaseClient, whereSql: string): Promise<string | null> {
  const { data, error } = await supabase.rpc("exec_sql", { sql: `select id from public.exercises where ${whereSql} order by random() limit 1` });
  if (error || !data || !data[0]) {
    // Fallback to regular query if exec_sql is not available
    const q = await supabase.from("exercises").select("id").limit(1);
    if (!q.error && q.data && q.data[0]) return String(q.data[0].id);
    return null;
  }
  return String(data[0].id);
}

// Clear a day (delete items then blocks)
export async function clearDay(supabase: SupabaseClient, planDayId: string) {
  const blks = await supabase
    .from("session_blocks")
    .select("id, sessions!inner(plan_day_id)")
    .eq("sessions.plan_day_id", planDayId);
  if (blks.error) return;
  const ids = (blks.data || []).map((b: any) => b.id);
  if (ids.length === 0) return;
  await supabase.from("session_block_items").delete().in("block_id", ids);
  await supabase.from("session_blocks").delete().in("id", ids);
  // Also remove empty sessions to avoid duplication on subsequent generations
  await supabase.from("sessions").delete().eq("plan_day_id", planDayId);
  // Reset day flags/description
  await supabase.from("plan_days").update({ is_rest: false, description: null }).eq("id", planDayId);
}

// Generate a week across given day ids (guarantee >=2 run days)
export async function generateHyroxWeek(
  supabase: SupabaseClient,
  planId: string,
  dayIds: string[],
  opts: GenerateOptions = {}
) {
  const N = dayIds.length;
  const trainingDays = Math.min(7, Math.max(1, opts.trainingDays ?? 6));

  // Construct mandatory sequence for one week
  const sequence: Array<"Z2"|"TECHNIQUE"|"SIM"|"MOBILITY_UPPER"|"STRENGTH_FOCUS"|"CIRCUIT_AMRAP"> = [
    "Z2",
    "TECHNIQUE",
    "SIM",
  ];
  if (trainingDays >= 4) sequence.push("MOBILITY_UPPER");
  if (trainingDays >= 5) sequence.push("STRENGTH_FOCUS");
  if (trainingDays >= 6) sequence.push("CIRCUIT_AMRAP");

  // Build full schedule: repeat sequence for both weeks (14 days)
  const fullSchedule: Array<typeof sequence[number] | "REST"> = [];
  const weeksCount = Math.ceil(N / 7);
  for (let week = 0; week < weeksCount; week++) {
    for (let d = 0; d < 7; d++) {
      if (d < trainingDays) {
        fullSchedule.push(sequence[d % sequence.length]);
      } else {
        fullSchedule.push("REST");
      }
    }
  }

  // Clear all days first
  for (let i = 0; i < N; i++) {
    await clearDay(supabase, dayIds[i]);
  }

  // Assign training days in order
  for (let i = 0; i < N; i++) {
    const dayId = dayIds[i];
    const slot = fullSchedule[i];
    if (!slot || slot === "REST") {
      await supabase.from("plan_days").update({ is_rest: true, description: "Rest day" }).eq("id", dayId);
      continue;
    }
    await supabase.from("plan_days").update({ is_rest: false }).eq("id", dayId);
    const usedIds = new Set<string>();

    if (slot === "Z2") {
      // Z2 30 min easy run
      await supabase.from("plan_days").update({ description: "Z2 easy run (30 min). Focus on cadence and breathing." }).eq("id", dayId);
      const sessionId = await getOrCreateSession(supabase, dayId, "HYROX – Z2 Run");
      const blk = await createBlock(supabase, sessionId, "cardio", "30 min Easy Run (Z2)");
      // Prefer any exercise that clearly indicates running
      const run = await supabase
        .from("exercises")
        .select("id,name,tags,modality")
        .or("modality.eq.running,modality.eq.cardio")
        .ilike("name","%run%")
        .limit(1)
        .single();
      if (run.data?.id) {
        await addUniqueItem(supabase, blk, String(run.data.id), usedIds, 0);
      } else {
        const fallback = await supabase
          .from("exercises").select("id").ilike("name","%run%")
          .limit(1).single();
        if (fallback.data?.id) await addUniqueItem(supabase, blk, String(fallback.data.id), usedIds, 0);
      }
      continue;
    }

    if (slot === "TECHNIQUE") {
      // Technique: lunges, farmer carries, goblet squats + 2 random mobility
      await supabase.from("plan_days").update({ description: "Technique: lunges, farmer carries, goblet squats + mobility focus." }).eq("id", dayId);
      const sessionId = await getOrCreateSession(supabase, dayId, "HYROX – Technique");
      const strengthBlk = await createBlock(supabase, sessionId, "strength", "Technique Strength");
      const tech = await supabase
        .from("exercises")
        .select("id,name")
        .or("pattern.ilike.%lunge%,name.ilike.%carry%,name.ilike.%farmer%,name.ilike.%goblet%,pattern.ilike.%squat%")
        .eq("modality","strength")
        .limit(5);
      for (let j = 0; j < (tech.data?.length || 0) && j < 3; j++) {
        await addUniqueItem(supabase, strengthBlk, String(tech.data![j].id), usedIds, j);
      }
      const mobBlk = await createBlock(supabase, sessionId, "circuit", "Mobility (2)" );
      const mob = await supabase.from("exercises").select("id").eq("modality","mobility").limit(10);
      // pick two
      for (let j = 0; j < Math.min(2, mob.data?.length || 0); j++) {
        await addUniqueItem(supabase, mobBlk, String(mob.data![j].id), usedIds, j);
      }
      await addRandomCardio(supabase, sessionId, undefined, usedIds);
      continue;
    }

    if (slot === "SIM") {
      // HYROX simulation uses tags to select: hyrox stations and hyrox-run runs
      await supabase.from("plan_days").update({ description: "HYROX simulation: 400m/600m run + station (no sled) ×3; finish with mobility." }).eq("id", dayId);
      const sessionId = await getOrCreateSession(supabase, dayId, "HYROX – Simulation");
      const simBlk = await createBlock(supabase, sessionId, "circuit", "HYROX Simulation");

      // Stations: tagged 'hyrox', excluding sled
      const stationsQ = await supabase
        .from("exercises")
        .select("id,name,tags")
        .ilike("tags","%hyrox%")
        .not("name","ilike","%sled%")
        .limit(12);
      const stations = (stationsQ.data || []).map(r => String(r.id));

      // Runs: tagged 'hyrox-run'. Prefer 400m, otherwise 600m, and keep consistent within this day
      const runsQ = await supabase
        .from("exercises")
        .select("id,name,tags")
        .ilike("tags","%hyrox-run%")
        .limit(10);
      const run400 = (runsQ.data || []).find(r => /400\s*m/i.test(r.name || ""))?.id || runsQ.data?.[0]?.id;
      const run600 = (runsQ.data || []).find(r => /600\s*m/i.test(r.name || ""))?.id || runsQ.data?.[1]?.id || runsQ.data?.[0]?.id;
      const chosenRun = run400 || run600;
      const runIdStr = chosenRun ? String(chosenRun) : undefined;

      // Alternate: run, station, run, station, run, station (max available)
      const order: string[] = [];
      for (let k = 0; k < 3; k++) {
        if (runIdStr) order.push(runIdStr);
        if (stations[k]) order.push(stations[k]);
      }
      for (let idx = 0; idx < order.length; idx++) {
        // For simulation it's okay to repeat the same RUN between stations, but don't repeat stations
        if (/^\d+$/.test(order[idx])) {
          // numeric id string either way
          await addItem(supabase, simBlk, order[idx], idx);
        } else {
          await addItem(supabase, simBlk, order[idx], idx);
        }
      }
      continue;
    }

    if (slot === "MOBILITY_UPPER") {
      await supabase.from("plan_days").update({ description: "Mobility + Upper body strength." }).eq("id", dayId);
      const sessionId = await getOrCreateSession(supabase, dayId, "HYROX – Mobility + Upper");
      const mobBlk = await createBlock(supabase, sessionId, "circuit", "Mobility 15–20 min");
      const mob = await supabase.from("exercises").select("id").eq("modality","mobility").limit(3);
      for (let j = 0; j < (mob.data?.length || 0); j++) {
        await addUniqueItem(supabase, mobBlk, String(mob.data![j].id), usedIds, j);
      }
      const upperBlk = await createBlock(supabase, sessionId, "strength", "Upper Body Strength");
      const upper = await supabase
        .from("exercises").select("id")
        .eq("modality","strength")
        .or("primary_area.ilike.%upper%,pattern.ilike.%press%,pattern.ilike.%row%,pattern.ilike.%pull%")
        .limit(4);
      for (let j = 0; j < (upper.data?.length || 0); j++) {
        await addUniqueItem(supabase, upperBlk, String(upper.data![j].id), usedIds, j);
      }
      await addRandomCardio(supabase, sessionId, undefined, usedIds);
      continue;
    }

    if (slot === "STRENGTH_FOCUS") {
      await supabase.from("plan_days").update({ description: "Main strength focus day." }).eq("id", dayId);
      const sessionId = await getOrCreateSession(supabase, dayId, "HYROX – Strength Focus");
      const blk = await createBlock(supabase, sessionId, "strength", "Compound Lifts");
      const lifts = await supabase.from("exercises").select("id").eq("modality","strength").limit(5);
      for (let j = 0; j < (lifts.data?.length || 0); j++) {
        await addUniqueItem(supabase, blk, String(lifts.data![j].id), usedIds, j);
      }
      await addRandomCardio(supabase, sessionId, undefined, usedIds);
      continue;
    }

    if (slot === "CIRCUIT_AMRAP") {
      await supabase.from("plan_days").update({ description: "Circuit training + AMRAP finisher." }).eq("id", dayId);
      const sessionId = await getOrCreateSession(supabase, dayId, "HYROX – Circuit + AMRAP");
      const circBlk = await createBlock(supabase, sessionId, "circuit", "Mixed Circuit");
      const circ = await supabase.from("exercises").select("id").or("modality.eq.cardio,modality.eq.erg,modality.eq.running").limit(4);
      for (let j = 0; j < (circ.data?.length || 0); j++) {
        await addUniqueItem(supabase, circBlk, String(circ.data![j].id), usedIds, j);
      }
      const finBlk = await createBlock(supabase, sessionId, "circuit", "AMRAP Finisher (10–12 min)");
      const fin = await supabase.from("exercises").select("id").ilike("tags","%amrap%").limit(3);
      for (let j = 0; j < (fin.data?.length || 0); j++) {
        await addUniqueItem(supabase, finBlk, String(fin.data![j].id), usedIds, j);
      }
      await addRandomCardio(supabase, sessionId, undefined, usedIds);
      continue;
    }
  }
}


