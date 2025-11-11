import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/utils/supabaseClient";

type Preferences = {
  focusAreas: string[];
  runSessionsPerWeek: number;
  hillsOrSprints: "Yes" | "No" | null;
  wantsPTCheckins?: boolean;
  equipment?: string[];
  cardioClassFrequency?: "Never" | "1× per week" | "2–3× per week" | "4+× per week";
  trainingDaysPerWeek?: number;
};

const ProgramCustomize = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selected, setSelected] = useState<string[]>([]);
  const [runPerWeek, setRunPerWeek] = useState<number>(0);
  const [hillsSprints, setHillsSprints] = useState<"Yes" | "No" | null>(null);
  const [wantsPT, setWantsPT] = useState<"Yes" | "No" | null>(null);
  const [equip, setEquip] = useState<string[]>([]);
  const [cardioClassFreq, setCardioClassFreq] = useState<"Never" | "1× per week" | "2–3× per week" | "4+× per week" | null>(null);
  const [trainingDays, setTrainingDays] = useState<number>(3);

  const profile = useMemo(() => {
    try {
      const raw = localStorage.getItem("onboarding_profile");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const recommendedOptions = useMemo(() => {
    const opts: string[] = [];
    if (profile) {
      if ((profile.running_score ?? 0) < 60) opts.push("Running");
      if ((profile.strength_score ?? 0) < 60) opts.push("Strength");
      const cardio = profile.cardio_composite_score ?? profile.cardio_conditioning_score ?? 0;
      if (cardio < 60) opts.push("Cardio");
    }
    return opts.length ? opts : ["Running", "Strength", "Cardio"];
  }, [profile]);

  // Pre-select focus areas based on onboarding scores if no preferences exist
  // Prefill from stored preferences if available
  useEffect(() => {
    const prefs: Preferences | undefined = profile?.training_preferences;
    if (prefs && prefs.focusAreas && prefs.focusAreas.length > 0) {
      // Use existing preferences
      setSelected(prefs.focusAreas);
      setRunPerWeek(prefs.runSessionsPerWeek ?? 0);
      setHillsSprints(prefs.hillsOrSprints ?? null);
      setWantsPT(prefs.wantsPTCheckins ? "Yes" : "No");
      setEquip(prefs.equipment ?? []);
      setCardioClassFreq(prefs.cardioClassFrequency ?? null);
      setTrainingDays(typeof prefs.trainingDaysPerWeek === "number" ? prefs.trainingDaysPerWeek : 3);
    } else {
      // First time: pre-select based on scores < 60
      setSelected(recommendedOptions);
    }
  }, [profile, recommendedOptions]);

  const buildPrefs = (): Preferences => ({
    focusAreas: selected,
    runSessionsPerWeek: runPerWeek,
    hillsOrSprints: runPerWeek > 1 ? (hillsSprints ?? "No") : null,
    wantsPTCheckins: wantsPT === "Yes",
    equipment: equip,
    cardioClassFrequency: selected.includes("Cardio") ? cardioClassFreq ?? "Never" : undefined,
    trainingDaysPerWeek: trainingDays,
  });

  // Autosave to local storage whenever values change
  useEffect(() => {
    try {
      const current = profile || {};
      const updated = { ...current, training_preferences: buildPrefs() };
      localStorage.setItem("onboarding_profile", JSON.stringify(updated));
    } catch {
      // ignore
    }
  }, [selected, runPerWeek, hillsSprints, wantsPT, equip, cardioClassFreq]); 

  const toggle = (name: string) => {
    setSelected((cur) => (cur.includes(name) ? cur.filter((x) => x !== name) : [...cur, name]));
  };

  const save = async () => {
    const prefs = buildPrefs();
    // Persist locally
    try {
      const current = profile || {};
      const updated = { ...current, training_preferences: prefs };
      localStorage.setItem("onboarding_profile", JSON.stringify(updated));
      // Best-effort persist to Supabase
      if (user?.clientId) {
        await supabase.from("clients").update({ 
          athlete_profile: updated // Use athlete_profile column instead of onboarding_profile
        }).eq("id", user.clientId);
      }
    } catch (e: any) {
      toast.error("Could not save preferences", { description: e?.message || String(e) });
    }
    toast.success("Custom programme saved");
    navigate("/program-preview");
  };
  const saveAndBack = async () => {
    const prefs = buildPrefs();
    try {
      const current = profile || {};
      const updated = { ...current, training_preferences: prefs };
      localStorage.setItem("onboarding_profile", JSON.stringify(updated));
      if (user?.clientId) {
        await supabase.from("clients").update({ 
          athlete_profile: updated // Use athlete_profile column
        }).eq("id", user.clientId);
      }
    } catch {
      // best-effort
    }
    navigate(-1);
  };

  return (
    <div className="fixed inset-0 bg-background overflow-hidden" style={{ touchAction: "none" }}>
      <header
        className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border"
        style={{ paddingTop: "calc(20px + env(safe-area-inset-top, 0px))" }}
      >
        <div className="container max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white">Custom Programme</h1>
            <div className="text-sm text-white/70">Plan</div>
          </div>
        </div>
      </header>
      <main className="container max-w-2xl mx-auto px-4 pb-40 h-[calc(100vh-4rem)] overflow-y-auto" style={{ paddingTop: 'calc(4rem + env(safe-area-inset-top, 0px))' }}>
        {/* Training days - priority card */}
        <Card className="p-5 bg-zinc-900 border-zinc-800 mb-4">
          <Label className="text-white text-xl font-bold">Training days per week</Label>
          <div className="grid grid-cols-6 gap-2 mt-2">
            {[1,2,3,4,5,6].map((n)=>(
              <Button
                key={`tdtop-${n}`}
                variant="ghost"
                className={`w-full h-12 text-lg border ${trainingDays===n?"bg-yellow-500 text-black border-yellow-500":"border-white/30"}`}
                onClick={()=>setTrainingDays(n)}
              >
                {n}
              </Button>
            ))}
          </div>
        </Card>
        {/* PT check-ins card */}
        <Card className="p-5 bg-zinc-900 border-zinc-800 mb-4">
          <Label className="text-white text-xl font-bold">PT check‑ins via Zoom</Label>
          <p className="text-sm text-white/60 mt-1">If you are serious about your training and want your PT to review your programme and adjust it to your needs.</p>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {(["Yes","No"] as const).map(v=>(
              <Button
                key={`pt-top-${v}`}
                variant="ghost"
                className={`w-full h-12 text-lg border ${wantsPT===v?"bg-yellow-500 text-black border-yellow-500":"border-white/30"}`}
                onClick={()=>setWantsPT(v)}
              >
                {v}
              </Button>
            ))}
          </div>
        </Card>
        <Card className="p-5 bg-zinc-900 border-zinc-800 space-y-6">
          <div>
            <Label className="text-white text-xl font-bold">Focus areas</Label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {["Running", "Strength", "Cardio"].map((opt) => {
                const active = selected.includes(opt);
                return (
                  <Button
                    key={opt}
                    variant="ghost"
                    className={`w-full h-12 text-lg border ${active ? "bg-yellow-500 text-black border-yellow-500" : "border-white/30"}`}
                    onClick={() => toggle(opt)}
                  >
                    {opt}
                  </Button>
                );
              })}
            </div>
          </div>
          {(selected.includes("Strength") || selected.includes("Cardio")) && (
            <div>
              <Label className="text-white text-xl font-bold">Hyrox‑style equipment</Label>
              <p className="text-sm text-white/60 mt-1">Select all that apply</p>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {[
                  "Sled push/pull",
                  "Wall balls",
                  "Sandbags",
                  "Heavy dumbbells",
                  "SkiErg",
                  "RowErg",
                  "None",
                ].map((opt) => {
                  const active = equip.includes(opt);
                  return (
                    <Button
                      key={`eq-${opt}`}
                      variant="ghost"
                      className={`w-full h-12 text-lg border transition-colors ${
                        active 
                          ? "bg-yellow-500 text-black border-yellow-500 hover:bg-yellow-400" 
                          : "border-white/30 bg-transparent hover:bg-white/10"
                      }`}
                      onClick={() => {
                        setEquip((cur) => {
                          if (opt === "None") return ["None"];
                          const withoutNone = cur.filter((e) => e !== "None");
                          return withoutNone.includes(opt)
                            ? withoutNone.filter((e) => e !== opt)
                            : [...withoutNone, opt];
                        });
                      }}
                    >
                      {opt}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}
          {selected.includes("Cardio") && (
            <div>
              <Label className="text-white text-xl font-bold">Cardio classes</Label>
              <p className="text-sm text-white/60 mt-1">Do you attend HIIT, CrossFit, circuit or spin classes?</p>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {(["Never","1× per week","2–3× per week","4+× per week"] as const).map(v=>(
                  <Button
                    key={`ccf-${v}`}
                    variant="ghost"
                    className={`w-full h-12 text-lg border ${cardioClassFreq===v?"bg-yellow-500 text-black border-yellow-500":"border-white/30"}`}
                    onClick={()=>setCardioClassFreq(v)}
                  >
                    {v}
                  </Button>
                ))}
              </div>
            </div>
          )}
          <div>
            <Label className="text-white text-xl font-bold">Runs per week</Label>
            <div className="grid grid-cols-6 gap-2 mt-2">
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <Button
                  key={`rpw-${n}`}
                  variant="ghost"
                  className={`w-full h-12 text-lg border ${runPerWeek === n ? "bg-yellow-500 text-black border-yellow-500" : "border-white/30"}`}
                  onClick={() => setRunPerWeek(n)}
                >
                  {n}
                </Button>
              ))}
            </div>
          </div>
          {runPerWeek > 1 && (
            <div>
              <Label className="text-white text-xl font-bold">Include one hills or sprint session weekly?</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {(["Yes", "No"] as const).map((v) => (
                  <Button
                    key={`hsw-${v}`}
                    variant="ghost"
                    className={`w-full h-12 text-lg border ${hillsSprints === v ? "bg-yellow-500 text-black border-yellow-500" : "border-white/30"}`}
                    onClick={() => setHillsSprints(v)}
                  >
                    {v}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </Card>
      </main>
      <div className="fixed left-0 right-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)]">
        <div className="container max-w-2xl mx-auto px-4 pb-4">
          <div className="bg-background/95 backdrop-blur border border-border rounded-xl p-2 shadow-lg">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                className="basis-1/3 h-14 text-lg font-bold border border-white/20 text-white"
                onClick={saveAndBack}
              >
                Back
              </Button>
              <Button
                className="basis-2/3 h-14 text-lg font-bold"
                style={{ backgroundColor: "#FFCC00", color: "#000" }}
                onClick={save}
              >
                Save & Continue
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgramCustomize;


