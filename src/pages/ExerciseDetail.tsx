import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Timer } from "@/components/Timer";
import { RestTimer } from "@/components/RestTimer";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Loader2, List, Pencil, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Exercise } from "@/types/workout";
import { ExerciseMedia } from "@/components/ExerciseMedia";
import { HIITWorkout } from "./HIITWorkout";
import { CircuitWorkout } from "./CircuitWorkout";
import { CircuitWorkoutTimer } from "./CircuitWorkoutTimer";
import { AMRAPWorkout } from "./AMRAPWorkout";
import { SimulationWorkout } from "./SimulationWorkout";
import { triggerSuccessHaptic } from "@/utils/haptics";
import { FlameRating } from "@/components/FlameRating";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkoutSession } from "@/contexts/WorkoutSessionContext";
import { 
  markExerciseComplete,
  syncWorkoutLogToSupabase,
  checkPersonalBest 
} from "@/services/workoutCache";
import { supabase } from "@/utils/supabaseClient";

const ExerciseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { exercises: contextExercises, refresh: refreshDataContext } = useData(); // Get exercises and refresh from DataContext
  const { user: authUser } = useAuth();
  const { endWorkoutSession } = useWorkoutSession();
  
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exercise, setExercise] = useState<Exercise | null>(null);

  const [setWeights, setSetWeights] = useState<string[]>([]);
  const [setCompleted, setSetCompleted] = useState<boolean[]>([]); // Track completed sets
  const [todaysDistance, setTodaysDistance] = useState("");
  const [todaysDuration, setTodaysDuration] = useState("");
  const [rating, setRating] = useState(0); // 0-5 flame rating
  const [runStats, setRunStats] = useState<{ speed: number; pace: string; time: string; distance: string } | null>(null);
  
  // Save in-progress weights and completions to localStorage
  const saveInProgressData = useCallback((weights: string[], completed: boolean[]) => {
    if (!exercise) return;
    
    try {
      const userStr = localStorage.getItem("frank_rock_user");
      if (userStr) {
        const user = JSON.parse(userStr);
        const userKey = `currentTrainingDay_${user.username}`;
        const day = parseInt(localStorage.getItem(userKey) || "1");
        const cacheKey = `inProgressExercise_${user.username}_day${day}_${exercise.id}`;
        
        const data = {
          weights,
          completed,
          timestamp: Date.now()
        };
        
        localStorage.setItem(cacheKey, JSON.stringify(data));
        console.log('💾 Saved in-progress data:', data);
      }
    } catch (e) {
      console.error('Error saving in-progress data:', e);
    }
  }, [exercise]);
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [restDuration, setRestDuration] = useState(60);
  const [showWorkoutTimer, setShowWorkoutTimer] = useState(false);
  const [workoutDuration, setWorkoutDuration] = useState(0);
  const [currentSet, setCurrentSet] = useState(1); // Track current set for rehab
  const [rehabTimerActive, setRehabTimerActive] = useState(false);
  const [existingLogId, setExistingLogId] = useState<string | null>(null); // Track if exercise was already logged today
  
  // Edit mode for exercise plan
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState<string>("");
  const [editSets, setEditSets] = useState<number>(0);
  const [editReps, setEditReps] = useState<number>(0);
  const [editSuggestedKg, setEditSuggestedKg] = useState<number>(0);
  const [editDuration, setEditDuration] = useState<number>(0);
  const [editDistance, setEditDistance] = useState<number>(0);
  
  // Auto-save in-progress weights and completions whenever they change
  useEffect(() => {
    if (setWeights.length > 0 && setCompleted.length > 0 && exercise) {
      saveInProgressData(setWeights, setCompleted);
    }
  }, [setWeights, setCompleted, exercise, saveInProgressData]);
  
  // Swipe gesture detection
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  
  const minSwipeDistance = 50; // minimum distance for a swipe

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(0); // Reset
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe && currentIndex < exercises.length - 1) {
      handleNext();
    } else if (isRightSwipe && currentIndex > 0) {
      handlePrevious();
    }
  };

  useEffect(() => {
    const loadExercises = async () => {
      try {
        setLoading(true);
        
        // Wait for contextExercises to be loaded
        if (contextExercises.length === 0) {
          console.log('⏳ Waiting for exercises from DataContext...');
          setLoading(false);
          return;
        }
        
        // ONLY use exercises from DataContext (Supabase)
        const data = contextExercises;
        setExercises(data);
        
        console.log('📋 Loaded exercises from DataContext:', data.map(ex => ({ id: ex.id, name: ex.name })));
        console.log('🔍 Looking for exercise ID:', id);
        
        // Find exercise by ID
        if (id) {
          const index = data.findIndex(ex => ex.id === id);
          
          if (index >= 0) {
            // Found the exercise by ID
            setCurrentIndex(index);
            const ex = data[index];
            setExercise(ex);
          
            // Debug: Check if timer should show
            console.log("🔍 Exercise Debug:", {
              name: ex.name,
              type: ex.type,
              durationMin: ex.durationMin,
              willShowTimer: !!ex.durationMin && ex.durationMin > 0
            });
            
            // Reset rating and existing log ID for new exercise
            setRating(0);
            setExistingLogId(null);
            setEditMode(false);
            
            // Clear run/cardio specific data when navigating to new exercise
            setTodaysDistance("");
            setTodaysDuration("");
            setRunStats(null);
            setShowWorkoutTimer(false);
            
            // Initialize edit fields with current exercise data
            setEditName(ex.name || "");
            setEditSets(ex.sets || 0);
            setEditReps(ex.reps || 0);
            setEditSuggestedKg(ex.suggestedKg || 0);
            setEditDuration(ex.durationMin || 0);
            setEditDistance(ex.targetDistanceKm || 0);
            
            // Pre-populate fields based on exercise data
            if (ex.type === "weights" && ex.sets) {
              // Try to load in-progress data from localStorage first
              const userStr = localStorage.getItem("frank_rock_user");
              if (userStr) {
                const user = JSON.parse(userStr);
                const userKey = `currentTrainingDay_${user.username}`;
                const day = parseInt(localStorage.getItem(userKey) || "1");
                const cacheKey = `inProgressExercise_${user.username}_day${day}_${ex.id}`;
                const cached = localStorage.getItem(cacheKey);
                
                if (cached) {
                  try {
                    const { weights, completed, timestamp } = JSON.parse(cached);
                    const cacheAge = Date.now() - timestamp;
                    
                    // Use cached data if less than 24 hours old
                    if (cacheAge < 24 * 60 * 60 * 1000 && weights.length === ex.sets) {
                      console.log('💾 Restored in-progress data from cache:');
                      console.log('  - Weights:', weights);
                      console.log('  - Completed ticks:', completed);
                      setSetWeights(weights);
                      setSetCompleted(completed);
                    } else {
                      // Cache too old or sets count changed, use defaults
                      const initialWeights = Array(ex.sets).fill(ex.suggestedKg?.toString() || "");
                      setSetWeights(initialWeights);
                      setSetCompleted(Array(ex.sets).fill(false));
                    }
                  } catch (e) {
                    console.error('Error loading cached weights:', e);
                    const initialWeights = Array(ex.sets).fill(ex.suggestedKg?.toString() || "");
                    setSetWeights(initialWeights);
                    setSetCompleted(Array(ex.sets).fill(false));
                  }
                } else {
                  // No cache, use default suggested weight
                  const initialWeights = Array(ex.sets).fill(ex.suggestedKg?.toString() || "");
                  setSetWeights(initialWeights);
                  setSetCompleted(Array(ex.sets).fill(false));
                }
              } else {
                // No user, use defaults
                const initialWeights = Array(ex.sets).fill(ex.suggestedKg?.toString() || "");
                setSetWeights(initialWeights);
                setSetCompleted(Array(ex.sets).fill(false));
              }
            }
            if (ex.targetDistanceKm) {
              setTodaysDistance(ex.targetDistanceKm.toString());
            }
            if (ex.durationMin) {
              setTodaysDuration(ex.durationMin.toString());
            }
            
            // Check if this exercise was already logged today and pre-fill with that data
            try {
              const userStr = localStorage.getItem("frank_rock_user");
              if (userStr) {
                const user = JSON.parse(userStr);
                const storageKey = `workoutHistory_${user.username}`;
                const workoutHistory = localStorage.getItem(storageKey);
                
                if (workoutHistory) {
                  const logs = JSON.parse(workoutHistory);
                  const todayDate = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
                  
                  console.log('🔍 Checking for existing log:', {
                    exerciseName: ex.name,
                    todayDate,
                    totalLogs: logs.length,
                    todayLogs: logs.filter((log: any) => log.timestamp && log.timestamp.startsWith(todayDate)).map((log: any) => log.exerciseName)
                  });
                  
                  // Find today's log for this specific exercise (case-insensitive and trim whitespace)
                  const todayLog = logs.find((log: any) => 
                    log.exerciseName?.trim().toLowerCase() === ex.name.trim().toLowerCase() && 
                    log.timestamp && 
                    log.timestamp.startsWith(todayDate)
                  );
                  
                  if (todayLog) {
                    console.log('📝 Found existing log for today:', todayLog);
                    
                    // Store the log ID so we can update it instead of creating new
                    setExistingLogId(todayLog.id);
                    
                    // Pre-fill with existing data
                    if (ex.type === "weights" && todayLog.weights && Array.isArray(todayLog.weights)) {
                      setSetWeights(todayLog.weights.map((w: number) => w.toString()));
                      setSetCompleted(Array(todayLog.weights.length).fill(false)); // Allow re-editing
                    } else if (todayLog.weight) {
                      if (ex.sets) {
                        setSetWeights(Array(ex.sets).fill(todayLog.weight.toString()));
                      }
                    }
                    
                    if (todayLog.sets && todayLog.reps) {
                      // Sets/reps are read from exercise plan, but we could show a message
                      console.log('✓ Exercise already logged with', todayLog.sets, 'sets and', todayLog.reps, 'reps');
                    }
                    
                    if (todayLog.duration) {
                      setTodaysDuration(todayLog.duration.toString());
                    }
                    
                    if (todayLog.distance) {
                      setTodaysDistance(todayLog.distance.toString());
                    }
                    
                    if (todayLog.rating) {
                      setRating(todayLog.rating);
                    }
                    
                    toast.info("Exercise already logged today", {
                      description: "Update your data and click 'Update Log' to save changes"
                    });
                  } else {
                    // No existing log, clear the ID
                    setExistingLogId(null);
                  }
                }
              }
            } catch (error) {
              console.error("Error checking existing log:", error);
            }
          } else {
            // ID not found - redirect to today page
            console.warn("Exercise ID not found:", id, "- Redirecting to Today page");
            toast.error("Exercise not found", {
              description: "Redirecting to today's workout..."
            });
            navigate("/today");
            return;
          }
        } else {
          // No ID provided - use first non-intro exercise
          let foundIndex = 0;
          while (foundIndex < data.length && data[foundIndex].type === 'intro') {
            foundIndex++;
          }
          if (foundIndex < data.length) {
            setCurrentIndex(foundIndex);
            setExercise(data[foundIndex]);
          }
        }
      } catch (error) {
        console.error("Error loading exercise:", error);
        toast.error("Failed to load exercise");
      } finally {
        setLoading(false);
      }
    };

    loadExercises();
  }, [id, contextExercises]); // Reload when ID changes or when exercises are loaded from DataContext

  const handleMarkAsDone = async (customRating?: number) => {
    if (!exercise) return;

    // Trigger haptic feedback
    triggerSuccessHaptic();

    // Use customRating if provided (from flame click), otherwise use state
    const finalRating = customRating !== undefined ? customRating : rating;

    const data: any = {
      rating: finalRating > 0 ? finalRating : undefined, // Only send if rated (1-5)
    };

    if (exercise.type === "cardio" || exercise.type === "running") {
      // Cardio & Running exercises: both distance and duration
      // Convert distance: if target was < 1km, user entered meters, so convert to km for database
      let distanceKm: number | undefined;
      if (todaysDistance) {
        const isMeters = exercise.targetDistanceKm && exercise.targetDistanceKm < 1;
        distanceKm = isMeters ? parseFloat(todaysDistance) / 1000 : parseFloat(todaysDistance);
      }
      data.distance = distanceKm;
      data.duration = todaysDuration ? parseFloat(todaysDuration) : undefined;
    } else if (exercise.type === "mobility") {
      // Mobility exercises: duration only, no PB tracking
      data.duration = todaysDuration ? parseFloat(todaysDuration) : undefined;
    } else if (exercise.type === "weights") {
      // Send array of weights for each set
      data.weights = setWeights.map(w => w ? parseFloat(w) : 0);
      data.sets = exercise.sets;
      data.reps = exercise.reps;
    } else if (exercise.type === "bodyweight") {
      // Bodyweight exercises track sets and reps, but no weight
      data.sets = exercise.sets;
      data.reps = exercise.reps;
    }

    console.log('💾 Saving exercise data:', {
      exerciseName: exercise.name,
      exerciseType: exercise.type,
      data,
      todaysDuration,
      todaysDistance,
      existingLogId
    });

    // Check if we have any meaningful data to save (not just undefined rating)
    const hasData = Object.values(data).some(value => value !== undefined && value !== null);
    if (!hasData) {
      toast.warning("No data to save", {
        description: "Please enter duration, distance, or weight data before completing",
        duration: 3000,
      });
      return;
    }

    // If this exercise was already logged today, UPDATE the existing log
    if (existingLogId) {
      try {
        const userStr = localStorage.getItem("frank_rock_user");
        if (userStr) {
          const user = JSON.parse(userStr);
          const storageKey = `workoutHistory_${user.username}`;
          const workoutHistory = localStorage.getItem(storageKey);
          
          if (workoutHistory) {
            const logs = JSON.parse(workoutHistory);
            const logIndex = logs.findIndex((log: any) => log.id === existingLogId);
            
            if (logIndex >= 0) {
              // Update the existing log
              logs[logIndex] = {
                ...logs[logIndex],
                ...data,
                timestamp: new Date().toLocaleString("en-GB", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              };
              
              localStorage.setItem(storageKey, JSON.stringify(logs));
              
              toast.success("✓ Exercise updated!", {
                description: "Your workout data has been saved",
                duration: 2000,
              });
              
              // Navigate back (don't end session - user might do more exercises)
              navigate("/today");
              return;
            }
          }
        }
      } catch (error) {
        console.error("Error updating log:", error);
        toast.error("Failed to update exercise");
        return;
      }
    }

    // 🆕 HYBRID CACHING ONLY: Save to localStorage + Supabase (no Google Sheets)
    let isPB = false;
    let oldPB: number | undefined;
    let newPB: number | undefined;
    
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
      
      // Save to localStorage immediately (hybrid cache layer)
      const storageKey = `workoutHistory_${username}`;
      const existingLogs = localStorage.getItem(storageKey);
      const logs = existingLogs ? JSON.parse(existingLogs) : [];
      
      const timestamp = new Date().toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      
      // Mark exercise as complete in cache
      markExerciseComplete(username, trainingDay, exercise.id, authUser?.clientId);
      
      // Clear in-progress data since exercise is now complete
      const cacheKey = `inProgressExercise_${username}_day${trainingDay}_${exercise.id}`;
      localStorage.removeItem(cacheKey);
      console.log('🧹 Cleared in-progress data for completed exercise');
      
      // Check for Personal Best and sync to Supabase if logged in
      if (authUser?.clientId) {
        const pbResult = await checkPersonalBest(
          authUser.clientId,
          exercise.name,
          {
            weight: data.weight,
            weights: data.weights,
            duration: data.duration,
            distance: data.distance,
          }
        );
        
        isPB = pbResult.isPB;
        oldPB = pbResult.oldPB;
        newPB = pbResult.newPB;
        
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
            weight: data.weight,
            weights: data.weights,
            sets: data.sets,
            reps: data.reps,
            duration: data.duration,
            distance: data.distance,
            rating: data.rating,
            isPB,
          }
        );
        
        console.log("✅ Exercise synced to Supabase with PB check");
      }
      
      // Save to localStorage
      logs.unshift({
        id: Date.now().toString(),
        username,
        exerciseName: exercise.name,
        timestamp,
        ...data,
        isPB,
      });
      
      if (logs.length > 100) logs.splice(100);
      localStorage.setItem(storageKey, JSON.stringify(logs));
      
    } catch (error) {
      console.error("Error saving exercise:", error);
      toast.error("Failed to save exercise");
      return;
    }
    
    // Show PB celebration if applicable
    if (isPB) {
      const message = oldPB && newPB
        ? `${oldPB}kg → ${newPB}kg! You crushed it!`
        : `${newPB}kg - First time! 🎉`;
      
      toast.success("🏆 NEW PERSONAL BEST!", {
        description: message,
        duration: 3000,
      });
    }
    
    // Navigate to next exercise or back to home
    if (currentIndex < exercises.length - 1) {
      const nextExercise = exercises[currentIndex + 1];
      if (!isPB) {
        toast.success("✅ Exercise completed!", {
          description: `Moving to: ${nextExercise.name}`,
        });
      }
      setTimeout(() => {
        navigate(`/exercise/${nextExercise.id}`);
      }, isPB ? 2000 : 500); // Longer delay for PB celebration
    } else {
      // Mark the training day as complete
      const userStr = localStorage.getItem("frank_rock_user");
      if (userStr) {
        const user = JSON.parse(userStr);
        const trainingDay = parseInt(localStorage.getItem(`currentTrainingDay_${user.username}`) || "1");
        const completedDaysKey = `completedDays_${user.username}`;
        const completedDaysStr = localStorage.getItem(completedDaysKey);
        const completedDays = completedDaysStr ? JSON.parse(completedDaysStr) : [];
        
        if (!completedDays.includes(trainingDay)) {
          completedDays.push(trainingDay);
          localStorage.setItem(completedDaysKey, JSON.stringify(completedDays));
        }
      }
      
      if (!isPB) {
        toast.success("🎉 All exercises complete!", {
          description: "Great workout! Returning to overview...",
        });
      } else {
        toast.success("🎉 Workout complete + NEW PB!", {
          description: "Amazing session! Returning to overview...",
        });
      }
      setTimeout(() => {
        endWorkoutSession(); // End session when all exercises complete
        navigate("/");
      }, isPB ? 2500 : 1000);
    }
  };

  const handleRestTimer = (seconds: number) => {
    setRestDuration(seconds);
    setShowRestTimer(true);
  };

  const handleStartWorkout = () => {
    // Use todaysDuration if user has entered a value, otherwise fallback to exercise.durationMin
    const durationToUse = todaysDuration ? parseFloat(todaysDuration) : exercise?.durationMin;
    if (durationToUse && durationToUse > 0) {
      setWorkoutDuration(durationToUse * 60); // Convert minutes to seconds
      setShowWorkoutTimer(true);
    } else {
      toast.error("Please set a duration", {
        description: "Enter a duration in minutes before starting"
      });
    }
  };

  const handleStartRehabTimer = () => {
    const durationToUse = exercise?.durationMin;
    if (durationToUse) {
      setWorkoutDuration(durationToUse * 60); // Convert minutes to seconds
      setShowWorkoutTimer(true);
    }
  };

  const handlePrevious = () => {
    // Find current index based on the exercise ID to ensure it's up to date
    const currentIdx = exercises.findIndex(ex => ex.id === id);
    if (currentIdx === -1) return;
    
    let prevIndex = currentIdx - 1;
    // Skip intro exercises
    while (prevIndex >= 0 && exercises[prevIndex].type === 'intro') {
      prevIndex--;
    }
    if (prevIndex >= 0) {
      const prevExercise = exercises[prevIndex];
      navigate(`/exercise/${prevExercise.id}`);
    }
  };

  const handleNext = () => {
    // Find current index based on the exercise ID to ensure it's up to date
    const currentIdx = exercises.findIndex(ex => ex.id === id);
    if (currentIdx === -1) return;
    
    let nextIndex = currentIdx + 1;
    // Skip intro exercises
    while (nextIndex < exercises.length && exercises[nextIndex].type === 'intro') {
      nextIndex++;
    }
    if (nextIndex < exercises.length) {
      const nextExercise = exercises[nextIndex];
      navigate(`/exercise/${nextExercise.id}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!exercise) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Exercise not found</p>
          <Button onClick={() => navigate("/")}>Back to Home</Button>
        </div>
      </div>
    );
  }

  // Handle completion for grouped workouts
  const handleGroupedWorkoutComplete = async () => {
    // Mark exercise as completed
    const userStr = localStorage.getItem("frank_rock_user");
    if (userStr) {
      const user = JSON.parse(userStr);
      const completedKey = `completedExercises_${user.username}`;
      const today = new Date().toLocaleDateString("en-CA");
      const completedData = JSON.parse(localStorage.getItem(completedKey) || "{}");
      
      if (!completedData[today]) {
        completedData[today] = [];
      }
      
      if (!completedData[today].includes(exercise.id)) {
        completedData[today].push(exercise.id);
      }
      
      localStorage.setItem(completedKey, JSON.stringify(completedData));
    }
    
    // Navigate to next exercise or home
    if (currentIndex < exercises.length - 1) {
      const nextExercise = exercises[currentIndex + 1];
      navigate(`/exercise/${nextExercise.id}`);
      toast.success("✅ Moving to next exercise!");
    } else {
      endWorkoutSession(); // End session when all exercises complete
      navigate("/");
      toast.success("🎉 All exercises complete!");
    }
  };

  // Route to specialized workout screens for grouped workouts
  if (exercise.type === "hiit") {
    return <HIITWorkout exercise={exercise} onComplete={handleGroupedWorkoutComplete} />;
  }

  if (exercise.type === "circuit") {
    // Use timer-based circuit if work/rest times are defined
    // Check if timings exist (accept 0, null, or any number)
    const workSec = (exercise as any).work_sec;
    const restSec = (exercise as any).rest_sec;
    const hasTimings = exercise.workRestRatio || (
      workSec != null && restSec != null // != null checks for both null and undefined
    );
    
    console.log('🏋️ Circuit workout routing:', {
      CIRCUIT_ID: exercise.id,
      hasTimings,
      workRestRatio: exercise.workRestRatio,
      work_sec: (exercise as any).work_sec,
      rest_sec: (exercise as any).rest_sec,
      totalRounds: exercise.totalRounds,
      exercise_count: exercise.exercises?.length,
      exerciseData: exercise
    });
    
    if (hasTimings) {
      console.log('✅ Using TIMER-BASED circuit');
      return <CircuitWorkoutTimer exercise={exercise} onComplete={handleGroupedWorkoutComplete} />;
    }
    console.log('⚠️ Using MANUAL circuit (no timings found)');
    return <CircuitWorkout exercise={exercise} onComplete={handleGroupedWorkoutComplete} />;
  }

  if (exercise.type === "amrap") {
    return <AMRAPWorkout exercise={exercise} onComplete={handleGroupedWorkoutComplete} />;
  }

  if (exercise.type === "simulation") {
    console.log('🏃 Simulation workout routing:', {
      SIMULATION_ID: exercise.id,
      name: exercise.name,
      station_count: exercise.exercises?.length,
    });
    return <SimulationWorkout exercise={exercise} onComplete={handleGroupedWorkoutComplete} />;
  }

  return (
    <div 
      className="min-h-screen bg-background"
      style={{ touchAction: 'pan-y', paddingTop: 0 }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="container max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-2">
            {/* Back button - Left */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                endWorkoutSession();
                navigate("/today");
              }}
              className="h-12 w-12 sm:h-14 sm:w-14 p-0 [&_svg]:!w-6 [&_svg]:!h-6 sm:[&_svg]:!w-8 sm:[&_svg]:!h-8 flex-shrink-0"
              title="Back to today's exercises"
            >
              <List strokeWidth={3} />
            </Button>

            {/* Navigation arrows - Right */}
            <div className="flex items-center gap-2">
              {/* Previous Exercise Arrow */}
              {(() => {
                const currentIdx = exercises.findIndex(ex => ex.id === id);
                return currentIdx > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevious}
                    className="h-12 w-12 sm:h-14 sm:w-14 p-0 flex-shrink-0"
                    title="Previous exercise"
                  >
                    <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8" strokeWidth={3} />
                  </Button>
                );
              })()}

              {/* Next Exercise Arrow */}
              {(() => {
                const currentIdx = exercises.findIndex(ex => ex.id === id);
                return currentIdx >= 0 && currentIdx < exercises.length - 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNext}
                    className="h-12 w-12 sm:h-14 sm:w-14 p-0 flex-shrink-0"
                    title="Next exercise"
                  >
                    <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8" strokeWidth={3} />
                  </Button>
                );
              })()}
            </div>
          </div>
        </div>
      </header>

      <main className="container max-w-2xl mx-auto px-2 sm:px-4 pt-20 pb-24 space-y-4 sm:space-y-6">
        {/* Static Header: Exercise Title + Notes + Media - Always visible for ALL exercise types */}
        <div className="space-y-4">
          {/* Exercise Title with Border */}
          <Card className="p-6 border-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <h2 className="text-4xl font-bold text-foreground text-center flex-1">
                {exercise.name}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setEditMode(!editMode)}
                className="ml-2"
              >
                {editMode ? "×" : <Pencil className="w-4 h-4" />}
              </Button>
            </div>
          </Card>
          
          {/* Edit Exercise Plan */}
          {editMode && (
            <Card className="p-6 bg-secondary/10 border-2 border-yellow-500">
              <div className="space-y-6">
                {/* Exercise Name */}
                <div>
                  <Label className="text-3xl font-bold mb-3 block">Exercise Name</Label>
                  <Input
                    type="text"
                    value={editName || ""}
                    onChange={(e) => setEditName(e.target.value)}
                    className="text-3xl h-16 text-center font-bold"
                    placeholder="Enter exercise name"
                  />
                </div>
                
                {(exercise.type === "weights" || exercise.type === "bodyweight") && (
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <Label className="text-3xl font-bold mb-3 block">Sets</Label>
                      <Input
                        type="number"
                        value={editSets || ""}
                        onChange={(e) => setEditSets(parseInt(e.target.value) || 0)}
                        className="text-5xl h-20 text-center font-bold"
                      />
                    </div>
                    <div>
                      <Label className="text-3xl font-bold mb-3 block">Reps</Label>
                      <Input
                        type="number"
                        value={editReps || ""}
                        onChange={(e) => setEditReps(parseInt(e.target.value) || 0)}
                        className="text-5xl h-20 text-center font-bold"
                      />
                    </div>
                  </div>
                )}
                {exercise.type === "weights" && (
                  <div>
                    <Label className="text-3xl font-bold mb-3 block">Suggested Weight (kg)</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={editSuggestedKg || ""}
                      onChange={(e) => setEditSuggestedKg(parseFloat(e.target.value) || 0)}
                      className="text-5xl h-20 text-center font-bold"
                    />
                  </div>
                )}
                {(exercise.type === "cardio" || exercise.type === "running" || exercise.type === "mobility") && (
                  <div>
                    <Label className="text-3xl font-bold mb-3 block">Duration (min)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={editDuration || ""}
                      onChange={(e) => setEditDuration(parseFloat(e.target.value) || 0)}
                      className="text-5xl h-20 text-center font-bold"
                    />
                    <p className="text-sm text-muted-foreground text-center mt-2">
                      e.g., 0.5 min = 30 seconds
                    </p>
                  </div>
                )}
                {(exercise.type === "running" || exercise.type === "cardio") && (
                  <div>
                    <Label className="text-3xl font-bold mb-3 block">Target Distance (km)</Label>
                    <Input
                      type="number"
                      step="0.001"
                      value={editDistance || ""}
                      onChange={(e) => setEditDistance(parseFloat(e.target.value) || 0)}
                      className="text-5xl h-20 text-center font-bold"
                      placeholder="e.g., 0.5 = 500m, 5.0 = 5km"
                    />
                    <p className="text-sm text-muted-foreground text-center mt-2">
                      Use 0.5 for 500m, 1.0 for 1km, etc.
                    </p>
                  </div>
                )}
                <Button
                  onClick={async () => {
                    // Save changes to Supabase
                    if (exercise) {
                      try {
                        const { supabase } = await import("@/utils/supabaseClient");
                        
                        // Prepare the updated extra data (use correct field names that match loading logic)
                        const extra: any = {};
                        
                        if (exercise.type === "weights" || exercise.type === "bodyweight") {
                          if (editSets) extra.sets = editSets;
                          if (editReps) extra.reps = editReps;
                        }
                        
                        if (exercise.type === "weights" && editSuggestedKg && editSuggestedKg > 0) {
                          extra.weight = editSuggestedKg; // Store as number only, no "kg" suffix
                        }
                        
                        if ((exercise.type === "cardio" || exercise.type === "running" || exercise.type === "mobility") && editDuration) {
                          extra.duration = editDuration; // Changed from duration_min to duration
                        }
                        
                        if ((exercise.type === "running" || exercise.type === "cardio") && editDistance) {
                          extra.distance = editDistance; // Changed from distance_km to distance
                        }
                        
                        // Store custom name in extra field (if changed)
                        if (editName && editName !== exercise.name) {
                          extra.custom_name = editName;
                        }
                        
                        // Update in Supabase
                        console.log('💾 Saving to Supabase:', {
                          exercise_id: exercise.id,
                          old_name: exercise.name,
                          new_name: editName,
                          extra
                        });
                        
                        const { error } = await supabase
                          .from('session_block_items')
                          .update({ extra })
                          .eq('id', exercise.id);
                        
                        if (error) throw error;
                        
                        console.log('✅ Saved successfully to Supabase');
                        
                        // Preserve current weights if user has already entered them
                        const hasEnteredWeights = setWeights.some(w => w && w !== "" && parseFloat(w) !== (exercise.suggestedKg || 0));
                        
                        // Update local state with new values (use editX values when they're not 0/null)
                        const updatedExercise = {
                          ...exercise,
                          name: editName || exercise.name,
                          sets: editSets !== 0 ? editSets : exercise.sets,
                          reps: editReps !== 0 ? editReps : exercise.reps,
                          suggestedKg: editSuggestedKg !== 0 ? editSuggestedKg : exercise.suggestedKg,
                          durationMin: editDuration !== 0 ? editDuration : exercise.durationMin,
                          targetDistanceKm: editDistance !== 0 ? editDistance : exercise.targetDistanceKm,
                        };
                        setExercise(updatedExercise);
                        
                        // Also update the exercises array to persist changes
                        const updatedExercises = exercises.map(ex => 
                          ex.id === exercise.id ? updatedExercise : ex
                        );
                        setExercises(updatedExercises);
                        
                        // Update weight inputs based on what changed
                        if (updatedExercise.type === "weights" && updatedExercise.sets) {
                          const newSetsCount = updatedExercise.sets;
                          const oldSetsCount = setWeights.length;
                          const weightChanged = editSuggestedKg !== 0 && editSuggestedKg !== exercise.suggestedKg;
                          const setsChanged = newSetsCount !== oldSetsCount;
                          
                          // If suggested weight changed, update ALL sets with new default (even if user entered weights)
                          if (weightChanged) {
                            console.log('🔄 Suggested weight changed, updating all sets:', { old: exercise.suggestedKg, new: editSuggestedKg });
                            const newWeights = Array(newSetsCount).fill(updatedExercise.suggestedKg?.toString() || "");
                            const newCompleted = Array(newSetsCount).fill(false);
                            setSetWeights(newWeights);
                            setSetCompleted(newCompleted);
                          } 
                          // If only sets count changed (not weight), preserve existing weights where possible
                          else if (setsChanged) {
                            console.log('🔄 Sets count changed, adjusting array:', { old: oldSetsCount, new: newSetsCount });
                            const newWeights = Array(newSetsCount).fill("").map((_, idx) => 
                              idx < oldSetsCount ? setWeights[idx] : (updatedExercise.suggestedKg?.toString() || "")
                            );
                            const newCompleted = Array(newSetsCount).fill(false).map((_, idx) =>
                              idx < oldSetsCount ? setCompleted[idx] : false
                            );
                            setSetWeights(newWeights);
                            setSetCompleted(newCompleted);
                          }
                          // If nothing changed and user has weights, keep them
                          else if (hasEnteredWeights) {
                            console.log('✅ Keeping user-entered weights');
                          }
                        }
                        
                        setEditMode(false);
                        
                        console.log('✅ Exercise updated:', {
                          id: exercise.id,
                          name: updatedExercise.name,
                          sets: updatedExercise.sets,
                          reps: updatedExercise.reps,
                          suggestedKg: updatedExercise.suggestedKg,
                          durationMin: updatedExercise.durationMin,
                          targetDistanceKm: updatedExercise.targetDistanceKm,
                          weightsPreserved: hasEnteredWeights
                        });
                        
                        // Refresh DataContext to reload all exercises with updated values
                        console.log("🔄 Refreshing DataContext after save...");
                        await refreshDataContext();
                        
                        toast.success("Exercise updated!", {
                          description: editName !== exercise.name 
                            ? `${editName} - ${updatedExercise.sets}×${updatedExercise.reps}` 
                            : `${updatedExercise.sets}×${updatedExercise.reps} @ ${updatedExercise.suggestedKg}kg`
                        });
                        
                        setEditMode(false); // Close edit modal after successful save
                      } catch (error) {
                        console.error("Error saving exercise:", error);
                        toast.error("Failed to save changes", {
                          description: error instanceof Error ? error.message : "Please try again"
                        });
                      }
                    }
                  }}
                  className="w-full h-20 text-3xl font-bold"
                  style={{ backgroundColor: '#FFCC00', color: '#000' }}
                >
                  Save Changes
                </Button>
              </div>
            </Card>
          )}
          
          {/* Media & Notes */}
          {(exercise.notes || exercise.mediaUrl) && (
            <div className="text-center">
              {/* Media from mediaUrl field */}
              {exercise.mediaUrl && (
                <div className="mb-4 max-w-full">
                  <ExerciseMedia url={exercise.mediaUrl} alt={`${exercise.name} demonstration`} />
                </div>
              )}
              
              {/* Notes - check if it's a URL or text */}
              {exercise.notes && (() => {
                const trimmedNotes = exercise.notes.trim();
                const isUrl = trimmedNotes.startsWith('http://') || trimmedNotes.startsWith('https://');
                const isMediaUrl = isUrl && (
                  trimmedNotes.match(/\.(jpg|jpeg|png|gif|webp|mp4|webm|ogg|youtube\.com|youtu\.be)/i) ||
                  trimmedNotes.includes('youtube.com') || trimmedNotes.includes('youtu.be')
                );
                
                if (isMediaUrl) {
                  return (
                    <div className="max-w-full">
                      <ExerciseMedia url={trimmedNotes} alt={`${exercise.name} demonstration`} />
                    </div>
                  );
                } else {
                  return (
                    <p className="text-base text-foreground whitespace-pre-wrap text-center">{exercise.notes}</p>
                  );
                }
              })()}
            </div>
          )}
        </div>

        {/* Target Card - Hide for cardio/running (shown in timer section), hide when timer running for mobility */}
        {exercise.type !== "cardio" && exercise.type !== "running" && !(exercise.type === "mobility" && showWorkoutTimer) && (
        <Card className="p-6 bg-secondary/10 border-secondary">
          <div className="text-center">
            {/* Hide "Target" label for mobility exercises */}
            {exercise.type !== "mobility" && (
              <p className="text-sm text-muted-foreground mb-2">Target</p>
            )}
            {exercise.type === "mobility" ? (
              <>
                <Label htmlFor="mobility-duration" className="text-xl font-bold block text-center mb-4">Duration (minutes)</Label>
                <p className="text-sm text-muted-foreground text-center mb-2">0.5 min = 30 seconds</p>
                <div className="flex items-center justify-center gap-3">
                  <Button
                    type="button"
                    onClick={() => setTodaysDuration((prev) => Math.max(0.5, parseFloat(prev || exercise.durationMin?.toString() || "0.5") - 0.5).toFixed(1))}
                    className="h-32 w-24 text-5xl font-bold bg-yellow-500 hover:bg-yellow-600 text-black"
                    variant="default"
                  >
                    −
                  </Button>
                  <Input
                    id="mobility-duration"
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*\.?[0-9]*"
                    value={todaysDuration || exercise.durationMin?.toString() || ""}
                    onChange={(e) => {
                      // Allow only numbers and one decimal point
                      const value = e.target.value;
                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                        setTodaysDuration(value);
                      }
                    }}
                    onBlur={(e) => {
                      // Clean up on blur - ensure it's a valid number
                      const num = parseFloat(e.target.value);
                      if (!isNaN(num) && num >= 0) {
                        setTodaysDuration(num.toFixed(1));
                      } else {
                        setTodaysDuration(exercise.durationMin?.toString() || "0.5");
                      }
                    }}
                    className="text-center text-6xl h-32 border-2 font-bold flex-1"
                    placeholder={exercise.durationMin?.toString() || "8"}
                  />
                  <Button
                    type="button"
                    onClick={() => setTodaysDuration((prev) => (parseFloat(prev || exercise.durationMin?.toString() || "0") + 0.5).toFixed(1))}
                    className="h-32 w-24 text-5xl font-bold bg-yellow-500 hover:bg-yellow-600 text-black"
                    variant="default"
                  >
                    +
                  </Button>
                </div>
              </>
            ) : exercise.type === "rehab" ? (
              <>
                {exercise.sets ? (
                  <>
                    {/* Show sets × reps if reps exist, otherwise sets × Sets */}
                    <p className="text-7xl font-bold text-foreground mb-4">
                      {exercise.reps ? `${exercise.sets} × ${exercise.reps}` : `${exercise.sets} × Sets`}
                    </p>
                    {exercise.durationMin && (
                      <p className="text-2xl text-blue-400 font-semibold mb-2">
                        {exercise.durationMin} min per set
                      </p>
                    )}
                    {exercise.suggestedKg && exercise.suggestedKg > 0 && (
                      <p className="text-xl text-secondary font-semibold">
                        Weight: {exercise.suggestedKg}kg
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    {/* Simple duration display for rehab without sets */}
                    <p className="text-7xl font-bold text-foreground mb-4">
                      {exercise.durationMin} min
                    </p>
                    <p className="text-xl text-blue-400 font-medium">
                      Rehab Exercise
                    </p>
                  </>
                )}
              </>
            ) : (
              <>
                <p className="text-7xl font-bold text-foreground mb-4">
                  {exercise.sets} × {exercise.reps}
                </p>
                {exercise.type === "weights" && exercise.suggestedKg && exercise.suggestedKg > 0 && (
                  <p className="text-2xl text-secondary font-semibold">
                    Suggested: {exercise.suggestedKg}kg
                  </p>
                )}
                {exercise.type === "bodyweight" && (
                  <p className="text-xl text-muted-foreground font-medium">
                    Bodyweight Exercise
                  </p>
                )}
              </>
            )}
          </div>
        </Card>
        )}

        {/* Workout Countdown Timer (for mobility exercises only - right after Duration card) */}
        {exercise.type === "mobility" && (
          <>
            {showWorkoutTimer ? (
              <>
                <div className="overflow-hidden rounded-xl border-2 border-primary">
                  <Timer
                      mode="countdown"
                      initialSeconds={workoutDuration}
                      autoStart={true}
                      onComplete={() => {
                        const completedDuration = Math.round(workoutDuration / 60);
                        setTodaysDuration(completedDuration.toString());
                        setShowWorkoutTimer(false);
                        
                        // Show completion message and let user rate
                        toast.success("🎉 Countdown Complete!", {
                          description: "Tap a flame below to rate and continue",
                          duration: 4000,
                        });
                        
                        // Scroll to rating section after brief delay
                        setTimeout(() => {
                          const ratingElement = document.querySelector('.rating-section');
                          if (ratingElement) {
                            ratingElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }
                        }, 500);
                      }}
                    />
                </div>
                <div className="flex justify-center mt-4">
                  <Button
                    variant="ghost"
                    onClick={() => setShowWorkoutTimer(false)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Cancel Workout
                  </Button>
                </div>
              </>
            ) : (
              <Button
                size="lg"
                onClick={handleStartWorkout}
                className="h-24 px-16 text-3xl font-bold w-full"
                style={{ backgroundColor: '#FFCC00', color: '#000' }}
              >
                START COUNTDOWN
              </Button>
            )}
          </>
        )}
        
        {/* Running & Cardio (ERG) Exercises */}
        {(exercise.type === "running" || exercise.type === "cardio") && (
          <>
            {/* DISTANCE-BASED: Use stopwatch to record time */}
            {exercise.targetDistanceKm && exercise.targetDistanceKm > 0 ? (
              <>
                <Card className="p-6 bg-primary/10 border-primary mb-4">
                  <p className="text-center text-2xl font-bold">
                    Target: <span className="text-primary">{exercise.targetDistanceKm < 1 ? `${(exercise.targetDistanceKm * 1000).toFixed(0)}m` : `${exercise.targetDistanceKm}km`}</span>
                  </p>
                </Card>
                
                {showWorkoutTimer ? (
                  <>
                    <div className="overflow-hidden rounded-xl border-2 border-primary">
                      <Timer
                        mode="stopwatch"
                        initialSeconds={0}
                        autoStart={true}
                        onComplete={() => {}}
                      />
                    </div>
                    <div className="flex justify-center gap-4 mt-4">
                      <Button
                        size="lg"
                        onClick={() => {
                          // Get elapsed time from timer
                          const timerElement = document.querySelector('[data-timer-elapsed]');
                          const elapsedSeconds = timerElement ? parseInt(timerElement.getAttribute('data-timer-elapsed') || '0') : 0;
                          const elapsedMinutes = (elapsedSeconds / 60).toFixed(2);
                          const elapsedHours = elapsedSeconds / 3600;
                          
                          // Set distance: if target < 1km, store in meters; otherwise in km
                          const targetKm = exercise.targetDistanceKm || 0;
                          const isMeters = targetKm < 1;
                          const distanceValue = isMeters ? (targetKm * 1000).toFixed(0) : targetKm.toString();
                          
                          // Calculate speed (km/h) and pace (min/km)
                          const avgSpeed = targetKm / elapsedHours; // km/h
                          const paceMinPerKm = elapsedSeconds / 60 / targetKm; // min/km
                          const paceMin = Math.floor(paceMinPerKm);
                          const paceSec = Math.round((paceMinPerKm - paceMin) * 60);
                          const paceString = `${paceMin}:${paceSec.toString().padStart(2, '0')}`;
                          
                          setTodaysDuration(elapsedMinutes);
                          setTodaysDistance(distanceValue);
                          setShowWorkoutTimer(false);
                          
                          // Store stats to display on page
                          const distanceDisplay = isMeters ? `${Math.round(targetKm * 1000)}m` : `${targetKm}km`;
                          const mins = Math.floor(elapsedSeconds / 60);
                          const secs = elapsedSeconds % 60;
                          const timeString = `${mins}:${secs.toString().padStart(2, '0')}`;
                          
                          setRunStats({
                            speed: parseFloat(avgSpeed.toFixed(1)),
                            pace: paceString,
                            time: timeString,
                            distance: distanceDisplay
                          });
                          
                          // Scroll to stats section
                          setTimeout(() => {
                            const statsElement = document.querySelector('.run-stats');
                            if (statsElement) {
                              statsElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }
                          }, 500);
                        }}
                        className="h-16 px-12 text-2xl font-bold flex-1"
                        style={{ backgroundColor: '#22c55e', color: '#fff' }}
                      >
                        STOP & SAVE
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => setShowWorkoutTimer(false)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        Cancel
                      </Button>
                    </div>
                  </>
                ) : (
                  <Button
                    size="lg"
                    onClick={() => setShowWorkoutTimer(true)} // Just start the stopwatch, no duration needed!
                    className="h-24 px-16 text-3xl font-bold w-full"
                    style={{ backgroundColor: '#FFCC00', color: '#000' }}
                  >
                    START RECORDING
                  </Button>
                )}
              </>
            ) : exercise.durationMin && exercise.durationMin > 0 ? (
              /* DURATION-BASED: Use countdown timer, record distance achieved */
              <>
                <Card className="p-6 bg-primary/10 border-primary mb-4">
                  <p className="text-center text-2xl font-bold">
                    Duration: <span className="text-primary">{exercise.durationMin} min</span>
                  </p>
                </Card>
                
                {showWorkoutTimer ? (
                  <>
                    <div className="overflow-hidden rounded-xl border-2 border-primary">
                      <Timer
                        mode="countdown"
                        initialSeconds={workoutDuration}
                        autoStart={true}
                        onComplete={() => {
                          const completedDuration = Math.round(workoutDuration / 60);
                          setTodaysDuration(completedDuration.toString());
                          setShowWorkoutTimer(false);
                          
                          toast.success("🎉 Time Complete!", {
                            description: "Enter distance achieved below",
                            duration: 4000,
                          });
                          
                          // Scroll to distance input
                          setTimeout(() => {
                            const distanceInput = document.querySelector('#distance');
                            if (distanceInput) {
                              distanceInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }
                          }, 500);
                        }}
                      />
                    </div>
                    <div className="flex justify-center mt-4">
                      <Button
                        variant="ghost"
                        onClick={() => setShowWorkoutTimer(false)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        Cancel
                      </Button>
                    </div>
                  </>
                ) : (
                  <Button
                    size="lg"
                    onClick={handleStartWorkout}
                    className="h-24 px-16 text-3xl font-bold w-full"
                    style={{ backgroundColor: '#FFCC00', color: '#000' }}
                  >
                    START COUNTDOWN
                  </Button>
                )}
              </>
            ) : null}
          </>
        )}
        
        {/* Run Stats Display - Show after timer completes */}
        {runStats && (exercise.type === "running" || exercise.type === "cardio") && (
          <Card className="p-6 bg-gradient-to-r from-green-500/10 to-blue-500/10 border-green-500/30 run-stats">
            <h3 className="text-2xl font-bold text-center mb-4 text-green-400">
              🏃 Run Complete!
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-background/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Distance</p>
                <p className="text-3xl font-bold text-foreground">{runStats.distance}</p>
              </div>
              <div className="text-center p-4 bg-background/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Time</p>
                <p className="text-3xl font-bold text-foreground">{runStats.time}</p>
              </div>
              <div className="text-center p-4 bg-background/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Avg Speed</p>
                <p className="text-3xl font-bold text-primary">{runStats.speed} km/h</p>
              </div>
              <div className="text-center p-4 bg-background/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Pace</p>
                <p className="text-3xl font-bold text-primary">{runStats.pace} /km</p>
              </div>
            </div>
          </Card>
        )}
        
        {/* Simple Timer for Rehab Exercises without sets */}
        {exercise.type === "rehab" && !exercise.sets && exercise.durationMin && exercise.durationMin > 0 && (
          <>
            {showWorkoutTimer ? (
              <>
                <div className="overflow-hidden rounded-xl border-2 border-blue-500">
                  <Timer
                    mode="countdown"
                    initialSeconds={(exercise.durationMin || 1) * 60}
                    autoStart={true}
                    onComplete={() => {
                      const completedDuration = Math.round((exercise.durationMin || 1));
                      toast.success("🎉 Rehab Complete!", {
                        description: `${completedDuration} minutes completed!`,
                        duration: 3000,
                      });
                      setTodaysDuration(completedDuration.toString());
                      setShowWorkoutTimer(false);
                    }}
                  />
                </div>
                <div className="flex justify-center mt-4">
                  <Button
                    variant="ghost"
                    onClick={() => setShowWorkoutTimer(false)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Cancel Workout
                  </Button>
                </div>
              </>
            ) : (
              <Button
                size="lg"
                onClick={handleStartRehabTimer}
                className="h-24 px-16 text-3xl font-bold w-full bg-blue-500 hover:bg-blue-600"
              >
                START
              </Button>
            )}
          </>
        )}
        
        {/* Set-based Timer for Rehab Exercises with sets */}
        {exercise.type === "rehab" && exercise.sets && exercise.durationMin && exercise.durationMin > 0 && (
          <>
            {rehabTimerActive ? (
              <>
                <Card className="p-6 bg-blue-500/10 border-blue-500">
                  <h3 className="text-2xl font-bold mb-2 text-center text-blue-400">
                    Set {currentSet} of {exercise.sets}
                  </h3>
                  <p className="text-center text-sm text-muted-foreground mb-4">
                    {exercise.durationMin} min × {exercise.reps} reps
                  </p>
                  <Timer
                    mode="countdown"
                    initialSeconds={(exercise.durationMin || 1) * 60}
                    autoStart={true}
                    onComplete={() => {
                      if (currentSet < (exercise.sets || 1)) {
                        toast.success(`Set ${currentSet} Complete!`, {
                          description: `Ready for Set ${currentSet + 1}?`,
                          duration: 3000,
                        });
                        setCurrentSet(prev => prev + 1);
                        setRehabTimerActive(false);
                      } else {
                        toast.success("🎉 All Sets Complete!", {
                          description: `${exercise.sets} sets completed!`,
                          duration: 3000,
                        });
                        setRehabTimerActive(false);
                        setCurrentSet(1);
                      }
                    }}
                  />
                </Card>
                <div className="flex justify-center mt-4">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setRehabTimerActive(false);
                      setCurrentSet(1);
                    }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Cancel Workout
                  </Button>
                </div>
              </>
            ) : (
              <Button
                size="lg"
                onClick={() => {
                  setRehabTimerActive(true);
                }}
                className="h-24 px-16 text-3xl font-bold w-full bg-blue-500 hover:bg-blue-600"
              >
                {currentSet === 1 ? 'START SET 1' : `START SET ${currentSet}`}
              </Button>
            )}
            {currentSet > 1 && !rehabTimerActive && (
              <p className="text-center text-sm text-muted-foreground mt-2">
                Completed {currentSet - 1} of {exercise.sets} sets
              </p>
            )}
          </>
        )}

        {/* Input Form */}
        <div className="space-y-4">
          {exercise.type === "weights" && (
            <div className="space-y-3">
              <Label className="text-xl font-bold">Weight per Set (kg)</Label>
              {setWeights.map((weight, index) => (
                <div key={index}>
                  <Label htmlFor={`set-${index}`} className="text-xl font-semibold text-foreground mb-3 block">
                    Set {index + 1} of {exercise.sets}
                  </Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      onClick={() => {
                        const newWeights = [...setWeights];
                        newWeights[index] = Math.max(0, parseFloat(newWeights[index] || "0") - 1).toString();
                        setSetWeights(newWeights);
                      }}
                      className="h-16 w-16 text-3xl font-bold bg-yellow-500 hover:bg-yellow-600 text-black flex-shrink-0"
                      variant="default"
                    >
                      -
                    </Button>
                    <Input
                      id={`set-${index}`}
                      type="number"
                      value={weight}
                      onChange={(e) => {
                        const newWeights = [...setWeights];
                        newWeights[index] = e.target.value;
                        setSetWeights(newWeights);
                      }}
                      className="text-3xl font-bold h-16 text-center border-2 flex-1"
                      placeholder="0"
                    />
                    <Button
                      type="button"
                      onClick={() => {
                        const newWeights = [...setWeights];
                        newWeights[index] = (parseFloat(newWeights[index] || "0") + 1).toString();
                        setSetWeights(newWeights);
                      }}
                      className="h-16 w-16 text-3xl font-bold bg-yellow-500 hover:bg-yellow-600 text-black flex-shrink-0"
                      variant="default"
                    >
                      +
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        const newCompleted = [...setCompleted];
                        newCompleted[index] = !newCompleted[index];
                        console.log(`✓ Tick clicked - Set ${index + 1}:`, newCompleted[index] ? 'COMPLETE' : 'INCOMPLETE');
                        console.log('📊 All sets status:', newCompleted);
                        setSetCompleted(newCompleted);
                        if (!newCompleted[index]) {
                          toast.success("Set marked as incomplete");
                        } else {
                          triggerSuccessHaptic();
                          toast.success(`Set ${index + 1} complete! 💪`);
                        }
                      }}
                      className={`h-16 w-16 text-3xl font-bold flex-shrink-0 transition-all ${
                        setCompleted[index] 
                          ? 'bg-green-500 hover:bg-green-600 text-white' 
                          : 'bg-yellow-500 hover:bg-yellow-600 text-white'
                      }`}
                      variant="default"
                    >
                      ✓
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Manual inputs for running/cardio - only shown for duration-based exercises OR if timer was used */}
          {(exercise.type === "running" || exercise.type === "cardio") && (
            <>
              {/* For DURATION-BASED runs: show distance input (to record distance achieved) */}
              {exercise.durationMin && exercise.durationMin > 0 && !exercise.targetDistanceKm && (
                <div>
                  <Label htmlFor="distance" className="text-xl font-bold">Distance Achieved (km)</Label>
                  <div className="flex items-center gap-3 mt-3">
                    <Button
                      type="button"
                      onClick={() => {
                        const current = parseFloat(todaysDistance || "0");
                        const newValue = Math.max(0, current - 0.1);
                        setTodaysDistance(newValue.toFixed(1));
                      }}
                      className="h-32 w-24 text-5xl font-bold bg-yellow-500 hover:bg-yellow-600 text-black"
                      variant="default"
                    >
                      -
                    </Button>
                    <Input
                      id="distance"
                      type="number"
                      step="0.1"
                      value={todaysDistance || ""}
                      onChange={(e) => setTodaysDistance(e.target.value)}
                      className="text-6xl font-bold h-32 text-center border-2 flex-1"
                      placeholder="5.0"
                    />
                    <Button
                      type="button"
                      onClick={() => {
                        const current = parseFloat(todaysDistance || "0");
                        const newValue = current + 0.1;
                        setTodaysDistance(newValue.toFixed(1));
                      }}
                      className="h-32 w-24 text-5xl font-bold bg-yellow-500 hover:bg-yellow-600 text-black"
                      variant="default"
                    >
                      +
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
          
          {exercise.type === "bodyweight" && (
            <div className="text-center py-4">
              <p className="text-muted-foreground">Bodyweight exercise - no weight to track</p>
            </div>
          )}

          {/* Mobility exercises: duration input is now in the Target card above, no separate input needed */}
        </div>

        {/* Rest Timer - Skip for mobility exercises */}
        {exercise.type !== "mobility" && (
          <>
            {showRestTimer ? (
              <Card className="p-6">
                <h3 className="text-lg font-bold mb-4 text-center">Rest Timer</h3>
                <Timer
                  mode="countdown"
                  initialSeconds={restDuration}
                  onComplete={() => {
                    toast.success("Rest complete!", {
                      description: "Ready for next set",
                    });
                    setShowRestTimer(false);
                  }}
                />
              </Card>
            ) : (
              <RestTimer onSelectDuration={handleRestTimer} exerciseType={exercise.type} />
            )}
          </>
        )}

        {/* Flame Rating - Click to Rate & Complete */}
        <Card className="rating-section p-6 bg-yellow-500/10 border-4 border-yellow-500">
          <div className="flex flex-col items-center gap-4">
            <Label className="text-3xl font-bold text-foreground text-center">
              {existingLogId ? "Update & Rate" : "Rate to Continue"}
            </Label>
            
            <FlameRating 
              value={rating} 
              onChange={(selectedRating) => {
                setRating(selectedRating);
                // Auto-complete when flame is clicked, passing the rating directly
                setTimeout(() => handleMarkAsDone(selectedRating), 100);
              }} 
              size="lg" 
            />
            
            {rating > 0 && (
              <p className="text-lg text-foreground font-bold">
                {rating === 5 && "🔥 Crushed it!"}
                {rating === 4 && "💪 Great effort!"}
                {rating === 3 && "👍 Solid work!"}
                {rating === 2 && "😅 Challenging!"}
                {rating === 1 && "😮‍💨 Tough one!"}
              </p>
            )}
            
            {/* Skip rating option */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleMarkAsDone()}
              className="text-muted-foreground hover:text-foreground mt-2"
            >
              {existingLogId ? "Update without rating" : "Skip and complete without rating"}
            </Button>
          </div>
        </Card>

      </main>
    </div>
  );
};

export default ExerciseDetail;
