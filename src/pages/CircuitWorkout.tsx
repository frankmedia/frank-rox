import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Timer } from "@/components/Timer";
import { toast } from "sonner";
import type { Exercise } from "@/types/workout";
import { triggerSuccessHaptic } from "@/utils/haptics";
import { 
  markCircuitRound, 
  getCircuitProgress,
  markExerciseComplete,
  syncCircuitToSupabase
} from "@/services/workoutCache";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/utils/supabaseClient";
import { ExerciseMedia } from "@/components/ExerciseMedia";

interface CircuitWorkoutProps {
  exercise: Exercise;
  onComplete: () => void;
}

export function CircuitWorkout({ exercise, onComplete }: CircuitWorkoutProps) {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const totalRounds = exercise.totalRounds || 3;
  const exercises = exercise.exercises || [];
  
  // Get user data for caching
  const [username, setUsername] = useState<string>("");
  const [trainingDay, setTrainingDay] = useState<number>(1);
  const [planId, setPlanId] = useState<string | null>(null);
  
  // Track completed rounds per exercise: { exerciseId: [1, 2, 3] }
  const [completedRounds, setCompletedRounds] = useState<Record<string, number[]>>({});
  const [showTimer, setShowTimer] = useState(false);
  const [timerDuration, setTimerDuration] = useState(90);
  
  // Load user data and cached progress on mount
  useEffect(() => {
    try {
      const userStr = localStorage.getItem("frank_rock_user");
      if (userStr) {
        const user = JSON.parse(userStr);
        const userUsername = user.username || "";
        setUsername(userUsername);
        
        // Get training day
        const userKey = `currentTrainingDay_${userUsername}`;
        const day = parseInt(localStorage.getItem(userKey) || "1");
        setTrainingDay(day);
        
        // Load cached circuit progress
        const cached = getCircuitProgress(userUsername, day, exercise.id);
        setCompletedRounds(cached);
        
        console.log("🔄 Loaded circuit progress from cache:", cached);
      }
      
      // Get plan ID if available
      if (authUser?.clientId) {
        // We'll fetch this when syncing, for now just store clientId
      }
    } catch (e) {
      console.error("Error loading circuit data:", e);
    }
  }, [exercise.id, authUser]);
  
  const toggleNextRound = (exerciseId: string, exerciseName: string) => {
    if (!username) return;
    
    setCompletedRounds((prev) => {
      const exerciseRounds = prev[exerciseId] || [];
      
      // If all rounds are complete, clear all
      if (exerciseRounds.length === totalRounds) {
        // Clear all rounds in cache
        for (let i = 1; i <= totalRounds; i++) {
          markCircuitRound(username, trainingDay, exercise.id, exerciseId, exerciseName, i);
        }
        
        return {
          ...prev,
          [exerciseId]: [],
        };
      }
      
      // Otherwise, add the next round
      const nextRound = exerciseRounds.length + 1;
      
      // Save to cache immediately (hybrid: localStorage + will sync to Supabase)
      markCircuitRound(username, trainingDay, exercise.id, exerciseId, exerciseName, nextRound);
      
      triggerSuccessHaptic();
      
      const newRounds = [...exerciseRounds, nextRound].sort((a, b) => a - b);
      
      return {
        ...prev,
        [exerciseId]: newRounds,
      };
    });
  };
  
  const isRoundComplete = (exerciseId: string, roundNumber: number) => {
    return (completedRounds[exerciseId] || []).includes(roundNumber);
  };
  
  const isAllComplete = () => {
    return exercises.every((ex: Exercise) => 
      (completedRounds[ex.id] || []).length === totalRounds
    );
  };
  
  const handleComplete = async () => {
    if (!username) {
      toast.error("User not found");
      return;
    }
    
    triggerSuccessHaptic();
    
    // Mark this circuit as complete in the cache
    markExerciseComplete(username, trainingDay, exercise.id, authUser?.clientId);
    
    // Sync to Supabase immediately (hybrid approach)
    if (authUser?.clientId) {
      const { data: plan } = await supabase
        .from("plans")
        .select("id")
        .eq("client_id", authUser.clientId)
        .eq("status", "active")
        .single();
        
      const result = await syncCircuitToSupabase(
        authUser.clientId,
        plan?.id || null,
        trainingDay,
        exercise.name,
        exercises,
        completedRounds
      );
      
      if (result.success) {
        toast.success("✅ Circuit Complete!", {
          description: `${totalRounds} rounds synced to cloud!`,
        });
      } else {
        toast.success("✅ Circuit Complete!", {
          description: "Saved locally, will sync when online",
        });
      }
    } else {
      toast.success("✅ Circuit Complete!", {
        description: `${totalRounds} rounds finished!`,
      });
    }
    
    onComplete();
  };
  
  const startRestTimer = (seconds: number) => {
    setTimerDuration(seconds);
    setShowTimer(true);
  };
  
  const getTotalCompleted = () => {
    return Object.values(completedRounds).reduce((sum, rounds) => sum + rounds.length, 0);
  };
  
  const getTotalRequired = () => {
    return exercises.length * totalRounds;
  };
  
  const progress = (getTotalCompleted() / getTotalRequired()) * 100;
  
  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-2 sm:px-4 py-2 sm:py-4">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-full h-8 w-8 sm:h-10 sm:w-10"
          >
            <ArrowLeft className="w-4 h-4 sm:w-6 sm:h-6" />
          </Button>
          <h1 className="text-base sm:text-lg md:text-xl font-bold">Circuit Workout</h1>
          <div className="w-8 sm:w-10" />
        </div>
      </div>
      
      {/* Content */}
      <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-6 space-y-4 sm:space-y-6">
        {/* Exercise Name */}
        <Card className="p-6 border-4" style={{ borderColor: "#FFB74D" }}>
          <h2 className="text-3xl font-bold text-center mb-2">{exercise.name}</h2>
          <p className="text-center text-foreground/70 text-lg">
            {totalRounds} rounds • {exercises.length} exercises per round
          </p>
        </Card>
        
        {/* Progress Display */}
        <div className="text-center space-y-2">
          <div className="text-5xl font-bold" style={{ color: "#FFB74D" }}>
            {getTotalCompleted()} / {getTotalRequired()}
          </div>
          <p className="text-base text-foreground/70">Sets completed</p>
          
          {/* Progress Bar */}
          <div className="w-full bg-secondary/20 rounded-full h-4 overflow-hidden">
            <div
              className="h-full transition-all duration-300"
              style={{ width: `${progress}%`, backgroundColor: "#FFB74D" }}
            />
          </div>
        </div>
        
        {/* Exercise List with Round Circles */}
        <div className="space-y-3">
              {exercises.map((ex: Exercise) => {
                // Build display info
                let title = ex.name;
                const parts: string[] = [];
                
                // Add distance to title in brackets if exists
                if (ex.targetDistanceKm) {
                  const meters = Math.round(ex.targetDistanceKm * 1000);
                  title = `${ex.name} [${meters}m]`;
                }
                
                // Build subtitle
                if (ex.reps) {
                  parts.push(`${ex.reps} reps`);
                }
                
                if (ex.suggestedKg) {
                  parts.push(`${ex.suggestedKg}kg`);
                }
                
                if (ex.durationMin) {
                  parts.push(`${ex.durationMin} min`);
                }
                
                return (
                  <Card
                    key={ex.id}
                    className="p-6 border-2 cursor-pointer hover:bg-muted/50 transition-all"
                    onClick={() => toggleNextRound(ex.id, ex.name)}
                  >
                    <div className="flex flex-col gap-4">
                      {/* Exercise Name */}
                      <div className="w-full">
                        <h3 className="text-2xl font-bold mb-2 text-foreground">{title}</h3>
                        {parts.length > 0 && (
                          <p className="text-lg text-foreground/70 mb-3">
                            {parts.join(" • ")}
                          </p>
                        )}
                      </div>
                      
                      {/* Exercise Media (YouTube/Video) */}
                      {ex.mediaUrl && (
                        <div className="w-full">
                          <ExerciseMedia 
                            url={ex.mediaUrl} 
                            alt={ex.name}
                          />
                        </div>
                      )}
                      
                      {/* Round Circles - wrap to next line if needed */}
                      <div className="flex flex-wrap gap-2 justify-center">
                        {Array.from({ length: totalRounds }, (_, idx) => {
                          const roundNumber = idx + 1;
                          const isComplete = isRoundComplete(ex.id, roundNumber);
                          
                          return (
                            <div
                              key={roundNumber}
                              className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all ${
                                isComplete
                                  ? "border-green-500 bg-green-500"
                                  : "border-muted-foreground"
                              }`}
                            >
                              {isComplete ? (
                                <Check className="w-6 h-6 text-white" />
                              ) : (
                                <span className="text-lg font-bold text-foreground/80">{roundNumber}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </Card>
                );
              })}
        </div>
        
        {/* Rest Timer Section */}
        {showTimer ? (
          <Card className="p-6 bg-primary/5 border-primary">
            <h3 className="text-2xl font-bold mb-4 text-center text-primary">Rest Timer</h3>
            <Timer
              mode="countdown"
              initialSeconds={timerDuration}
              onComplete={() => {
                toast.success("Rest complete! 💪");
                setShowTimer(false);
              }}
              onCancel={() => setShowTimer(false)}
            />
          </Card>
        ) : (
          <div className="flex gap-3 justify-center">
            <Button
              variant="outline"
              size="lg"
              onClick={() => startRestTimer(60)}
              className="text-lg font-bold"
            >
              Rest 60s
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => startRestTimer(90)}
              className="text-lg font-bold"
            >
              Rest 90s
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => startRestTimer(120)}
              className="text-lg font-bold"
            >
              Rest 2min
            </Button>
          </div>
        )}
        
        {/* Mark as Done */}
        {isAllComplete() && (
          <Button
            size="lg"
            onClick={handleComplete}
            className="h-16 w-full text-xl font-bold"
            style={{ backgroundColor: "#FFCC00", color: "#000" }}
          >
            ✓ Mark as Done
          </Button>
        )}
        
        {/* Notes */}
        {exercise.notes && (
          <Card className="p-4 bg-muted/50">
            <p className="text-sm text-muted-foreground">{exercise.notes}</p>
          </Card>
        )}
      </div>
    </div>
  );
}
