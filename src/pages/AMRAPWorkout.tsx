import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import type { Exercise } from "@/types/workout";
import { triggerSuccessHaptic } from "@/utils/haptics";
import { useWakeLock } from "@/hooks/useWakeLock";
import { useAuth } from "@/contexts/AuthContext";
import { 
  markExerciseComplete,
  syncWorkoutLogToSupabase 
} from "@/services/workoutCache";
import { supabase } from "@/utils/supabaseClient";

interface AMRAPWorkoutProps {
  exercise: Exercise;
  onComplete: () => void;
}

export function AMRAPWorkout({ exercise, onComplete }: AMRAPWorkoutProps) {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const timeCap = exercise.timeCap || 10; // minutes
  const exercises = exercise.exercises || [];
  
  const [isRunning, setIsRunning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(timeCap * 60); // in seconds
  
  // Keep screen awake during workout
  useWakeLock(isRunning);
  
  useEffect(() => {
    if (!isRunning || timeRemaining <= 0) return;
    
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          toast.success("⏰ Time's Up!", {
            description: `AMRAP Complete!`,
            duration: 5000,
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isRunning, timeRemaining]);
  
  const handleStart = () => {
    setIsRunning(true);
    setTimeRemaining(timeCap * 60);
    toast.info("🎯 AMRAP Started!", { description: "Go get it!" });
  };
  
  const handlePause = () => {
    setIsRunning(false);
  };
  
  const handleResume = () => {
    setIsRunning(true);
  };
  
  const handleComplete = async () => {
    triggerSuccessHaptic();
    
    try {
      const userStr = localStorage.getItem("frank_rock_user");
      if (userStr) {
        const user = JSON.parse(userStr);
        const username = user.username || "";
        
        // Get training day
        const userKey = `currentTrainingDay_${username}`;
        const trainingDay = parseInt(localStorage.getItem(userKey) || "1");
        
        // Mark as complete in cache
        markExerciseComplete(username, trainingDay, exercise.id, authUser?.clientId);
        
        // Calculate duration completed
        const timeElapsed = Math.round((timeCap * 60 - timeRemaining) / 60);
        
        // Sync to Supabase if logged in
        if (authUser?.clientId) {
          const { data: plan } = await supabase
            .from("plans")
            .select("id")
            .eq("client_id", authUser.clientId)
            .eq("status", "active")
            .single();
            
          await syncWorkoutLogToSupabase(
            authUser.clientId,
            plan?.id || null,
            trainingDay,
            {
              exerciseName: exercise.name,
              duration: timeElapsed,
              notes: `${timeCap} min time cap - ${exercises.length} exercises`,
            }
          );
          
          toast.success("✅ AMRAP Logged!", {
            description: "Synced to cloud!"
          });
        } else {
          toast.success("✅ AMRAP Logged!");
        }
      }
    } catch (e) {
      console.error("Error logging AMRAP workout:", e);
      toast.success("✅ AMRAP Logged!");
    }
    
    onComplete();
  };
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };
  
  const progress = ((timeCap * 60 - timeRemaining) / (timeCap * 60)) * 100;
  
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
          <h1 className="text-base sm:text-lg md:text-xl font-bold">AMRAP Workout</h1>
          <div className="w-8 sm:w-10" />
        </div>
      </div>
      
      {/* Content */}
      <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-6 space-y-4 sm:space-y-6">
        {/* Exercise Name */}
        <Card className="p-6 border-4" style={{ borderColor: "#00E676" }}>
          <h2 className="text-3xl font-bold text-center mb-2">{exercise.name}</h2>
          <p className="text-center text-foreground/70 text-lg">
            {timeCap} minute time cap • As many rounds as possible
          </p>
        </Card>
        
        {/* Exercise List - Always visible */}
        <div className="space-y-3">
          {exercises.map((ex: Exercise) => {
            // Build title with distance in brackets
            let title = ex.name;
            const parts: string[] = [];
            
            if (ex.targetDistanceKm) {
              // Convert km to meters for display in title
              const meters = Math.round(ex.targetDistanceKm * 1000);
              title = `${ex.name} [${meters}m]`;
            }
            
            // Build subtitle with other info (reps in AMRAP are just the target, don't display)
            if (ex.suggestedKg) {
              parts.push(`${ex.suggestedKg}kg`);
            }
            
            if (ex.durationMin) {
              parts.push(`${ex.durationMin} min`);
            }
            
            return (
              <Card
                key={ex.id}
                className="p-6 border-2"
              >
                <div>
                  <h3 className="text-3xl font-bold mb-1 text-foreground">{title}</h3>
                  {parts.length > 0 && (
                    <p className="text-lg text-foreground/70">
                      {parts.join(" • ")}
                    </p>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
        
        {!isRunning && timeRemaining === timeCap * 60 ? (
          // Start button
          <Button
            size="lg"
            onClick={handleStart}
            className="h-24 px-16 text-3xl font-bold w-full"
            style={{ backgroundColor: "#00E676", color: "#000" }}
          >
            START AMRAP
          </Button>
        ) : (
          <>
            {/* Timer Display */}
            <Card className="p-8 bg-primary/5" style={{ borderColor: "#00E676", borderWidth: "4px" }}>
              <div className="text-center space-y-4">
                <div className="text-sm font-bold uppercase tracking-wider" style={{ color: "#00E676" }}>
                  Time Remaining
                </div>
                
                <div className="text-9xl font-bold" style={{ color: timeRemaining <= 60 ? "#FF0000" : "#00E676" }}>
                  {formatTime(timeRemaining)}
                </div>
                
                {/* Progress Bar */}
                <div className="w-full bg-secondary/20 rounded-full h-4 overflow-hidden">
                  <div
                    className="h-full transition-all duration-300"
                    style={{ width: `${progress}%`, backgroundColor: "#00E676" }}
                  />
                </div>
              </div>
            </Card>
            
            {/* Controls */}
            <div className="flex gap-4 w-full">
              {isRunning ? (
                <>
                  <Button
                    size="lg"
                    onClick={handlePause}
                    className="h-20 text-2xl font-bold flex-1"
                    variant="outline"
                  >
                    Pause
                  </Button>
                  <Button
                    size="lg"
                    onClick={handleComplete}
                    className="h-20 text-2xl font-bold flex-[2]"
                    style={{ backgroundColor: "#FFCC00", color: "#000" }}
                  >
                    Complete Early
                  </Button>
                </>
              ) : timeRemaining > 0 ? (
                <>
                  <Button
                    size="lg"
                    onClick={handleResume}
                    className="h-20 text-2xl font-bold flex-1"
                    style={{ backgroundColor: "#00E676", color: "#000" }}
                  >
                    Resume
                  </Button>
                  <Button
                    size="lg"
                    onClick={handleComplete}
                    className="h-20 text-2xl font-bold flex-[2]"
                    style={{ backgroundColor: "#FFCC00", color: "#000" }}
                  >
                    Complete Early
                  </Button>
                </>
              ) : (
                <Button
                  size="lg"
                  onClick={handleComplete}
                  className="h-20 w-full text-2xl font-bold"
                  style={{ backgroundColor: "#FFCC00", color: "#000" }}
                >
                  ✓ Mark as Done
                </Button>
              )}
            </div>
          </>
        )}
        
        {/* Notes */}
        {exercise.notes && (
          <Card className="p-4 bg-muted/50">
            <p className="text-base text-foreground/70">{exercise.notes}</p>
          </Card>
        )}
      </div>
    </div>
  );
}

