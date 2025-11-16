import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Flame, ChevronRight, Dumbbell, PersonStanding, Info, Zap, Repeat, Target, Footprints, User, Heart, HandMetal, Check, Trophy, Activity, Moon, Gauge, MapPin, TrendingUp, Loader2, Clock3, Route } from "lucide-react";
import { getTodayExercises } from "@/services/supabasePlans";
import { LoadingScreen } from "@/components/LoadingScreen";
import { TrainingDayGridSkeleton } from "@/components/TrainingDayGridSkeleton";
import type { Exercise } from "@/types/workout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/utils/supabaseClient";
import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { AppHealth } from "@/services/appHealth";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { WelcomeVideoModal } from "@/components/WelcomeVideoModal";
import { useData } from "@/contexts/DataContext";

interface ExerciseLog {
  exerciseName: string;
  weight?: number;
  weights?: number[];
  duration?: number;
  distance?: number;
  rating?: number;
}

interface DaySummary {
  day: number;
  exercises: Exercise[];
  totalExercises: number;
  isCompleted: boolean;
  isRestDay: boolean;
  hasWeights: boolean;
  hasBodyweight: boolean;
  hasRunning: boolean;
  hasCardio: boolean;
  hasMobility: boolean;
  hasHIIT: boolean;
  hasCircuit: boolean;
  hasAMRAP: boolean;
  exerciseLogs: ExerciseLog[]; // Logged workout data for this day
}

type DisplayExercise = Exercise & {
  __groupLabel?: string;
  __isGroupHeader?: boolean;
};

const baseExerciseType = (type: Exercise["type"]) => {
  if (!type) return "other";
  return type.replace("_exercise", "");
};

const getExerciseTypeLabel = (type: Exercise["type"]) => {
  const raw = baseExerciseType(type);
  return raw
    .split(/[\s_-]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const flattenExercisesForDisplay = (items: Exercise[]): DisplayExercise[] => {
  const result: DisplayExercise[] = [];

  items.forEach((item) => {
    if (item.type === "intro") {
      return;
    }

    if (item.isGroupHeader && item.exercises && item.exercises.length > 0) {
      result.push({ ...item, __isGroupHeader: true });
      item.exercises.forEach((child) => {
        if (child.type !== "intro") {
          result.push({ ...child, __groupLabel: item.name });
        }
      });
    } else if (!item._isChildExercise) {
      result.push(item);
    }
  });

  return result;
};

const getExerciseIcon = (exercise: Exercise) => {
  const type = baseExerciseType(exercise.type);
  const commonClasses = "w-4 h-4";

  switch (type) {
    case "weights":
      return <Dumbbell className={`${commonClasses} text-emerald-400`} />;
    case "cardio":
      return <Activity className={`${commonClasses} text-rose-300`} />;
    case "bodyweight":
      return <PersonStanding className={`${commonClasses} text-sky-300`} />;
    case "running":
      return <Footprints className={`${commonClasses} text-orange-300`} />;
    case "mobility":
      return <HandMetal className={`${commonClasses} text-purple-300`} />;
    case "hiit":
      return <Flame className={`${commonClasses} text-pink-400`} />;
    case "circuit":
      return <Repeat className={`${commonClasses} text-amber-300`} />;
    case "amrap":
      return <Target className={`${commonClasses} text-indigo-300`} />;
    case "rehab":
      return <Heart className={`${commonClasses} text-emerald-300`} />;
    case "simulation":
      return <Zap className={`${commonClasses} text-yellow-300`} />;
    default:
      return <Info className={`${commonClasses} text-zinc-400`} />;
  }
};

const getExerciseMeta = (exercise: Exercise) => {
  const meta: string[] = [];
  
  // For interval training (cardio with sets, distance, and rest)
  if (exercise.type === "cardio" && exercise.sets && exercise.targetDistanceKm) {
    const distanceM = Math.round(exercise.targetDistanceKm * 1000);
    const distanceStr = distanceM >= 1000 
      ? `${(distanceM / 1000).toFixed(1)}km` 
      : `${distanceM}m`;
    meta.push(`${exercise.sets}×${distanceStr}`);
  } else if (exercise.sets && exercise.reps) {
    // Regular strength training
    meta.push(`${exercise.sets}×${exercise.reps}`);
  } else if (exercise.reps && !exercise.sets) {
    // Circuit exercises with reps but no sets (e.g., Air Squats, Wall Balls in circuits)
    meta.push(`${exercise.reps} reps`);
  }
  
  if (exercise.suggestedKg) {
    meta.push(`${exercise.suggestedKg}kg`);
  }
  if (exercise.durationMin) {
    // Display seconds if less than 1 minute, otherwise minutes
    if (exercise.durationMin < 1) {
      const seconds = Math.round(exercise.durationMin * 60);
      meta.push(`${seconds} sec`);
    } else {
      meta.push(`${Math.round(exercise.durationMin)} min`);
    }
  }
  if (exercise.targetDistanceKm && !meta.some(m => m.includes('km') || m.includes('m'))) {
    // Only show distance if not already shown in interval format
    meta.push(`${exercise.targetDistanceKm} km`);
  }
  if (exercise.workRestRatio) {
    meta.push(exercise.workRestRatio);
  }
  return meta.join(" • ");
};

const getCompletedExerciseCount = (logs: ExerciseLog[], total: number) => {
  if (!logs || logs.length === 0) return 0;
  const unique = new Set(
    logs
      .map((log) => log.exerciseName?.trim().toLowerCase())
      .filter(Boolean)
  );
  return Math.min(unique.size, total);
};

const AUTO_NAV_FLAG = "rox_auto_open_first_incomplete";

const Overview = () => {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const { setTrainingDay } = useData();
  const [loading, setLoading] = useState(true);
  const [hydratedFromCache, setHydratedFromCache] = useState(false);
  const [isFetchingDays, setIsFetchingDays] = useState(false);
  const [daySummaries, setDaySummaries] = useState<DaySummary[]>([]);
  const [completedDayIndexes, setCompletedDayIndexes] = useState<number[]>([]);
  const [maxDay, setMaxDay] = useState(14);
  const [allRaces, setAllRaces] = useState<Array<{ id: number; race_name: string; race_date: string }>>([]);
  const [healthConnected, setHealthConnected] = useState(false);
  const [planRefreshToken, setPlanRefreshToken] = useState(0);
  const [hyroxSimDays, setHyroxSimDays] = useState<Array<{ id: string; day_index: number; description: string }>>([]);
  const [generatingHyrox, setGeneratingHyrox] = useState(false);
  const [healthData, setHealthData] = useState<{
    steps: number;
    heartRate: { average: number; max: number; min: number } | null;
    distance: number;
    calories: number;
    sleep: number;
    sleepScore: number;
    readiness: number;
    sleepEfficiency: number;
    recoveryScore: number;
    sleepStages: {
      remMinutes: number;
      deepMinutes: number;
      lightMinutes: number;
      awakeMinutes: number;
      outOfBedMinutes: number;
    };
  } | null>(null);
  const [welcomeVideoSetting, setWelcomeVideoSetting] = useState<{ url: string; title?: string | null } | null>(null);
  const [showWelcomeVideo, setShowWelcomeVideo] = useState(false);

  const formatMetric = useCallback((value: number | null | undefined, formatter?: (value: number) => string) => {
    if (!value || Number.isNaN(value) || value <= 0) return "--";
    return formatter ? formatter(value) : Math.round(value).toString();
  }, []);

  const readinessInsight = useMemo(() => {
    const value = healthData?.readiness ?? 0;
    if (!value || Number.isNaN(value) || value <= 0) {
      return null;
    }

    const clamped = Math.max(0, Math.min(value, 100));
    const fraction = clamped / 100;
    const activeColor = '#f97316';
    const trackColor = '#1f2937';
    const gradient = `conic-gradient(${activeColor} ${fraction * 100}%, ${trackColor} ${fraction * 100}% 100%)`;

    return {
      value: Math.round(clamped),
      gradient,
      textClass: clamped >= 80 ? 'text-emerald-400' : clamped >= 60 ? 'text-orange-400' : 'text-yellow-300',
    };
  }, [healthData?.readiness]);

  const sleepInsight = useMemo(() => {
    const value = healthData?.sleepScore ?? 0;
    if (!value || Number.isNaN(value) || value <= 0) {
      return null;
    }

    const clamped = Math.max(0, Math.min(value, 100));
    const fraction = clamped / 100;
    const activeColor = '#a855f7'; // purple-500
    const trackColor = '#1f2937';
    const gradient = `conic-gradient(${activeColor} ${fraction * 100}%, ${trackColor} ${fraction * 100}% 100%)`;

    return {
      value: Math.round(clamped),
      gradient,
    };
  }, [healthData?.sleepScore]);

  useEffect(() => {
    if (!authUser || authUser.role !== "client") return;

    const seenKey = `welcome_video_seen_${authUser.username}`;
    const alreadySeen = !!localStorage.getItem(seenKey);

    // If athlete has already completed a day or dismissed the video, skip autoplay
    if (alreadySeen || completedDayIndexes.length > 0) return;

    let cancelled = false;

    const loadWelcomeVideo = async () => {
      try {
        const { data, error } = await supabase
          .from("app_settings")
          .select("value")
          .eq("key", "welcome_video")
          .maybeSingle();

        if (error) {
          console.warn("Unable to load welcome video:", error.message);
          return;
        }

        if (cancelled || localStorage.getItem(seenKey)) return;

        const value = data?.value;
        if (value?.url) {
          setWelcomeVideoSetting({ url: value.url, title: value.title });
          setShowWelcomeVideo(true);
        }
      } catch (loadError) {
        console.warn("Welcome video fetch failed", loadError);
      }
    };

    loadWelcomeVideo();

    return () => {
      cancelled = true;
    };
  }, [authUser, completedDayIndexes]);

  const handleDismissWelcomeVideo = useCallback(() => {
    if (authUser?.username) {
      const key = `welcome_video_seen_${authUser.username}`;
      localStorage.setItem(key, new Date().toISOString());
    }
    setShowWelcomeVideo(false);
  }, [authUser]);

  const quickStats = useMemo(() => {
    if (!healthData) return [] as Array<{ key: string; icon: JSX.Element; value: string }>;

    const stats: Array<{ key: string; icon: JSX.Element; value: string }> = [];

    if (healthData.steps > 0) {
      stats.push({
        key: 'steps',
        icon: <Footprints className="w-4 h-4 text-blue-500 flex-shrink-0" />,
        value: healthData.steps.toLocaleString(),
      });
    }

    const avgHeart = healthData.heartRate?.average ?? 0;
    if (avgHeart > 0) {
      stats.push({
        key: 'heart',
        icon: <Heart className="w-4 h-4 text-red-500 flex-shrink-0" />,
        value: avgHeart.toString(),
      });
    }

    if (healthData.distance > 0) {
      stats.push({
        key: 'distance',
        icon: <MapPin className="w-4 h-4 text-green-500 flex-shrink-0" />,
        value: `${healthData.distance.toFixed(1)}km`,
      });
    }

    const calories = formatMetric(healthData.calories);
    if (calories !== '--') {
      stats.push({
        key: 'calories',
        icon: <Flame className="w-4 h-4 text-orange-500 flex-shrink-0" />,
        value: calories,
      });
    }

    if (healthData.sleep > 0) {
      stats.push({
        key: 'sleep',
        icon: <Moon className="w-4 h-4 text-purple-400 flex-shrink-0" />,
        value: `${healthData.sleep.toFixed(1)}h`,
      });
    }

    // Sleep Score now shown as its own gauge card above; omit from quick stats row.

    return stats;
  }, [healthData, formatMetric]);

  // Container ref for scrolling (pull-to-refresh removed per user request)
  const containerRef = useRef<HTMLDivElement>(null);

  const ExerciseRow = ({ exercise }: { exercise: DisplayExercise }) => {
    const [offset, setOffset] = useState(0);
    const [dragging, setDragging] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const startXRef = useRef<number | null>(null);
    const pointerIdRef = useRef<number | null>(null);

    const finishGesture = useCallback(
      (finalOffset: number) => {
        const shouldReveal = finalOffset <= -70;
        if (shouldReveal) {
          setOffset(-96);
          if (!isOpen && Capacitor.isNativePlatform()) {
            Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
          }
          setIsOpen(true);
        } else {
          setOffset(0);
          setIsOpen(false);
        }
      },
      [isOpen],
    );

    const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
      event.stopPropagation();
      startXRef.current = event.clientX;
      pointerIdRef.current = event.pointerId;
      setDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    };

    const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging || startXRef.current === null) return;
      const delta = event.clientX - startXRef.current;
      if (delta > 0) {
        setOffset(Math.min(delta, 24));
        return;
      }
      const clamped = Math.max(delta, -110);
      setOffset(clamped);
    };

    const endGesture = (event: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging) return;
      event.stopPropagation();
      setDragging(false);
      finishGesture(offset);
      startXRef.current = null;
      if (pointerIdRef.current !== null) {
        try {
          event.currentTarget.releasePointerCapture(pointerIdRef.current);
        } catch {
          // noop
        }
        pointerIdRef.current = null;
      }
    };

    const metaSummary = getExerciseMeta(exercise);

    return (
      <div className="relative overflow-hidden">
        <div
          className="relative flex items-center gap-3 px-3.5 py-2 bg-background/80"
          style={{
            transform: `translateX(${offset}px)`,
            transition: dragging ? "none" : "transform 0.18s ease-out",
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endGesture}
          onPointerCancel={endGesture}
          onPointerLeave={dragging ? endGesture : undefined}
          onClick={(event) => {
            if (isOpen) {
              event.stopPropagation();
              setOffset(0);
              setIsOpen(false);
            }
          }}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800">
            {getExerciseIcon(exercise)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[13px] font-semibold text-foreground truncate leading-tight">{exercise.name}</p>
              {metaSummary ? (
                <span className="inline-flex items-center gap-1 text-[12px] text-zinc-400 whitespace-nowrap">
                  <Clock3 className="w-3.5 h-3.5" />
                  {metaSummary}
                </span>
              ) : (
                <span className="text-[12px] text-zinc-500 whitespace-nowrap">{getExerciseTypeLabel(exercise.type)}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Generate Hyrox track on-demand for existing plans
  const generateHyroxTrackForPlan = async (planId: string) => {
    if (generatingHyrox) return; // Prevent duplicate generation
    
    try {
      setGeneratingHyrox(true);
      console.log('🏃 Generating Hyrox track for plan:', planId);
      
      // Import the generator dynamically
      const { generateHyroxTrack } = await import("@/services/programGeneration/hyroxTrackGenerator");
      
      // Generate the Hyrox track
      const { dayIds, errors } = await generateHyroxTrack(supabase, planId);
      
      if (errors.length > 0) {
        console.error('⚠️ Errors generating Hyrox track:', errors);
        toast.error('Some Hyrox workouts could not be generated');
      }
      
      if (dayIds.length > 0) {
        console.log(`✅ Generated ${dayIds.length} Hyrox simulations`);
        toast.success(`${dayIds.length} Race Simulations added to your plan!`);
        
        // Reload the Hyrox days
        const { data: hyroxDays } = await supabase
          .from('plan_days')
          .select('id, day_index, description')
          .eq('plan_id', planId)
          .eq('track_name', 'hyrox')
          .eq('is_optional', true)
          .like('description', '%Simulation%')
          .order('day_index', { ascending: true });
        
        if (hyroxDays) {
          setHyroxSimDays(hyroxDays);
        }
      }
    } catch (error) {
      console.error('❌ Error generating Hyrox track:', error);
      toast.error('Failed to generate Race Simulations');
    } finally {
      setGeneratingHyrox(false);
    }
  };

  useEffect(() => {
    if (!authUser?.clientId) {
      setHydratedFromCache(false);
      setDaySummaries([]);
      setLoading(false);
      return;
    }

    const cacheKey = `overview_daySummaries_${authUser.clientId}`;

    if (cacheKey && !hydratedFromCache) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed.summaries)) {
            setDaySummaries(parsed.summaries);
            if (typeof parsed.max === "number") {
              setMaxDay(parsed.max);
            }
            setLoading(false);
            setHydratedFromCache(true);
          }
        } catch (e) {
          console.error("Failed to parse overview cache", e);
        }
      }
    }

    const loadDays = async () => {
      try {
        setIsFetchingDays(true);
        if (!hydratedFromCache) {
          setLoading(true);
          setDaySummaries([]);
        }

        if (!authUser?.clientId) {
          setLoading(false);
          setIsFetchingDays(false);
          return;
        }

        // Get active plan from Supabase
        // If multiple active plans exist, use the most recent one
        const { data: plans, error: planError } = await supabase
          .from('plans')
          .select('id, created_at')
          .eq('client_id', authUser.clientId)
          .eq('status', 'active')
          .order('created_at', { ascending: false });

        if (planError) {
          console.error("Error loading plan:", planError);
          setLoading(false);
          setIsFetchingDays(false);
          return;
        }

        if (!plans || plans.length === 0) {
          console.log("No active plan found");
          setLoading(false);
          setIsFetchingDays(false);
          return;
        }

        // Use the most recent active plan if multiple exist
        const plan = plans[0];
        if (plans.length > 1) {
          console.warn(`Found ${plans.length} active plans, using most recent:`, plan.id);
        }

        // Check if this is a new plan (different from last loaded plan)
        // If so, clear completion data to avoid showing old ticks on new program
        const userStr = localStorage.getItem("frank_rock_user");
        if (userStr) {
          const user = JSON.parse(userStr);
          const lastPlanIdKey = `lastActivePlanId_${user.username}`;
          const lastPlanId = localStorage.getItem(lastPlanIdKey);
          const currentPlanId = String(plan.id);
          
          // Clear if plan changed OR if this is first time (lastPlanId is null)
          if (!lastPlanId || lastPlanId !== currentPlanId) {
            console.log('🔄 New plan detected, clearing completion data', { old: lastPlanId || 'none', new: currentPlanId });
            // Clear localStorage completion data
            const completedDaysKey = `completedDays_${user.username}`;
            localStorage.removeItem(completedDaysKey);
            
            // Clear workout cache for all days
            const workoutCacheKey = `workoutSession_${user.username}`;
            localStorage.removeItem(workoutCacheKey);
            
            // Also clear old completion data from Supabase for previous plans
            if (lastPlanId && lastPlanId !== currentPlanId) {
              console.log('🗑️ Removing old plan completion records from database');
              await supabase
                .from('completed_days')
                .delete()
                .eq('client_id', authUser.clientId)
                .neq('plan_id', currentPlanId);
            }
          }
          
          // Update last plan ID
          localStorage.setItem(lastPlanIdKey, currentPlanId);
        }

        // Fetch plan_days to get structure
        const { data: allPlanDays, error: planDaysError } = await supabase
          .from('plan_days')
          .select('day_index, is_rest, track_name')
          .eq('plan_id', plan.id)
          .order('day_index', { ascending: true });

        if (planDaysError || !allPlanDays || allPlanDays.length === 0) {
          console.error("Error loading plan days:", planDaysError);
          setLoading(false);
          setIsFetchingDays(false);
          return;
        }

        // Filter to only main track (exclude 'hyrox' track)
        const planDays = allPlanDays.filter(d => d.track_name !== 'hyrox');

        console.log(`📋 Loaded ${planDays.length} main plan days (${allPlanDays.length} total including optional)`);

        // Fetch Hyrox simulation days (optional track)
        const { data: hyroxDays, error: hyroxError } = await supabase
          .from('plan_days')
          .select('id, day_index, description')
          .eq('plan_id', plan.id)
          .eq('track_name', 'hyrox')
          .eq('is_optional', true)
          .order('day_index', { ascending: true });

        if (!hyroxError && hyroxDays) {
          console.log(`🏃 Loaded ${hyroxDays.length} Hyrox simulation days:`, hyroxDays);
          setHyroxSimDays(hyroxDays);
          
          // If no Hyrox track exists, generate it automatically
          if (hyroxDays.length === 0) {
            console.log('🏃 No Hyrox track found, generating on-demand...');
            generateHyroxTrackForPlan(plan.id);
          }
        }

        // Calculate max day (day_index is 1-based: 1, 2, 3...)
        const maxDayIndex = Math.max(...planDays.map(pd => pd.day_index));
        setMaxDay(maxDayIndex);

        // Get completed days from BOTH localStorage AND Supabase
        if (!userStr) {
          setLoading(false);
          return;
        }
        const userData = JSON.parse(userStr);
        
        // Load from Supabase first (source of truth)
        const { data: completedDaysData } = await supabase
          .from('completed_days')
          .select('day_index')
          .eq('client_id', authUser.clientId)
          .eq('plan_id', plan.id);
        
        // day_index is already 1-based (1, 2, 3...)
        const completedDaysFromDB = completedDaysData?.map(cd => cd.day_index) || [];
        
        // Also check localStorage as backup
        const completedDaysKey = `completedDays_${userData.username}`;
        const completedDaysStr = localStorage.getItem(completedDaysKey);
        const completedDaysFromLS: number[] = completedDaysStr ? JSON.parse(completedDaysStr) : [];
        
        // Merge both sources (union)
        const completedDays: number[] = [...new Set([...completedDaysFromDB, ...completedDaysFromLS])];
        setCompletedDayIndexes(completedDays);
        
        console.log(`✅ Found ${completedDays.length} completed days:`, completedDays);

        // Now load exercises for each day using the existing getTodayExercises function
        const summaries: DaySummary[] = [];
        const userKey = `currentTrainingDay_${userData.username}`;
        const originalDay = localStorage.getItem(userKey);

        for (let dayIdx = 0; dayIdx < planDays.length; dayIdx++) {
          const planDay = planDays[dayIdx];
          const day = planDay.day_index; // Already 1-based (1, 2, 3...)
          const isRestDay = planDay.is_rest || false;

          // Temporarily set day in localStorage to fetch exercises
          localStorage.setItem(userKey, day.toString());
          
          // Use existing getTodayExercises which handles the complex query
          const exercises = await getTodayExercises(authUser.clientId);

          // Analyze exercise types
          const hasWeights = exercises.some(e => e.type === "weights");
          const hasBodyweight = exercises.some(e => e.type === "bodyweight");
          const hasRunning = exercises.some(e => e.type === "running");
          const hasCardio = exercises.some(e => e.type === "cardio");
          const hasMobility = exercises.some(e => e.type === "mobility");
          const hasHIIT = exercises.some(e => e.type === "hiit");
          const hasCircuit = exercises.some(e => e.type === "circuit");
          const hasAMRAP = exercises.some(e => e.type === "amrap");

          // Check if completed
          const isCompleted = completedDays.includes(day);

          // Filter out intro cards for exercise count
          const workoutExercises = exercises.filter(e => e.type !== "intro");
          
          // Count exercises properly: multiple circuit/AMRAP blocks from same session = 1 exercise
          // Group circuits/AMRAPs by their base name (e.g., "Circuit 1/3", "Circuit 2/3" → "Circuit")
          const seenCircuitSessions = new Set<string>();
          const exerciseCount = workoutExercises.reduce((count, ex) => {
            // If it's a child exercise (part of a circuit/AMRAP), don't count it separately
            if (ex._isChildExercise) {
              return count;
            }
            
            // If it's a group header (circuit/AMRAP), check if we've already counted this session
            if (ex.isGroupHeader && (ex.type === "circuit" || ex.type === "amrap")) {
              // Extract base name (e.g., "Circuit 1/3" → "Circuit", "Threshold Circuit" → "Threshold Circuit")
              const baseName = ex.name.replace(/\s+\d+\/\d+$/, '').trim();
              const sessionKey = `${baseName}_${ex.type}`;
              
              if (seenCircuitSessions.has(sessionKey)) {
                // Already counted this circuit/AMRAP session
                return count;
              }
              
              seenCircuitSessions.add(sessionKey);
              return count + 1;
            }
            
            // Otherwise it's a standalone exercise, count it
            return count + 1;
          }, 0);

          // Fetch workout logs for this day
          const { data: logs } = await supabase
            .from('workout_logs')
            .select('exercise_name, weight, weights, duration_min, distance_km, rating')
            .eq('client_id', authUser.clientId)
            .eq('training_day', day)
            .order('logged_at', { ascending: false });

          const exerciseLogs: ExerciseLog[] = (logs || []).map(log => ({
            exerciseName: log.exercise_name,
            weight: log.weight || undefined,
            weights: log.weights || undefined,
            duration: log.duration_min || undefined,
            distance: log.distance_km || undefined,
            rating: log.rating || undefined,
          }));

          summaries.push({
            day,
            exercises,
            totalExercises: exerciseCount,
            isCompleted,
            isRestDay,
            hasWeights,
            hasBodyweight,
            hasRunning,
            hasCardio,
            hasMobility,
            hasHIIT,
            hasCircuit,
            hasAMRAP,
            exerciseLogs,
          });

          // Stream updates so UI responds faster
          setDaySummaries(() => [...summaries]);
          if (!hydratedFromCache && summaries.length === 1) {
            setLoading(false);
          }
        }

        // Restore original day
        if (originalDay) {
          localStorage.setItem(userKey, originalDay);
        }

        setDaySummaries(summaries);
        console.log(`✅ Loaded ${summaries.length} days with exercises`);
        if (cacheKey) {
          localStorage.setItem(cacheKey, JSON.stringify({ summaries, max: maxDay }));
        }
        setLoading(false);
      } catch (error) {
        console.error("Error loading days:", error);
        if (!hydratedFromCache) {
          setLoading(false);
        }
      } finally {
        setIsFetchingDays(false);
      }
    };

    loadDays();
  }, [authUser?.clientId, planRefreshToken]);

  // Load all upcoming races
  useEffect(() => {
    const loadRaces = async () => {
      if (!authUser?.clientId) return;
      
      try {
        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase
          .from('races')
          .select('id, race_name, race_date')
          .eq('client_id', authUser.clientId)
          .gte('race_date', today)
          .order('race_date', { ascending: true });
        
        if (!error && data) {
          setAllRaces(data);
        }
      } catch (e) {
        console.error("Error loading races:", e);
      }
    };
    
    loadRaces();
  }, [authUser?.clientId]);

  // Load health data
  useEffect(() => {
    const checkAndLoadHealth = async () => {
      if (!Capacitor.isNativePlatform()) return;
      
      try {
        const flag = localStorage.getItem("health_connected");
        const connected = flag === "true";
        setHealthConnected(connected);
        
        if (connected) {
          await fetchHealthData();
        }
      } catch (e) {
        console.error('Error checking health:', e);
      }
    };
    
    checkAndLoadHealth();
  }, []);

  const fetchHealthData = async () => {
    try {
      // Get today's data from midnight to now
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const start = startOfToday.toISOString();
      const end = now.toISOString();
      
      // For sleep: query from 6 PM yesterday to now (captures last night's sleep)
      const yesterdayEvening = new Date(now);
      yesterdayEvening.setDate(yesterdayEvening.getDate() - 1);
      yesterdayEvening.setHours(18, 0, 0, 0); // 6 PM yesterday
      const sleepStart = yesterdayEvening.toISOString();
      
      console.log('📊 [Overview] Fetching health data from:', start, 'to:', end);
      console.log('📊 [Overview] Sleep data from:', sleepStart, 'to:', end);
      console.log('📊 [Overview] Timezone offset:', now.getTimezoneOffset() / 60, 'hours');
      console.log('📊 [Overview] Current time:', now.toLocaleString());
      console.log('📊 [Overview] Start of today:', startOfToday.toLocaleString());
      
      const emptySleep = {
        hours: 0,
        minutes: 0,
        inBedHours: 0,
        inBedMinutes: 0,
        efficiency: 0,
        sleepScore: 0,
        stages: {
          awakeMinutes: 0,
          lightMinutes: 0,
          deepMinutes: 0,
          remMinutes: 0,
          outOfBedMinutes: 0,
        },
        platform: 'android' as const,
      };

      const [stepsResult, heartRateResult, distanceResult, caloriesResult, sleepResult] = await Promise.all([
        AppHealth.getSteps({ start, end}).catch(() => ({ total: 0, platform: 'android' as const })),
        AppHealth.getHeartRate({ start, end }).catch(() => null),
        AppHealth.getDistance({ start, end }).catch(() => ({ kilometers: 0, meters: 0, platform: 'android' as const })),
        AppHealth.getCalories({ start, end }).catch(() => ({ calories: 0, platform: 'android' as const })),
        AppHealth.getSleep({ start: sleepStart, end }).catch(() => emptySleep)
      ]);

      const asleepHours = sleepResult.hours || 0;
      const stages = sleepResult.stages || emptySleep.stages;
      const calculatedSleepScore = asleepHours > 0
        ? Math.round(Math.min(asleepHours / 7.5, 1) * 100)
        : 0;
      const sleepScore = sleepResult.sleepScore || calculatedSleepScore;

      const hasSleepData = asleepHours > 0 || (sleepResult.sleepScore ?? 0) > 0;
      const hasStepData = (stepsResult.total ?? 0) > 0;
      const hasRecoverySignal = hasSleepData || hasStepData;

      const stepGoal = 8000;
      const stepPenaltyRatio = hasStepData
        ? Math.min(Math.max(stepsResult.total - stepGoal, 0) / stepGoal, 1)
        : 0;
      const recoveryScore = hasRecoverySignal
        ? Math.round((1 - stepPenaltyRatio) * 100)
        : 0;
      const readiness = hasRecoverySignal
        ? Math.round(0.7 * sleepScore + 0.3 * recoveryScore)
        : 0;

      const data = {
        steps: stepsResult.total,
        heartRate: heartRateResult && heartRateResult.samples > 0 ? {
          average: heartRateResult.average,
          max: heartRateResult.max,
          min: heartRateResult.min
        } : null,
        distance: distanceResult.kilometers,
        calories: caloriesResult.calories,
        sleep: asleepHours,
        sleepScore,
        readiness,
        sleepEfficiency: sleepResult.efficiency || 0,
        recoveryScore,
        sleepStages: {
          remMinutes: stages.remMinutes || 0,
          deepMinutes: stages.deepMinutes || 0,
          lightMinutes: stages.lightMinutes || 0,
          awakeMinutes: stages.awakeMinutes || 0,
          outOfBedMinutes: stages.outOfBedMinutes || 0,
        },
      };
      
      console.log('📊 [Overview] Received health data:', JSON.stringify(data, null, 2));
      
      setHealthData(data);
    } catch (e) {
      console.error('Error fetching health data:', e);
    }
  };

  const calculateDaysUntil = (raceDate: string): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const race = new Date(raceDate);
    race.setHours(0, 0, 0, 0);
    const diffTime = race.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const handleDayClick = (day: number) => {
    if (Capacitor.isNativePlatform()) {
      Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
    }
    setTrainingDay(day.toString());
    console.log(`📅 Day ${day} selected, updated training day to: ${day}`);
    navigate("/today");
  };

  const handleGoToToday = useCallback(() => {
    let targetDay: number | null = null;

    if (daySummaries.length > 0) {
      const firstIncomplete = daySummaries.find((summary) => !summary.isRestDay && summary.totalExercises > 0 && !summary.isCompleted);
      const firstActive = daySummaries.find((summary) => !summary.isRestDay && summary.totalExercises > 0);
      const fallback = daySummaries[0];

      targetDay = (firstIncomplete || firstActive || fallback)?.day ?? null;
    }

    if (targetDay !== null) {
      setTrainingDay(String(targetDay));
    }

    navigate("/today");
  }, [daySummaries, navigate, setTrainingDay]);

  const safeAreaTop = "env(safe-area-inset-top, 0px)";

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-24" style={{ paddingTop: safeAreaTop }}>
        <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
          <div className="container max-w-2xl mx-auto px-4 py-4">
            <div 
              className="flex items-center justify-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => navigate("/overview")}
            >
              <Flame className="w-8 h-8" style={{ color: "#FFCC00" }} />
              <h1 className="text-3xl font-black tracking-tight text-primary">
                Rox<span className="text-foreground">PT</span>
              </h1>
            </div>
          </div>
        </header>
        <main className="container max-w-2xl mx-auto px-2 sm:px-4 pt-8 pb-14 sm:pt-10 sm:pb-16">
          <div className="h-8 w-64 bg-muted rounded mb-6 animate-pulse" />
          <TrainingDayGridSkeleton count={14} />
        </main>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="min-h-screen bg-background pb-24 overflow-y-auto relative" style={{ paddingTop: safeAreaTop }}>
      {/* Pull-to-Refresh Indicator removed for cleaner UI */}

      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="container max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div 
              className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity flex-1 justify-center"
              onClick={() => navigate("/overview")}
            >
              <Flame className="w-8 h-8" style={{ color: "#FFCC00" }} />
              <h1 className="text-3xl font-black tracking-tight text-primary">
                Rox<span className="text-foreground">PT</span>
              </h1>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary flex-shrink-0"
                >
                  <Info className="w-5 h-5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-2xl">
                    <Flame className="w-6 h-6" style={{ color: '#FFCC00' }} />
                    Hyrox Training Methodology
                  </DialogTitle>
                  <DialogDescription className="text-base text-white/70">
                    Understanding the science behind your training programme
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-6 mt-4">
                  {/* What is Hyrox */}
                  <div>
                    <h3 className="text-xl font-bold mb-2 text-foreground">What is Hyrox?</h3>
                    <p className="text-muted-foreground leading-relaxed mb-3">
                      HYROX is a fitness race structured as <strong>8 rounds</strong> of: 
                      <strong> 1km run → 1 functional station</strong> (e.g., SkiErg, sled push, sled pull, burpee broad jumps, row, farmer's carry, sandbag lunges, wall balls).
                    </p>
                    <p className="text-sm text-foreground/70 italic">
                      Total distance: 8km running + 8 functional stations. Average completion time: 60-90 minutes.
                    </p>
                  </div>

                  {/* Energy Systems Table */}
                  <div>
                    <h3 className="text-xl font-bold mb-3 text-foreground">Energy System Demands</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="border-b-2" style={{ borderColor: '#FFCC00' }}>
                            <th className="text-left p-2 font-bold text-foreground">System</th>
                            <th className="text-left p-2 font-bold text-foreground">Duration</th>
                            <th className="text-left p-2 font-bold text-foreground">HYROX Application</th>
                          </tr>
                        </thead>
                        <tbody className="text-muted-foreground">
                          <tr className="border-b border-border">
                            <td className="p-2 font-semibold">Phosphocreatine</td>
                            <td className="p-2">0-10 seconds</td>
                            <td className="p-2">Sled push initiation, explosive movements</td>
                          </tr>
                          <tr className="border-b border-border">
                            <td className="p-2 font-semibold">Glycolytic</td>
                            <td className="p-2">10s - 2 min</td>
                            <td className="p-2">Station completion, SkiErg, rowing efforts</td>
                          </tr>
                          <tr>
                            <td className="p-2 font-semibold">Oxidative</td>
                            <td className="p-2">2+ minutes</td>
                            <td className="p-2">Base for entire race, running between stations</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Why It's Different */}
                  <div>
                    <h3 className="text-xl font-bold mb-2 text-foreground">Why It's Different</h3>
                    <p className="text-muted-foreground leading-relaxed mb-3">
                      It's a <strong>"hybrid" event</strong>: part endurance race, part functional fitness. 
                      This dual demand requires training that covers both <strong>running endurance</strong> and <strong>functional strength & conditioning</strong>.
                    </p>
                    <Card className="p-3 bg-secondary/10">
                      <p className="text-sm text-foreground">
                        <strong>Key Challenge:</strong> Maintaining running performance while building functional strength, without letting one interfere with the other.
                      </p>
                    </Card>
                  </div>

                  {/* Training Phases */}
                  <div>
                    <h3 className="text-xl font-bold mb-3 text-foreground">Training Phases</h3>
                    <div className="space-y-4">
                      {/* Phase 1 */}
                      <Card className="p-4 border-2 border-primary/20">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold" style={{ backgroundColor: '#FFCC00', color: '#000' }}>1</div>
                          <div className="flex-1">
                            <h4 className="font-bold text-lg text-foreground mb-1">Base Phase (Weeks 1–2)</h4>
                            <p className="text-sm text-muted-foreground mb-2">
                              <strong>Focus:</strong> Aerobic Capacity + Technique<br/>
                              <strong>Energy System:</strong> Zone 2 / Aerobic
                            </p>
                            <p className="text-sm text-foreground">
                              Build volume safely, improve running & SkiErg efficiency
                            </p>
                          </div>
                        </div>
                      </Card>

                      {/* Phase 2 */}
                      <Card className="p-4 border-2 border-primary/20">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold" style={{ backgroundColor: '#FFCC00', color: '#000' }}>2</div>
                          <div className="flex-1">
                            <h4 className="font-bold text-lg text-foreground mb-1">Build Phase (Weeks 3–4)</h4>
                            <p className="text-sm text-muted-foreground mb-2">
                              <strong>Focus:</strong> Strength + Threshold<br/>
                              <strong>Energy System:</strong> Aerobic + Lactate Threshold
                            </p>
                            <p className="text-sm text-foreground">
                              Introduce faster runs, heavier carries, and circuits
                            </p>
                          </div>
                        </div>
                      </Card>

                      {/* Phase 3 */}
                      <Card className="p-4 border-2 border-primary/20">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold" style={{ backgroundColor: '#FFCC00', color: '#000' }}>3</div>
                          <div className="flex-1">
                            <h4 className="font-bold text-lg text-foreground mb-1">Peak Phase (Weeks 5–6)</h4>
                            <p className="text-sm text-muted-foreground mb-2">
                              <strong>Focus:</strong> HIIT + Simulation<br/>
                              <strong>Energy System:</strong> Anaerobic + Race Specific
                            </p>
                            <p className="text-sm text-foreground">
                              Add short, high-intensity intervals to replicate race fatigue
                            </p>
                          </div>
                        </div>
                      </Card>

                      {/* Phase 4 */}
                      <Card className="p-4 border-2 border-primary/20">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold" style={{ backgroundColor: '#FFCC00', color: '#000' }}>4</div>
                          <div className="flex-1">
                            <h4 className="font-bold text-lg text-foreground mb-1">Taper Phase (Final Week)</h4>
                            <p className="text-sm text-muted-foreground mb-2">
                              <strong>Focus:</strong> Sharpness + Recovery<br/>
                              <strong>Energy System:</strong> All systems
                            </p>
                            <p className="text-sm text-foreground">
                              Maintain performance without overload
                            </p>
                          </div>
                        </div>
                      </Card>
                    </div>
                  </div>

                  {/* Training Intensity Distribution */}
                  <div>
                    <h3 className="text-xl font-bold mb-3 text-foreground">Training Intensity Distribution: The 80/20 Rule</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Research-backed approach for optimal endurance development:
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="border-b-2" style={{ borderColor: '#FFCC00' }}>
                            <th className="text-left p-2 font-bold text-foreground">Intensity</th>
                            <th className="text-left p-2 font-bold text-foreground">% of Training</th>
                            <th className="text-left p-2 font-bold text-foreground">Heart Rate</th>
                            <th className="text-left p-2 font-bold text-foreground">Purpose</th>
                          </tr>
                        </thead>
                        <tbody className="text-muted-foreground">
                          <tr className="border-b border-border">
                            <td className="p-2 font-semibold">Low (Easy)</td>
                            <td className="p-2">80%</td>
                            <td className="p-2">&lt;70% HRmax</td>
                            <td className="p-2">Aerobic base, recovery</td>
                          </tr>
                          <tr>
                            <td className="p-2 font-semibold">High (Hard)</td>
                            <td className="p-2">20%</td>
                            <td className="p-2">&gt;80% HRmax</td>
                            <td className="p-2">Race pace, power</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <Card className="p-3 bg-secondary/10 mt-3">
                      <p className="text-sm text-foreground">
                        <strong>Common Mistake:</strong> Training too much in the "RED zone" (70-80% HRmax) reduces both aerobic base and high-end power development.
                      </p>
                    </Card>
                  </div>

                  {/* Weekly Training Structure */}
                  <div>
                    <h3 className="text-xl font-bold mb-3 text-foreground">Sample Weekly Training Structure</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="border-b-2" style={{ borderColor: '#FFCC00' }}>
                            <th className="text-left p-2 font-bold text-foreground">Day</th>
                            <th className="text-left p-2 font-bold text-foreground">Session Type</th>
                            <th className="text-left p-2 font-bold text-foreground">Intensity</th>
                            <th className="text-left p-2 font-bold text-foreground">Duration</th>
                          </tr>
                        </thead>
                        <tbody className="text-muted-foreground">
                          <tr className="border-b border-border">
                            <td className="p-2 font-semibold">Monday</td>
                            <td className="p-2">Strength + Stations</td>
                            <td className="p-2">High</td>
                            <td className="p-2">60-75 min</td>
                          </tr>
                          <tr className="border-b border-border">
                            <td className="p-2 font-semibold">Tuesday</td>
                            <td className="p-2">Easy Run</td>
                            <td className="p-2">Low</td>
                            <td className="p-2">30-45 min</td>
                          </tr>
                          <tr className="border-b border-border">
                            <td className="p-2 font-semibold">Wednesday</td>
                            <td className="p-2">HIIT + Stations</td>
                            <td className="p-2">High</td>
                            <td className="p-2">45-60 min</td>
                          </tr>
                          <tr className="border-b border-border">
                            <td className="p-2 font-semibold">Thursday</td>
                            <td className="p-2">Active Recovery</td>
                            <td className="p-2">Low</td>
                            <td className="p-2">30 min</td>
                          </tr>
                          <tr className="border-b border-border">
                            <td className="p-2 font-semibold">Friday</td>
                            <td className="p-2">Intervals + Circuit</td>
                            <td className="p-2">Moderate</td>
                            <td className="p-2">60-75 min</td>
                          </tr>
                          <tr className="border-b border-border">
                            <td className="p-2 font-semibold">Saturday</td>
                            <td className="p-2">Long Run</td>
                            <td className="p-2">Low</td>
                            <td className="p-2">60-90 min</td>
                          </tr>
                          <tr>
                            <td className="p-2 font-semibold">Sunday</td>
                            <td className="p-2">Rest / Mobility</td>
                            <td className="p-2">-</td>
                            <td className="p-2">-</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Station Training Focus */}
                  <div>
                    <h3 className="text-xl font-bold mb-3 text-foreground">Station-Specific Training Protocols</h3>
                    <div className="grid gap-3">
                      <Card className="p-3 border-l-4" style={{ borderLeftColor: '#FFCC00' }}>
                        <h4 className="font-bold text-foreground mb-1">SkiErg</h4>
                        <p className="text-sm text-muted-foreground">5 x 500m @ 70-75% effort, 90s rest → Aerobic power + rhythm</p>
                      </Card>
                      <Card className="p-3 border-l-4" style={{ borderLeftColor: '#FFCC00' }}>
                        <h4 className="font-bold text-foreground mb-1">Sled Push/Pull</h4>
                        <p className="text-sm text-muted-foreground">6 x 50m @ 100% race weight, 90s rest → Power endurance</p>
                      </Card>
                      <Card className="p-3 border-l-4" style={{ borderLeftColor: '#FFCC00' }}>
                        <h4 className="font-bold text-foreground mb-1">Burpee Broad Jumps</h4>
                        <p className="text-sm text-muted-foreground">8 x 5 jumps, focus on rhythm → Movement efficiency</p>
                      </Card>
                      <Card className="p-3 border-l-4" style={{ borderLeftColor: '#FFCC00' }}>
                        <h4 className="font-bold text-foreground mb-1">Rowing</h4>
                        <p className="text-sm text-muted-foreground">4 x 1000m @ 75-80% effort, 2min rest → Lactate threshold</p>
                      </Card>
                    </div>
                  </div>

                  {/* Key Principles */}
                  <div>
                    <h3 className="text-xl font-bold mb-2 text-foreground">Key Training Principles</h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <span style={{ color: '#FFCC00' }}>▸</span>
                        <span><strong>Progressive Overload:</strong> Gradually increase volume and intensity</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span style={{ color: '#FFCC00' }}>▸</span>
                        <span><strong>Specificity:</strong> Train movements and energy systems used in the race</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span style={{ color: '#FFCC00' }}>▸</span>
                        <span><strong>Recovery:</strong> 7-9 hours sleep + active recovery sessions</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span style={{ color: '#FFCC00' }}>▸</span>
                        <span><strong>Consistency:</strong> Regular training builds the base for peak performance</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span style={{ color: '#FFCC00' }}>▸</span>
                        <span><strong>Concurrent Training:</strong> Separate strength and endurance by 6+ hours</span>
                      </li>
                    </ul>
                  </div>

                  {/* Recovery Science */}
                  <div>
                    <h3 className="text-xl font-bold mb-3 text-foreground">Recovery & Adaptation</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="border-b-2" style={{ borderColor: '#FFCC00' }}>
                            <th className="text-left p-2 font-bold text-foreground">Phase</th>
                            <th className="text-left p-2 font-bold text-foreground">Timeline</th>
                            <th className="text-left p-2 font-bold text-foreground">What's Happening</th>
                          </tr>
                        </thead>
                        <tbody className="text-muted-foreground">
                          <tr className="border-b border-border">
                            <td className="p-2 font-semibold">Immediate Fatigue</td>
                            <td className="p-2">0-24 hours</td>
                            <td className="p-2">Glycogen depletion, muscle damage</td>
                          </tr>
                          <tr className="border-b border-border">
                            <td className="p-2 font-semibold">Recovery</td>
                            <td className="p-2">24-72 hours</td>
                            <td className="p-2">Repair, glycogen restoration</td>
                          </tr>
                          <tr>
                            <td className="p-2 font-semibold">Supercompensation</td>
                            <td className="p-2">72-120 hours</td>
                            <td className="p-2">Adaptation, stronger than before</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <Card className="p-3 bg-secondary/10 mt-3">
                      <p className="text-sm text-foreground">
                        <strong>Optimal Training:</strong> Apply next stimulus during supercompensation window (3-5 days after hard session)
                      </p>
                    </Card>
                  </div>


                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container max-w-2xl mx-auto px-2 sm:px-4 pt-8 pb-14 sm:pt-10 sm:pb-16">

        {healthConnected && (readinessInsight || sleepInsight) && (
          <div className="mb-4 grid grid-cols-2 gap-3">
            {readinessInsight && sleepInsight && (
              <Card className="p-5 bg-background/80 border border-orange-500/30 shadow-lg flex flex-col items-center text-center gap-2">
                <p className="text-xs uppercase font-semibold text-yellow-300">24h Recovery Index</p>
                <div className="relative w-28 h-28 sm:w-32 sm:h-32 my-1">
                  <div className="absolute inset-0 rounded-full" style={{ background: readinessInsight.gradient }} />
                  <div className="absolute inset-2.5 rounded-full bg-background flex items-center justify-center border border-white/5">
                    <span className="text-3xl font-bold text-foreground">{readinessInsight.value}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Composite of sleep, HRV, and heart rate.
                </p>
              </Card>
            )}
            {sleepInsight && (
              <Card className="p-5 bg-background/80 border border-purple-500/30 shadow-lg flex flex-col items-center text-center gap-2">
                <p className="text-xs uppercase font-semibold text-purple-300">Sleep Score</p>
                <div className="relative w-28 h-28 sm:w-32 sm:h-32 my-1">
                  <div className="absolute inset-0 rounded-full" style={{ background: sleepInsight.gradient }} />
                  <div className="absolute inset-2.5 rounded-full bg-background flex items-center justify-center border border-white/5">
                    <span className="text-3xl font-bold text-foreground">{sleepInsight.value}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Quality from duration and stages.
                </p>
              </Card>
            )}
          </div>
        )}

        {healthConnected && healthData && quickStats.length > 0 && (
          <div className="mb-4">
            <Card className="p-3 bg-gradient-to-r from-primary/5 to-red-500/5 border-primary/10">
              <div className="flex flex-wrap items-center justify-around gap-3">
                {quickStats.map((stat) => (
                  <div key={stat.key} className="flex items-center gap-1.5">
                    {stat.icon}
                    <span className="text-lg font-bold text-foreground">{stat.value}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* Race Schedule */}
        {allRaces.length > 0 && (
          <div className="mt-10 sm:mt-12 mb-6">
            <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
              <Trophy className="w-5 h-5" style={{ color: '#FFCC00' }} />
              Race Schedule
            </h3>
            <div className="space-y-2">
              {allRaces.map((race, index) => {
                const days = calculateDaysUntil(race.race_date);
                const isNext = index === 0;
                
                return (
                  <Card
                    key={race.id}
                    className={`${isNext ? 'p-4 border-2 bg-[#FFCC00]/10' : 'p-2 border'} border-border`}
                    style={isNext ? { borderColor: '#FFCC00' } : {}}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h4 className={`${isNext ? 'text-xl font-bold' : 'text-sm font-medium'} text-foreground break-words`}>
                          {race.race_name}
                        </h4>
                        <p className={`${isNext ? 'text-sm' : 'text-xs'} text-muted-foreground mt-0.5`}>
                          {new Date(race.race_date).toLocaleDateString('en-GB', { 
                            day: 'numeric', 
                            month: 'long', 
                            year: 'numeric' 
                          })}
                        </p>
                      </div>
                      <div className={`flex-shrink-0 text-right ${isNext ? 'min-w-[80px]' : 'min-w-[60px]'}`}>
                        <div className={`${isNext ? 'text-3xl' : 'text-xl'} font-bold`} style={{ color: '#FFCC00' }}>
                          {days}
                        </div>
                        <div className={`${isNext ? 'text-xs' : 'text-[10px]'} text-muted-foreground uppercase tracking-wider`}>
                          days
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Hero Image */}
        <motion.div 
          className="mb-6 rounded-lg overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <img 
            src="https://my.roxpt.app/hyrox-home.webp" 
            alt="Hyrox Training" 
            className="w-full h-auto object-cover"
          />
        </motion.div>

        {/* Race Simulations - Horizontal Scrolling - Only show if there's an active plan */}
        {daySummaries.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-bold mb-3 px-2">Race Sims</h3>
            <p className="text-sm text-muted-foreground mb-4 px-2">
              Full race simulations you can do anytime to track your progress.
            </p>
            
            {generatingHyrox ? (
            <Card className="p-6 bg-[#111111] rounded-[18px] border border-[rgba(255,215,0,0.2)]">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-yellow-500 mx-auto mb-3" />
                <h4 className="font-semibold text-base mb-2">Generating Race Simulations...</h4>
                <p className="text-sm text-muted-foreground">
                  Adding Hyrox Full simulations to your plan
                </p>
              </div>
            </Card>
          ) : hyroxSimDays.length === 0 ? (
            <Card className="p-6 bg-[#111111] rounded-[18px] border border-[rgba(255,215,0,0.2)]">
              <div className="text-center">
                <h4 className="font-semibold text-base mb-2">Loading Race Sims...</h4>
                <p className="text-sm text-muted-foreground">
                  Race simulations will appear here shortly
                </p>
              </div>
            </Card>
          ) : (
            <div className="overflow-x-auto -mx-2 px-2 pb-2" style={{ WebkitOverflowScrolling: 'touch' }}>
              <div className="flex gap-4" style={{ width: 'max-content' }}>
                {/* Hyrox Full Simulations (from database) */}
                {(() => {
                  const fullSims = hyroxSimDays.filter(d => d.description.includes('Full'));
                  console.log('🏃 Rendering Hyrox Full cards:', fullSims);
                  return fullSims.slice(0, 2).map((sim, idx) => (
                <Card
                  key={sim.id}
                  className="flex-shrink-0 w-64 p-5 bg-[#111111] rounded-[18px] border border-[rgba(255,215,0,0.2)] shadow-[0_8px_24px_rgba(0,0,0,0.4)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.5)] hover:border-[rgba(255,215,0,0.35)] hover:-translate-y-0.5 active:scale-[0.98] active:shadow-[0_4px_16px_rgba(0,0,0,0.3)] transition-all duration-200 cursor-pointer"
                  onClick={() => {
                    // Navigate to Hyrox simulation workout
                    setTrainingDay(sim.day_index.toString());
                    navigate('/today');
                  }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-500 border-yellow-500/30">
                      🏃 SIM
                    </Badge>
                    {idx === 0 && <Badge variant="secondary" className="text-xs">1</Badge>}
                    {idx === 1 && <Badge variant="secondary" className="text-xs">2</Badge>}
                  </div>
                  <h4 className="font-semibold text-base mb-1">Hyrox Full</h4>
                  <p className="text-xs text-muted-foreground mb-2">Open Men</p>
                  <p className="text-xs text-foreground/60">
                    8 stations with 1km runs between each
                  </p>
                </Card>
              ));
                })()}

              {/* Hyrox Half - Coming Soon */}
              <Card
                className="flex-shrink-0 w-64 p-5 bg-[#111111] rounded-[18px] border border-[rgba(255,215,0,0.2)] shadow-[0_8px_24px_rgba(0,0,0,0.4)] transition-all duration-200 opacity-40 cursor-not-allowed"
                onClick={() => toast("Coming soon!")}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-500 border-yellow-500/30">
                    🏃 SIM
                  </Badge>
                  <Badge variant="secondary" className="text-xs">Soon</Badge>
                </div>
                <h4 className="font-semibold text-base mb-1">Hyrox Half</h4>
                <p className="text-xs text-muted-foreground mb-2">Open Men</p>
                <p className="text-xs text-foreground/60">
                  8 stations with 500m runs between each
                </p>
              </Card>

              {/* DEKA & ATHX - Coming Soon */}
              {[
                { 
                  title: "DEKA", 
                  subtitle: "Fit / Mile",
                  description: "10 functional fitness zones",
                },
                { 
                  title: "ATHX", 
                  subtitle: "Standard",
                  description: "Hybrid athletic competition",
                },
              ].map((sim) => (
                <Card
                  key={sim.title}
                  className="flex-shrink-0 w-64 p-5 bg-[#111111] rounded-[18px] border border-[rgba(255,215,0,0.2)] shadow-[0_8px_24px_rgba(0,0,0,0.4)] transition-all duration-200 opacity-40 cursor-not-allowed"
                  onClick={() => toast("Coming soon!")}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-500 border-yellow-500/30">
                      🏃 SIM
                    </Badge>
                    <Badge variant="secondary" className="text-xs">Soon</Badge>
                  </div>
                  <h4 className="font-semibold text-base mb-1">{sim.title}</h4>
                  <p className="text-xs text-muted-foreground mb-2">{sim.subtitle}</p>
                  <p className="text-xs text-foreground/60">
                    {sim.description}
                  </p>
                </Card>
              ))}
              </div>
            </div>
          )}
          </div>
        )}

        {isFetchingDays && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
            <Loader2 className="w-4 h-4 animate-spin" />
            Updating plan…
          </div>
        )}

        <div className="space-y-3">
          {daySummaries.length === 0 && !loading && !isFetchingDays && (
            <Card className="p-8 text-center space-y-4">
              <div className="flex justify-center">
                <Target className="w-16 h-16 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">No Training Plan Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Complete your onboarding to get a personalized 14-day training programme tailored to your goals.
                </p>
              </div>
              <Button 
                onClick={() => navigate('/onboarding')}
                className="w-full h-12 text-lg font-bold"
                style={{ backgroundColor: "#FFCC00", color: "#000" }}
              >
                Start Onboarding
              </Button>
            </Card>
          )}
          
          {daySummaries.map((summary) => {
            const displayDay = summary.day >= 1 ? summary.day : summary.day + 1;
            const displayExercises = flattenExercisesForDisplay(summary.exercises);
            const completedCount = getCompletedExerciseCount(summary.exerciseLogs, summary.totalExercises);

            return (
              <Card
                key={summary.day}
                className={`group relative cursor-pointer rounded-2xl border border-zinc-800/70 bg-zinc-950/70 p-4 sm:p-5 shadow-[0_20px_45px_-30px_rgba(0,0,0,0.8)] transition-colors hover:border-yellow-500/40`}
                onClick={() => handleDayClick(displayDay)}
              >
                {summary.isCompleted && (
                  <div className="absolute top-3 right-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#22c55e] shadow-[0_8px_20px_-8px_rgba(34,197,94,0.8)]">
                      <Check className="h-6 w-6 text-white" />
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div
                        className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-lg font-bold shadow-inner"
                        style={{
                          backgroundColor: summary.isRestDay ? "#27272a" : "#FFCC00",
                          color: summary.isRestDay ? "#e4e4e7" : "#000",
                        }}
                      >
                        {displayDay}
                      </div>
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-bold text-foreground">
                            Day {displayDay}
                          </h3>
                          {summary.isRestDay && (
                            <Badge className="rounded-full bg-blue-500/15 text-blue-200 border border-blue-500/30 text-[10px] uppercase tracking-wide">
                              Recovery Focus
                            </Badge>
                          )}
                      {!summary.isRestDay && (
                        <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground ml-1">
                          <span className="text-sm font-semibold text-foreground">{summary.totalExercises}</span>
                          <Repeat className="w-3.5 h-3.5 text-yellow-400" />
                          <span>Exercises</span>
                        </span>
                      )}
                        </div>
                      {summary.isRestDay && (
                        <p className="text-sm text-muted-foreground">
                          Coach scheduled recovery—mobility and easy movement.
                        </p>
                      )}

                      {!summary.isRestDay && (
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                          {summary.hasCardio && (
                            <span className="inline-flex items-center gap-1">
                              <Heart className="w-4 h-4" />
                              Cardio
                            </span>
                          )}
                          {summary.hasMobility && (
                            <span className="inline-flex items-center gap-1">
                              <HandMetal className="w-4 h-4" />
                              Mobility
                            </span>
                          )}
                          {summary.hasCircuit && (
                            <span className="inline-flex items-center gap-1 text-amber-300">
                              <Repeat className="w-4 h-4" />
                              Circuit
                            </span>
                          )}
                          {summary.hasRunning && (
                            <span className="inline-flex items-center gap-1">
                              <Footprints className="w-4 h-4" />
                              Running
                            </span>
                          )}
                          {summary.hasWeights && (
                            <span className="inline-flex items-center gap-1">
                              <Dumbbell className="w-4 h-4" />
                              Weights
                            </span>
                          )}
                          {summary.hasHIIT && (
                            <span className="inline-flex items-center gap-1 text-pink-400">
                              <Flame className="w-4 h-4" />
                              HIIT
                            </span>
                          )}
                          {summary.hasAMRAP && (
                            <span className="inline-flex items-center gap-1 text-emerald-300">
                              <Target className="w-4 h-4" />
                              AMRAP
                            </span>
                          )}
                        </div>
                      )}
                      </div>
                    </div>
                    <ChevronRight className="mt-1 h-5 w-5 text-zinc-600 transition-colors group-hover:text-yellow-400" />
                  </div>

                  <div className="overflow-hidden rounded-xl border border-zinc-800/60 bg-black/40">
                    {displayExercises.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        Recovery
                      </div>
                    ) : (
                      <div className="divide-y divide-zinc-800/70">
                        {displayExercises.map((exercise, index) =>
                          exercise.__isGroupHeader ? (
                            <div
                              key={`${exercise.id || exercise.name}-header-${index}`}
                              className="bg-purple-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-purple-300"
                            >
                              {exercise.name}
                            </div>
                          ) : (
                            <ExerciseRow key={`${exercise.id || exercise.name}-${index}`} exercise={exercise} />
                          ),
                        )}
                      </div>
                    )}
                  </div>

                  {/* Recent log highlights removed for cleaner view */}
                </div>
              </Card>
            );
          })}
        </div>

        <Button
          variant="outline"
          className="w-full mt-6"
          onClick={handleGoToToday}
        >
          Go to Today's Workout
        </Button>

        {/* HYROX Fitness Assessment */}
        <Button
          className="w-full mt-4 h-16 text-lg font-bold border-2"
          style={{ 
            backgroundColor: '#FFFFFF', 
            color: '#000000',
            borderColor: '#000000'
          }}
          onClick={() => navigate("/assessment")}
        >
          Take HYROX Fitness Assessment
        </Button>

        <WelcomeVideoModal
          open={showWelcomeVideo}
          onClose={handleDismissWelcomeVideo}
          url={welcomeVideoSetting?.url}
          title={welcomeVideoSetting?.title || undefined}
        />
      </main>
    </div>
  );
};

export default Overview;

