import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/utils/supabaseClient";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  createBenningtonWorkoutInDay,
  createCombsWorkoutInDay,
  createDominoWorkoutInDay,
  createGeorgeWorkoutInDay,
  createHyroxFullSimulationInDay,
  createHyroxHalfSimulationInDay,
} from "@/services/hyroxTemplates";
import { createStrengthPlanDay } from "@/services/strengthGenerator";
import armsIconUrl from "@/icons/exercises/arms.svg?url";
import backIconUrl from "@/icons/exercises/back.svg?url";
import chestIconUrl from "@/icons/exercises/chest.svg?url";
import coreIconUrl from "@/icons/exercises/core.svg?url";
import compoundIconUrl from "@/icons/exercises/compound.svg?url";
import legsIconUrl from "@/icons/exercises/legs.svg?url";
import shouldersIconUrl from "@/icons/exercises/shoulders.svg?url";

type TrainingLevel = "Beginner" | "Intermediate" | "Advanced";
type SexSelection = "Male" | "Female" | null;
type SexKey = "male" | "female" | "neutral";
type EquipmentKey = "barbell" | "dumbbell" | "kettlebell" | "machine" | "bodyweight" | "carry";

const weightBrackets: Record<EquipmentKey, Record<SexKey, Record<TrainingLevel, string>>> = {
  barbell: {
    male: { Beginner: "20 kg", Intermediate: "60 kg", Advanced: "120 kg" },
    female: { Beginner: "15 kg", Intermediate: "35 kg", Advanced: "80 kg" },
    neutral: { Beginner: "18 kg", Intermediate: "48 kg", Advanced: "100 kg" },
  },
  dumbbell: {
    male: { Beginner: "10 kg", Intermediate: "20 kg", Advanced: "35 kg" },
    female: { Beginner: "6 kg", Intermediate: "12 kg", Advanced: "20 kg" },
    neutral: { Beginner: "8 kg", Intermediate: "16 kg", Advanced: "28 kg" },
  },
  kettlebell: {
    male: { Beginner: "8 kg", Intermediate: "16 kg", Advanced: "24 kg" },
    female: { Beginner: "6 kg", Intermediate: "12 kg", Advanced: "16 kg" },
    neutral: { Beginner: "7 kg", Intermediate: "14 kg", Advanced: "20 kg" },
  },
  machine: {
    male: { Beginner: "25 kg", Intermediate: "50 kg", Advanced: "100 kg" },
    female: { Beginner: "20 kg", Intermediate: "40 kg", Advanced: "70 kg" },
    neutral: { Beginner: "22 kg", Intermediate: "45 kg", Advanced: "85 kg" },
  },
  bodyweight: {
    male: { Beginner: "Bodyweight", Intermediate: "Bodyweight + tempo", Advanced: "Bodyweight + weighted vest" },
    female: { Beginner: "Bodyweight", Intermediate: "Bodyweight + tempo", Advanced: "Bodyweight + weighted vest" },
    neutral: { Beginner: "Bodyweight", Intermediate: "Bodyweight + tempo", Advanced: "Bodyweight + weighted vest" },
  },
  carry: {
    male: { Beginner: "Light implement", Intermediate: "Moderate implement", Advanced: "Heavy implement" },
    female: { Beginner: "Light implement", Intermediate: "Moderate implement", Advanced: "Heavy implement" },
    neutral: { Beginner: "Light implement", Intermediate: "Moderate implement", Advanced: "Heavy implement" },
  },
};

const equipmentDisplay: Record<EquipmentKey, string> = {
  barbell: "Barbell",
  dumbbell: "Dumbbell",
  kettlebell: "Kettlebell",
  machine: "Machine",
  bodyweight: "Bodyweight",
  carry: "Carry",
};

type StrengthSummaryItem = {
  name: string;
  modality: "strength" | "core" | "carry";
  equipment: EquipmentKey;
  setsRepsLabel: string;
  recommendedWeight: string;
  sets: number;
  reps?: number | null;
  distanceMeters?: number | null;
  durationMinutes?: number | null;
  numericWeight?: number | null;
  weightNote?: string | null;
};

function mapSexKey(selection: SexSelection): SexKey {
  if (selection === "Male") return "male";
  if (selection === "Female") return "female";
  return "neutral";
}

function getSetsReps(level: TrainingLevel, modality: "strength" | "core" | "carry"): string {
  if (modality === "core") {
    const table: Record<TrainingLevel, string> = { Beginner: "3×12", Intermediate: "3×15", Advanced: "4×20" };
    return table[level];
  }
  if (modality === "carry") {
    const table: Record<TrainingLevel, string> = { Beginner: "3×20 m", Intermediate: "4×30 m", Advanced: "5×40 m" };
    return table[level];
  }
  const table: Record<TrainingLevel, string> = { Beginner: "3×12", Intermediate: "4×10", Advanced: "5×5" };
  return table[level];
}

function getRecommendedWeight(equipment: EquipmentKey, sex: SexSelection, level: TrainingLevel): string {
  const sexKey = mapSexKey(sex);
  return weightBrackets[equipment]?.[sexKey]?.[level] ?? weightBrackets[equipment]?.male?.[level] ?? "";
}

function inferModality(exerciseName: string): "strength" | "core" | "carry" {
  const lower = exerciseName.toLowerCase();
  if (lower.includes("carry") || lower.includes("farmer") || lower.includes("sled") || lower.includes("yoke")) {
    return "carry";
  }
  if (
    lower.includes("plank") ||
    lower.includes("sit") ||
    lower.includes("crunch") ||
    lower.includes("hollow") ||
    lower.includes("dead bug") ||
    lower.includes("core") ||
    lower.includes("ab")
  ) {
    return "core";
  }
  return "strength";
}

function inferEquipment(exerciseName: string, selectedEquipment: string[]): EquipmentKey {
  const lower = exerciseName.toLowerCase();
  // 1) Always treat common bodyweight/core movements as bodyweight,
  //    regardless of available equipment selections.
  if (
    lower.includes("plank") ||
    lower.includes("push-up") ||
    lower.includes("pushup") ||
    lower.includes("handstand push-up") ||
    lower.includes("hspu") ||
    lower.includes("pull-up") ||
    lower.includes("chin-up") ||
    lower.includes("sit-up") ||
    lower.includes("situp") ||
    lower.includes("crunch") ||
    lower.includes("dip") ||
    lower.includes("burpee") ||
    lower.includes("air squat") ||
    lower.includes("box jump") ||
    lower.includes("jumping jack") ||
    lower.includes("mountain climber") ||
    lower.includes("pistol squat") ||
    lower.includes("l-sit") ||
    lower.includes("ring") ||
    lower.includes("leg raise") ||
    lower.includes("hanging leg") ||
    lower.includes("hollow") ||
    lower.includes("v-up") ||
    lower.includes("bodyweight")
  ) {
    return "bodyweight";
  }

  // 2) Carries
  if (lower.includes("carry") || lower.includes("farmer") || lower.includes("sled")) {
    return "carry";
  }

  // 3) Explicit mentions in the exercise name
  if (lower.includes("barbell")) return "barbell";
  if (lower.includes("dumbbell") || lower.includes("db")) return "dumbbell";
  if (lower.includes("kettlebell") || lower.includes("kb")) return "kettlebell";
  if (lower.includes("machine") || lower.includes("cable")) return "machine";

  // 4) Fallback to user's available equipment only if not clearly bodyweight/core
  if (selectedEquipment.includes("Barbell") || selectedEquipment.includes("Squat Rack")) return "barbell";
  if (selectedEquipment.includes("Dumbbells")) return "dumbbell";
  if (selectedEquipment.includes("Kettlebells")) return "kettlebell";
  if (selectedEquipment.includes("Machines") || selectedEquipment.includes("Cables")) return "machine";

  // 5) Default
  return "bodyweight";
}

const HorizontalRow = ({
  title,
  itemPrefix,
  itemCount = 8,
  hyroxDownloads = false,
  customItems,
  configureMode = false,
  onPlanGenerated,
}: {
  title: string;
  itemPrefix: string;
  itemCount?: number;
  hyroxDownloads?: boolean;
  customItems?: string[];
  configureMode?: boolean;
  onPlanGenerated?: () => void | Promise<void>;
}) => {
  const hyroxNames = ["HYROX Full Simulation", "HYROX Half Simulation", "George", "Domino", "Combs", "Bennington"];
  const items = customItems
    ? customItems
    : hyroxDownloads
    ? hyroxNames
    : Array.from({ length: itemCount }).map((_, i) => `${itemPrefix} ${i + 1}`);
  const hyroxDescriptions: Record<string, string> = {
    "HYROX Half Simulation": "Half distances: 500m runs and halved station volumes across all 8 stations.",
    George: "For time chipper: 1km run, five rounds of 20 squats, burpees, sit‑ups, push‑ups, then a 1km run.",
    Domino: "For time: 5‑min run, 50 squats, 50 burpees, 5‑min run, 50 push-ups, 5‑min run, 50 sit-ups.",
    Combs: "For time ladder: 60/40/20 squats broken up by 400m, 800m and 1600m runs.",
    Bennington: "For time: 2km run, 100 push-ups, 200 squats, finish with another 2km run.",
  };
  const [active, setActive] = useState(0);
  const [api, setApi] = useState<any>(null);
  useEffect(() => {
    if (!api) return;
    const onSelect = () => setActive(api.selectedScrollSnap());
    api.on("select", onSelect);
    onSelect();
    return () => api.off("select", onSelect);
  }, [api]);

  const { allExercises, refresh } = useData();
  const { user: authUser } = useAuth();
  const [loadingDays, setLoadingDays] = useState(false);
  const [planDays, setPlanDays] = useState<Array<{ id: string; day_index: number; free: boolean }>>([]);
  const [selectedPlanDay, setSelectedPlanDay] = useState<{ id: string; label: string } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const progressTimerRef = useRef<number | null>(null);
  const startFakeProgress = (durationMs = 3000) => {
    setGenProgress(0);
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const fraction = Math.min(elapsed / durationMs, 0.9);
      setGenProgress(Math.round(fraction * 100));
      if (fraction < 0.9) {
        progressTimerRef.current = requestAnimationFrame(tick);
      }
    };
    progressTimerRef.current = requestAnimationFrame(tick);
    return () => {
      if (progressTimerRef.current) {
        cancelAnimationFrame(progressTimerRef.current);
        progressTimerRef.current = null;
      }
      setGenProgress(100);
    };
  };

  const [openConfig, setOpenConfig] = useState(false);
  const [configTarget, setConfigTarget] = useState<string | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [preference, setPreference] = useState<string | null>(null);
  const [configStep, setConfigStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [selectedPlanDayState, setSelectedPlanDayState] = useState<{ id: string; label: string } | null>(null);
  const [selectedPrimary, setSelectedPrimary] = useState<string[]>([]);
  const [selectedSex, setSelectedSex] = useState<SexSelection>(null);
  const [selectedLevel, setSelectedLevel] = useState<TrainingLevel | null>(null);
  const [selectedIntensity, setSelectedIntensity] = useState<"Easy" | "Moderate" | "Hard">("Moderate");
  const equipmentOptions = [
    "Barbell",
    "Dumbbells",
    "Cables",
    "Resistance Bands",
    "Bench",
    "Squat Rack",
    "Kettlebells",
    "Machines",
  ];
  type DbExercise = { name: string; tags: string[] };
  const [primaryFromDb, setPrimaryFromDb] = useState<DbExercise[]>([]);
  const [loadingPrimary, setLoadingPrimary] = useState(false);

  const loadFreeDays = async () => {
    if (!authUser?.clientId) return;
    setLoadingDays(true);
    try {
      const { data: plan } = await supabase
        .from("plans")
        .select("id")
        .eq("client_id", authUser.clientId)
        .eq("status", "active")
        .single();
      if (!plan?.id) {
        setPlanDays([]);
        return;
      }
      const { data: days } = await supabase
        .from("plan_days")
        .select("id, day_index, is_rest, description")
        .eq("plan_id", plan.id)
        .order("day_index", { ascending: true });
      const ids = (days || []).map((d: any) => d.id);
      let sessionsByDay: Record<string, number> = {};
      if (ids.length > 0) {
        const { data: sessions } = await supabase
          .from("sessions")
          .select("id, plan_day_id")
          .in("plan_day_id", ids);
        (sessions || []).forEach((s: any) => {
          const k = String(s.plan_day_id);
          sessionsByDay[k] = (sessionsByDay[k] || 0) + 1;
        });
      }
      const mapped = (days || []).map((d: any) => {
        const hasSessions = (sessionsByDay[String(d.id)] || 0) > 0;
        const free = !hasSessions && (!d.description || d.description === "");
        return { id: String(d.id), day_index: Number(d.day_index), free };
      });
      setPlanDays(mapped);
    } finally {
      setLoadingDays(false);
    }
  };

  useEffect(() => {
    if (openConfig && configStep === 5) {
      loadFreeDays();
    }
  }, [openConfig, configStep, authUser?.clientId]);

  useEffect(() => {
    if (!selectedPlanDayState && planDays.length > 0) {
      const firstFree = planDays.find((d) => d.free);
      if (firstFree) {
        setSelectedPlanDayState({ id: firstFree.id, label: `Day ${firstFree.day_index + 1}` });
      }
    }
  }, [planDays, selectedPlanDayState]);

  useEffect(() => {
    if (!openConfig) {
      setPlanDays([]);
      setSelectedPlanDayState(null);
    }
  }, [openConfig]);

  const toggleEquipment = (eq: string) => {
    setSelectedEquipment((prev) => (prev.includes(eq) ? prev.filter((e) => e !== eq) : [...prev, eq]));
  };

  useEffect(() => {
    // Prefill defaults from onboarding if available
    try {
      const raw = localStorage.getItem("onboarding_profile");
      if (raw) {
        const parsed = JSON.parse(raw);
        const answers = parsed?.answers || {};
        if (!selectedSex) {
          const g = answers.gender;
          if (g === "Male" || g === "Female") setSelectedSex(g);
        }
        if (!selectedLevel) {
          const exp = answers.experience;
          if (exp === "Beginner" || exp === "Intermediate" || exp === "Advanced") {
            setSelectedLevel(exp);
          }
        }
      }
    } catch {}
  }, [openConfig]);  

  useEffect(() => {
    const fetchPrimary = async () => {
      try {
        setLoadingPrimary(true);
        const { data, error } = await supabase.from("exercises").select("name,tags").limit(200);
        if (error) throw error;
        const parsed: DbExercise[] = (data || [])
          .map((row: any) => {
            let tagsArr: string[] = [];
            if (Array.isArray(row.tags)) {
              tagsArr = row.tags;
            } else if (typeof row.tags === "string") {
              try {
                const j = JSON.parse(row.tags);
                tagsArr = Array.isArray(j) ? j : String(row.tags).split(",");
              } catch {
                tagsArr = String(row.tags).split(",");
              }
            }
            tagsArr = tagsArr.map((t) => String(t).trim().toLowerCase()).filter(Boolean);
            return { name: row.name, tags: tagsArr };
          })
          .filter((r) => r.name && r.tags?.includes("primary"));
        const uniqueByName = Array.from(new Map(parsed.map((p) => [p.name, p])).values());
        setPrimaryFromDb(uniqueByName);
      } catch (e) {
        console.error("Failed to load primary exercises from Supabase:", e);
      } finally {
        setLoadingPrimary(false);
      }
    };
    if (openConfig && configStep === 2) {
      fetchPrimary();
    }
  }, [openConfig, configStep]);

  const parseSetsRepsLabel = (label: string, modality: "strength" | "core" | "carry") => {
    const clean = label.replace(/\s+/g, " ").trim();
    const match = clean.match(/(\d+)\s*×\s*([\d.]+)\s*([a-zA-Z]+)?/);
    if (match) {
      const sets = parseInt(match[1], 10) || 3;
      const value = parseFloat(match[2]);
      const unit = match[3]?.toLowerCase();
      if (unit?.startsWith("m")) {
        return { sets, distanceMeters: value };
      }
      if (unit?.startsWith("sec")) {
        return { sets, durationMinutes: value / 60 };
      }
      if (unit?.startsWith("min")) {
        return { sets, durationMinutes: value };
      }
      return { sets, reps: Math.round(value) };
    }
    if (modality === "carry") return { sets: 3, distanceMeters: 20 };
    if (modality === "core") return { sets: 3, reps: 15 };
    return { sets: 3, reps: 12 };
  };

  const buildStrengthSummary = (): StrengthSummaryItem[] => {
    if (!selectedPrimary.length) return [];
    const level = (selectedLevel ?? "Beginner") as TrainingLevel;
    return selectedPrimary.map((exercise) => {
      const modality = inferModality(exercise);
      const setsRepsLabel = getSetsReps(level, modality);
      const equipmentKey = inferEquipment(exercise, selectedEquipment);
      const recommendedWeight = getRecommendedWeight(equipmentKey, selectedSex, level);
      const parsed = parseSetsRepsLabel(setsRepsLabel, modality);
      const matchWeight = recommendedWeight ? recommendedWeight.match(/(\d+(\.\d+)?)\s*kg/i) : null;
      const numericWeight = matchWeight ? parseFloat(matchWeight[1]) : null;
      const weightNote = numericWeight ? null : recommendedWeight || null;
      return {
        name: exercise,
        modality,
        equipment: equipmentKey,
        setsRepsLabel,
        recommendedWeight,
        sets: parsed.sets,
        reps: parsed.reps ?? null,
        distanceMeters: parsed.distanceMeters ?? null,
        durationMinutes: parsed.durationMinutes ?? null,
        numericWeight,
        weightNote,
      };
    });
  };

  return (
    <section className="space-y-3">
      <div className="relative -mx-2 px-2">
        <Carousel opts={{ align: "center", loop: false, skipSnaps: false, watchDrag: true }} setApi={setApi} className="w-full">
          <CarouselContent className="-ml-3">
            {items.map((label, idx) => (
              <CarouselItem key={idx} className="pl-3 basis-[62vw] sm:basis-[336px]">
                <Card className="p-5 bg-card/80 border flex flex-col justify-between h-full">
                  <div className="space-y-2">
                    {hyroxDownloads && (
                      <p className="text-[10px] uppercase tracking-widest font-bold text-yellow-400">Simulation</p>
                    )}
                    <h4 className="text-2xl font-extrabold">{label}</h4>
                    <p className="text-foreground/80">
                      {hyroxDownloads
                        ? hyroxDescriptions[label] || `Download the ${label} workout template.`
                        : "This is a horizontally scrollable card. Swipe to browse more."}
                    </p>
                  </div>
                  <div className="mt-4">
                    {hyroxDownloads ? (
                      <Button
                        className="w-full h-14 text-lg font-bold"
                        style={{ backgroundColor: "#FFCC00", color: "#000" }}
                        onClick={() => {
                          setConfigTarget(label);
                          setConfigStep(5);
                          setSelectedPlanDayState(null);
                          setOpenConfig(true);
                          loadFreeDays();
                        }}
                      >
                        Add to Plan
                      </Button>
                    ) : configureMode ? (
                      <Button
                        className="w-full h-14 text-lg font-bold"
                        onClick={() => {
                          const presetFocus =
                            label === "Full Body"
                              ? "Full Body"
                              : label === "Upper Body" || label === "Lower Body"
                              ? "Upper/Lower"
                              : null;
                          setPreference(presetFocus);
                          setConfigTarget(label);
                          setConfigStep(1);
                          setSelectedEquipment([]);
                          setSelectedPlanDayState(null);
                          setSelectedPrimary([]);
                          setSelectedSex(null);
                          setSelectedLevel(null);
                          setOpenConfig(true);
                          loadFreeDays();
                        }}
                      >
                        Configure
                      </Button>
                    ) : (
                      <Button className="w-full h-14 text-lg font-bold">Open</Button>
                    )}
                  </div>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        {/* Dots */}
        <div className="flex items-center justify-center gap-2 mt-2">
          {items.map((_, i) => (
            <span
              key={i}
              onClick={() => api?.scrollTo?.(i)}
              className={`transition-all rounded-full ${
                i === active ? "bg-yellow-500 w-3 h-3" : "bg-foreground/30 w-2 h-2"
              } cursor-pointer`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      </div>

      {(configureMode || hyroxDownloads) && (
        <Dialog open={openConfig} onOpenChange={setOpenConfig}>
          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Configure {configTarget}</DialogTitle>
              <DialogDescription className="text-sm text-white/70">
                {configStep === 1
                  ? "Select your equipment and preferred focus."
                  : configStep === 2
                  ? "Pick your primary exercises (personalised by your equipment)."
                  : configStep === 3
                  ? "Tell us about you so we can calibrate weights."
                  : configStep === 4
                  ? "Review your personalised prescription."
                  : ""}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {(() => {
                if (configStep === 1) {
                  return (
                    <>
                      <div>
                        <p className="text-sm font-semibold mb-2">What equipment do you have access to?</p>
                        <div className="flex flex-wrap gap-2">
                          {equipmentOptions.map((eq) => {
                            const selected = selectedEquipment.includes(eq);
                            return (
                              <Button
                                key={eq}
                                type="button"
                                variant="ghost"
                                className={`h-10 px-3 border transition-colors ${
                                  selected
                                    ? "bg-[#FFCC00] text-black border-[#FFCC00]"
                                    : "bg-black text-white border-white/30 hover:border-[#FFCC00]"
                                }`}
                                onClick={() => toggleEquipment(eq)}
                              >
                                {eq}
                              </Button>
                            );
                          })}
                        </div>
                      </div>
                      {configTarget === "Full Body" || configTarget === "Upper Body" || configTarget === "Lower Body" ? null : (
                        <div>
                          <p className="text-sm font-semibold mb-2">Do you want to focus on?</p>
                          <div className="flex flex-wrap gap-2">
                            {["Full Body", "Upper/Lower", "Push/Pull/Legs"].map((opt) => {
                              const selected = preference === opt;
                              return (
                                <Button
                                  key={opt}
                                  type="button"
                                  variant="ghost"
                                  className={`h-10 px-3 border transition-colors ${
                                    selected
                                      ? "bg-[#FFCC00] text-black border-[#FFCC00]"
                                      : "bg-black text-white border-white/30 hover:border-[#FFCC00]"
                                  }`}
                                  onClick={() => setPreference(opt)}
                                >
                                  {opt}
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      <Button
                        className="w-full h-12 font-bold"
                        style={{ backgroundColor: "#FFCC00", color: "#000" }}
                        onClick={() => setConfigStep(2)}
                        disabled={
                          configTarget !== "Full Body" &&
                          configTarget !== "Upper Body" &&
                          configTarget !== "Lower Body" &&
                          !preference
                        }
                      >
                        Continue
                      </Button>
                    </>
                  );
                }

                if (configStep === 2) {
                  const knownPrimary = ["squat", "bench", "deadlift", "press", "row", "hip thrust", "lunge", "carry"];
                  const tagHasAny = (tags: string[], needles: string[]) => needles.some((n) => tags.includes(n));
                  const prefKeys =
                    preference === "Full Body"
                      ? ["full-body", "total-body", "compound"]
                      : preference === "Upper/Lower"
                      ? ["upper", "lower", "split"]
                      : preference === "Push/Pull/Legs"
                      ? ["push", "pull", "legs"]
                      : [];
                  const has = (keys: string[]) => keys.some((k) => selectedEquipment.includes(k));
                  const equipKeys = {
                    barbell: ["Barbell", "Squat Rack"],
                    dumbbell: ["Dumbbells"],
                    bands: ["Resistance Bands"],
                    kettlebell: ["Kettlebells"],
                    machine: ["Machines", "Cables"],
                  };
                  const equipFilter = (ex: DbExercise) => {
                    const tags = ex.tags || [];
                    const hasTag = (needle: string) => tags.includes(needle);
                    const hasBarbell = hasTag("barbell");
                    const hasDumbbell = hasTag("dumbbell") || hasTag("db");
                    const hasKB = hasTag("kettlebell") || hasTag("kb");
                    const hasMachine = hasTag("machine") || hasTag("cable");
                    const hasBands = hasTag("band");
                    const hasBody = hasTag("bodyweight");
                    const selectedBarbell = has(equipKeys.barbell);
                    const selectedDumbbell = has(equipKeys.dumbbell);
                    const selectedKB = has(equipKeys.kettlebell);
                    const selectedMachine = has(equipKeys.machine);
                    const selectedBands = has(equipKeys.bands);
                    const selectedBody = selectedEquipment.includes("Bodyweight");
                    if (hasBody && selectedBody) return true;
                    if ((hasBarbell || hasMachine) && selectedBarbell) return true;
                    if (hasDumbbell && selectedDumbbell) return true;
                    if (hasKB && selectedKB) return true;
                    if (hasMachine && selectedMachine) return true;
                    if (hasBands && selectedBands) return true;
                    if (!selectedEquipment.length) return true;
                    if (selectedBarbell && !hasBarbell && !hasMachine) return false;
                    if (selectedDumbbell && !hasDumbbell) return false;
                    if (selectedKB && !hasKB) return false;
                    if (selectedMachine && !hasMachine) return false;
                    if (selectedBands && !hasBands) return false;
                    return true;
                  };
                  let equipFiltered = primaryFromDb.filter(equipFilter);
                  if (equipFiltered.length === 0) equipFiltered = primaryFromDb;
                  const orderByFocus = (a: DbExercise, b: DbExercise) => {
                    if (!prefKeys.length) return a.name.localeCompare(b.name);
                    const aMatch = tagHasAny(a.tags, prefKeys) ? 1 : 0;
                    const bMatch = tagHasAny(b.tags, prefKeys) ? 1 : 0;
                    if (aMatch !== bMatch) return bMatch - aMatch;
                    return a.name.localeCompare(b.name);
                  };
                  equipFiltered.sort(orderByFocus);
                  let list: string[] = equipFiltered.map((e) => e.name);
                  if (list.length === 0) {
                    const namesFromPlan = Array.from(
                      new Set(
                        allExercises
                          .filter((ex) => !ex._isChildExercise && (ex.type === "weights" || ex.type === "bodyweight"))
                          .map((ex) => ex.name)
                      )
                    );
                    list = namesFromPlan
                      .filter((n) => knownPrimary.some((k) => n.toLowerCase().includes(k)))
                      .slice(0, 12);
                  }
                  if (list.length === 0) {
                    list = ["Back Squat", "Bench Press", "Deadlift", "Overhead Press", "Barbell Row", "Hip Thrust", "Dumbbell Lunge"];
                  }
                  const groupOrder = ["full-body", "chest", "back", "shoulders", "arms", "legs", "glutes", "core", "cardio", "compound"];
                  const groupIcons: Record<string, string | null> = {
                    "full-body": compoundIconUrl,
                    chest: chestIconUrl,
                    back: backIconUrl,
                    shoulders: shouldersIconUrl,
                    arms: armsIconUrl,
                    legs: legsIconUrl,
                    glutes: legsIconUrl,
                    core: coreIconUrl,
                    cardio: null,
                    compound: compoundIconUrl,
                  };
                  const groupFallbackEmoji: Record<string, string> = {
                    "full-body": "🏋️",
                    chest: "🧡",
                    back: "🦴",
                    shoulders: "🤸",
                    arms: "💪",
                    legs: "🦵",
                    glutes: "🍑",
                    core: "🧠",
                    cardio: "🏃",
                    compound: "✨",
                  };
                  const detectGroup = (name: string): string => {
                    const ex = primaryFromDb.find((e) => e.name === name);
                    const tags = (ex?.tags || []).map((t) => t.toLowerCase());
                    for (const g of groupOrder) {
                      if (tags.includes(g)) return g;
                    }
                    const lower = name.toLowerCase();
                    if (lower.includes("squat") || lower.includes("lunge") || lower.includes("leg")) return "legs";
                    if (lower.includes("hip thrust") || lower.includes("glute") || lower.includes("bridge")) return "glutes";
                    if (lower.includes("bench") || lower.includes("chest") || lower.includes("push-up")) return "chest";
                    if (lower.includes("row") || lower.includes("pull")) return "back";
                    if (lower.includes("press") || lower.includes("shoulder")) return "shoulders";
                    if (lower.includes("curl") || lower.includes("tricep") || lower.includes("bicep")) return "arms";
                    if (lower.includes("plank") || lower.includes("sit") || lower.includes("crunch")) return "core";
                    if (lower.includes("run") || lower.includes("bike") || lower.includes("erg") || lower.includes("rower")) return "cardio";
                    return "compound";
                  };
                  const injectDefaults = (group: Record<string, string[]>, key: string, defaults: string[]) => {
                    const existing = new Set((group[key] || []).map((n) => n.toLowerCase()));
                    const additions = defaults.filter((n) => !existing.has(n.toLowerCase()));
                    if (additions.length) {
                      group[key] = [...(group[key] || []), ...additions];
                    }
                  };

                  const grouped: Record<string, string[]> = {};
                  list.forEach((name) => {
                    const g = detectGroup(name);
                    if (!grouped[g]) grouped[g] = [];
                    grouped[g].push(name);
                  });

                  if (configTarget === "Upper Body") {
                    const allowed = new Set(["chest", "back", "shoulders", "arms", "core", "compound", "full-body"]);
                    Object.keys(grouped).forEach((key) => {
                      if (!allowed.has(key)) delete grouped[key];
                    });
                    injectDefaults(grouped, "arms", [
                      "DB Bicep Curl",
                      "Cable Tricep Pushdown",
                      "Skull Crusher",
                      "Hammer Curl",
                    ]);
                    injectDefaults(grouped, "core", [
                      "Hanging Leg Raise",
                      "Cable Crunch",
                      "Plank",
                      "Sit Up",
                    ]);
                  } else if (configTarget === "Lower Body") {
                    const allowed = new Set(["legs", "glutes", "core", "compound", "full-body"]);
                    Object.keys(grouped).forEach((key) => {
                      if (!allowed.has(key)) delete grouped[key];
                    });
                    injectDefaults(grouped, "legs", [
                      "Back Squat",
                      "Front Squat",
                      "Romanian Deadlift",
                      "Bulgarian Split Squat",
                    ]);
                    injectDefaults(grouped, "glutes", [
                      "Hip Thrust",
                      "Glute Bridge",
                      "Cable Pull Through",
                    ]);
                    injectDefaults(grouped, "core", ["Plank", "Hanging Leg Raise", "Cable Crunch"]);
                  } else if (configTarget === "Full Body") {
                    injectDefaults(grouped, "chest", ["Bench Press", "Push-Up", "Cable Chest Fly"]);
                    injectDefaults(grouped, "back", ["Barbell Row", "Lat Pulldown", "Seated Row (Machine)"]);
                    injectDefaults(grouped, "shoulders", ["Overhead Press", "Dumbbell Shoulder Press", "Lateral Raise"]);
                    injectDefaults(grouped, "arms", ["DB Bicep Curl", "Tricep Dip", "Cable Tricep Pushdown"]);
                    injectDefaults(grouped, "legs", ["Back Squat", "Walking Lunge", "Romanian Deadlift"]);
                    injectDefaults(grouped, "glutes", ["Hip Thrust", "Glute Bridge", "Reverse Lunge"]);
                    injectDefaults(grouped, "core", ["Plank", "Hanging Leg Raise", "Cable Crunch"]);
                  }
                  return (
                    <>
                      <div className="space-y-4">
                        <p className="text-sm font-semibold">Recommended primary exercises</p>
                        {loadingPrimary ? (
                          <div className="text-center py-8 text-sm text-muted-foreground">Loading primary exercises…</div>
                        ) : (
                          <div className="space-y-4">
                            {groupOrder
                              .filter((g) => grouped[g]?.length)
                              .map((g) => (
                                <Card key={g} className="p-3 bg-black border border-white/20 text-white">
                                  <div className="flex items-center gap-2 mb-2">
                                    {groupIcons[g] ? (
                                      <img src={groupIcons[g]!} alt="" className="w-6 h-6" aria-hidden="true" />
                                    ) : (
                                      <span className="text-lg">{groupFallbackEmoji[g] ?? "✨"}</span>
                                    )}
                                    <h4 className="text-sm font-bold uppercase tracking-wider">{g.replace("-", " ")}</h4>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {grouped[g].map((name) => {
                                      const selected = selectedPrimary.includes(name);
                                      return (
                                        <Button
                                          key={name}
                                          type="button"
                                          variant="ghost"
                                          className={`h-10 px-3 border transition-colors ${
                                            selected
                                              ? "bg-[#FFCC00] text-black border-[#FFCC00]"
                                              : "bg-black text-white border-white/30 hover:border-[#FFCC00]"
                                          }`}
                                          onClick={() => {
                                            setSelectedPrimary((prev) =>
                                              prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
                                            );
                                          }}
                                        >
                                          {name}
                                        </Button>
                                      );
                                    })}
                                  </div>
                                </Card>
                              ))}
                          </div>
                        )}
                      </div>
                      <Button
                        className="w-full h-12 font-bold"
                        style={{ backgroundColor: "#FFCC00", color: "#000" }}
                        onClick={() => setConfigStep(3)}
                        disabled={selectedPrimary.length === 0}
                      >
                        Continue
                      </Button>
                    </>
                  );
                }

                if (configStep === 3) {
                  const sexOptions: SexSelection[] = ["Male", "Female"];
                  const levelOptions: TrainingLevel[] = ["Beginner", "Intermediate", "Advanced"];
                  return (
                    <>
                      <div className="mb-3">
                        <p className="text-sm font-semibold mb-2">Preferred intensity</p>
                        <div className="grid grid-cols-3 gap-2">
                          {(["Easy","Moderate","Hard"] as const).map((opt) => (
                            <Button
                              key={opt}
                              variant="ghost"
                              className={`h-12 border transition-colors ${
                                selectedIntensity === opt
                                  ? "bg-[#FFCC00] text-black border-[#FFCC00]"
                                  : "bg-black text-white border-white/30 hover:border-[#FFCC00]"
                              }`}
                              onClick={() => setSelectedIntensity(opt)}
                            >
                              {opt}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-semibold mb-2">What best describes you?</p>
                        <div className="flex gap-3">
                          {sexOptions.map((option) => (
                            <Button
                              key={option}
                              variant="ghost"
                              className={`flex-1 h-12 border transition-colors ${
                                selectedSex === option
                                  ? "bg-[#FFCC00] text-black border-[#FFCC00]"
                                  : "bg-black text-white border-white/30 hover:border-[#FFCC00]"
                              }`}
                              onClick={() => setSelectedSex(option)}
                            >
                              {option}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-semibold mb-2">Select your experience level</p>
                        <div className="grid grid-cols-3 gap-2">
                          {levelOptions.map((level) => (
                            <Button
                              key={level}
                              variant="ghost"
                              className={`h-12 border transition-colors ${
                                selectedLevel === level
                                  ? "bg-[#FFCC00] text-black border-[#FFCC00]"
                                  : "bg-black text-white border-white/30 hover:border-[#FFCC00]"
                              }`}
                              onClick={() => setSelectedLevel(level)}
                            >
                              {level}
                            </Button>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          We'll use this to set smarter suggested weights across barbells, dumbbells, kettlebells, and machines.
                        </p>
                      </div>
                      <Button
                        className="w-full h-12 font-bold"
                        style={{ backgroundColor: "#FFCC00", color: "#000" }}
                        onClick={() => setConfigStep(4)}
                        disabled={!selectedSex || !selectedLevel}
                      >
                        Continue
                      </Button>
                    </>
                  );
                }

                if (configStep === 4) {
                  const summaryItems = buildStrengthSummary();
                  return (
                    <>
                      <div className="space-y-3">
                        <p className="text-sm font-semibold">Plan summary</p>
                        <Card className="p-4 bg-background/60 border">
                          <p className="text-sm text-muted-foreground mb-3">
                            {selectedSex ? `${selectedSex} · ` : ""}
                            {selectedLevel ?? "Beginner"}
                          </p>
                          <div className="space-y-3">
                            {summaryItems.map((item) => (
                              <div key={item.name} className="border border-border/60 rounded-lg px-3 py-2 bg-background/70">
                                <p className="text-sm font-semibold text-foreground mb-1">{item.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {equipmentDisplay[item.equipment]} • {item.setsRepsLabel}
                                  {item.recommendedWeight ? ` • ${item.recommendedWeight}` : ""}
                                </p>
                              </div>
                            ))}
                            {summaryItems.length === 0 && (
                              <p className="text-xs text-muted-foreground">No exercises selected yet.</p>
                            )}
                          </div>
                        </Card>
                      </div>
                      <Button
                        className="w-full h-12 font-bold"
                        style={{ backgroundColor: "#FFCC00", color: "#000" }}
                        onClick={() => {
                          if (summaryItems.length === 0) return;
                          setConfigStep(5);
                          if (planDays.length === 0) {
                            setSelectedPlanDayState({ id: "manual-1", label: "Day 1" });
                          }
                        }}
                        disabled={summaryItems.length === 0}
                      >
                        Continue
                      </Button>
                    </>
                  );
                }

                const hasPlan = planDays.length > 0;
                const manualDays = Array.from({ length: 14 }).map((_, i) => ({
                  id: `manual-${i + 1}`,
                  label: `Day ${i + 1}`,
                  free: true,
                }));
                const daysToShow = hasPlan
                  ? planDays.map((d) => ({
                      id: d.id,
                      label: `Day ${d.day_index + 1}`,
                      free: d.free,
                    }))
                  : manualDays;

                return (
                  <>
                    <div>
                      <p className="text-sm font-semibold mb-3">Choose a day to add this workout</p>
                      {generating && (
                        <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden mb-2">
                          <div
                            className="h-full bg-yellow-500 transition-all"
                            style={{ width: `${Math.min(genProgress, 100)}%` }}
                          />
                        </div>
                      )}
                      {loadingDays && hasPlan ? (
                        <div className="text-muted-foreground text-sm">Loading free days…</div>
                      ) : (
                        <div className="grid grid-cols-4 gap-2">
                          {daysToShow.map((day) => {
                            const selected = selectedPlanDayState?.id === day.id;
                            const disabled = hasPlan && !day.free;
                            return (
                              <Button
                                key={day.id}
                                variant="ghost"
                                className={`h-12 text-sm border transition-colors ${
                                  selected
                                    ? "bg-[#FFCC00] text-black border-[#FFCC00]"
                                    : "bg-black text-white border-white/30 hover:border-[#FFCC00]"
                                } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
                                onClick={() => {
                                  if (disabled) return;
                                  setSelectedPlanDayState({ id: day.id, label: day.label });
                                }}
                              >
                                {day.label}
                              </Button>
                            );
                          })}
                        </div>
                      )}
                      {hasPlan ? (
                        <p className="text-xs text-muted-foreground mt-3">
                          Only free days are selectable. Occupied days are greyed out.
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-3">
                          No plan detected, showing generic day numbers.
                        </p>
                      )}
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        variant="ghost"
                        className="border border-white/30 text-white bg-black hover:border-[#FFCC00]"
                        onClick={() => setOpenConfig(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        disabled={loadingDays || !selectedPlanDayState}
                        style={{ backgroundColor: "#FFCC00", color: "#000", opacity: selectedPlanDayState && !loadingDays ? 1 : 0.6 }}
                        onClick={async () => {
                          if (!selectedPlanDayState) return;
                          let stopProgress = () => {};
                          try {
                            setLoadingDays(true);
                            setGenerating(true);
                            stopProgress = startFakeProgress(3000);
                            if (selectedPlanDayState.id.startsWith("manual-")) {
                              toast.error("Please select a real plan day from your programme.");
                              stopProgress();
                              setGenerating(false);
                              setLoadingDays(false);
                              return;
                            }
                            const { data: pd, error } = await supabase
                              .from("plan_days")
                              .select("plan_id")
                              .eq("id", selectedPlanDayState.id)
                              .single();
                            if (error || !pd?.plan_id) {
                              toast.error("Could not find the plan for that day.");
                              stopProgress();
                              setGenerating(false);
                              setLoadingDays(false);
                              return;
                            }
                            const template = configTarget ?? "";
                            const isStrengthTemplate = ["Full Body", "Upper Body", "Lower Body"].includes(template);
                            let warnings: string[] = [];
                            if (isStrengthTemplate) {
                              const strengthSummary = buildStrengthSummary();
                              if (strengthSummary.length === 0) {
                                toast.error("Select at least one primary exercise before scheduling.");
                                stopProgress();
                                setGenerating(false);
                                setLoadingDays(false);
                                return;
                              }
                              const prescriptions = strengthSummary.map((item) => ({
                                name: item.name,
                                sets: item.sets,
                                reps: item.reps ?? null,
                                distanceMeters: item.distanceMeters ?? null,
                                durationMinutes: item.durationMinutes ?? null,
                                weightKg: item.numericWeight ?? null,
                                notes: item.weightNote ?? null,
                              }));
                              const result = await createStrengthPlanDay(supabase as any, selectedPlanDayState.id, {
                                template,
                                focus: preference,
                                sex: selectedSex ?? undefined,
                                level: selectedLevel ?? undefined,
                                intensity: selectedIntensity,
                                exercises: prescriptions,
                              });
                              warnings = result.warnings ?? [];
                            } else {
                              let result: { warnings: string[] } | null = null;
                              if (template === "HYROX Full Simulation") {
                                result = await createHyroxFullSimulationInDay(supabase as any, selectedPlanDayState.id);
                              } else if (template === "HYROX Half Simulation") {
                                result = await createHyroxHalfSimulationInDay(supabase as any, selectedPlanDayState.id);
                              } else if (template === "George") {
                                result = await createGeorgeWorkoutInDay(supabase as any, selectedPlanDayState.id);
                              } else if (template === "Domino") {
                                result = await createDominoWorkoutInDay(supabase as any, selectedPlanDayState.id);
                              } else if (template === "Combs") {
                                result = await createCombsWorkoutInDay(supabase as any, selectedPlanDayState.id);
                              } else if (template === "Bennington") {
                                result = await createBenningtonWorkoutInDay(supabase as any, selectedPlanDayState.id);
                              } else {
                                result = await createHyroxFullSimulationInDay(supabase as any, selectedPlanDayState.id);
                              }
                              warnings = result?.warnings ?? [];
                            }
                            if (warnings.length) {
                              warnings.forEach((w) => toast.warning(w));
                            }
                            await loadFreeDays();
                            await refresh();
                            if (onPlanGenerated) {
                              await onPlanGenerated();
                            }
                            setOpenConfig(false);
                            toast.success(`${template || "Custom workout"} generated for ${selectedPlanDayState.label}`);
                          } catch (err) {
                            console.error("Failed to create HYROX simulation", err);
                            toast.error("Failed to create the HYROX workout. Try again.");
                          } finally {
                            stopProgress();
                            setLoadingDays(false);
                            setGenerating(false);
                          }
                        }}
                      >
                        {selectedPlanDayState ? `Add to ${selectedPlanDayState.label}` : "Add to Day"}
                      </Button>
                    </div>
                  </>
                );
              })()}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </section>
  );
};

interface T1ShowcaseProps {
  showIntro?: boolean;
  introText?: string;
  className?: string;
  onPlanGenerated?: () => void | Promise<void>;
}

export const T1Showcase = ({
  showIntro = true,
  introText,
  className,
  onPlanGenerated,
}: T1ShowcaseProps) => {
  const categories = ["Hyrox", "Strength"];
  const [activeCat, setActiveCat] = useState<string>("Hyrox");
  const wrapperClass = ["space-y-8", className].filter(Boolean).join(" ");

  return (
    <div className={wrapperClass}>
      {showIntro && (
        <p className="text-muted-foreground">
          {introText ??
            ""}
        </p>
      )}

      <div className="flex items-center gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {categories.map((c) => {
          const selected = c === activeCat;
          return (
            <Button
              key={c}
              variant={selected ? "default" : "outline"}
              className={`h-10 px-4 whitespace-nowrap ${selected ? "bg-yellow-500 text-black border-yellow-500" : ""}`}
              onClick={() => setActiveCat(c)}
            >
              {c}
            </Button>
          );
        })}
      </div>

      {activeCat === "Hyrox" && <HorizontalRow title="Hyrox" itemPrefix="Hyrox Plan" hyroxDownloads />}

      {activeCat === "Strength" && (
        <HorizontalRow
          title="Strength"
          itemPrefix="Strength Program"
          customItems={["Full Body", "Upper Body", "Lower Body"]}
          itemCount={3}
          configureMode
          onPlanGenerated={onPlanGenerated}
        />
      )}
    </div>
  );
};


