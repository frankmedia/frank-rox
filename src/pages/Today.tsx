import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ExerciseCard } from "@/components/ExerciseCard";
import { ExerciseMedia } from "@/components/ExerciseMedia";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trophy, ClipboardList, Flame, Info, Share2, Loader2, CheckCircle2, SkipForward, Activity, Heart } from "lucide-react";
import { toast } from "sonner";
import { TrainingDaySelector } from "@/components/TrainingDaySelector";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingScreen } from "@/components/LoadingScreen";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { ExerciseListSkeleton } from "@/components/ExerciseCardSkeleton";
import { shareWorkout } from "@/utils/share";
import { supabase } from "@/utils/supabaseClient";
import { isExerciseComplete, getCompletionStats } from "@/services/workoutCache";
import confetti from "canvas-confetti";
import { Capacitor } from "@capacitor/core";
import { AppHealth } from "@/services/appHealth";

const Today = () => {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const { exercises, loading, error, refresh } = useData();
  const [syncing, setSyncing] = useState(false);
  const [healthData, setHealthData] = useState<{
    steps: number;
    heartRate: { average: number; max: number; min: number } | null;
  } | null>(null);
  const [healthConnected, setHealthConnected] = useState(false);
  
  // Debug: Log exercises whenever they change
  useEffect(() => {
    console.log(`📋 Today page: Received ${exercises.length} exercises from DataContext:`, exercises.map(e => `${e.name} (${e.type})`));
  }, [exercises]);
  
  // Check if health is connected and fetch data
  useEffect(() => {
    const checkHealth = async () => {
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
    
    checkHealth();
  }, []);
  
  // Fetch health data
  const fetchHealthData = async () => {
    try {
      // Get today's data from midnight to now
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const start = startOfToday.toISOString();
      const end = now.toISOString();
      
      console.log('📊 [Today] Fetching health data from:', start, 'to:', end);
      
      const [stepsResult, heartRateResult] = await Promise.all([
        AppHealth.getSteps({ start, end }).catch(() => ({ total: 0, platform: 'android' as const })),
        AppHealth.getHeartRate({ start, end }).catch(() => null)
      ]);
      
      setHealthData({
        steps: stepsResult.total,
        heartRate: heartRateResult && heartRateResult.samples > 0 ? {
          average: heartRateResult.average,
          max: heartRateResult.max,
          min: heartRateResult.min
        } : null
      });
    } catch (e) {
      console.error('Error fetching health data:', e);
    }
  };
  
  // Function to find the next incomplete training day
  const findNextIncompleteDay = () => {
    try {
      const userStr = localStorage.getItem("frank_rock_user");
      if (userStr) {
        const user = JSON.parse(userStr);
        const completedDaysKey = `completedDays_${user.username}`;
        const completedDaysStr = localStorage.getItem(completedDaysKey);
        const completedDays: number[] = completedDaysStr ? JSON.parse(completedDaysStr) : [];
        
        // Find the first day that's not completed
        for (let day = 1; day <= 20; day++) { // Assuming max 20 training days
          if (!completedDays.includes(day)) {
            return day.toString();
          }
        }
        // If all days are completed, return day 1
        return "1";
      }
    } catch (e) {
      console.error("Error finding next incomplete day:", e);
    }
    return "1";
  };

  const [currentTrainingDay, setCurrentTrainingDay] = useState(() => {
    try {
      const userStr = localStorage.getItem("frank_rock_user");
      if (userStr) {
        const user = JSON.parse(userStr);
        const userKey = `currentTrainingDay_${user.username}`;
        const storedDay = localStorage.getItem(userKey);
        
        // If no stored day, find the next incomplete day
        if (!storedDay) {
          return findNextIncompleteDay();
        }
        
        // Check if the stored day is completed, if so find next incomplete
        const completedDaysKey = `completedDays_${user.username}`;
        const completedDaysStr = localStorage.getItem(completedDaysKey);
        const completedDays: number[] = completedDaysStr ? JSON.parse(completedDaysStr) : [];
        
        if (completedDays.includes(parseInt(storedDay))) {
          return findNextIncompleteDay();
        }
        
        return storedDay;
      }
    } catch (e) {
      console.error("Error loading training day:", e);
    }
    return "1";
  });
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set());

  // Refresh exercises when training day changes
  useEffect(() => {
    console.log(`🔄 Training day changed to ${currentTrainingDay}, refreshing exercises...`);
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrainingDay]);

  // Pull-to-refresh with MUCH bigger threshold
  const { containerRef, pullDistance, isRefreshing } = usePullToRefresh({
    onRefresh: async () => {
      await Promise.all([
        refresh(),
        healthConnected ? fetchHealthData() : Promise.resolve()
      ]);
      toast.success("Refreshed!", { duration: 2000 });
    },
    threshold: 150, // Much bigger pull required
  });

  // Load completed exercises from today (user-specific) using hybrid cache
  const loadCompletedExercises = () => {
    try {
      const userStr = localStorage.getItem("frank_rock_user");
      if (userStr) {
        const user = JSON.parse(userStr);
        const username = user.username || "";
        const trainingDay = parseInt(currentTrainingDay);
        
        // Check both the workout cache AND localStorage history
        const completedIds = new Set<string>();
        
        // 1. Check workout cache (new hybrid system)
        exercises.forEach((ex) => {
          if (isExerciseComplete(username, trainingDay, ex.id)) {
            completedIds.add(ex.name); // ExerciseCard expects exercise names
          }
        });
        
        // 2. Also check localStorage workoutHistory for backward compatibility
        const storageKey = `workoutHistory_${username}`;
        const workoutHistory = localStorage.getItem(storageKey);
        
        if (workoutHistory) {
          const logs = JSON.parse(workoutHistory);
          const todayDate = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
          
          logs
            .filter((log: any) => log.timestamp && log.timestamp.startsWith(todayDate))
            .forEach((log: any) => {
              completedIds.add(log.exerciseName as string);
            });
        }
        
        setCompletedExercises(completedIds);
        
        console.log("✅ Loaded completed exercises:", Array.from(completedIds));
      }
    } catch (e) {
      console.error("Error loading completed exercises:", e);
    }
  };

  useEffect(() => {
    loadCompletedExercises();
  }, [exercises]); // Re-check when exercises change
  
  // Re-check on component mount and when window gains focus (optimistic UI)
  useEffect(() => {
    loadCompletedExercises();
    
    const handleFocus = () => loadCompletedExercises();
    window.addEventListener("focus", handleFocus);
    
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  // Auto-update to next incomplete day when current day is completed
  useEffect(() => {
    const checkAndUpdateToNextDay = () => {
      try {
        const userStr = localStorage.getItem("frank_rock_user");
        if (userStr) {
          const user = JSON.parse(userStr);
          const completedDaysKey = `completedDays_${user.username}`;
          const completedDaysStr = localStorage.getItem(completedDaysKey);
          const completedDays: number[] = completedDaysStr ? JSON.parse(completedDaysStr) : [];
          
          // If current day is completed, find next incomplete day
          if (completedDays.includes(parseInt(currentTrainingDay))) {
            const nextDay = findNextIncompleteDay();
            if (nextDay !== currentTrainingDay) {
              setCurrentTrainingDay(nextDay);
              // Update localStorage
              const userKey = `currentTrainingDay_${user.username}`;
              localStorage.setItem(userKey, nextDay);
            }
          }
        }
      } catch (e) {
        console.error("Error checking for next day:", e);
      }
    };

    checkAndUpdateToNextDay();
  }, [currentTrainingDay]);
  
  // Header is now fixed - no scroll hiding needed

  // Sync today's workout logs to Supabase
  const syncLogsToSupabase = async (status: 'completed' | 'skipped') => {
    if (!authUser?.clientId) {
      toast.error("Not logged in");
      return false;
    }

    try {
      setSyncing(true);
      const userStr = localStorage.getItem("frank_rock_user");
      if (!userStr) return false;

      const user = JSON.parse(userStr);
      const storageKey = `workoutHistory_${user.username}`;
      const workoutHistory = localStorage.getItem(storageKey);
      
      if (!workoutHistory) {
        // No logs to sync, just mark day as skipped/completed
        if (status === 'completed') {
          toast.error("No exercises logged today");
          return false;
        }
      }

      const logs = workoutHistory ? JSON.parse(workoutHistory) : [];
      const todayDate = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
      
      // Filter logs for today only
      const todayLogs = logs.filter((log: any) => 
        log.timestamp && log.timestamp.startsWith(todayDate)
      );

      // Get active plan ID
      const { data: plan } = await supabase
        .from('plans')
        .select('id')
        .eq('client_id', authUser.clientId)
        .eq('status', 'active')
        .single();

      const planId = plan?.id || null;
      const trainingDay = parseInt(currentTrainingDay);

      // Bulk insert workout logs if status is 'completed'
      if (status === 'completed' && todayLogs.length > 0) {
        const workoutLogsToInsert = todayLogs.map((log: any) => ({
          client_id: authUser.clientId,
          plan_id: planId,
          training_day: trainingDay,
          exercise_name: log.exerciseName,
          logged_at: new Date(log.timestamp).toISOString(),
          weight: log.weight || null,
          weights: log.weights || null,
          sets: log.sets || null,
          reps: log.reps || null,
          duration_min: log.duration || null,
          distance_km: log.distance || null,
          notes: log.notes || null,
          rating: log.rating || null,
          is_pb: log.isPB || false,
        }));

        console.log('💾 Syncing to Supabase:', {
          count: workoutLogsToInsert.length,
          clientId: authUser.clientId,
          planId,
          trainingDay,
          logs: workoutLogsToInsert
        });

        const { error: logsError } = await supabase
          .from('workout_logs')
          .insert(workoutLogsToInsert);

        if (logsError) {
          console.error('❌ Error inserting logs:', logsError);
          throw logsError;
        }
        
        console.log('✅ Successfully synced logs to Supabase');
        
        // Clear today's logs from localStorage after successful sync
        const newLogs = logs.filter((log: any) => 
          !(log.timestamp && log.timestamp.startsWith(todayDate))
        );
        localStorage.setItem(storageKey, JSON.stringify(newLogs));
        console.log('🧹 Cleared synced logs from localStorage');
      } else if (status === 'completed') {
        console.log('⚠️  No logs to sync (todayLogs.length = 0)');
      }

      // Calculate stats
      let totalWeight = 0;
      let totalDuration = 0;
      let totalDistance = 0;

      todayLogs.forEach((log: any) => {
        if (log.weights && Array.isArray(log.weights)) {
          totalWeight += log.weights.reduce((sum: number, w: number) => sum + w, 0);
        } else if (log.weight) {
          totalWeight += log.weight;
        }
        if (log.duration) totalDuration += log.duration;
        if (log.distance) totalDistance += log.distance;
      });

      // Mark day as completed/skipped
      console.log('💾 Marking day as', status, {
        client_id: authUser.clientId,
        plan_id: planId,
        day_index: trainingDay,
        total_exercises: todayLogs.length
      });
      
      const { error: dayError } = await supabase
        .from('completed_days')
        .upsert({
          client_id: authUser.clientId,
          plan_id: planId,
          day_index: trainingDay,
          status,
          total_exercises: todayLogs.length,
          total_weight_kg: totalWeight,
          total_duration_min: totalDuration,
          total_distance_km: totalDistance,
        }, {
          onConflict: 'client_id,plan_id,day_index'
        });

      if (dayError) {
        console.error('❌ Error marking day:', dayError);
        throw dayError;
      }
      
      console.log('✅ Day marked as', status);

      // Also update localStorage for Overview page compatibility
      const completedDaysKey = `completedDays_${user.username}`;
      const completedDaysStr = localStorage.getItem(completedDaysKey);
      const completedDays: number[] = completedDaysStr ? JSON.parse(completedDaysStr) : [];
      
      if (!completedDays.includes(trainingDay)) {
        completedDays.push(trainingDay);
        localStorage.setItem(completedDaysKey, JSON.stringify(completedDays));
      }

      return true;
    } catch (err) {
      console.error("Error syncing to Supabase:", err);
      toast.error("Failed to sync workout");
      return false;
    } finally {
      setSyncing(false);
    }
  };

  const handleCompleteDay = async () => {
    const success = await syncLogsToSupabase('completed');
    if (success) {
      // 🎉 CONFETTI CELEBRATION!
      const duration = 3000;
      const animationEnd = Date.now() + duration;
      
      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;
      
      const interval: any = setInterval(() => {
        const timeLeft = animationEnd - Date.now();
        
        if (timeLeft <= 0) {
          return clearInterval(interval);
        }
        
        const particleCount = 50 * (timeLeft / duration);
        
        // Fire confetti from both sides
        confetti({
          particleCount,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.6 },
          colors: ['#FFCC00', '#FFB74D', '#FFA000', '#FF6F00']
        });
        confetti({
          particleCount,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.6 },
          colors: ['#FFCC00', '#FFB74D', '#FFA000', '#FF6F00']
        });
      }, 250);
      
      toast.success("Day completed! 🎉", {
        description: "Your workout has been synced",
        duration: 3000
      });
      
      // Advance to next day
      const nextDay = (parseInt(currentTrainingDay) + 1).toString();
      const userStr = localStorage.getItem("frank_rock_user");
      if (userStr) {
        const user = JSON.parse(userStr);
        const userKey = `currentTrainingDay_${user.username}`;
        localStorage.setItem(userKey, nextDay);
        setCurrentTrainingDay(nextDay);
      }
      
      // Refresh exercises for next day after confetti
      setTimeout(async () => {
        await refresh();
      }, 3000);
    }
  };

  const handleSkipDay = async () => {
    const success = await syncLogsToSupabase('skipped');
    if (success) {
      toast.info("Day skipped", {
        description: "Moving to next training day"
      });
      
      // Advance to next day
      const nextDay = (parseInt(currentTrainingDay) + 1).toString();
      const userStr = localStorage.getItem("frank_rock_user");
      if (userStr) {
        const user = JSON.parse(userStr);
        const userKey = `currentTrainingDay_${user.username}`;
        localStorage.setItem(userKey, nextDay);
        setCurrentTrainingDay(nextDay);
      }
      
      // Refresh exercises for next day
      await refresh();
    }
  };

  useEffect(() => {
    if (error) {
      toast.error("Failed to load exercises", {
        description: error,
      });
    } else if (!loading && exercises.length === 0) {
      console.log("⚠️ No exercises found - check if plan/day exists in database");
      // Don't show toast immediately - user might be navigating or refreshing
    }
  }, [error, loading, exercises]);

  const handleShare = async () => {
    const result = await shareWorkout(currentTrainingDay, exercises);
    
    if (result.success) {
      if (result.fallback) {
        toast.success("Copied to clipboard!", {
          description: "Share your workout with friends",
        });
      } else {
        toast.success("Workout shared!");
      }
    } else if (!result.cancelled) {
      toast.error("Failed to share workout");
    }
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-background pb-20 overflow-y-auto relative" style={{ paddingTop: 0 }}>
      {/* Pull-to-Refresh Indicator */}
      <div 
        className="absolute top-0 left-0 right-0 flex items-center justify-center transition-all z-50 pointer-events-none"
        style={{
          height: `${pullDistance}px`,
          opacity: Math.min(pullDistance / 150, 1),
        }}
      >
        <div className="flex flex-col items-center gap-2 mt-4">
          {isRefreshing ? (
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#FFCC00' }} />
          ) : (
            <Flame className="w-8 h-8" style={{ color: '#FFCC00', transform: `rotate(${pullDistance * 2.4}deg)` }} />
          )}
          <span className="text-sm font-semibold text-muted-foreground">
            {isRefreshing ? "Refreshing..." : "Pull down to refresh"}
          </span>
        </div>
      </div>

      {/* Header */}
      <header 
        className="sticky z-10 bg-background border-b border-border"
      >
        <div className="container max-w-2xl mx-auto px-2 sm:px-4 py-2">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            {/* Logo - Left Side */}
            <div 
              className="flex items-center gap-1 sm:gap-2 cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
              onClick={() => navigate("/overview")}
            >
              <Flame className="w-6 h-6 sm:w-8 sm:h-8" style={{ color: '#FFCC00' }} />
              <h1 className="text-lg sm:text-2xl font-bold text-primary">
                Rox<span className="text-foreground">PT</span>
              </h1>
            </div>
            
            {/* Training Day Selector - Right */}
            <TrainingDaySelector onDayChange={setCurrentTrainingDay} />
          </div>
        </div>
      </header>

      {/* Today's Workout */}
      <main className="container max-w-2xl mx-auto px-2 sm:px-4 pt-16 pb-6">
        <div className="flex items-center justify-between mb-3 sm:mb-6">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">Training Day {currentTrainingDay}</h2>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-primary"
              onClick={handleShare}
            >
              <Share2 className="w-4 h-4" />
            </Button>
            
            <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-primary text-xs sm:text-sm"
              >
                <Info className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                <span className="hidden sm:inline">Hyrox Training</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                  <Flame className="w-6 h-6" style={{ color: '#FFCC00' }} />
                  Hyrox Training Methodology
                </DialogTitle>
                <DialogDescription className="text-base">
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
                      <strong>Common Mistake:</strong> Training too much in the "gray zone" (70-80% HRmax) reduces both aerobic base and high-end power development.
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

        {/* Health Stats Card (Native Only) */}
        {healthConnected && healthData && (
          <Card className="p-4 mb-4 bg-gradient-to-r from-primary/10 to-red-500/10 border-primary/20">
            <button 
              onClick={fetchHealthData}
              className="absolute top-3 right-3 p-1.5 hover:bg-background/50 rounded-full transition-colors"
            >
              <Activity className="w-4 h-4 text-primary" />
            </button>
            
            <div className="grid grid-cols-2 gap-3">
              {/* Steps */}
              <div className="flex items-center gap-3 p-3 bg-background/50 rounded-lg">
                <div className="p-2 bg-primary/20 rounded-full">
                  <Activity className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Steps</p>
                  <p className="text-lg font-bold text-primary">{healthData.steps.toLocaleString()}</p>
                </div>
              </div>
              
              {/* Heart Rate */}
              {healthData.heartRate && (
                <div className="flex items-center gap-3 p-3 bg-background/50 rounded-lg">
                  <div className="p-2 bg-red-500/20 rounded-full">
                    <Heart className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Avg HR</p>
                    <p className="text-lg font-bold text-red-500">{healthData.heartRate.average}</p>
                    <p className="text-xs text-muted-foreground">{healthData.heartRate.min}-{healthData.heartRate.max} bpm</p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {loading ? (
          <ExerciseListSkeleton count={6} />
        ) : (
          <>
            {/* Intro Card (optional) */}
            {(() => {
              const introCard = exercises.find(ex => ex.type === "intro");
              if (!introCard) return null;
              
              return (
                <Card 
                  className="p-4 mb-6 border-4 overflow-hidden"
                  style={{ borderColor: "#FFCC00" }}
                >
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <ClipboardList className="w-8 h-8 flex-shrink-0" style={{ color: "#FFCC00" }} />
                      <h3 className="text-3xl font-bold" style={{ color: "#FFCC00" }}>
                        {introCard.name}
                      </h3>
                    </div>
                    
                    {/* Media (if available) - Full width with rounded corners */}
                    {introCard.mediaUrl && (
                      <div className="-mx-4 mb-4">
                        <div className="rounded-lg overflow-hidden">
                          <ExerciseMedia url={introCard.mediaUrl} alt={introCard.name} />
                        </div>
                      </div>
                    )}
                    
                    {/* Description */}
                    {introCard.notes && (
                      <p className="text-xl text-foreground leading-relaxed">
                        {introCard.notes}
                      </p>
                    )}
                  </div>
                </Card>
              );
            })()}
            
            <div className="space-y-4">
              {exercises.map((exercise) => {
                // Skip intro cards - they're displayed above
                if (exercise.type === "intro") {
                  return null;
                }
                
                // Skip rendering child exercises that are part of a group
                // They're already displayed inside their parent card
                if ((exercise as any)._isChildExercise) {
                  return null;
                }
                
                return (
                  <ExerciseCard
                    key={exercise.id}
                    exercise={exercise}
                    onClick={() => navigate(`/exercise/${exercise.id}`)}
                    isCompleted={completedExercises.has(exercise.name)}
                  />
                );
              })}
            </div>

            {exercises.filter(ex => ex.type !== "intro").length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No exercises planned for today</p>
              </div>
            )}

            {/* Complete/Skip Day Buttons */}
            {!loading && exercises.filter(ex => ex.type !== "intro").length > 0 && (
              <div className="container max-w-2xl mx-auto px-4 py-6">
                <div className="flex gap-3">
                  <Button
                    onClick={handleSkipDay}
                    disabled={syncing}
                    variant="outline"
                    className="flex-1 h-12 text-base font-semibold"
                  >
                    {syncing ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <SkipForward className="w-5 h-5 mr-2" />
                        Skip Day
                      </>
                    )}
                  </Button>
                  
                  <Button
                    onClick={handleCompleteDay}
                    disabled={syncing}
                    className="flex-1 h-12 text-base font-semibold"
                    style={{ backgroundColor: '#FFCC00', color: '#000' }}
                  >
                    {syncing ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5 mr-2" />
                        Complete Day
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Today;
