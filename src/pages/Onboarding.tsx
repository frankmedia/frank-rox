import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { computeAthleteProfile } from "@/utils/athleteScoring";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Dumbbell, Activity as ActivityIcon, User as UserIcon } from "lucide-react";

// Runner icon (silhouette) - same as in ProgramPreview
const RunnerIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="9" cy="4" r="2" />
    <path d="M7 22l2-5 3 2 3-5" />
    <path d="M5 12l4-2 3 2 2 1" />
    <path d="M13 22l2-4" />
  </svg>
);

type Answers = {
  gender?: string;
  age?: number;
  mobility?: string;
  experience?: string;
  runWeekly?: string;
  intervals?: string;
  hills?: string;
  // Time inputs stored per-field for numeric-only entry
  best5k_mm?: string;
  best5k_ss?: string;
  best10k_hh?: string;
  best10k_mm?: string;
  runSurface?: string;
  bench5rm?: string;
  squat5rm?: string;
  deadlift5rm?: string;
  ohp5rm?: string;
  competitionExperience?: "No" | "Once" | "2–3 times" | "4+ times";
  competitionResult?: "DNF" | "Finished" | "Podium";
  // Cardio & Conditioning
  cardioSessions?: number;
  cardioDuration?: "<20" | "20–40" | "40–60" | "60+";
  cardioModalities?: string[];
  cardioIntervalZ2?: "Yes" | "No" | "Both";
  // Training focus planning
  focusAreas?: string[]; // ["Running","Strength","Cardio"]
  runSessionsPlan?: number;
  canDoHillsOrSprints?: "Yes" | "No";
  // Event planning
  trainingForEvent?: "Yes" | "No";
  eventName?: string;
  eventDate?: string;
};

const steps = [
  {
    key: "basics",
    title: "Basics",
    render: (a: Answers, set: (k: keyof Answers, v: any) => void) => (
      <div className="space-y-5">
        <div>
          <Label className="text-white text-xl font-bold">Biological sex</Label>
          <div className="grid grid-cols-1 gap-2 mt-2">
            {["Male", "Female", "Other"].map(v => (
              <Button
                key={v}
                variant="ghost"
                className={`w-full h-12 text-lg border ${a.gender===v?"bg-yellow-500 text-black border-yellow-500":"border-white/30"}`}
                onClick={()=>set("gender", v)}
              >
                {v}
              </Button>
            ))}
          </div>
        </div>
        <div>
          <Label className="text-white text-xl font-bold">Age</Label>
          <Input type="number" min={10} max={100} value={a.age ?? ""} onChange={e=>set("age", Number(e.target.value))} className="mt-1" />
        </div>
      </div>
    )
  },
  {
    key: "event",
    title: "Event",
    render: (a: Answers, set: (k: keyof Answers, v: any) => void) => {
      const weeksToEvent = a.eventDate ? Math.floor((new Date(a.eventDate).getTime() - Date.now()) / (7 * 24 * 60 * 60 * 1000)) : null;
      const weeksColor = weeksToEvent === null ? "text-white/70" : weeksToEvent < 2 ? "text-red-500" : weeksToEvent <= 6 ? "text-orange-500" : "text-green-500";
      return (
        <div className="space-y-5">
          <div>
            <Label className="text-white text-xl font-bold">Are you training for an event?</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {["Yes", "No"].map(v => (
                <Button
                  key={v}
                  variant="ghost"
                  className={`w-full h-12 text-lg border ${a.trainingForEvent===v?"bg-yellow-500 text-black border-yellow-500":"border-white/30"}`}
                  onClick={()=>set("trainingForEvent", v as "Yes" | "No")}
                >
                  {v}
                </Button>
              ))}
            </div>
          </div>
          {a.trainingForEvent === "Yes" && (
            <>
              <div>
                <Label className="text-white text-xl font-bold">Event name</Label>
                <Input
                  type="text"
                  placeholder="e.g. London Marathon"
                  value={a.eventName ?? ""}
                  onChange={e=>set("eventName", e.target.value)}
                  className="mt-1 h-12 text-lg"
                />
              </div>
              <div>
                <Label className="text-white text-xl font-bold">Event date</Label>
                <Input
                  type="date"
                  value={a.eventDate ?? ""}
                  onChange={e=>set("eventDate", e.target.value)}
                  className="mt-1 h-12 text-lg bg-white text-black"
                  style={{ colorScheme: 'light' }}
                />
              </div>
              {weeksToEvent !== null && (
                <div className={`text-center text-lg font-bold ${weeksColor}`}>
                  {weeksToEvent < 0 ? "Event has passed" : `${weeksToEvent} weeks to event`}
                </div>
              )}
            </>
          )}
        </div>
      );
    }
  },
  {
    key: "strengthSimple",
    title: "Strength",
    render: (a: Answers, set: (k: keyof Answers, v: any) => void) => (
      <div className="space-y-5">
        <Card className="bg-zinc-900 border border-zinc-800 p-4 sm:p-5">
          <Label className="text-white text-xl font-bold">Bench Press (kg, best recent 5 reps)</Label>
          <div className="grid grid-cols-4 gap-2 mt-2">
            {["20","40","60","80","100","120+","Not sure"].map(v=>(
              <Button
                key={`bench-${v}`}
                variant="ghost"
                className={`w-full text-lg border ${v==="Not sure"?"h-27 opacity-60":"h-12"} ${a.bench5rm===v?"bg-yellow-500 text-black border-yellow-500":"border-white/30"}`}
                onClick={()=>set("bench5rm", v)}
              >
                {v}
              </Button>
            ))}
          </div>
        </Card>
        <Card className="bg-zinc-900 border border-zinc-800 p-4 sm:p-5">
          <Label className="text-white text-xl font-bold">Back Squat (kg, best recent 5 reps)</Label>
          <div className="grid grid-cols-4 gap-2 mt-2">
            {["20","40","60","80","100","120","120+","Not sure"].map(v=>(
              <Button
                key={`squat-${v}`}
                variant="ghost"
                className={`w-full text-lg border ${v==="Not sure"?"h-27 opacity-60":"h-12"} ${a.squat5rm===v?"bg-yellow-500 text-black border-yellow-500":"border-white/30"}`}
                onClick={()=>set("squat5rm", v)}
              >
                {v}
              </Button>
            ))}
          </div>
        </Card>
        <Card className="bg-zinc-900 border border-zinc-800 p-4 sm:p-5">
          <Label className="text-white text-xl font-bold">Deadlift (kg, best recent 5 reps)</Label>
          <div className="grid grid-cols-4 gap-2 mt-2">
            {["20","40","60","80","100","120","140+","Not sure"].map(v=>(
              <Button
                key={`dead-${v}`}
                variant="ghost"
                className={`w-full text-lg border ${v==="Not sure"?"h-27 opacity-60":"h-12"} ${a.deadlift5rm===v?"bg-yellow-500 text-black border-yellow-500":"border-white/30"}`}
                onClick={()=>set("deadlift5rm", v)}
              >
                {v}
              </Button>
            ))}
          </div>
        </Card>
        <Card className="bg-zinc-900 border border-zinc-800 p-4 sm:p-5">
          <Label className="text-white text-xl font-bold">Overhead Press (kg, best recent 5 reps)</Label>
          <div className="grid grid-cols-4 gap-2 mt-2">
            {["5","10","20","30","40","50","60+","Not sure"].map(v=>(
              <Button
                key={`ohp-${v}`}
                variant="ghost"
                className={`w-full text-lg border ${v==="Not sure"?"h-27 opacity-60":"h-12"} ${a.ohp5rm===v?"bg-yellow-500 text-black border-yellow-500":"border-white/30"}`}
                onClick={()=>set("ohp5rm", v)}
              >
                {v}
              </Button>
            ))}
          </div>
        </Card>
      </div>
    )
  },
  {
    key: "running",
    title: "Running",
    render: (a: Answers, set: (k: keyof Answers, v: any) => void) => (
      <div className="space-y-5">
        <div>
          <Label className="text-white text-xl font-bold">How long do you run per week?</Label>
          <div className="grid grid-cols-1 gap-2 mt-2">
            {["0", "0–60 min", "1–2 hours", "2–4 hours", "4+ hours"].map(v => (
              <Button
                key={v}
                variant="ghost"
                className={`w-full h-12 text-lg border ${a.runWeekly===v?"bg-yellow-500 text-black border-yellow-500":"border-white/30"}`}
                onClick={()=>set("runWeekly", v)}
              >
                {v}
              </Button>
            ))}
          </div>
        </div>
        <div>
          <Label className="text-white text-xl font-bold">Do you do interval sessions?</Label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {["Yes","No"].map(v=>(
              <Button
                key={v}
                variant="ghost"
                className={`w-full h-12 text-lg border ${a.intervals===v?"bg-yellow-500 text-black border-yellow-500":"border-white/30"}`}
                onClick={()=>set("intervals", v)}
              >
                {v}
              </Button>
            ))}
          </div>
        </div>
        <div>
          <Label className="text-white text-xl font-bold">Do you do hill sessions?</Label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {["Yes","No"].map(v=>(
              <Button
                key={v}
                variant="ghost"
                className={`w-full h-12 text-lg border ${a.hills===v?"bg-yellow-500 text-black border-yellow-500":"border-white/30"}`}
                onClick={()=>set("hills", v)}
              >
                {v}
              </Button>
            ))}
          </div>
        </div>
        <div>
          <Label className="text-white text-xl font-bold">Best 5km time</Label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {["<20min", "20-25min", "25-30min", "30min+"].map(v => (
              <Button
                key={`5k-${v}`}
                variant="ghost"
                className={`w-full h-12 text-lg border ${a.best5k_mm===v?"bg-yellow-500 text-black border-yellow-500":"border-white/30"}`}
                onClick={()=>set("best5k_mm", v)}
              >
                {v}
              </Button>
            ))}
          </div>
        </div>
        <div>
          <Label className="text-white text-xl font-bold">Best 10km time</Label>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {["<45min", "45-50min", "50-55min", "55-60min", "60min+"].map(v => (
              <Button
                key={`10k-${v}`}
                variant="ghost"
                className={`w-full h-12 text-lg border ${a.best10k_hh===v?"bg-yellow-500 text-black border-yellow-500":"border-white/30"}`}
                onClick={()=>set("best10k_hh", v)}
              >
                {v}
              </Button>
            ))}
          </div>
        </div>
        {/* Removed 'Where do you usually run?' as not used in the algorithm */}
      </div>
    )
  },
  {
    key: "cardio",
    title: "Cardio & Conditioning",
    render: (a: Answers, set: (k: keyof Answers, v: any) => void) => {
      const toggleMod = (mod: string) => {
        const cur = a.cardioModalities ?? [];
        if (cur.includes(mod)) {
          set("cardioModalities", cur.filter(m => m !== mod));
        } else {
          set("cardioModalities", [...cur, mod]);
        }
      };
      return (
        <div className="space-y-5">
          <div>
            <Label className="text-white text-xl font-bold">
              Cardio sessions per week
              <span className="block text-sm font-normal text-white/60 mt-1">(not including running)</span>
            </Label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {[0,1,2,3,4,5].map((n) => (
                <Button
                  key={`cspw-${n}`}
                  variant="ghost"
                  className={`w-full h-12 text-lg border ${a.cardioSessions===n?"bg-yellow-500 text-black border-yellow-500":"border-white/30"}`}
                  onClick={()=>set("cardioSessions", n)}
                >
                  {n}{n===5?"+":""}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-white text-xl font-bold">Which workout do you do most often?</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {["RowErg","SkiErg","Assault Bike","Circuits"].map(mod => {
                const active = (a.cardioModalities ?? []).includes(mod);
                return (
                  <Button
                    key={mod}
                    variant="ghost"
                    className={`w-full h-12 text-lg border ${active?"bg-yellow-500 text-black border-yellow-500":"border-white/30"}`}
                    onClick={()=>toggleMod(mod)}
                  >
                    {mod}
                  </Button>
                );
              })}
            </div>
          </div>
          <div>
            <Label className="text-white text-xl font-bold">Average duration</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {(["<20","20–40","40–60","60+"] as const).map(v=>(
                <Button
                  key={`dur-${v}`}
                  variant="ghost"
                  className={`w-full h-12 text-lg border ${a.cardioDuration===v?"bg-yellow-500 text-black border-yellow-500":"border-white/30"}`}
                  onClick={()=>set("cardioDuration", v)}
                >
                  {v} min
                </Button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-white text-xl font-bold">Intervals or Zone 2?</Label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {(["Yes","No","Both"] as const).map(v=>(
                <Button
                  key={`iz2-${v}`}
                  variant="ghost"
                  className={`w-full h-12 text-lg border ${a.cardioIntervalZ2===v?"bg-yellow-500 text-black border-yellow-500":"border-white/30"}`}
                  onClick={()=>set("cardioIntervalZ2", v)}
                >
                  {v}
                </Button>
              ))}
            </div>
          </div>
        </div>
      );
    }
  },
  {
    key: "experience",
    title: "Experience & Competition",
    render: (a: Answers, set: (k: keyof Answers, v: any) => void) => (
      <div className="space-y-5">
        <div>
          <Label className="text-white text-xl font-bold">Have you competed before?</Label>
          <div className="grid grid-cols-1 gap-2">
            {[{ label: "Never", value: "No" }, { label: "Once", value: "Once" }, { label: "2–3 times", value: "2–3 times" }, { label: "4+ times", value: "4+ times" }].map(({ label, value }) => (
              <Button
                key={`comp-${value}`}
                variant="ghost"
                className={`w-full h-12 text-lg border ${a.competitionExperience===value?"bg-yellow-500 text-black border-yellow-500":"border-white/30"}`}
                onClick={()=>set("competitionExperience", value as any)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
        <div>
          <Label className="text-white text-xl font-bold">Best result</Label>
          <div className="grid grid-cols-1 gap-2">
            {[{label:"Did Not Finish", value:"DNF"},{label:"Finished", value:"Finished"},{label:"Podium", value:"Podium"}].map(({label,value})=>(
              <Button
                key={`res-${value}`}
                variant="ghost"
                className={`w-full h-12 text-lg border ${a.competitionResult===value?"bg-yellow-500 text-black border-yellow-500":"border-white/30"}`}
                onClick={()=>set("competitionResult", value as any)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    )
  },
  { key: "done", title: "Summary", render: () => <p className="text-sm text-muted-foreground">Tap Finish to see your athlete profile.</p> }
];

const Onboarding = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const set = (k: keyof Answers, v: any) => setAnswers(prev => ({ ...prev, [k]: v }));
  const [resultsOpen, setResultsOpen] = useState(false);
  const [results, setResults] = useState<{ running: number; strength: number; cardio: number } | null>(null);

  const next = () => setIdx(i => Math.min(i+1, steps.length-1));
  const prev = () => setIdx(i => Math.max(i-1, 0));

  const finish = async () => {
    // Simple heuristic to shape an athlete profile (0-100)
    const pad2 = (s?: string) => String(s ?? "").padStart(2, "0");
    const best5kStr =
      (answers.best5k_mm && answers.best5k_ss)
        ? `${pad2(answers.best5k_mm)}:${pad2(answers.best5k_ss)}`
        : null;
    const best10kStr =
      (answers.best10k_mm)
        ? `${pad2(answers.best10k_hh || "0")}:${pad2(answers.best10k_mm)}:00`
        : null;
    const profile = computeAthleteProfile({
      cardio: {
        sessions_per_week: typeof answers.cardioSessions === "number" ? answers.cardioSessions : 0,
        avg_duration_band: (answers.cardioDuration as any) || "20–40",
        modalities: answers.cardioModalities || [],
        interval_or_z2: (answers.cardioIntervalZ2 as any) || "No",
      },
      running: {
        weekly_run_band: (answers.runWeekly as any) || "0",
        intervals: (answers.intervals as any) || "No",
        hills: (answers.hills as any) || "No",
        best5k: best5kStr,
        best10k: best10kStr,
      },
      strength: {
        bench5rm: answers.bench5rm,
        squat5rm: answers.squat5rm,
        deadlift5rm: answers.deadlift5rm,
        ohp5rm: answers.ohp5rm,
      },
      mobility: {
        mobility_band: (answers.mobility as any) || "None",
        yoga: (answers as any).yoga || "No",
      },
      competition: {
        experience: answers.competitionExperience,
        result: answers.competitionResult,
      }
    });
    const payload = { ...profile, answers };
    localStorage.setItem("onboarding_profile", JSON.stringify(payload));
    try {
      if (user?.clientId) {
        const update: Record<string, any> = {
          sex: answers.gender ?? null,
          age: typeof answers.age === "number" ? answers.age : null,
          onboarding_completed_at: new Date().toISOString(),
          athlete_profile: profile, // Changed from onboarding_profile to athlete_profile
          onboarding_answers: answers, // Store raw answers separately
        };
        console.log("💾 Saving to clients table:", update);
        const { error } = await supabase.from("clients").update(update).eq("id", user.clientId);
        if (error) {
          console.error("❌ Failed to save to clients:", error);
          throw error;
        }
        console.log("✅ Saved to clients table");
      }
    } catch (e: any) {
      console.error("❌ Error saving onboarding:", e);
      toast.error("Failed to save onboarding", { description: e?.message || String(e) });
    }
    setResults({
      running: profile.running_score,
      strength: profile.strength_score,
      cardio: (profile as any).cardio_composite_score ?? profile.cardio_conditioning_score,
    });
    setResultsOpen(true);
  };

  const step = steps[idx];

  // Freeze page scroll while this screen is open (copy of T2 behavior)
  useEffect(() => {
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlHeight = document.documentElement.style.height;
    const prevBodyHeight = document.body.style.height;
    const prevOverscroll = (document.body.style as any).overscrollBehaviorY;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.documentElement.style.height = "100%";
    document.body.style.height = "100%";
    (document.body.style as any).overscrollBehaviorY = "none";
    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.height = prevHtmlHeight;
      document.body.style.height = prevBodyHeight;
      (document.body.style as any).overscrollBehaviorY = prevOverscroll || "";
    };
  }, []);

  // Reset scroll position to top when step changes
  useEffect(() => {
    const mainElement = document.querySelector('main');
    if (mainElement) {
      mainElement.scrollTop = 0;
    }
  }, [idx]);

  return (
    <div className="fixed inset-0 bg-background overflow-hidden" style={{ touchAction: 'none' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border"
        style={{ paddingTop: 'calc(60px + env(safe-area-inset-top, 0px))' }}
      >
        <div className="container max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white">{step.title}</h1>
            <div className="text-sm text-white/70">{idx+1} / {steps.length}</div>
          </div>
        </div>
      </header>

      {/* Centered content area; page is frozen (no global scrolling) */}
      <main className="container max-w-2xl mx-auto px-4 pb-40 h-[calc(100vh-4rem)] overflow-y-auto" style={{ paddingTop: 'calc(4rem + env(safe-area-inset-top, 0px))' }}>
        <Card className="mt-10 p-5 bg-zinc-900 border-zinc-800">
          <div className="text-white space-y-4">
            {typeof step.render === "function" ? step.render(answers, set) : step.render}
          </div>
        </Card>
      </main>

      {/* Fixed action bar at the bottom of the screen */}
      <div className="fixed left-0 right-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)]">
        <div className="container max-w-2xl mx-auto px-4 pb-2">
          <div className="bg-background/95 backdrop-blur border border-border rounded-xl p-2 shadow-lg">
            <div className="flex items-center gap-2">
              <Button variant="ghost" className="basis-1/3 h-14 text-lg font-bold border border-white/20 text-white" onClick={prev} disabled={idx===0}>
                Back
              </Button>
              {idx < steps.length - 1 ? (
                step.key === "experience" ? (
                  <Button
                    className="basis-2/3 h-14 text-lg font-bold"
                    style={{ backgroundColor: "#FFCC00", color: "#000" }}
                    onClick={finish}
                  >
                    Complete
                  </Button>
                ) : (
                  <Button
                    className="basis-2/3 h-14 text-lg font-bold"
                    style={{ backgroundColor: "#FFCC00", color: "#000" }}
                    onClick={next}
                  >
                    Next
                  </Button>
                )
              ) : (
                <Button
                  className="basis-2/3 h-14 text-lg font-bold"
                  style={{ backgroundColor: "#FFCC00", color: "#000" }}
                  onClick={finish}
                >
                  Complete
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Results dialog */}
      <Dialog open={resultsOpen} onOpenChange={setResultsOpen}>
        <DialogContent className="pt-10" aria-describedby="ap-desc">
          <DialogHeader>
            <DialogTitle>Athlete Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p id="ap-desc" className="sr-only">Your athlete profile scores and summary.</p>
            {/* Name badge */}
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-white/20 text-white/90 text-sm">
                <UserIcon className="w-4 h-4" />
                {user?.name || "Athlete"}
              </span>
            </div>
            {(() => {
              const mkColor = (v: number) => (v >= 80 ? "#22c55e" : v >= 50 ? "#f59e0b" : "#ef4444");
              const Bar = ({ label, value, Icon }: { label: string; value: number; Icon: React.ElementType }) => (
                <div>
                  <div className="flex items-center justify-between text-white mb-1">
                    <span className="font-semibold inline-flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      {label}
                    </span>
                    <span className="text-sm">{Math.round(value)}</span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: mkColor(value || 0) }}
                    />
                  </div>
                </div>
              );
              return (
                <>
                  <Bar label="Running" value={results?.running ?? 0} Icon={RunnerIcon} />
                  <Bar label="Strength" value={results?.strength ?? 0} Icon={Dumbbell} />
                  <Bar label="Cardio" value={results?.cardio ?? 0} Icon={ActivityIcon} />
                </>
              );
            })()}
            {/* Sex & Age chips */}
            <div className="flex items-center gap-2 flex-wrap pt-2">
              {answers.gender && (
                <span className="px-3 py-1 rounded-full border border-white/20 text-white/80 text-xs">{answers.gender}</span>
              )}
              {typeof answers.age === "number" && answers.age > 0 && (
                <span className="px-3 py-1 rounded-full border border-white/20 text-white/80 text-xs">{answers.age} yrs</span>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              className="w-full h-12 font-bold"
              style={{ backgroundColor: "#FFCC00", color: "#000" }}
              onClick={() => {
                setResultsOpen(false);
                navigate("/program-customize");
              }}
            >
              Custom Programme
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Onboarding;


