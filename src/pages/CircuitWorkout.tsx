import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Dumbbell, Clock, Target, Repeat, ChevronLeft, ChevronRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Timer } from "@/components/Timer";
import { IntervalTimer } from "@/components/IntervalTimer";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
  
  // Detect if this is a running interval workout
  const isRunningInterval = 
    exercises.length === 1 && 
    exercises[0]?.type === "cardio" && 
    exercises[0]?.targetDistanceKm && 
    exercises[0]?.targetDistanceKm > 0 &&
    totalRounds > 1;
  
  // Get rest duration (in seconds)
  const restBetweenRounds = (exercise as any).rest_between_rounds_s || 90;
  
  console.log('🏃 Circuit Workout Detection:', {
    isRunningInterval,
    exercises: exercises.length,
    firstExerciseType: exercises[0]?.type,
    targetDistance: exercises[0]?.targetDistanceKm,
    totalRounds,
    restBetweenRounds,
  });
  
  // If it's a running interval, use IntervalTimer instead
  if (isRunningInterval) {
    // Get training day for saving
    const userStr = localStorage.getItem("frank_rock_user");
    const user = userStr ? JSON.parse(userStr) : null;
    const username = user?.username || "";
    const userKey = `currentTrainingDay_${username}`;
    const trainingDay = parseInt(localStorage.getItem(userKey) || "1");
    
    const handleIntervalComplete = async (intervalTimes: number[], rating: number) => {
      console.log('✅ Interval workout complete:', { intervalTimes, rating });
      
      if (!username) {
        toast.error("User not found");
        onComplete();
        return;
      }
      
      triggerSuccessHaptic();
      
      // Mark this exercise as complete in the cache
      markExerciseComplete(username, trainingDay, exercise.id, authUser?.clientId);
      
      // Sync to Supabase immediately (hybrid approach)
      if (authUser?.clientId) {
        const { data: plan } = await supabase
          .from("plans")
          .select("id")
          .eq("client_id", authUser.clientId)
          .eq("status", "active")
          .single();
        
        // Convert interval times to completed rounds format
        // Each interval is treated as a "round" with the time recorded
        const completedRounds: Record<string, number[]> = {
          [exercises[0].id]: intervalTimes
        };
        
        const result = await syncCircuitToSupabase(
          authUser.clientId,
          plan?.id || null,
          trainingDay,
          exercise.name,
          exercises,
          completedRounds,
          rating
        );
        
        if (result.success) {
          toast.success("✅ Interval Workout Complete!", {
            description: `${totalRounds} intervals synced to cloud!`,
          });
        } else {
          toast.success("✅ Interval Workout Complete!", {
            description: "Saved locally, will sync when online",
          });
        }
      } else {
        toast.success("✅ Interval Workout Complete!", {
          description: `${totalRounds} intervals finished!`,
        });
      }
      
      onComplete();
    };
    
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-16 items-center px-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="mr-4"
            >
              <ArrowLeft className="h-6 w-6" />
            </Button>
            <h1 className="text-2xl font-bold">{exercise.name}</h1>
          </div>
        </header>
        
        <main className="container max-w-2xl mx-auto px-4 pt-6 pb-24">
          <IntervalTimer
            totalRounds={totalRounds}
            targetDistance={exercises[0].targetDistanceKm!}
            restSeconds={restBetweenRounds}
            exerciseName={exercises[0].name}
            onComplete={handleIntervalComplete}
            onCancel={() => navigate(-1)}
          />
        </main>
      </div>
    );
  }
  
  // Get user data for caching
  const [username, setUsername] = useState<string>("");
  const [trainingDay, setTrainingDay] = useState<number>(1);
  const [planId, setPlanId] = useState<string | null>(null);
  
  // Track completed rounds per exercise: { exerciseId: [1, 2, 3] }
  const [completedRounds, setCompletedRounds] = useState<Record<string, number[]>>({});
  const [showTimer, setShowTimer] = useState(false);
  const [timerDuration, setTimerDuration] = useState(90);
  const [hasUnsavedProgress, setHasUnsavedProgress] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  
  // Video carousel state
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  
  // Collect all videos from exercises
  const videosWithExercises = exercises
    .map((ex, index) => ({ exercise: ex, index, mediaUrl: ex.mediaUrl }))
    .filter(item => item.mediaUrl);
  
  // Extract YouTube ID from URL
  const getYouTubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };
  
  // Get YouTube thumbnail URL
  const getYouTubeThumbnail = (url: string) => {
    const videoId = getYouTubeId(url);
    return videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : null;
  };
  
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
  
  // Auto-save progress every time completedRounds changes
  useEffect(() => {
    if (username && trainingDay) {
      console.log("💾 Auto-saving circuit progress:", completedRounds);
      // Progress is already saved via markCircuitRound() in toggleNextRound()
      // This is just a safety backup in case of unmount
      
      // Check if there's any completed rounds (unsaved progress)
      const hasProgress = Object.values(completedRounds).some(rounds => rounds.length > 0);
      setHasUnsavedProgress(hasProgress && !isAllComplete());
    }
  }, [completedRounds, username, trainingDay]);
  
  // Removed native beforeunload prompt to avoid system popup on mobile
  
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
    
    // Clear unsaved progress flag since we're saving now
    setHasUnsavedProgress(false);
    
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
            onClick={() => {
              if (hasUnsavedProgress) {
                setShowLeaveConfirm(true);
              } else {
                navigate(-1);
              }
            }}
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
        <Card className="p-6 bg-black/5 border-0">
          <h2 className="text-3xl font-bold text-center mb-2 flex items-center justify-center gap-2">
            <Repeat className="w-7 h-7 text-primary" />
            {exercise.name}
          </h2>
          <p className="text-center text-foreground/70 text-lg">
            {totalRounds} rounds {exercises.length} exercises per round
          </p>
        </Card>
        
        {/* Video Carousel - All videos at the top */}
        {videosWithExercises.length > 0 && (
          <Card className="p-4 bg-black/5 border-0">
            <div className="relative">
              {/* Main Video Display */}
              <div className="w-full mb-3">
                <ExerciseMedia 
                  url={videosWithExercises[currentVideoIndex]?.mediaUrl || ""} 
                  alt={videosWithExercises[currentVideoIndex]?.exercise.name || ""}
                />
              </div>
              
              {/* Video Thumbnail Carousel */}
              {videosWithExercises.length > 1 && (
                <div className="relative">
                  <div 
                    ref={carouselRef}
                    className="flex gap-3 overflow-x-auto scrollbar-hide pb-2"
                    style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
                  >
                    {videosWithExercises.map((item, index) => {
                      const thumbnail = getYouTubeThumbnail(item.mediaUrl || "");
                      const isActive = index === currentVideoIndex;
                      
                      return (
                        <div
                          key={index}
                          onClick={() => setCurrentVideoIndex(index)}
                          className={`flex-shrink-0 w-32 h-20 rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                            isActive ? 'border-primary scale-105' : 'border-transparent opacity-70 hover:opacity-100'
                          }`}
                          style={{ scrollSnapAlign: 'start' }}
                        >
                          {thumbnail ? (
                            <div className="relative w-full h-full">
                              <img 
                                src={thumbnail} 
                                alt={item.exercise.name}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                <Play className="w-6 h-6 text-white" />
                              </div>
                              <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-1 truncate">
                                {item.exercise.name}
                              </div>
                            </div>
                          ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center">
                              <Play className="w-8 h-8 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Navigation Arrows */}
                  {videosWithExercises.length > 3 && (
                    <>
                      {currentVideoIndex > 0 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute left-0 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm rounded-full h-8 w-8"
                          onClick={() => {
                            const newIndex = Math.max(0, currentVideoIndex - 1);
                            setCurrentVideoIndex(newIndex);
                            carouselRef.current?.scrollTo({
                              left: newIndex * 140,
                              behavior: 'smooth'
                            });
                          }}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                      )}
                      {currentVideoIndex < videosWithExercises.length - 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm rounded-full h-8 w-8"
                          onClick={() => {
                            const newIndex = Math.min(videosWithExercises.length - 1, currentVideoIndex + 1);
                            setCurrentVideoIndex(newIndex);
                            carouselRef.current?.scrollTo({
                              left: newIndex * 140,
                              behavior: 'smooth'
                            });
                          }}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </Card>
        )}
        
        {/* Progress Display */}
        <div className="text-center space-y-2">
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
                
                // Build subtitle flags (kept for legacy; actual rendering below with icons)
                if (ex.reps) parts.push(`${ex.reps} reps`);
                if (ex.suggestedKg) parts.push(`${ex.suggestedKg}kg`);
                if (ex.durationMin) parts.push(`${ex.durationMin} min`);
                
                return (
                  <Card
                    key={ex.id}
                    className="p-6 border-0 cursor-pointer transition-all"
                    onClick={() => toggleNextRound(ex.id, ex.name)}
                  >
                    <div className="flex flex-col gap-4">
                      {/* Exercise header row: title + meta inline */}
                      <div className="w-full">
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <h3 className="text-2xl font-bold text-foreground truncate">{title}</h3>
                          <div className="flex items-center gap-4 text-muted-foreground whitespace-nowrap">
                              {ex.sets && ex.reps && (
                                <span className="text-4xl font-bold text-foreground">
                                  {ex.sets} × {ex.reps}
                                </span>
                              )}
                              {!ex.sets && ex.reps && (
                                <span className="text-4xl font-bold text-foreground">
                                  {ex.reps}
                                </span>
                              )}
                              {ex.suggestedKg && ex.suggestedKg > 0 && (
                              <span className="flex items-center gap-2 text-2xl sm:text-3xl font-bold text-foreground">
                                <Dumbbell className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
                                  <span className="font-extrabold text-primary">{ex.suggestedKg}kg</span>
                                </span>
                              )}
                            {!ex.sets && !ex.reps && ex.durationMin && (
                              <span className="flex items-center gap-2 text-2xl sm:text-3xl font-bold text-foreground">
                                <Clock className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
                                <span className="font-extrabold text-primary">
                                  {ex.durationMin < 1 ? `${Math.round(ex.durationMin * 60)} sec` : `${ex.durationMin} min`}
                                </span>
                              </span>
                            )}
                            {!ex.sets && !ex.reps && ex.targetDistanceKm && (
                              <span className="flex items-center gap-2 text-2xl sm:text-3xl font-bold text-foreground">
                                <Target className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
                                <span className="font-extrabold text-primary">
                                  {ex.targetDistanceKm < 1 ? `${Math.round(ex.targetDistanceKm * 1000)}m` : `${ex.targetDistanceKm}km`}
                                </span>
                              </span>
                            )}
                            </div>
                          </div>
                      </div>
                      
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
      {/* In-app leave confirmation dialog */}
      <Dialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Leave circuit?</DialogTitle>
            <DialogDescription className="text-white/70">
              You have unsaved circuit progress. Your progress is saved locally, but the circuit is not marked as complete.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button
              variant="ghost"
              className="w-full sm:w-auto border border-white/30 text-white hover:border-[#FFCC00]"
              onClick={() => setShowLeaveConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => navigate(-1)}
              className="w-full sm:w-auto"
              style={{ backgroundColor: "#FFCC00", color: "#000" }}
            >
              Leave
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
