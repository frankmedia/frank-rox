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
  cardioClassesPerWeek?: number; // Changed from frequency to number (1-3)
  trainingDaysPerWeek?: number;
};

const ProgramCustomize = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selected, setSelected] = useState<string[]>(["Running", "Strength", "Cardio"]); // All selected by default
  const [runPerWeek, setRunPerWeek] = useState<number>(2);
  const [hillsSprints, setHillsSprints] = useState<"Yes" | "No">("Yes"); // Default to Yes
  const [wantsPT, setWantsPT] = useState<"Yes" | "No" | null>(null);
  const [equip, setEquip] = useState<string[]>(["Sled push/pull", "Wall balls", "Sandbags", "Heavy dumbbells", "SkiErg", "RowErg"]); // All selected by default
  const [cardioClasses, setCardioClasses] = useState<number>(1); // Changed to number, default 1
  const [trainingDays, setTrainingDays] = useState<number>(5); // Default to 5 days

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
      setRunPerWeek(prefs.runSessionsPerWeek ?? 2);
      setHillsSprints(prefs.hillsOrSprints ?? "Yes");
      setWantsPT(prefs.wantsPTCheckins ? "Yes" : "No");
      setEquip((prefs.equipment && prefs.equipment.length > 0) ? prefs.equipment : ["Sled push/pull", "Wall balls", "Sandbags", "Heavy dumbbells", "SkiErg", "RowErg"]);
      setCardioClasses(prefs.cardioClassesPerWeek ?? 1);
      setTrainingDays(typeof prefs.trainingDaysPerWeek === "number" ? prefs.trainingDaysPerWeek : 5);
    }
    // If no preferences, keep the defaults set in useState
  }, [profile]);

  const buildPrefs = (): Preferences => ({
    focusAreas: selected,
    runSessionsPerWeek: runPerWeek,
    hillsOrSprints: hillsSprints,
    wantsPTCheckins: wantsPT === "Yes",
    equipment: equip,
    cardioClassesPerWeek: selected.includes("Cardio") ? cardioClasses : undefined,
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
  }, [selected, runPerWeek, hillsSprints, wantsPT, equip, cardioClasses, trainingDays]); 

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
        {/* Athlete Score Display */}
        {profile && (() => {
          const athleteScore = Math.round((profile.running_score + profile.strength_score + (profile.cardio_composite_score || profile.cardio_conditioning_score || 0)) / 3);
          const scorePosition = `${athleteScore}%`;
          
          return (
            <Card className="p-5 bg-gradient-to-r from-yellow-500/10 to-yellow-500/5 border-yellow-500/30 mb-4">
              <div className="mb-3">
                <p className="text-sm text-white/70 mb-1">Your Programme is Based On</p>
                <p className="text-xl font-bold text-white">Athlete Score</p>
              </div>
              
              {/* Score Line with Arrow */}
              <div className="relative pt-8 pb-2">
                {/* Arrow pointing down to score */}
                <div 
                  className="absolute top-0 flex flex-col items-center transition-all duration-500"
                  style={{ left: scorePosition, transform: 'translateX(-50%)' }}
                >
                  <div className="text-2xl font-extrabold text-yellow-500 mb-1">
                    {athleteScore}
                  </div>
                  <svg className="w-6 h-6 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 4l-8 8h5v8h6v-8h5z" />
                  </svg>
                </div>
                
                {/* Score Line */}
                <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 transition-all duration-500"
                    style={{ width: scorePosition }}
                  />
                </div>
                
                {/* Scale markers */}
                <div className="flex justify-between mt-1 text-xs text-white/40">
                  <span>0</span>
                  <span>25</span>
                  <span>50</span>
                  <span>75</span>
                  <span>100</span>
                </div>
              </div>
            </Card>
          );
        })()}
        
        {/* Sprint Session Toggle */}
        <Card className="p-5 bg-zinc-900 border-zinc-800 mb-4">
          <Label className="text-white text-xl font-bold">Include sprint session?</Label>
          <p className="text-sm text-white/60 mt-1">One high-intensity sprint or hill session per week</p>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {(["Yes","No"] as const).map(v=>(
              <Button
                key={`sprint-${v}`}
                variant="ghost"
                className={`w-full h-12 text-lg border ${hillsSprints===v?"bg-yellow-500 text-black border-yellow-500 hover:bg-yellow-400":"border-white/30 hover:bg-white/10"}`}
                onClick={()=>setHillsSprints(v)}
              >
                {v}
              </Button>
            ))}
          </div>
        </Card>
        
        {/* Training days - priority card */}
        <Card className="p-5 bg-zinc-900 border-zinc-800 mb-4">
          <Label className="text-white text-xl font-bold">Training days per week</Label>
          <div className="grid grid-cols-6 gap-2 mt-2">
            {[1,2,3,4,5,6].map((n)=>(
              <Button
                key={`tdtop-${n}`}
                variant="ghost"
                className={`w-full h-12 text-lg border ${trainingDays===n?"bg-yellow-500 text-black border-yellow-500 hover:bg-yellow-400":"border-white/30 hover:bg-white/10"}`}
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
                className={`w-full h-12 text-lg border ${wantsPT===v?"bg-yellow-500 text-black border-yellow-500 hover:bg-yellow-400":"border-white/30 hover:bg-white/10"}`}
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
                    className={`w-full h-12 text-lg border ${active ? "bg-yellow-500 text-black border-yellow-500 hover:bg-yellow-400" : "border-white/30 hover:bg-white/10"}`}
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
              <Label className="text-white text-xl font-bold">Cardio classes per week</Label>
              <p className="text-sm text-white/60 mt-1">HIIT, CrossFit, circuit or spin classes (max 3/week)</p>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {[1, 2, 3].map(n=>(
                  <Button
                    key={`cc-${n}`}
                    variant="ghost"
                    className={`w-full h-12 text-lg border ${cardioClasses===n?"bg-yellow-500 text-black border-yellow-500 hover:bg-yellow-400":"border-white/30 hover:bg-white/10"}`}
                    onClick={()=>setCardioClasses(n)}
                  >
                    {n}
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
                  className={`w-full h-12 text-lg border ${runPerWeek === n ? "bg-yellow-500 text-black border-yellow-500 hover:bg-yellow-400" : "border-white/30 hover:bg-white/10"}`}
                  onClick={() => setRunPerWeek(n)}
                >
                  {n}
                </Button>
              ))}
            </div>
          </div>
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


