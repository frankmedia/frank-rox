import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ExerciseCard } from "@/components/ExerciseCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Flame, Info, Loader2, CheckCircle2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingScreen } from "@/components/LoadingScreen";
import { ExerciseListSkeleton } from "@/components/ExerciseCardSkeleton";
import { supabase } from "@/utils/supabaseClient";
import confetti from "canvas-confetti";
import { getTodayExercises } from "@/services/supabasePlans";
import { Exercise } from "@/types/workout";

const Simulation = () => {
  const navigate = useNavigate();
  const { simNumber } = useParams<{ simNumber: string }>();
  const { user: authUser } = useAuth();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set());
  const [completedReady, setCompletedReady] = useState(false);
  const [simTitle, setSimTitle] = useState("Hyrox Full Simulation");
  const containerRef = useRef<HTMLDivElement>(null);

  const simDay = simNumber ? 100 + parseInt(simNumber) : 101;
  const simDate = new Date().toLocaleDateString('en-GB', { 
    weekday: 'short', 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric' 
  });

  // Load simulation exercises directly from database
  useEffect(() => {
    const loadSimulation = async () => {
      if (!authUser?.clientId) return;
      
      setLoading(true);
      try {
        console.log(`📋 Loading simulation exercises for sim #${simNumber}, day_index ${simDay}`);
        
        // Get active plan
        const { data: plan } = await supabase
          .from('plans')
          .select('id')
          .eq('client_id', authUser.clientId)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (!plan) {
          console.error('No active plan found');
          toast.error("No active plan found");
          setLoading(false);
          return;
        }

        // Get the simulation day (day_index = simDay, track_name = 'hyrox')
        const { data: planDay } = await supabase
          .from('plan_days')
          .select('id, description')
          .eq('plan_id', plan.id)
          .eq('day_index', simDay)
          .eq('track_name', 'hyrox')
          .single();

        if (!planDay) {
          console.error(`No simulation day found for day_index ${simDay}`);
          toast.error("Simulation not found");
          setLoading(false);
          return;
        }

        console.log(`✅ Found simulation day:`, planDay.id);
        
        // Set the simulation title based on description
        const isHalf = planDay.description?.includes('Half');
        setSimTitle(isHalf ? "Hyrox Half Simulation" : "Hyrox Full Simulation");

        // Get sessions for this day
        const { data: sessions, error: sessionsError } = await supabase
          .from('sessions')
          .select(`
            id,
            name,
            notes,
            session_blocks!inner (
              id,
              block_type,
              title,
              parameters,
              rounds,
              work_sec,
              rest_sec,
              rest_between_rounds_s,
              session_block_items!inner (
                id,
                exercise_id,
                item_order,
                sets,
                reps,
                duration_sec,
                distance_m,
                weight_kg,
                notes,
                extra,
                exercises!inner (
                  id,
                  name,
                  modality
                )
              )
            )
          `)
          .eq('plan_day_id', planDay.id);
        
        if (sessionsError) {
          console.error('❌ Session query error:', sessionsError);
          toast.error("Failed to load simulation data");
          setLoading(false);
          return;
        }

        if (!sessions || sessions.length === 0) {
          console.error('No sessions found for simulation');
          toast.error("No exercises found in simulation");
          setLoading(false);
          return;
        }

        console.log(`✅ Found ${sessions.length} sessions with blocks`);

        // Transform to Exercise[] format
        const exerciseData: Exercise[] = [];
        
        for (const session of sessions) {
          const blocks = (session as any).session_blocks || [];
          
          for (const block of blocks) {
            const items = block.session_block_items || [];
            
            console.log(`🔍 Processing block type: ${block.block_type}, items count: ${items.length}`);
            
            // For simulation blocks, process all items as individual exercises
            if (block.block_type === 'simulation' || block.block_type === 'circuit') {
              // Process all items as individual exercises
              for (const item of items) {
                const distance = item.extra?.distance || (item.distance_m ? item.distance_m / 1000 : undefined);
                const reps = item.extra?.reps || item.reps || 0;
                
                exerciseData.push({
                  id: item.exercise_id || item.id,
                  name: item.exercises?.name || 'Unknown Exercise',
                  type: (item.exercises?.modality === 'running' ? 'running' : 'weights') as any,
                  sets: item.sets || 1,
                  reps: reps,
                  durationMin: item.duration_sec ? item.duration_sec / 60 : undefined,
                  targetDistanceKm: distance,
                  suggestedKg: item.weight_kg || undefined,
                  notes: item.notes || (item.extra?.weight ? `Weight: ${item.extra.weight}` : ''),
                });
              }
            }
          }
        }

        console.log(`✅ Loaded ${exerciseData.length} exercises for simulation:`, exerciseData.map(e => e.name));
        setExercises(exerciseData);
      } catch (err) {
        console.error("Error loading simulation:", err);
        toast.error("Failed to load simulation");
      } finally {
        setLoading(false);
      }
    };

    loadSimulation();
  }, [authUser?.clientId, simDay, simNumber]);

  // Load completion status
  useEffect(() => {
    const loadCompletionStatus = () => {
      if (!authUser?.username) return;

      try {
        const userStr = localStorage.getItem("frank_rock_user");
        if (userStr) {
          const user = JSON.parse(userStr);
          const cacheKey = `workout_cache_${user.username}`;
          const cache = localStorage.getItem(cacheKey);
          
          if (cache) {
            const parsed = JSON.parse(cache);
            if (parsed.trainingDay === simDay && parsed.completedExercises) {
              const completed = new Set<string>(parsed.completedExercises);
              setCompletedExercises(completed);
            }
          }
        }
        setCompletedReady(true);
      } catch (err) {
        console.error("Error loading completion status:", err);
        setCompletedReady(true);
      }
    };

    loadCompletionStatus();
  }, [authUser?.username, simDay, exercises]);

  // Check for completion and trigger confetti
  useEffect(() => {
    if (!completedReady) return;

    const totalExercises = exercises.filter(e => e.type !== "intro").length;
    const completedCount = exercises.filter(e => 
      e.type !== "intro" && completedExercises.has(e.id)
    ).length;

    if (totalExercises > 0 && completedCount === totalExercises) {
      console.log("🎉 Simulation completed!");
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }, [completedExercises, exercises, completedReady]);

  const handleCompleteSimulation = async () => {
    if (!authUser?.clientId) return;

    setSyncing(true);
    try {
      // Get active plan
      const { data: plan } = await supabase
        .from("plans")
        .select("id")
        .eq("client_id", authUser.clientId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (plan) {
        // Mark day as completed
        await supabase
          .from("completed_days")
          .upsert({
            client_id: authUser.clientId,
            plan_id: plan.id,
            training_day: simDay,
            completed_at: new Date().toISOString(),
          });
      }

      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.5 }
      });

      toast.success("Simulation completed! 🎉");
      
      // Navigate back to overview after a short delay
      setTimeout(() => {
        navigate("/overview");
      }, 2000);
    } catch (err) {
      console.error("Error completing simulation:", err);
      toast.error("Failed to save completion");
    } finally {
      setSyncing(false);
    }
  };

  const totalExercises = exercises.filter(e => e.type !== "intro").length;
  const completedCount = exercises.filter(e => 
    e.type !== "intro" && completedExercises.has(e.id)
  ).length;
  const allComplete = totalExercises > 0 && completedCount === totalExercises;

  // Filter out intro cards (they'll be shown separately)
  const introCards = exercises.filter(e => e.type === "intro");
  const workoutExercises = exercises.filter(e => e.type !== "intro");

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div ref={containerRef} className="min-h-screen bg-background pb-20 overflow-y-auto relative" style={{ paddingTop: 0 }}>
      {/* Header */}
      <header className="sticky z-10 bg-background border-b border-border">
        <div className="container max-w-2xl mx-auto px-2 sm:px-4 py-4">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            {/* Back Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/overview")}
              className="flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            
            {/* Logo - Center */}
            <div 
              className="flex items-center gap-1 sm:gap-2 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => navigate("/overview")}
            >
              <Flame className="w-6 h-6 sm:w-8 sm:h-8" style={{ color: '#FFCC00' }} />
              <h1 className="text-lg sm:text-2xl font-bold text-primary">
                Rox<span className="text-foreground">PT</span>
              </h1>
            </div>

            {/* Info Button */}
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
                  <DialogTitle>Hyrox Training Info</DialogTitle>
                  <DialogDescription>
                    Race format and competition details
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 text-sm">
                  <p>
                    <strong>Hyrox</strong> is a standardized fitness race combining running and functional workouts.
                  </p>
                  <p>
                    <strong>Format:</strong> 8 x 1km runs with 8 workout stations between each run.
                  </p>
                  <p>
                    <strong>Stations:</strong> SkiErg, Sled Push, Sled Pull, Burpee Broad Jumps, Rowing, Farmers Carry, Sandbag Lunges, Wall Balls.
                  </p>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {/* Simulation Header */}
      <main className="container max-w-2xl mx-auto px-2 sm:px-4 pt-16 pb-6">
        <div className="relative flex flex-col items-center mb-6">
          <h2 className="text-center text-2xl sm:text-3xl md:text-4xl font-extrabold text-foreground">
            <span className="text-yellow-500">{simTitle}</span>
          </h2>
          <p className="text-sm text-muted-foreground mt-1">{simDate}</p>
        </div>

        {/* Intro Cards */}
        {introCards.length > 0 && (
          <div className={`mb-6 ${introCards.length > 1 ? 'overflow-x-auto -mx-2 px-2 pb-2' : ''}`} style={{ WebkitOverflowScrolling: 'touch' }}>
            <div className={introCards.length > 1 ? 'flex gap-4' : ''} style={introCards.length > 1 ? { width: 'max-content' } : {}}>
              {introCards.map((intro) => (
                <Card 
                  key={intro.id} 
                  className={`
                    p-6 bg-[#111111] 
                    rounded-[18px]
                    border border-[rgba(255,215,0,0.2)]
                    shadow-[0_8px_24px_rgba(0,0,0,0.4)]
                    hover:shadow-[0_12px_32px_rgba(0,0,0,0.5)] hover:border-[rgba(255,215,0,0.35)] hover:-translate-y-0.5
                    active:scale-[0.98] active:shadow-[0_4px_16px_rgba(0,0,0,0.3)]
                    transition-all duration-200
                    ${introCards.length > 1 ? 'flex-shrink-0 w-80' : 'w-full'}
                  `}
                >
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2">{intro.name}</h3>
                    <p className="text-sm text-foreground/70 leading-relaxed">{intro.notes}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Exercise List */}
        {workoutExercises.length === 0 ? (
          <ExerciseListSkeleton count={8} />
        ) : (
          <div className="space-y-4 mb-6">
            {workoutExercises.map((exercise) => (
              <ExerciseCard
                key={exercise.id}
                exercise={exercise}
                isCompleted={completedExercises.has(exercise.id)}
                onClick={() => navigate(`/exercise/${exercise.id}`)}
              />
            ))}
          </div>
        )}

        {/* Complete Simulation Button */}
        <div className="flex gap-3 mt-6">
          <Button
            variant="default"
            className="w-full h-14 text-base font-semibold bg-yellow-500 hover:bg-yellow-600 text-black"
            onClick={handleCompleteSimulation}
            disabled={!allComplete || syncing}
          >
            {syncing ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-5 w-5" />
            )}
            Complete Simulation
          </Button>
        </div>

        {/* Progress Indicator */}
        {totalExercises > 0 && (
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              {completedCount} of {totalExercises} exercises completed
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Simulation;

