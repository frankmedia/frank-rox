import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import type { Exercise } from "@/types/workout";
import { useWakeLock } from "@/hooks/useWakeLock";
import { useAuth } from "@/contexts/AuthContext";
import { 
  markExerciseComplete,
  syncWorkoutLogToSupabase 
} from "@/services/workoutCache";
import { supabase } from "@/utils/supabaseClient";

interface HIITWorkoutProps {
  exercise: Exercise;
  onComplete: () => void;
}

export function HIITWorkout({ exercise, onComplete }: HIITWorkoutProps) {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [currentInterval, setCurrentInterval] = useState(0);
  const [isWorkPhase, setIsWorkPhase] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(0);
  
  // Keep screen awake during workout
  useWakeLock(isRunning);
  
  // Parse work/rest ratio (e.g., "20s/10s" or "20s work / 10s rest")
  const parseWorkRest = (ratio: string) => {
    // Remove "work", "rest", extra spaces
    const cleaned = ratio.toLowerCase().replace(/work|rest/g, "").trim();
    const parts = cleaned.split("/");
    const work = parseInt(parts[0]) || 20;
    const rest = parseInt(parts[1]) || 10;
    return { work, rest };
  };
  
  const { work: workSeconds, rest: restSeconds } = parseWorkRest(exercise.workRestRatio || exercise.notes || "20s/10s");
  const totalIntervals = exercise.totalRounds || exercise.sets || 8;
  
  console.log("🔥 HIIT Workout Debug:", {
    name: exercise.name,
    totalRounds: exercise.totalRounds,
    sets: exercise.sets,
    totalIntervals,
    workRestRatio: exercise.workRestRatio,
    notes: exercise.notes,
    parsedWork: workSeconds,
    parsedRest: restSeconds
  });
  
  useEffect(() => {
    if (!isRunning) return;
    
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Switch phase or move to next interval
          if (isWorkPhase) {
            // Work phase done, start rest
            setIsWorkPhase(false);
            return restSeconds;
          } else {
            // Rest phase done, move to next interval
            setCurrentInterval((prevInterval) => {
              const nextInterval = prevInterval + 1;
              if (nextInterval >= totalIntervals) {
                // All intervals complete!
                setIsRunning(false);
                toast.success("🎉 HIIT Complete!", {
                  description: `${totalIntervals} intervals finished!`,
                  duration: 3000,
                });
                return prevInterval;
              }
              return nextInterval;
            });
            setIsWorkPhase(true);
            return workSeconds;
          }
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isRunning, isWorkPhase, workSeconds, restSeconds, totalIntervals]);
  
  const handleStart = () => {
    setIsRunning(true);
    setCurrentInterval(0);
    setIsWorkPhase(true);
    setTimeRemaining(workSeconds);
    toast.info("🔥 HIIT Started!", { description: "Let's go!" });
  };
  
  const handlePause = () => {
    setIsRunning(false);
  };
  
  const handleResume = () => {
    setIsRunning(true);
  };
  
  const handleReset = () => {
    setIsRunning(false);
    setCurrentInterval(0);
    setIsWorkPhase(true);
    setTimeRemaining(workSeconds);
  };
  
  const handleComplete = async () => {
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
        
        // Sync to Supabase if logged in
        if (authUser?.clientId) {
          const { data: plan } = await supabase
            .from("plans")
            .select("id")
            .eq("client_id", authUser.clientId)
            .eq("status", "active")
            .order("created_at", { ascending: false })
            .limit(1)
            .single();
            
          await syncWorkoutLogToSupabase(
            authUser.clientId,
            plan?.id || null,
            trainingDay,
            {
              exerciseName: exercise.name,
              sets: totalIntervals,
              duration: Math.round((totalIntervals * (workSeconds + restSeconds)) / 60),
              notes: `${workSeconds}s work / ${restSeconds}s rest`,
            }
          );
          
          toast.success("✅ HIIT Workout Logged!", {
            description: "Synced to cloud!"
          });
        } else {
          toast.success("✅ HIIT Workout Logged!");
        }
      }
    } catch (e) {
      console.error("Error logging HIIT workout:", e);
      toast.success("✅ HIIT Workout Logged!");
    }
    
    onComplete();
  };
  
  const progress = ((currentInterval / totalIntervals) * 100).toFixed(0);
  
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
          <h1 className="text-base sm:text-lg md:text-xl font-bold">HIIT Workout</h1>
          <div className="w-8 sm:w-10" />
        </div>
      </div>
      
      {/* Content */}
      <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-6 space-y-4 sm:space-y-6">
        {/* Exercise Name */}
        <Card className="p-6 bg-black/5 border-0">
          <h2 className="text-3xl font-bold text-center mb-2 flex items-center justify-center gap-2">
            <Activity className="w-7 h-7 text-primary" />
            {exercise.name}
          </h2>
          <p className="text-center text-muted-foreground">
            {totalIntervals} intervals • {workSeconds}s work / {restSeconds}s rest
          </p>
        </Card>
        
        {!isRunning && currentInterval === 0 ? (
          // Start button
          <Button
            size="lg"
            onClick={handleStart}
            className="h-24 px-16 text-3xl font-bold w-full"
            style={{ backgroundColor: "#FF00B2" }}
          >
            START HIIT
          </Button>
        ) : (
          <>
            {/* Timer Display */}
            <Card className="p-8 bg-primary/5" style={{ borderColor: "#FF00B2", borderWidth: "4px" }}>
              <div className="text-center space-y-4">
                <div className="text-sm font-bold uppercase tracking-wider" style={{ color: "#FF00B2" }}>
                  Interval {currentInterval + 1} / {totalIntervals}
                </div>
                
                <div className="text-9xl font-bold" style={{ color: isWorkPhase ? "#FF00B2" : "#888" }}>
                  {timeRemaining}
                </div>
                
                <div className="text-3xl font-bold uppercase" style={{ color: isWorkPhase ? "#FF00B2" : "#888" }}>
                  {isWorkPhase ? "WORK" : "REST"}
                </div>
                
                {/* Progress Bar */}
                <div className="w-full bg-secondary/20 rounded-full h-4 overflow-hidden">
                  <div
                    className="h-full transition-all duration-300"
                    style={{ width: `${progress}%`, backgroundColor: "#FF00B2" }}
                  />
                </div>
              </div>
            </Card>
            
            {/* Controls */}
            <div className="flex gap-4 w-full">
              <Button
                size="lg"
                onClick={handleReset}
                className="h-20 text-2xl font-bold flex-1"
                variant="outline"
              >
                Restart
              </Button>
              <Button
                size="lg"
                onClick={handleComplete}
                className="h-20 text-2xl font-bold flex-[2]"
                style={{ backgroundColor: "#FFCC00", color: "#000" }}
              >
                Complete Early
              </Button>
            </div>
          </>
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

