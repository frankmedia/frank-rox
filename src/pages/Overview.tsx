import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Flame, ChevronRight, Dumbbell, PersonStanding, Info, Zap, Repeat, Target, Footprints, User, Heart, HandMetal, CheckCircle2, Trophy, Activity, Moon, Gauge, MapPin, TrendingUp, Loader2 } from "lucide-react";
import { getTodayExercises } from "@/services/supabasePlans";
import { LoadingScreen } from "@/components/LoadingScreen";
import { TrainingDayGridSkeleton } from "@/components/TrainingDayGridSkeleton";
import type { Exercise } from "@/types/workout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/utils/supabaseClient";
import { Capacitor } from "@capacitor/core";
import { AppHealth } from "@/services/appHealth";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

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
}

const Overview = () => {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [daySummaries, setDaySummaries] = useState<DaySummary[]>([]);
  const [maxDay, setMaxDay] = useState(14);
  const [allRaces, setAllRaces] = useState<Array<{ id: number; race_name: string; race_date: string }>>([]);
  const [healthConnected, setHealthConnected] = useState(false);
  const [healthData, setHealthData] = useState<{
    steps: number;
    heartRate: { average: number; max: number; min: number } | null;
    distance: number;
    calories: number;
    sleep: number;
  } | null>(null);

  // Pull-to-refresh
  const { containerRef, pullDistance, isRefreshing } = usePullToRefresh({
    onRefresh: async () => {
      await fetchHealthData();
      toast.success("Refreshed!", { duration: 2000 });
    },
    threshold: 150,
  });

  useEffect(() => {
    const loadDays = async () => {
      try {
        setLoading(true);

        if (!authUser?.clientId) {
          setLoading(false);
          return;
        }

        // Get active plan from Supabase
        const { data: plan } = await supabase
          .from('plans')
          .select('id')
          .eq('client_id', authUser.clientId)
          .eq('status', 'active')
          .single();

        if (!plan) {
          console.log("No active plan found");
          setLoading(false);
          return;
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
        const { data: planDays, error: planDaysError } = await supabase
          .from('plan_days')
          .select('day_index, is_rest')
          .eq('plan_id', plan.id)
          .order('day_index', { ascending: true });

        if (planDaysError || !planDays || planDays.length === 0) {
          console.error("Error loading plan days:", planDaysError);
          setLoading(false);
          return;
        }

        console.log(`📋 Loaded ${planDays.length} plan days`);

        // Calculate max day
        const maxDayIndex = Math.max(...planDays.map(pd => pd.day_index));
        const max = maxDayIndex + 1; // day_index is 0-based
        setMaxDay(max);

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
        
        // day_index is 0-based, convert to 1-based day numbers
        const completedDaysFromDB = completedDaysData?.map(cd => cd.day_index + 1) || [];
        
        // Also check localStorage as backup
        const completedDaysKey = `completedDays_${userData.username}`;
        const completedDaysStr = localStorage.getItem(completedDaysKey);
        const completedDaysFromLS: number[] = completedDaysStr ? JSON.parse(completedDaysStr) : [];
        
        // Merge both sources (union)
        const completedDays: number[] = [...new Set([...completedDaysFromDB, ...completedDaysFromLS])];
        
        console.log(`✅ Found ${completedDays.length} completed days:`, completedDays);

        // Now load exercises for each day using the existing getTodayExercises function
        const summaries: DaySummary[] = [];
        const userKey = `currentTrainingDay_${userData.username}`;
        const originalDay = localStorage.getItem(userKey);

        for (let dayIdx = 0; dayIdx < planDays.length; dayIdx++) {
          const planDay = planDays[dayIdx];
          const day = planDay.day_index + 1; // Convert to 1-based
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

          summaries.push({
            day,
            exercises,
            totalExercises: workoutExercises.length,
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
          });
        }

        // Restore original day
        if (originalDay) {
          localStorage.setItem(userKey, originalDay);
        }

        setDaySummaries(summaries);
        console.log(`✅ Loaded ${summaries.length} days with exercises`);
      } catch (error) {
        console.error("Error loading days:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDays();
  }, [authUser?.clientId]);

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
      
      const [stepsResult, heartRateResult, distanceResult, caloriesResult, sleepResult] = await Promise.all([
        AppHealth.getSteps({ start, end}).catch(() => ({ total: 0, platform: 'android' as const })),
        AppHealth.getHeartRate({ start, end }).catch(() => null),
        AppHealth.getDistance({ start, end }).catch(() => ({ kilometers: 0, meters: 0, platform: 'android' as const })),
        AppHealth.getCalories({ start, end }).catch(() => ({ calories: 0, platform: 'android' as const })),
        AppHealth.getSleep({ start: sleepStart, end }).catch(() => ({ hours: 0, minutes: 0, platform: 'android' as const }))
      ]);
      
      const data = {
        steps: stepsResult.total,
        heartRate: heartRateResult && heartRateResult.samples > 0 ? {
          average: heartRateResult.average,
          max: heartRateResult.max,
          min: heartRateResult.min
        } : null,
        distance: distanceResult.kilometers,
        calories: caloriesResult.calories,
        sleep: sleepResult.hours
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
    // Update current training day
    const userStr = localStorage.getItem("frank_rock_user");
    if (userStr) {
      const user = JSON.parse(userStr);
      const userKey = `currentTrainingDay_${user.username}`;
      localStorage.setItem(userKey, day.toString());
      
      console.log(`📅 Day ${day} selected, updated training day to: ${day}`);
    }

    // Navigate to today page
    navigate("/today");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-24" style={{ paddingTop: 0 }}>
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
        <main className="container max-w-2xl mx-auto px-2 sm:px-4 py-4 sm:py-6">
          <div className="h-8 w-64 bg-muted rounded mb-6 animate-pulse" />
          <TrainingDayGridSkeleton count={14} />
        </main>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="min-h-screen bg-background pb-24 overflow-y-auto relative" style={{ paddingTop: 0 }}>
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
      </header>

      {/* Content */}
      <main className="container max-w-2xl mx-auto px-2 sm:px-4 py-4 sm:py-6">
        {/* Race Schedule */}
        {allRaces.length > 0 && (
          <div className="mb-6">
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
                    className={`${
                      isNext
                        ? 'p-4 border-2 bg-[#FFCC00]/10'
                        : 'p-2 border'
                    } border-border`}
                    style={isNext ? { borderColor: '#FFCC00' } : {}}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h4 className={`${
                          isNext ? 'text-xl font-bold' : 'text-sm font-medium'
                        } text-foreground break-words`}>
                          {race.race_name}
                        </h4>
                        <p className={`${
                          isNext ? 'text-sm' : 'text-xs'
                        } text-muted-foreground mt-0.5`}>
                          {new Date(race.race_date).toLocaleDateString('en-GB', { 
                            day: 'numeric', 
                            month: 'long', 
                            year: 'numeric' 
                          })}
                        </p>
                      </div>
                      <div className={`flex-shrink-0 text-right ${
                        isNext ? 'min-w-[80px]' : 'min-w-[60px]'
                      }`}>
                        <div className={`${
                          isNext ? 'text-3xl' : 'text-xl'
                        } font-bold`} style={{ color: '#FFCC00' }}>
                          {days}
                        </div>
                        <div className={`${
                          isNext ? 'text-xs' : 'text-[10px]'
                        } text-muted-foreground uppercase tracking-wider`}>
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

        {/* Health Stats - Compact Inline */}
        {healthConnected && healthData && (
          <div className="mb-4">
            <Card className="p-3 bg-gradient-to-r from-primary/5 to-red-500/5 border-primary/10">
              <div className="flex items-center justify-around gap-3 flex-wrap">
                {/* Steps */}
                {healthData.steps > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Footprints className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    <span className="text-lg font-bold text-foreground">{healthData.steps.toLocaleString()}</span>
                  </div>
                )}

                {/* Heart Rate - Pulsing */}
                {healthData.heartRate && healthData.heartRate.average > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Heart className="w-4 h-4 text-red-500 flex-shrink-0 animate-pulse" />
                    <span className="text-lg font-bold text-foreground">{healthData.heartRate.average}</span>
                  </div>
                )}

                {/* Distance */}
                {healthData.distance > 0 && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span className="text-lg font-bold text-foreground">{healthData.distance.toFixed(1)}km</span>
                  </div>
                )}

                {/* Calories */}
                {healthData.calories > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-orange-500 flex-shrink-0" />
                    <span className="text-lg font-bold text-foreground">{healthData.calories}</span>
                  </div>
                )}

                {/* Sleep */}
                {healthData.sleep > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Moon className="w-4 h-4 text-purple-500 flex-shrink-0" />
                    <span className="text-lg font-bold text-foreground">{healthData.sleep.toFixed(1)}h</span>
                  </div>
                )}
              </div>
            </Card>
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
            src="/hyrox-home.webp" 
            alt="Hyrox Training" 
            className="w-full h-auto object-cover"
          />
        </motion.div>

        <div className="grid gap-3">
          {daySummaries.map((summary) => (
            <Card
              key={summary.day}
              className={`p-4 hover:bg-secondary/10 transition-colors cursor-pointer border-2 hover:border-primary relative ${
                summary.isCompleted ? 'border-[#FFCC00]' : ''
              }`}
              onClick={() => handleDayClick(summary.day)}
            >
              {/* Completion Badge */}
              {summary.isCompleted && (
                <div className="absolute top-2 right-2">
                  <CheckCircle2 className="w-16 h-16 fill-[#22c55e] text-white" />
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold"
                      style={{ 
                        backgroundColor: summary.isRestDay ? '#6B7280' : '#FFCC00', 
                        color: summary.isRestDay ? '#FFF' : '#000' 
                      }}
                    >
                      {summary.day}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-foreground">
                        Day {summary.day}
                      </h3>
                      {summary.isRestDay ? (
                        <p className="text-sm text-muted-foreground">
                          Rest day
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          {summary.totalExercises} exercises
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Exercise type icons - only show if not a rest day */}
                  {!summary.isRestDay && (
                    <div className="flex flex-wrap items-center gap-2 ml-15">
                      {summary.hasWeights && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Dumbbell className="w-4 h-4" />
                          <span>Weights</span>
                        </div>
                      )}
                      {summary.hasBodyweight && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <User className="w-4 h-4" />
                          <span>Bodyweight</span>
                        </div>
                      )}
                      {summary.hasRunning && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Footprints className="w-4 h-4" />
                          <span>Running</span>
                        </div>
                      )}
                      {summary.hasCardio && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Heart className="w-4 h-4" />
                          <span>Cardio</span>
                        </div>
                      )}
                      {summary.hasMobility && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <HandMetal className="w-4 h-4" />
                          <span>Mobility</span>
                        </div>
                      )}
                      {summary.hasHIIT && (
                        <div className="flex items-center gap-1 text-xs" style={{ color: '#FF00B2' }}>
                          <Flame className="w-4 h-4" />
                          <span>HIIT</span>
                        </div>
                      )}
                      {summary.hasCircuit && (
                        <div className="flex items-center gap-1 text-xs" style={{ color: '#FFB74D' }}>
                          <Repeat className="w-4 h-4" />
                          <span>Circuit</span>
                        </div>
                      )}
                      {summary.hasAMRAP && (
                        <div className="flex items-center gap-1 text-xs" style={{ color: '#00E676' }}>
                          <Target className="w-4 h-4" />
                          <span>AMRAP</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Button
          variant="outline"
          className="w-full mt-6"
          onClick={() => navigate("/today")}
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
      </main>
    </div>
  );
};

export default Overview;

