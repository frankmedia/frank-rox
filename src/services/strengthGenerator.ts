import type { SupabaseClient } from "@supabase/supabase-js";

export type StrengthPrescription = {
  name: string;
  sets: number;
  reps?: number | null;
  distanceMeters?: number | null;
  durationMinutes?: number | null;
  weightKg?: number | null;
  notes?: string | null;
};

export type StrengthPlanOptions = {
  template: string;
  focus?: string | null;
  sex?: string | null;
  level?: string | null;
  intensity?: string | null;
  exercises: StrengthPrescription[];
};

type WarningResult = { warnings: string[] };

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
  blockType: "cardio" | "strength" | "mobility",
  title: string,
  parameters: Record<string, any> = {}
): Promise<string> {
  const res = await supabase
    .from("session_blocks")
    .insert({
      session_id: sessionId,
      block_type: blockType,
      title,
      rounds: 1,
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
  const payload: Record<string, any> = {
    block_id: blockId,
    exercise_id: exerciseId,
    status: "draft",
    item_order: order,
  };
  if (Object.keys(extra).length) {
    payload.extra = extra;
  }
  const res = await supabase.from("session_block_items").insert(payload);
  if (res.error) throw res.error;
}

async function findExerciseId(
  supabase: SupabaseClient,
  searchTerms: string[],
  options: { modality?: string; exclude?: string[] } = {}
): Promise<string | null> {
  const exclude = (options.exclude || []).map((s) => s.toLowerCase());
  for (const term of searchTerms) {
    const query = supabase
      .from("exercises")
      .select("id,name,modality")
      .ilike("name", `%${term}%`)
      .limit(5);
    const { data, error } = await query;
    if (error || !data?.length) continue;
    const match = data.find((row) => {
      if (options.modality && row.modality?.toLowerCase() !== options.modality.toLowerCase()) {
        return false;
      }
      const name = row.name?.toLowerCase() ?? "";
      return !exclude.some((ex) => name.includes(ex));
    });
    if (match?.id) return String(match.id);
  }
  return null;
}

function parseWeight(weight?: number | string | null): number | null {
  if (!weight && weight !== 0) return null;
  if (typeof weight === "number") return weight;
  const match = String(weight).match(/(\d+(\.\d+)?)/);
  if (!match) return null;
  const parsed = parseFloat(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function createStrengthPlanDay(
  supabase: SupabaseClient,
  planDayId: string,
  options: StrengthPlanOptions
): Promise<WarningResult> {
  const warnings: string[] = [];

  if (!options.exercises.length) {
    return { warnings: ["No exercises selected for strength plan."] };
  }

  const sessionName = `Strength — ${options.template}`;
  const sessionId = await createSession(supabase, planDayId, sessionName);

  // Warm-up block (5 minutes cardio)
  const warmupBlockId = await createBlock(
    supabase,
    sessionId,
    "cardio",
    "Warm-up · 5 min easy effort",
    { format: "cardio", duration: 5 }
  );

  const warmupExerciseId =
    (await findExerciseId(supabase, ["Easy Jog", "Easy Run", "Light Row"], { modality: "cardio" })) ??
    (await findExerciseId(supabase, ["Bike"], { modality: "cardio" })) ??
    (await findExerciseId(supabase, ["Jumping Jacks"], {}));

  if (warmupExerciseId) {
    await addItem(supabase, warmupBlockId, warmupExerciseId, 0, { duration: 5 });
  } else {
    warnings.push("Could not find a suitable warm-up exercise.");
  }

  // Main strength block
  const strengthBlockId = await createBlock(
    supabase,
    sessionId,
    "strength",
    `Strength — ${options.template}`,
    { focus: options.focus, level: options.level, sex: options.sex, intensity: options.intensity }
  );

  let order = 0;
  for (const prescription of options.exercises) {
    const searchTerms = [prescription.name];
    const exerciseId =
      (await findExerciseId(supabase, searchTerms, { modality: "strength" })) ??
      (await findExerciseId(supabase, searchTerms)) ??
      null;

    if (!exerciseId) {
      warnings.push(`Missing exercise in library: ${prescription.name}`);
      continue;
    }

    const extra: Record<string, any> = {};
    if (prescription.sets) extra.sets = prescription.sets;
    if (prescription.reps && prescription.reps > 0) extra.reps = prescription.reps;
    if (prescription.durationMinutes && prescription.durationMinutes > 0) {
      extra.duration = prescription.durationMinutes;
    }
    if (prescription.distanceMeters && prescription.distanceMeters > 0) {
      extra.distance = prescription.distanceMeters / 1000;
    }
    const weight = parseWeight(prescription.weightKg ?? null);
    if (weight) extra.weight = weight;
    if (prescription.notes) extra.notes = prescription.notes;

    await addItem(supabase, strengthBlockId, exerciseId, order++, extra);
  }

  if (order === 0) {
    warnings.push("No strength exercises were added (all missing).");
  }

  // Cool down block
  const cooldownBlockId = await createBlock(
    supabase,
    sessionId,
    "mobility",
    "Cool Down · 5 min easy mobility",
    { format: "mobility", duration: 5 }
  );

  const cooldownExerciseId =
    (await findExerciseId(supabase, ["Mobility Flow", "Stretching"], { modality: "mobility" })) ??
    (await findExerciseId(supabase, ["Walk", "Easy Walk"], { modality: "cardio" })) ??
    warmupExerciseId;

  if (cooldownExerciseId) {
    await addItem(supabase, cooldownBlockId, cooldownExerciseId, 0, { duration: 5 });
  } else {
    warnings.push("Could not find a cool-down exercise.");
  }

  await supabase
    .from("plan_days")
    .update({
      is_rest: false,
      description: `Strength — ${options.template}${options.focus ? ` (${options.focus})` : ""}`,
    })
    .eq("id", planDayId);

  return { warnings };
}


