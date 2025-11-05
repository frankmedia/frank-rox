import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Pause, RotateCcw, CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import type { Exercise } from "@/types/workout";
import { triggerSuccessHaptic } from "@/utils/haptics";
import { 
  markExerciseComplete,
  syncCircuitToSupabase
} from "@/services/workoutCache";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/utils/supabaseClient";
import { FlameRating } from "@/components/FlameRating";
import { useWorkoutSession } from "@/contexts/WorkoutSessionContext";

interface CircuitWorkoutTimerProps {
  exercise: Exercise;
  onComplete: () => void;
}

type Phase = "GET_READY" | "WORK" | "REST" | "REST_BETWEEN_ROUNDS" | "COMPLETE";

export function CircuitWorkoutTimer({ exercise, onComplete }: CircuitWorkoutTimerProps) {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  
  // Circuit settings from database (null becomes 0)
  const workSeconds = (exercise as any).work_sec ?? 30;
  const restSeconds = (exercise as any).rest_sec ?? 0; // null or undefined becomes 0
  const totalRounds = exercise.totalRounds ?? 3;
  const exercises = exercise.exercises || [];
  const restBetweenRounds = (exercise as any).rest_between_rounds_s ?? 0;
  
  console.log('⏱️ Circuit Timer Settings:', {
    work_sec: workSeconds,
    rest_sec: restSeconds,
    rounds: totalRounds,
    rest_between_rounds_s: restBetweenRounds,
    raw_data: {
      work_sec: (exercise as any).work_sec,
      rest_sec: (exercise as any).rest_sec,
      rest_between_rounds_s: (exercise as any).rest_between_rounds_s,
    }
  });
  
  const [phase, setPhase] = useState<Phase>("GET_READY");
  const [currentRound, setCurrentRound] = useState(1);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(10); // 10 second get ready
  const [isRunning, setIsRunning] = useState(true); // Auto-start
  const [isPaused, setIsPaused] = useState(false);
  const [rating, setRating] = useState(0); // 0-5 flame rating
  
  // Track completed exercises: completedExercises[exerciseIndex][roundIndex] = true/false
  const [completedExercises, setCompletedExercises] = useState<boolean[][]>(
    exercises.map(() => Array(totalRounds).fill(false))
  );
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Use global workout session to keep screen awake
  const { startWorkoutSession, isWakeLockActive } = useWorkoutSession();
  
  // Start global session when circuit starts
  useEffect(() => {
    if (isRunning && !isPaused && phase !== "COMPLETE") {
      startWorkoutSession();
    }
  }, [isRunning, isPaused, phase, startWorkoutSession]);
  
  // Create beep sound
  useEffect(() => {
    // Create an audio context for beep sound
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    console.log('🔊 Audio context created, state:', audioContext.state);
    
    const playBeep = async () => {
      try {
        // Resume audio context if suspended (browser autoplay policy)
        if (audioContext.state === 'suspended') {
          console.log('🔊 Resuming suspended audio context...');
          await audioContext.resume();
          console.log('🔊 Audio context resumed, state:', audioContext.state);
        }
        
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
        console.log('🔊 BEEP played!');
      } catch (err) {
        console.error('🔇 Error playing beep:', err);
      }
    };
    
    (audioRef as any).current = { play: playBeep, context: audioContext };
    
    return () => {
      audioContext.close();
    };
  }, []);
  
  // Timer logic
  useEffect(() => {
    if (!isRunning || isPaused) return;
    
    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 0) {
          advanceToNextPhase();
          return 0;
        }
        
        // Beep at 3, 2, 1 seconds
        if ((prev === 3 || prev === 2 || prev === 1) && audioRef.current) {
          audioRef.current.play();
          triggerSuccessHaptic();
        }
        
        return prev - 1;
      });
    }, 1000);
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, isPaused, phase, currentRound, currentExerciseIndex]);
  
  const advanceToNextPhase = () => {
    if (phase === "GET_READY") {
      setPhase("WORK");
      setTimeRemaining(Number(workSeconds));
    } else if (phase === "WORK") {
      // Mark current exercise as complete for this round
      setCompletedExercises((prev) => {
        const updated = prev.map(row => [...row]);
        if (updated[currentExerciseIndex]) {
          updated[currentExerciseIndex][currentRound - 1] = true;
        }
        return updated;
      });
      triggerSuccessHaptic();
      
      // Check if this is the last exercise in the round
      if (currentExerciseIndex === exercises.length - 1) {
        // Last exercise - check if last round
        if (currentRound === totalRounds) {
          setPhase("COMPLETE");
          setIsRunning(false);
          handleComplete();
        } else {
          // Start rest between rounds ONLY if restBetweenRounds > 0
          if (restBetweenRounds > 0) {
            setPhase("REST_BETWEEN_ROUNDS");
            setTimeRemaining(restBetweenRounds);
          } else {
            // No rest between rounds - go directly to next round
            setCurrentRound((prev) => prev + 1);
            setCurrentExerciseIndex(0);
            setPhase("WORK");
            setTimeRemaining(Number(workSeconds));
          }
        }
      } else {
        // More exercises in this round - start rest
        setPhase("REST");
        setTimeRemaining(Number(restSeconds));
      }
    } else if (phase === "REST") {
      // Move to next exercise
      setCurrentExerciseIndex((prev) => prev + 1);
      setPhase("WORK");
      setTimeRemaining(Number(workSeconds));
    } else if (phase === "REST_BETWEEN_ROUNDS") {
      // Start next round
      setCurrentRound((prev) => prev + 1);
      setCurrentExerciseIndex(0);
      setPhase("WORK");
      setTimeRemaining(Number(workSeconds));
    }
  };
  
  const handleStart = () => {
    setIsRunning(true);
    setIsPaused(false);
  };
  
  const handlePause = async () => {
    // Unlock audio on user interaction
    if ((audioRef as any).current?.context) {
      const ctx = (audioRef as any).current.context;
      if (ctx.state === 'suspended') {
        console.log('🔊 Unlocking audio on tap...');
        await ctx.resume();
        console.log('🔊 Audio unlocked!');
      }
    }
    setIsPaused(!isPaused);
  };
  
  const handleReset = async () => {
    // Unlock audio on user interaction
    if ((audioRef as any).current?.context) {
      const ctx = (audioRef as any).current.context;
      if (ctx.state === 'suspended') {
        console.log('🔊 Unlocking audio on reset...');
        await ctx.resume();
        console.log('🔊 Audio unlocked!');
      }
    }
    setIsRunning(false);
    setIsPaused(false);
    setPhase("GET_READY");
    setCurrentRound(1);
    setCurrentExerciseIndex(0);
    setTimeRemaining(10);
  };
  
  const handleComplete = async (finalRating?: number) => {
    try {
      const userStr = localStorage.getItem("frank_rock_user");
      if (!userStr) {
        toast.error("User not found");
        return;
      }
      
      const user = JSON.parse(userStr);
      const username = user.username || "";
      const userKey = `currentTrainingDay_${username}`;
      const trainingDay = parseInt(localStorage.getItem(userKey) || "1");
      
      // Use finalRating if provided, otherwise use state
      const ratingToSave = finalRating !== undefined ? finalRating : rating;
      
      // Mark circuit as complete
      markExerciseComplete(username, trainingDay, exercise.id, authUser?.clientId);
      
      // Sync to Supabase with rating
      if (authUser?.clientId) {
        const { data: plan } = await supabase
          .from("plans")
          .select("id")
          .eq("client_id", authUser.clientId)
          .eq("status", "active")
          .single();
          
        await syncCircuitToSupabase(
          authUser.clientId,
          plan?.id || null,
          trainingDay,
          exercise.name,
          exercises,
          { rating: ratingToSave > 0 ? ratingToSave : undefined } // Include rating if provided
        );
        
        toast.success("✅ Circuit Complete!", {
          description: `${totalRounds} rounds synced to cloud!`,
        });
      } else {
        toast.success("✅ Circuit Complete!", {
          description: `${totalRounds} rounds finished!`,
        });
      }
      
      triggerSuccessHaptic();
      
      // Navigate back after completion
      onComplete();
    } catch (e) {
      console.error("Error completing circuit:", e);
      toast.success("✅ Circuit Complete!");
      onComplete();
    }
  };
  
  const currentExercise = exercises[currentExerciseIndex];
  const isRedZone = timeRemaining <= 5;
  
  const getPhaseDisplay = () => {
    switch (phase) {
      case "GET_READY":
        return "GET READY!";
      case "WORK":
        return currentExercise?.name || "Exercise";
      case "REST":
        return "REST";
      case "REST_BETWEEN_ROUNDS":
        return `REST - Round ${currentRound} Complete!`;
      case "COMPLETE":
        return "WORKOUT COMPLETE! 🎉";
      default:
        return "";
    }
  };
  
  const getPhaseColor = () => {
    if (phase === "COMPLETE") return "bg-green-500";
    if (isRedZone) return "bg-red-500";
    if (phase === "WORK") return "bg-yellow-500";
    if (phase === "REST" || phase === "REST_BETWEEN_ROUNDS") return "bg-blue-500";
    return "bg-gray-500";
  };
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="container max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/today")}
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{exercise.name}</h1>
              <p className="text-sm text-muted-foreground">
                {workSeconds}s work • {restSeconds}s rest • {totalRounds} rounds
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Timer Display */}
      <div className="container max-w-2xl mx-auto px-4 py-4">
        {/* Wake Lock Status Indicator */}
        {isRunning && !isPaused && phase !== "COMPLETE" && (
          <div className="flex items-center justify-center mb-4">
            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
          </div>
        )}
        
        <Card 
          onClick={isRunning && phase !== "COMPLETE" ? handlePause : undefined}
          className={`p-4 text-center ${getPhaseColor()} transition-colors duration-300 ${isRunning && phase !== "COMPLETE" ? 'cursor-pointer' : ''}`}
        >
          <div className="space-y-2">
            {/* Round Counter */}
            {phase !== "GET_READY" && phase !== "COMPLETE" && (
              <div className={`text-lg font-bold ${isRedZone ? 'text-white' : 'text-black'}`}>
                Round {currentRound} of {totalRounds}
              </div>
            )}
            
            {/* Exercise Name / Phase */}
            <div className={`text-2xl md:text-3xl font-bold ${isRedZone ? 'text-white' : 'text-black'} min-h-[3rem] flex items-center justify-center`}>
              {getPhaseDisplay()}
            </div>
            
            {/* Timer - Click to pause/resume with subtle breathing animation */}
            {phase !== "COMPLETE" && (
              <div className={`text-[12rem] md:text-[14rem] leading-none font-bold ${isRedZone ? 'text-white' : 'text-black'} tabular-nums ${timeRemaining <= 3 && timeRemaining > 0 ? 'animate-pulse' : isRunning && !isPaused ? 'animate-breathe' : ''}`}>
                {timeRemaining}
              </div>
            )}
            
            {/* Pause indicator */}
            {isPaused && (
              <div className={`text-xl font-bold ${isRedZone ? 'text-white' : 'text-black'} animate-pulse`}>
                <Pause className="w-8 h-8 inline-block" /> PAUSED
              </div>
            )}
            
            {/* Exercise Details - NOT shown for timed circuits (they just do it for the work time) */}
          </div>
        </Card>

        {/* Controls */}
        <div className="mt-4 space-y-4">
          {phase !== "COMPLETE" && (
            <Button
              onClick={handleReset}
              className="w-full h-12 text-base font-bold bg-red-600 hover:bg-red-700 text-white"
            >
              <RotateCcw className="w-5 h-5 mr-2" />
              Reset
            </Button>
          )}
          
          {phase === "COMPLETE" && (
            <div className="space-y-4">
              <Card className="p-6 bg-green-500/10 border-green-500">
                <h3 className="text-2xl font-bold text-center mb-4">🎉 Circuit Complete!</h3>
                <p className="text-center text-muted-foreground mb-6">
                  How was your workout? Rate it to give feedback to your PT!
                </p>
                
                {/* Flame Rating */}
                <div className="flex flex-col items-center gap-4">
                  <FlameRating 
                    value={rating} 
                    onChange={(selectedRating) => {
                      setRating(selectedRating);
                      // Auto-complete when flame is clicked
                      setTimeout(() => handleComplete(selectedRating), 100);
                    }}
                    size="lg"
                  />
                  
                  {rating > 0 && (
                    <p className="text-lg font-semibold text-center">
                      {rating === 5 && "🔥 Crushed it!"}
                      {rating === 4 && "💪 Great effort!"}
                      {rating === 3 && "👍 Solid work!"}
                      {rating === 2 && "😅 Challenging!"}
                      {rating === 1 && "😮‍💨 Tough one!"}
                    </p>
                  )}
                  
                  {/* Skip rating option */}
                  {rating === 0 && (
                    <Button
                      onClick={() => handleComplete(0)}
                      variant="ghost"
                      className="text-sm"
                    >
                      Skip and complete without rating
                    </Button>
                  )}
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* Exercise List */}
        {phase !== "COMPLETE" && (
          <Card className="mt-8 p-6">
            <h3 className="text-lg font-bold mb-4">Exercises in Circuit</h3>
            <div className="space-y-3">
              {exercises.map((ex: any, idx: number) => (
                <div
                  key={idx}
                  className={`p-3 rounded ${
                    idx === currentExerciseIndex && phase === "WORK"
                      ? "bg-yellow-500/20 border-2 border-yellow-500"
                      : "bg-secondary/10"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      {/* For timed circuits, ONLY show the exercise name - no reps/kg/distance */}
                      <div className="font-medium">{ex.name}</div>
                    </div>
                    
                    {/* Round checkboxes */}
                    <div className="flex gap-2 items-center">
                      {Array.from({ length: totalRounds }).map((_, roundIdx) => (
                        <div key={roundIdx}>
                          {completedExercises[idx]?.[roundIdx] ? (
                            <CheckCircle2 className="w-6 h-6 text-green-500" />
                          ) : (
                            <Circle className="w-6 h-6 text-muted-foreground" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
      
      {/* CSS animation for subtle breathing effect */}
      <style>{`
        @keyframes breathe {
          0%, 95%, 100% { opacity: 1; transform: scale(1); }
          97.5% { opacity: 0.97; transform: scale(1.003); }
        }
        .animate-breathe {
          animation: breathe 10s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

