import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { createPlanInDatabase } from "@/services/programmeToDatabase";
import { toast } from "sonner";

type RunProfile = {
  runSessionsPerWeek: number;
  focus?: "base" | "build" | "race-prep";
  weeksToEvent?: number;
  hasHills?: boolean;
};

type SessionBlock = {
  day: string;
  type: "run" | "strength" | "cardio" | "recovery";
  title: string;
  distance?: string;
  pace?: string;
  effort: "easy" | "moderate" | "hard";
  detail?: string;
};

type UserPreferences = {
  trainingDaysPerWeek: number;
  runSessionsPerWeek: number;
  focusAreas: string[];
  hasHills: boolean;
  focus: "base" | "build" | "race-prep";
  blockNumber?: number;
  weeksToEvent?: number | null;
  isDeload?: boolean;
  isTaper?: boolean;
  taperWeek?: 1 | 2; // Week -2 or Week -1
};

function buildFullProgramme(prefs: UserPreferences): SessionBlock[] {
  const sessions: SessionBlock[] = [];
  const trainingDays = prefs.trainingDaysPerWeek || 5;
  const runs = prefs.runSessionsPerWeek || 2;
  const focus = prefs.focus || "base";
  const focusAreas = new Set(prefs.focusAreas.map(f => f.toLowerCase()));
  
  // Volume modifiers for deload/taper
  let volumeModifier = 1.0; // Normal = 100%
  let useLowImpact = false;
  
  // DELOAD LOGIC: Block 6 (after 12 weeks)
  if (prefs.isDeload) {
    volumeModifier = 0.7; // -30% volume
    console.log("🔄 DELOAD WEEK: Reducing volume by 30%");
  }
  
  // TAPER LOGIC: 2 weeks before event
  if (prefs.isTaper && prefs.taperWeek) {
    if (prefs.taperWeek === 1) {
      volumeModifier = 0.8; // Week -2: -20% volume
      useLowImpact = true;
      console.log("🏁 TAPER WEEK -2: Reducing volume by 20%, using low-impact alternatives");
    } else if (prefs.taperWeek === 2) {
      volumeModifier = 0.6; // Week -1: -40% volume
      useLowImpact = true;
      console.log("🏁 TAPER WEEK -1: Reducing volume by 40%, using low-impact alternatives");
    }
  }
  
  // Available days for training
  const availableDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const usedDays = new Set<string>();
  
  // Helper to find next available day
  const getNextDay = (preferredDays: string[]) => {
    for (const day of preferredDays) {
      if (!usedDays.has(day) && sessions.filter(s => s.day === day).length === 0) {
        return day;
      }
    }
    // Fallback: find any unused day
    return availableDays.find(d => !usedDays.has(d)) || availableDays[0];
  };

  // 1. Add Running Sessions
  if (focusAreas.has("running") || runs > 0) {
    // Long run (always on Saturday if available)
    const longRunDay = getNextDay(["Saturday", "Sunday"]);
    
    // Calculate adjusted distance based on volume modifier
    let baseDistance = focus === "base" ? 7 : focus === "build" ? 9 : 11; // km
    let adjustedDistance = Math.round(baseDistance * volumeModifier);
    
    // For taper, suggest low-impact alternative
    const runTitle = useLowImpact ? "Long Cardio (Low Impact)" : "Long Run";
    const runDetail = useLowImpact 
      ? `${adjustedDistance}km equivalent on bike or rower (low impact for taper)`
      : "Build aerobic base with steady-state running";
    
    sessions.push({
      day: longRunDay,
      type: useLowImpact ? "cardio" : "run",
      title: runTitle,
      distance: `${adjustedDistance}km`,
      pace: "Zone 2 (conversational)",
      effort: "easy",
      detail: runDetail
    });
    usedDays.add(longRunDay);

    // Intervals
    if (runs >= 2) {
      const intervalDay = getNextDay(["Tuesday", "Wednesday"]);
      
      // Reduce interval volume for deload/taper
      let baseReps = focus === "race-prep" ? 6 : focus === "build" ? 8 : 6;
      let adjustedReps = Math.max(2, Math.round(baseReps * volumeModifier)); // Min 2 reps
      let repDistance = focus === "race-prep" ? "1km" : "500m";
      
      // For taper week -1, make it very short
      if (prefs.isTaper && prefs.taperWeek === 2) {
        adjustedReps = Math.min(adjustedReps, 3); // Max 3 reps in week -1
      }
      
      sessions.push({
        day: intervalDay,
        type: "run",
        title: "Intervals",
        distance: `${adjustedReps}×${repDistance}`,
        pace: "Race pace",
        effort: prefs.isTaper ? "moderate" : "hard",
        detail: prefs.isTaper 
          ? "Short, sharp quality session - keep it controlled"
          : "90sec rest between reps, focus on maintaining pace"
      });
      usedDays.add(intervalDay);
    }

    // Tempo run
    if (runs >= 3 && !prefs.isTaper) { // Skip tempo in taper
      const tempoDay = getNextDay(["Thursday", "Friday"]);
      let baseTempoDistance = focus === "build" ? 5.5 : 4;
      let adjustedTempoDistance = Math.round(baseTempoDistance * volumeModifier);
      
      sessions.push({
        day: tempoDay,
        type: "run",
        title: "Tempo Run",
        distance: `${adjustedTempoDistance}km`,
        pace: "Steady (Zone 3)",
        effort: "moderate",
        detail: "Continuous run at comfortably hard pace"
      });
      usedDays.add(tempoDay);
    }

    // Hill repeats
    if (prefs.hasHills && runs >= 4) {
      const hillDay = getNextDay(["Monday", "Wednesday"]);
      sessions.push({
        day: hillDay,
        type: "run",
        title: "Hill Repeats",
        distance: "6×200m",
        pace: "Hard effort uphill",
        effort: "hard",
        detail: "Focus on power and form, jog down recovery"
      });
      usedDays.add(hillDay);
    }

    // Recovery run
    if (runs >= 5) {
      const recoveryDay = getNextDay(["Wednesday", "Friday"]);
      sessions.push({
        day: recoveryDay,
        type: "run",
        title: "Recovery Run",
        distance: "3–4km",
        pace: "Very easy (Zone 1)",
        effort: "easy",
        detail: "Promote adaptation and active recovery"
      });
      usedDays.add(recoveryDay);
    }
  }

  // 2. Add Strength Sessions
  if (focusAreas.has("strength")) {
    const strengthDays = Math.min(3, trainingDays - usedDays.size);
    
    if (strengthDays >= 1) {
      const lowerDay = getNextDay(["Monday", "Thursday"]);
      sessions.push({
        day: lowerDay,
        type: "strength",
        title: "Strength Lower + Easy Engine",
        detail: "Back squats, Bulgarian split squats, RDLs + 20min Z2 RowErg",
        effort: "hard"
      });
      usedDays.add(lowerDay);
    }

    if (strengthDays >= 2) {
      const upperDay = getNextDay(["Wednesday", "Friday"]);
      sessions.push({
        day: upperDay,
        type: "strength",
        title: "Strength Upper + Short Engine",
        detail: "Bench press, strict press, weighted pull-ups + 15min EMOM SkiErg",
        effort: "hard"
      });
      usedDays.add(upperDay);
    }

    if (strengthDays >= 3) {
      const fullBodyDay = getNextDay(["Tuesday", "Saturday"]);
      sessions.push({
        day: fullBodyDay,
        type: "strength",
        title: "Full Body Strength",
        detail: "Deadlifts, overhead press, rows, core work",
        effort: "moderate"
      });
      usedDays.add(fullBodyDay);
    }
  }

  // 3. Add Cardio/Conditioning Sessions
  if (focusAreas.has("cardio")) {
    const cardioDays = Math.min(2, trainingDays - usedDays.size);
    
    if (cardioDays >= 1) {
      const cardioDay = getNextDay(["Tuesday", "Thursday"]);
      sessions.push({
        day: cardioDay,
        type: "cardio",
        title: "Race Simulation",
        detail: "4 rounds: 1km run + 50m sled push + 500m SkiErg, 3min rest",
        effort: "hard"
      });
      usedDays.add(cardioDay);
    }

    if (cardioDays >= 2) {
      const engineDay = getNextDay(["Friday", "Wednesday"]);
      sessions.push({
        day: engineDay,
        type: "cardio",
        title: "Engine Work",
        detail: "30min mixed: RowErg, SkiErg, Assault Bike intervals",
        effort: "moderate"
      });
      usedDays.add(engineDay);
    }
  }

  // 4. Add Mobility/Recovery sessions
  // Strategy: Add mobility to EVERY training day (10-15 min post-workout)
  // Add full recovery days on rest days
  
  // Get all training days
  const trainingDaysUsed = Array.from(usedDays);
  
  // Add short mobility to each training day (10-15 min)
  for (const day of trainingDaysUsed) {
    sessions.push({
      day: day, // Same day as main workout
      type: "recovery",
      title: "Post-Workout Mobility",
      detail: "10-15min stretching and foam rolling",
      effort: "easy"
    });
  }
  
  // Add full recovery days on rest days (if any)
  const restDays = availableDays.filter(d => !usedDays.has(d));
  if (restDays.length > 0) {
    // Add one full recovery day (prefer Sunday)
    const recoveryDay = restDays.includes("Sunday") ? "Sunday" : restDays[0];
    sessions.push({
      day: recoveryDay,
      type: "recovery",
      title: "Active Recovery",
      detail: "30min yoga, foam rolling, dynamic stretching",
      effort: "easy"
    });
  }

  return sessions.sort((a, b) => {
    const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    return dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
  });
}

export default function ProgrammeBuilder() {
  console.log("🏗️ ProgrammeBuilder component mounted");
  
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);

  console.log("🔍 ProgrammeBuilder state:", { user, isLoading, step, progress });

  const steps = [
    "Analysing your training goals...",
    "Calibrating intensity zones...",
    "Building your first 2-week block...",
    "Creating workouts in database...",
    "Programme ready!"
  ];

  useEffect(() => {
    console.log("🔄 ProgrammeBuilder useEffect triggered");
    // Wait for auth to load
    if (isLoading) {
      console.log("⏳ Auth still loading...");
      return;
    }

    console.log("🔍 Auth loaded. User:", user);
    console.log("🔍 localStorage frank_rock_user:", localStorage.getItem("frank_rock_user"));

    // Get user profile from localStorage
    const profileStr = localStorage.getItem("onboarding_profile");
    if (!profileStr) {
      console.log("❌ No onboarding profile found");
      navigate("/onboarding");
      return;
    }

    if (!user?.clientId) {
      console.log("❌ No user or clientId. User:", user);
      toast.error("User not authenticated");
      navigate("/login");
      return;
    }

    console.log("✅ User authenticated. ClientId:", user.clientId);

    const profile = JSON.parse(profileStr);
    const prefs = profile?.training_preferences || {};
    const answers = profile?.answers || {};

    // Determine focus based on weeks to event
    const weeksToEvent = answers.eventDate 
      ? Math.floor((new Date(answers.eventDate).getTime() - Date.now()) / (7 * 24 * 60 * 60 * 1000))
      : null;

    let focus: "base" | "build" | "race-prep" = "base";
    if (weeksToEvent) {
      if (weeksToEvent <= 4) focus = "race-prep";
      else if (weeksToEvent <= 8) focus = "build";
    }

    // Get current block number from localStorage (or default to 1)
    const lastProgramme = localStorage.getItem("current_programme");
    let blockNumber = 1;
    if (lastProgramme) {
      try {
        const parsed = JSON.parse(lastProgramme);
        blockNumber = (parsed.blockNumber || 0) + 1; // Increment block number
      } catch (e) {
        console.warn("Could not parse last programme, defaulting to block 1");
      }
    }

    // Determine if this is a DELOAD block (Block 6, 12, 18, etc.)
    const isDeload = blockNumber % 6 === 0;

    // Determine if this is a TAPER block (2 weeks before event)
    const isTaper = weeksToEvent !== null && weeksToEvent <= 2;
    const taperWeek = weeksToEvent === 1 ? 2 : weeksToEvent === 2 ? 1 : undefined;

    console.log(`📊 Block ${blockNumber}: ${isDeload ? 'DELOAD' : isTaper ? `TAPER (Week -${taperWeek})` : 'NORMAL'}`);

    const userPrefs: UserPreferences = {
      trainingDaysPerWeek: prefs.trainingDaysPerWeek || 5,
      runSessionsPerWeek: prefs.runSessionsPerWeek || 2,
      focusAreas: prefs.focusAreas || ["Running"],
      hasHills: prefs.hillsOrSprints === "Yes",
      focus,
      blockNumber,
      weeksToEvent,
      isDeload,
      isTaper,
      taperWeek: taperWeek as 1 | 2 | undefined
    };

    // Generate full personalized programme
    const allSessions = buildFullProgramme(userPrefs);

    // Save to localStorage
    const programme = {
      sessions: allSessions,
      preferences: userPrefs,
      generatedAt: new Date().toISOString(),
      blockNumber,
      focus,
      isDeload,
      isTaper
    };
    localStorage.setItem("current_programme", JSON.stringify(programme));

    // Async function to create plan in database
    const createPlan = async () => {
      try {
        console.log("🚀 Creating plan in database...");
        const result = await createPlanInDatabase(supabase, user.clientId, programme);
        console.log("✅ Plan created:", result.planId);
        
        if (result.warnings.length > 0) {
          console.warn("⚠️ Warnings:", result.warnings);
        }

        // Save plan ID to localStorage
        localStorage.setItem("current_plan_id", result.planId);
      } catch (error: any) {
        console.error("❌ Failed to create plan:", error);
        toast.error("Failed to create programme", {
          description: error.message
        });
      }
    };

    // Animate through steps
    let stepInterval: NodeJS.Timeout;
    let progressInterval: NodeJS.Timeout;

    const animate = async () => {
      // Step 1: Analyzing
      setStep(0);
      await new Promise(resolve => setTimeout(resolve, 1200));

      // Step 2: Calibrating
      setStep(1);
      await new Promise(resolve => setTimeout(resolve, 1200));

      // Step 3: Building
      setStep(2);
      await new Promise(resolve => setTimeout(resolve, 1200));

      // Step 4: Creating in database
      setStep(3);
      await createPlan();
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Step 5: Ready
      setStep(4);
      setProgress(100);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Navigate to overview
      navigate("/overview");
    };

    // Start animation
    animate();

    // Progress bar animation
    progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) {
          clearInterval(progressInterval);
          return 95; // Stop at 95% until database creation is done
        }
        return prev + 2;
      });
    }, 50);

    return () => {
      if (stepInterval) clearInterval(stepInterval);
      if (progressInterval) clearInterval(progressInterval);
    };
  }, [navigate, user, isLoading]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Animated Icon */}
        <motion.div
          className="flex justify-center mb-8"
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <div className="w-20 h-20 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-yellow-500/40 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-yellow-500 flex items-center justify-center">
                <span className="text-2xl">⚡</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Building Your Programme</h1>
          <p className="text-white/60 text-sm">Creating your personalized training plan...</p>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden mb-8">
          <motion.div
            className="h-full bg-yellow-400"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Steps */}
        <div className="space-y-4">
          {steps.map((text, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{
                opacity: idx <= step ? 1 : 0.3,
                x: idx <= step ? 0 : -20
              }}
              transition={{ duration: 0.5 }}
              className="flex items-center gap-3"
            >
              {idx < step ? (
                <div className="w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center flex-shrink-0">
                  <span className="text-black text-sm font-bold">✓</span>
                </div>
              ) : idx === step ? (
                <motion.div
                  className="w-6 h-6 rounded-full border-2 border-yellow-400 flex-shrink-0"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <div className="w-full h-full rounded-full bg-yellow-400/50" />
                </motion.div>
              ) : (
                <div className="w-6 h-6 rounded-full border-2 border-zinc-700 flex-shrink-0" />
              )}
              <span className={`text-sm ${idx <= step ? 'text-white' : 'text-white/40'}`}>
                {text}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Dynamic Keywords */}
        {step >= 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-2 pt-8"
          >
            <p className="text-sm text-white/60">
              Structuring <span className="text-yellow-400 font-semibold">running & strength blocks</span>
            </p>
            <p className="text-sm text-white/60">
              Generating your <span className="text-yellow-400 font-semibold">2-week adaptive plan</span>
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}

