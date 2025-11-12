import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dumbbell, CirclePause, HeartPulse, Calendar } from "lucide-react";
import { App as CapacitorApp } from "@capacitor/app";

// Runner icon (silhouette) without external dependencies
const RunnerIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="9" cy="4" r="2" />
    <path d="M7 22l2-5 3 2 3-5" />
    <path d="M5 12l4-2 3 2 2 1" />
    <path d="M13 22l2-4" />
  </svg>
);

// Heart icon for cardio days
const HeartIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

type SessionBlock = {
  type: "run" | "strength" | "cardio" | "recovery";
  icon: React.ElementType;
  intensity: "easy" | "moderate" | "hard";
};

type DayPlan = {
  day: string; // "Day 1"... not shown, we render index
  title: string;
  subtitle?: string;
  detail?: string;
  blocks: SessionBlock[]; // Multiple session blocks per day
  dayIntensity: "rest" | "easy" | "moderate" | "hard";
  icons: React.ElementType[]; // Derived from blocks
};

type TrainingPreferences = {
  focusAreas?: string[];
  runSessionsPerWeek?: number;
  hillsOrSprints?: "Yes" | "No" | null;
  equipment?: string[];
  cardioClassFrequency?: "Never" | "1× per week" | "2–3× per week" | "4+× per week";
  wantsPTCheckins?: boolean;
  trainingDaysPerWeek?: number;
};

const days = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

function buildWeek(pref: TrainingPreferences, desiredTrainingDays: number, weekNumber: number = 1): DayPlan[] {
  let runs = Math.max(0, Math.min(5, pref.runSessionsPerWeek ?? 0));
  const focus = new Set((pref.focusAreas || []).map((x) => x.toLowerCase()));
  
  // SMART SESSION DISTRIBUTION (same logic as ProgrammeBuilder)
  // Get cardioSessions from onboarding_answers (stored in localStorage)
  let requestedCardio = 0;
  try {
    const profileStr = localStorage.getItem("onboarding_profile");
    if (profileStr) {
      const profile = JSON.parse(profileStr);
      requestedCardio = profile?.answers?.cardioSessions ?? 0;
    }
  } catch {
    // Ignore
  }
  
  // If Cardio is selected as focus area but no cardioSessions, default to 2
  if (focus.has("cardio") && requestedCardio === 0) {
    requestedCardio = 2;
  }
  
  const requestedStrength = focus.has("strength") ? 2 : 0;
  
  // Calculate standalone cardio (cardio not embedded in strength days)
  const hasCardioAndStrength = focus.has("cardio") && focus.has("strength");
  const standaloneCardio = hasCardioAndStrength ? Math.max(0, requestedCardio - 2) : requestedCardio;
  const totalRequested = runs + standaloneCardio + requestedStrength;
  
  // If total sessions exceed training days, reduce runs first
  if (totalRequested > desiredTrainingDays) {
    const excess = totalRequested - desiredTrainingDays;
    runs = Math.max(0, runs - excess);
    console.log(`⚠️ Preview: Reducing runs from ${pref.runSessionsPerWeek} to ${runs} to fit ${desiredTrainingDays} training days`);
  }
  
  console.log(`📊 Preview: ${runs} runs + ${standaloneCardio} standalone cardio + ${requestedStrength} strength (with ${hasCardioAndStrength ? 2 : 0} embedded cardio) = ${runs + standaloneCardio + requestedStrength} sessions in ${desiredTrainingDays} days`);

  // Build actual programme structure (matching ProgrammeBuilder logic)
  const isWeek2 = weekNumber === 2;
  const schedule: Array<Omit<DayPlan, "day" | "icons">> = [];
  
  // 1. Add Running Sessions (if user wants them)
  if (runs >= 1) {
    // Long run
    schedule.push({
      title: "Long Run (🏃)",
      subtitle: "Aerobic base development",
      detail: isWeek2 ? "8km steady @ Z2 pace" : "7km steady @ Z2 pace",
      blocks: [{ type: "run", icon: RunnerIcon, intensity: "easy" }],
      dayIntensity: "moderate"
    });
  }
  
  if (runs >= 2) {
    // Intervals
    schedule.push({
      title: "Running Intervals (🏃)",
      subtitle: "Lactate threshold + speed work",
      detail: isWeek2 ? "8×500m @ race pace, 90s rest" : "6×500m @ race pace, 90s rest",
      blocks: [{ type: "run", icon: RunnerIcon, intensity: "hard" }],
      dayIntensity: "hard"
    });
  }
  
  if (runs >= 3) {
    // Tempo
    schedule.push({
      title: "Tempo Run (🏃)",
      subtitle: "Sustained threshold pace",
      detail: isWeek2 ? "5km @ steady pace (Z3)" : "4km @ steady pace (Z3)",
      blocks: [{ type: "run", icon: RunnerIcon, intensity: "moderate" }],
      dayIntensity: "moderate"
    });
  }
  
  // 2. Add Strength Sessions (if selected)
  if (focus.has("strength")) {
    if (requestedStrength >= 1) {
      // Lower body
      schedule.push({
        title: hasCardioAndStrength ? "Strength Lower + Cardio (💪 + ❤️)" : "Strength Lower (💪)",
        subtitle: "Heavy compound lifts" + (hasCardioAndStrength ? " + cardio finisher" : ""),
        detail: hasCardioAndStrength 
          ? "Squats, split squats, RDLs + 15min cardio"
          : "Squats, split squats, RDLs, leg press",
        blocks: hasCardioAndStrength 
          ? [
              { type: "strength", icon: Dumbbell, intensity: "hard" },
              { type: "cardio", icon: HeartIcon, intensity: "moderate" }
            ]
          : [{ type: "strength", icon: Dumbbell, intensity: "hard" }],
        dayIntensity: "hard"
      });
    }
    
    if (requestedStrength >= 2) {
      // Upper body
      schedule.push({
        title: hasCardioAndStrength ? "Strength Upper + Cardio (💪 + ❤️)" : "Strength Upper (💪)",
        subtitle: "Pressing & pulling power" + (hasCardioAndStrength ? " + cardio finisher" : ""),
        detail: hasCardioAndStrength
          ? "Bench, rows, shoulder press + 15min cardio"
          : "Bench, rows, shoulder press, accessories",
        blocks: hasCardioAndStrength
          ? [
              { type: "strength", icon: Dumbbell, intensity: "hard" },
              { type: "cardio", icon: HeartIcon, intensity: "moderate" }
            ]
          : [{ type: "strength", icon: Dumbbell, intensity: "hard" }],
        dayIntensity: "hard"
      });
    }
  }
  
  // 3. Add Standalone Cardio Sessions (if selected and not embedded)
  if (focus.has("cardio") && standaloneCardio > 0) {
    for (let i = 0; i < standaloneCardio; i++) {
      schedule.push({
        title: i === 0 ? "Conditioning (❤️)" : "Engine Work (❤️)",
        subtitle: i === 0 ? "Mixed cardio intervals" : "Steady-state cardio",
        detail: i === 0 
          ? "RowErg, SkiErg, or Bike intervals"
          : "20-30min Z2 on machine of choice",
        blocks: [{ type: "cardio", icon: HeartIcon, intensity: i === 0 ? "moderate" : "easy" }],
        dayIntensity: i === 0 ? "moderate" : "easy"
      });
    }
  }
  
  // 4. Fill remaining days with rest/recovery
  const sessionsNeeded = Math.min(desiredTrainingDays, schedule.length);
  const restDaysNeeded = 7 - sessionsNeeded;
  
  for (let i = 0; i < restDaysNeeded; i++) {
    schedule.push({
      title: "Active Recovery (⏸️)",
      subtitle: "Mobility & regeneration",
      detail: "Yoga, stretching, foam rolling",
      blocks: [{ type: "recovery", icon: CirclePause, intensity: "easy" }],
      dayIntensity: "easy"
    });
  }

  // Ensure we have exactly 7 days (pad with rest if needed)
  while (schedule.length < 7) {
    schedule.push({
      title: "Rest (⏸️)",
      subtitle: "Complete recovery",
      detail: "Full rest day",
      blocks: [],
      dayIntensity: "rest"
    });
  }

  // Map schedule to days of the week
  const result: DayPlan[] = schedule.slice(0, 7).map((session, i) => ({
    day: days[i],
    ...session,
    icons: session.blocks.length === 0 ? [CirclePause] : session.blocks.map(b => b.icon)
  }));

  return result;
}

const ProgramPreview = () => {
  const navigate = useNavigate();
  const [typed, setTyped] = useState("");
  
  const profile = useMemo(() => {
    try {
      const raw = localStorage.getItem("onboarding_profile");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);
  
  const pref: TrainingPreferences = profile?.training_preferences || {};
  const answers = profile?.answers || {};
  
  // Calculate weeks to event
  const weeksToEvent = answers.eventDate 
    ? Math.floor((new Date(answers.eventDate).getTime() - Date.now()) / (7 * 24 * 60 * 60 * 1000))
    : null;
  
  // Determine focus type
  const focusAreas = pref.focusAreas || [];
  let focusType = "";
  if (focusAreas.length === 3) {
    focusType = "building a complete hybrid athlete foundation";
  } else if (focusAreas.length === 2) {
    focusType = `focusing on ${focusAreas[0].toLowerCase()} and ${focusAreas[1].toLowerCase()}`;
  } else if (focusAreas.length === 1) {
    focusType = `specializing in ${focusAreas[0].toLowerCase()}`;
  } else {
    focusType = "building your fitness";
  }
  
  const trainingDays = pref.trainingDaysPerWeek || 5;
  const eventText = weeksToEvent && weeksToEvent > 0 
    ? ` (only ${weeksToEvent} week${weeksToEvent === 1 ? '' : 's'} to go!)` 
    : "";
  
  // Get event name or use generic term
  const eventName = answers.eventName || "fitness race";
  const raceName = answers.eventName || "fitness race";
  
  const intro = `Your training programme is built on evidence-based principles in strength & conditioning, endurance physiology, and functional performance science. Whether you're ${focusType} or chasing a personal best, this plan adapts to your <span class="text-yellow-400 font-bold underline">${trainingDays}-day training week</span>${eventText ? ` <span class="text-yellow-400 font-bold underline">(only ${weeksToEvent} week${weeksToEvent === 1 ? '' : 's'} to go!)</span>` : ''}.<br/><br/>Every session optimizes energy system development, movement efficiency, and recovery — ensuring consistent progression toward race readiness.`;
  const typingIdx = useRef(0);
  const [typingComplete, setTypingComplete] = useState(true); // Show immediately
  const [showWeek1, setShowWeek1] = useState(true); // Show immediately
  const [showWeek2, setShowWeek2] = useState(true); // Show immediately
  
  // Set typed text immediately (no animation)
  useEffect(() => {
    setTyped(intro);
  }, [intro]);

  // Handle Android back button
  useEffect(() => {
    const handleBackButton = CapacitorApp.addListener('backButton', () => {
      // Navigate back in the app instead of closing it
      navigate(-1);
    });

    return () => {
      handleBackButton.then(listener => listener.remove());
    };
  }, [navigate]);
  
  const daysPerWeek = 7;
  const incomplete =
    !pref ||
    !pref.focusAreas ||
    (pref.focusAreas || []).length === 0 ||
    typeof pref.runSessionsPerWeek !== "number";

  // Ensure training days per week are respected
  const desiredTrainingDays = Math.max(1, Math.min(6, pref.trainingDaysPerWeek ?? 5));
  const week1 = buildWeek(pref, desiredTrainingDays, 1);
  const week2 = buildWeek(pref, desiredTrainingDays, 2);
  
  const labelForIcon = (Icon: React.ElementType) => {
    switch (Icon) {
      case RunnerIcon:
        return "running";
      case Dumbbell:
        return "strength";
      case HeartIcon:
        return "cardio";
      default:
        return "rest";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header
        className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border"
        style={{ paddingTop: "calc(20px + env(safe-area-inset-top, 0px))" }}
      >
        <div className="container max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white">Your Plan</h1>
            <div className="text-sm text-white/70 whitespace-nowrap">Days/week: {desiredTrainingDays}</div>
          </div>
        </div>
      </header>
      <main className="container max-w-3xl mx-auto px-4 pb-40 flex flex-col items-center" style={{ paddingTop: '104px' }}>
        <div className="w-full max-w-2xl mb-12 text-white/90 text-base sm:text-lg text-left">
          <div className="font-medium" dangerouslySetInnerHTML={{ 
            __html: typed
              .replace(/strength & conditioning/g, '<span class="text-yellow-400 font-bold">strength & conditioning</span>')
              .replace(/endurance physiology/g, '<span class="text-yellow-400 font-bold">endurance physiology</span>')
              .replace(/functional performance science/g, '<span class="text-yellow-400 font-bold">functional performance science</span>')
              .replace(/energy system development/g, '<span class="text-yellow-400 font-bold">energy system development</span>')
              .replace(/movement efficiency/g, '<span class="text-yellow-400 font-bold">movement efficiency</span>')
              .replace(/race readiness/g, '<span class="text-yellow-400 font-bold">race readiness</span>')
          }} />
        </div>
        
        {/* Horizontal scrolling methodology cards - only show after typing complete */}
        {typingComplete && (
          <div className="w-full overflow-x-scroll pb-4 mb-6 -mx-4 px-4" style={{ 
            scrollbarWidth: 'none', 
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch'
          }}>
            <style>{`
              .methodology-scroll::-webkit-scrollbar {
                display: none;
              }
            `}</style>
            <div className="methodology-scroll flex gap-4" style={{ width: 'max-content' }}>
              {/* 2-Week Adaptive Blocks Card */}
              <Card className="flex-shrink-0 w-80 p-5 bg-zinc-900 border-zinc-800 flex flex-col" style={{ minHeight: '240px' }}>
                <h4 className="text-lg font-bold text-yellow-400 mb-3">2-Week Adaptive Blocks</h4>
                <p className="text-white/90 text-xs leading-relaxed mb-3">
                  Your plan evolves every <span className="text-yellow-400 font-semibold">2 weeks</span>, blending <span className="text-yellow-400 font-semibold">strength</span>, <span className="text-yellow-400 font-semibold">running</span>, and <span className="text-yellow-400 font-semibold">engine work</span> for hybrid performance.
                </p>
                
                <p className="text-white/70 text-xs mb-3">
                  Each bar segment shows your progress — moving from <span className="text-yellow-400 font-semibold">Base → Build → Race Prep</span> 🏁
                </p>
                
                {/* Segmented Progress Bar */}
                <div className="space-y-2 mb-4">
                  {(() => {
                    const totalBlocks = weeksToEvent ? Math.max(2, Math.ceil(weeksToEvent / 2)) : 4;
                    const blocks = Array.from({ length: totalBlocks }).map((_, i) => ({
                      name: i === 0 ? "Base & Movement" : i === totalBlocks - 1 ? "Race Prep" : "Build & Strength"
                    }));
                    const currentBlock = 0; // Always starting at Block 1 for onboarding
                    
                    return (
                      <>
                        {/* Segmented bar */}
                        <div className="flex items-center gap-1">
                          {blocks.map((block, idx) => {
                            const isPast = idx < currentBlock;
                            const isCurrent = idx === currentBlock;
                            
                            return (
                              <div
                                key={idx}
                                className={`h-2 flex-1 rounded-full transition-all ${
                                  isCurrent
                                    ? "bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.7)]"
                                    : isPast
                                    ? "bg-yellow-600"
                                    : "bg-zinc-700"
                                }`}
                              />
                            );
                          })}
                          <div className="ml-1 flex items-center justify-center rounded-full w-6 h-6 bg-yellow-500 text-zinc-900 text-xs font-bold">
                            🏁
                          </div>
                        </div>
                        
                        {/* Summary text */}
                        <p className="text-xs text-gray-300">
                          Block <span className="text-yellow-400 font-semibold">{currentBlock + 1}</span> of <span className="text-yellow-400 font-semibold">{blocks.length}</span> – <span className="text-yellow-400 font-semibold">{blocks[currentBlock].name}</span>
                        </p>
                      </>
                    );
                  })()}
                </div>
                
                <div className="mt-auto space-y-1 text-xs text-white/70">
                  <div>• <span className="text-yellow-400 font-semibold">Responsive</span> to your schedule</div>
                  <div>• <span className="text-yellow-400 font-semibold">Specific</span> to race demands</div>
                  <div>• <span className="text-yellow-400 font-semibold">Progressive</span> load increases</div>
                </div>
                
                {weeksToEvent && (
                  <p className="mt-3 text-xs text-gray-300">
                    <span className="text-yellow-400 font-semibold">{weeksToEvent} weeks</span> to race day — <span className="text-yellow-400 font-semibold">{Math.ceil(weeksToEvent / 2)} adaptive blocks</span> to get ready.
                  </p>
                )}
              </Card>

              <Card className="flex-shrink-0 w-80 p-5 bg-zinc-900 border-zinc-800 flex flex-col" style={{ minHeight: '240px' }}>
                <h4 className="text-lg font-bold text-yellow-400 mb-3">Energy System Training</h4>
                <p className="text-white/90 text-xs leading-relaxed mb-3">
                  Hybrid fitness demands all three energy systems working in harmony:
                </p>
                
                {/* Energy Systems Visual */}
                <div className="space-y-2 mb-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-white/80">Phosphocreatine</span>
                      <span className="text-yellow-400 font-semibold">0-10s</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-red-500" style={{ width: '15%' }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-white/80">Glycolytic</span>
                      <span className="text-yellow-400 font-semibold">10s-2min</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-orange-500" style={{ width: '35%' }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-white/80">Oxidative</span>
                      <span className="text-yellow-400 font-semibold">2+ min</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500" style={{ width: '50%' }}></div>
                    </div>
                  </div>
                </div>
                
                <p className="text-white/70 text-xs mt-auto">
                  Your plan balances these through strategic session design.
                </p>
              </Card>

              <Card className="flex-shrink-0 w-80 p-5 bg-zinc-900 border-zinc-800 flex flex-col" style={{ minHeight: '240px' }}>
                <h4 className="text-lg font-bold text-yellow-400 mb-3">The 80/20 Rule</h4>
                <p className="text-white/90 text-xs leading-relaxed mb-3">
                  Research-backed intensity distribution for optimal endurance:
                </p>
                
                {/* 80/20 Pie Chart Visual */}
                <div className="flex items-center justify-center mb-3">
                  <div className="relative w-32 h-32">
                    <svg viewBox="0 0 100 100" className="transform -rotate-90">
                      {/* 80% Low Intensity - Green */}
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="#22c55e"
                        strokeWidth="20"
                        strokeDasharray="251.2 251.2"
                        strokeDashoffset="0"
                      />
                      {/* 20% High Intensity - Yellow */}
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="#FFCC00"
                        strokeWidth="20"
                        strokeDasharray="50.24 251.2"
                        strokeDashoffset="-201"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-white">80/20</div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-white/80">80% Low (Z2, aerobic base)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                    <span className="text-white/80">20% High (race pace, power)</span>
                  </div>
                </div>
                
                <p className="text-white/70 text-xs mt-3">
                  Avoid the <span className="text-red-500 font-semibold">"RED zone" (70-80% HR)</span> that compromises both systems.
                </p>
              </Card>

              <Card className="flex-shrink-0 w-80 p-5 bg-zinc-900 border-zinc-800 flex flex-col" style={{ minHeight: '240px' }}>
                <h4 className="text-lg font-bold text-yellow-400 mb-2">Concurrent Training</h4>
                <p className="text-white/90 text-sm leading-relaxed mb-3 flex-1">
                  The key challenge: maintaining <span className="text-yellow-400 font-semibold">running performance</span> while building <span className="text-yellow-400 font-semibold">functional strength</span>. Your programme uses <span className="text-yellow-400 font-semibold">progressive overload</span>, <span className="text-yellow-400 font-semibold">race specificity</span>, and proper <span className="text-yellow-400 font-semibold">recovery windows</span> (3-5 days for supercompensation).
                </p>
                <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 p-4 rounded-xl border border-yellow-400/30 shadow-lg">
                  <h5 className="text-sm font-bold text-yellow-400 mb-3 tracking-wide">Key Principles</h5>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-yellow-400"></div>
                      <span className="text-xs text-white font-semibold">Progressive Overload</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-yellow-400"></div>
                      <span className="text-xs text-white font-semibold">Specificity</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-yellow-400"></div>
                      <span className="text-xs text-white font-semibold">Recovery</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-yellow-400"></div>
                      <span className="text-xs text-white font-semibold">Consistency</span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}
        
        {typingComplete && (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 w-full">
            {incomplete ? (
              <Card className="w-full max-w-2xl p-6 bg-zinc-900 border-zinc-800">
                <div className="py-8 text-center text-white/80">
                  <div className="text-lg font-bold mb-2">We need a bit more info</div>
                  <p className="text-sm mb-4">Select your focus areas and runs per week in Custom Programme to build the preview.</p>
                  <Button
                    className="h-11 font-bold"
                    style={{ backgroundColor: "#FFCC00", color: "#000" }}
                    onClick={() => navigate("/program-customize")}
                  >
                    Complete Setup
                  </Button>
                </div>
              </Card>
            ) : (
              <>
            
              {/* Week One Title and Intro */}
              <div className="w-full max-w-2xl mb-3">
                <h3 className="text-2xl font-extrabold text-white mb-2">Week One</h3>
                <p className="text-white/90 text-base sm:text-lg leading-relaxed">
                  {
                    focusAreas.length === 3
                      ? "Establishes your training rhythm with a complete hybrid approach — building your running base, functional strength, and conditioning simultaneously"
                      : focusAreas.length === 2
                      ? `Establishes your training rhythm with balanced focus on ${focusAreas[0].toLowerCase()} and ${focusAreas[1].toLowerCase()}, creating the foundation for race-specific fitness`
                      : focusAreas.length === 1
                      ? `Establishes your training rhythm with concentrated work on ${focusAreas[0].toLowerCase()}, ensuring quality over quantity in every session`
                      : "Establishes your training rhythm with foundational fitness development across all movement patterns"
                  }. {
                    trainingDays <= 3
                      ? "With fewer training days, each session is carefully designed for maximum adaptation."
                      : trainingDays >= 5
                      ? "Your high training frequency allows for greater volume distribution and faster progression."
                      : "This balanced 4-day schedule optimizes the training-recovery ratio."
                  }
                </p>
              </div>

              <div className="w-full max-w-2xl transition-opacity duration-500" style={{ opacity: showWeek1 ? 1 : 0 }}>
                <Card className="w-full p-5 bg-zinc-900 border-zinc-800">
                <div className="relative py-12 sm:py-16">
                  <div className="absolute left-[5%] right-[5%] top-1/2 -translate-y-1/2 h-[2px] bg-white/10" />
                  <div className="relative grid gap-3 sm:gap-4 justify-items-center" style={{ gridTemplateColumns: `repeat(${daysPerWeek}, minmax(0, 1fr))` }}>
                    {week1.slice(0, daysPerWeek).map((d, idx) => {
                      const icons = d.icons || [CirclePause];
                      const isRestDay = icons.length === 1 && icons[0] === CirclePause;
                      const ring = isRestDay ? "ring-2 ring-gray-500/80" : "ring-2 ring-yellow-500/80";
                      const dotColor = isRestDay ? "bg-gray-400" : "bg-yellow-400";
                      const iconColor = isRestDay ? "text-gray-400" : "text-yellow-400";
                      
                      // Get technical labels from the day's blocks
                      const technicalLabels = d.blocks.map(block => {
                        if (block.type === "strength") return block.intensity === "hard" ? "Lower" : "Upper";
                        if (block.type === "run") return block.intensity === "hard" ? "Intervals" : "Long Run";
                        if (block.type === "cardio") return block.intensity === "easy" ? "Easy Engine" : "Short Engine";
                        if (block.type === "recovery") return "Recovery";
                        return "";
                      });
                      
                      // Split icons into top and bottom
                      const topIcons = icons.filter(Icon => Icon === RunnerIcon || Icon === Dumbbell);
                      const bottomIcons = icons.filter(Icon => Icon === HeartIcon || Icon === CirclePause);
                      
                      return (
                        <div key={`w1-${idx}`} className="relative flex flex-col items-center">
                          {/* Top markers */}
                          <div className="h-10 sm:h-12 md:h-14 flex flex-col items-center justify-end gap-1 pb-1 sm:pb-2">
                            {topIcons.map((Icon, i) => {
                              const label = Icon === RunnerIcon 
                                ? (d.blocks.find(b => b.type === "run")?.intensity === "hard" ? "Intervals" : "Long Run")
                                : (d.blocks.find(b => b.type === "strength")?.intensity === "hard" ? "Lower" : "Upper");
                              return (
                                <div key={`top-${i}`} className="flex items-center justify-center gap-0.5 -rotate-45 origin-center" style={{ transform: 'rotate(-45deg) translate(20px, -5px)' }}>
                                  <Icon className={`w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 ${iconColor}`} />
                                  <span className={`text-[8px] sm:text-[9px] md:text-[10px] ${iconColor} font-semibold whitespace-nowrap`}>{label}</span>
                                </div>
                              );
                            })}
                          </div>
                          <div className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full ${dotColor} ${ring} flex items-center justify-center text-black text-xs sm:text-sm md:text-base font-extrabold my-1`}>
                            {idx + 1}
                          </div>
                          {/* Bottom markers */}
                          <div className="h-10 sm:h-12 md:h-14 flex flex-col items-center justify-start gap-1 pt-1 sm:pt-2">
                            {bottomIcons.map((Icon, i) => {
                              const label = Icon === HeartIcon 
                                ? (d.blocks.find(b => b.type === "cardio")?.intensity === "easy" ? "Easy Engine" : "Short Engine")
                                : "Rest";
                              return (
                                <div key={`bot-${i}`} className="flex items-center justify-center gap-0.5 -rotate-45 origin-center" style={{ transform: 'rotate(-45deg) translate(-20px, 5px)' }}>
                                  <Icon className={`w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 ${iconColor}`} />
                                  <span className={`text-[8px] sm:text-[9px] md:text-[10px] ${iconColor} font-semibold whitespace-nowrap`}>{label}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                </Card>
              </div>

              {/* Week Two Title and Intro */}
              <div className="w-full max-w-2xl mb-3 mt-6">
                <h3 className="text-2xl font-extrabold text-white mb-2">Week Two</h3>
                <p className="text-white/90 text-base sm:text-lg leading-relaxed mb-3">
                  Builds on this foundation with {
                    focusAreas.includes("Strength") && focusAreas.includes("Running") 
                      ? "increased volume in both strength and running sessions"
                      : focusAreas.includes("Strength")
                      ? "progressive overload in your strength work"
                      : focusAreas.includes("Running")
                      ? "increased running volume and intensity"
                      : "progressive adaptation across all systems"
                  }. {
                    pref.runSessionsPerWeek && pref.runSessionsPerWeek >= 3
                      ? `With ${pref.runSessionsPerWeek} runs per week, you're building serious aerobic capacity.`
                      : pref.runSessionsPerWeek === 2
                      ? "Your 2 weekly runs focus on quality over quantity — one interval session, one endurance."
                      : pref.runSessionsPerWeek === 1
                      ? "Your single weekly run is strategically placed for maximum aerobic benefit without compromising recovery."
                      : "Focus remains on functional strength and conditioning."
                  }
                </p>
                <p className="text-white/70 text-sm sm:text-base">
                  <span className="font-semibold text-yellow-400">Training tip:</span> {
                    trainingDays >= 5
                      ? "With 5+ training days, prioritize sleep (7-9hrs) and nutrition timing around hard sessions."
                      : trainingDays >= 3
                      ? "Your 3-4 day schedule allows optimal recovery between sessions — use rest days for mobility work."
                      : "Lower training frequency means each session counts — bring full intensity and focus."
                  } {
                    weeksToEvent && weeksToEvent <= 4
                      ? `With only ${weeksToEvent} weeks to race day, every session is building race-specific fitness.`
                      : weeksToEvent && weeksToEvent <= 8
                      ? "You're in the build phase — this is where fitness gains compound week over week."
                      : "Focus on building your aerobic base and movement quality — the foundation for everything."
                  }
                </p>
              </div>

              <div className="w-full max-w-2xl transition-opacity duration-500" style={{ opacity: showWeek2 ? 1 : 0 }}>
                <Card className="w-full p-5 bg-zinc-900 border-zinc-800">
                <div className="relative py-12 sm:py-16">
                  <div className="absolute left-[5%] right-[5%] top-1/2 -translate-y-1/2 h-[2px] bg-white/10" />
                  <div className="relative grid gap-3 sm:gap-4 justify-items-center" style={{ gridTemplateColumns: `repeat(${daysPerWeek}, minmax(0, 1fr))` }}>
                    {week2.slice(0, daysPerWeek).map((d, idx) => {
                      const icons = d.icons || [CirclePause];
                      const isRestDay = icons.length === 1 && icons[0] === CirclePause;
                      const ring = isRestDay ? "ring-2 ring-gray-500/80" : "ring-2 ring-yellow-500/80";
                      const dotColor = isRestDay ? "bg-gray-400" : "bg-yellow-400";
                      const iconColor = isRestDay ? "text-gray-400" : "text-yellow-400";
                      
                      // Split icons into top and bottom
                      const topIcons = icons.filter(Icon => Icon === RunnerIcon || Icon === Dumbbell);
                      const bottomIcons = icons.filter(Icon => Icon === HeartIcon || Icon === CirclePause);
                      
                      return (
                        <div key={`w2-${idx}`} className="relative flex flex-col items-center">
                          {/* Top markers */}
                          <div className="h-10 sm:h-12 md:h-14 flex flex-col items-center justify-end gap-1 pb-1 sm:pb-2">
                            {topIcons.map((Icon, i) => {
                              const label = Icon === RunnerIcon 
                                ? (d.blocks.find(b => b.type === "run")?.intensity === "hard" ? "Intervals" : "Long Run")
                                : (d.blocks.find(b => b.type === "strength")?.intensity === "hard" ? "Lower" : "Upper");
                              return (
                                <div key={`top-${i}`} className="flex items-center justify-center gap-0.5 -rotate-45 origin-center" style={{ transform: 'rotate(-45deg) translate(20px, -5px)' }}>
                                  <Icon className={`w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 ${iconColor}`} />
                                  <span className={`text-[8px] sm:text-[9px] md:text-[10px] ${iconColor} font-semibold whitespace-nowrap`}>{label}</span>
                                </div>
                              );
                            })}
                          </div>
                          <div className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full ${dotColor} ${ring} flex items-center justify-center text-black text-xs sm:text-sm md:text-base font-extrabold my-1`}>
                            {idx + 1}
                          </div>
                          {/* Bottom markers */}
                          <div className="h-10 sm:h-12 md:h-14 flex flex-col items-center justify-start gap-1 pt-1 sm:pt-2">
                            {bottomIcons.map((Icon, i) => {
                              const label = Icon === HeartIcon 
                                ? (d.blocks.find(b => b.type === "cardio")?.intensity === "easy" ? "Easy Engine" : "Short Engine")
                                : "Rest";
                              return (
                                <div key={`bot-${i}`} className="flex items-center justify-center gap-0.5 -rotate-45 origin-center" style={{ transform: 'rotate(-45deg) translate(-20px, 5px)' }}>
                                  <Icon className={`w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 ${iconColor}`} />
                                  <span className={`text-[8px] sm:text-[9px] md:text-[10px] ${iconColor} font-semibold whitespace-nowrap`}>{label}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                </Card>
              </div>
              
              {/* The Goal Section */}
              <Card className="w-full max-w-2xl p-6 bg-zinc-900 border-zinc-800 mt-8">
                <div className="text-left">
                  <h3 className="text-2xl font-extrabold text-yellow-400 mb-4">The Goal</h3>
                  <p className="text-white/90 text-base sm:text-lg leading-relaxed">
                    To make every week progressively build <span className="text-yellow-400 font-bold">race readiness</span> — balancing <span className="text-yellow-400 font-bold">intensity</span>, <span className="text-yellow-400 font-bold">recovery</span>, and <span className="text-yellow-400 font-bold">specificity</span> so that when {answers.eventName ? `${answers.eventName}` : 'event day'} arrives{eventText ? `, with ${weeksToEvent} week${weeksToEvent === 1 ? '' : 's'} of focused training behind you` : ''}, you're not just prepared… <span className="text-yellow-400 font-bold">you're ready to perform</span>.
                  </p>
                  {focusAreas.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <p className="text-white/70 text-sm">
                        Your focus: <span className="text-yellow-400 font-semibold">{focusAreas.join(', ')}</span> • Training {trainingDays} days per week • {pref.runSessionsPerWeek || 0} run sessions weekly
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            </>
          )}
          </div>
        )}
      </main>
      <div className="fixed left-0 right-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)]">
        <div className="container max-w-3xl mx-auto px-4 pb-2">
          <div className="bg-background/95 backdrop-blur border border-border rounded-xl p-2 shadow-lg">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                className="basis-1/3 h-14 text-lg font-bold border border-white/20 text-white"
                onClick={() => navigate(-1)}
              >
                Back
              </Button>
              <Button
                className="basis-2/3 h-14 text-lg font-bold"
                style={{ backgroundColor: "#FFCC00", color: "#000" }}
                onClick={() => navigate("/onboarding-complete")}
              >
                Complete
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgramPreview;


