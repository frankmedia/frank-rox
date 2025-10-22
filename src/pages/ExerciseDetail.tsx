import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Timer } from "@/components/Timer";
import { RestTimer } from "@/components/RestTimer";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Loader2, List } from "lucide-react";
import { toast } from "sonner";
import { fetchTodayExercises, logExercise } from "@/services/googleSheets";
import { Exercise } from "@/types/workout";
import { ExerciseMedia } from "@/components/ExerciseMedia";
import { HIITWorkout } from "./HIITWorkout";
import { CircuitWorkout } from "./CircuitWorkout";
import { AMRAPWorkout } from "./AMRAPWorkout";
import { triggerSuccessHaptic } from "@/utils/haptics";
import { FlameRating } from "@/components/FlameRating";

const ExerciseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exercise, setExercise] = useState<Exercise | null>(null);

  const [setWeights, setSetWeights] = useState<string[]>([]);
  const [setCompleted, setSetCompleted] = useState<boolean[]>([]); // Track completed sets
  const [todaysDistance, setTodaysDistance] = useState("");
  const [todaysDuration, setTodaysDuration] = useState("");
  const [rating, setRating] = useState(0); // 0-5 flame rating
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [restDuration, setRestDuration] = useState(60);
  const [showWorkoutTimer, setShowWorkoutTimer] = useState(false);
  const [workoutDuration, setWorkoutDuration] = useState(0);
  
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
        const data = await fetchTodayExercises();
        setExercises(data);
        
        // Find exercise by ID or use first
        const index = id ? data.findIndex(ex => ex.id === id) : 0;
        const foundIndex = index >= 0 ? index : 0;
        setCurrentIndex(foundIndex);
        
        if (data[foundIndex]) {
          const ex = data[foundIndex];
          setExercise(ex);
          
          // Debug: Check if timer should show
          console.log("🔍 Exercise Debug:", {
            name: ex.name,
            type: ex.type,
            durationMin: ex.durationMin,
            willShowTimer: !!ex.durationMin && ex.durationMin > 0
          });
          
          // Reset rating for new exercise
          setRating(0);
          
          // Pre-populate fields based on exercise data
          if (ex.type === "weights" && ex.sets) {
            // Initialize array with suggested weight for each set
            const initialWeights = Array(ex.sets).fill(ex.suggestedKg?.toString() || "");
            setSetWeights(initialWeights);
            // Initialize all sets as not completed
            setSetCompleted(Array(ex.sets).fill(false));
          }
          if (ex.targetDistanceKm) {
            setTodaysDistance(ex.targetDistanceKm.toString());
          }
          if (ex.durationMin) {
            setTodaysDuration(ex.durationMin.toString());
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
  }, [id]);

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
      data.distance = todaysDistance ? parseFloat(todaysDistance) : undefined;
      data.duration = todaysDuration ? parseInt(todaysDuration) : undefined;
    } else if (exercise.type === "mobility") {
      // Mobility exercises: duration only, no PB tracking
      data.duration = todaysDuration ? parseInt(todaysDuration) : undefined;
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

    // Log the exercise and check for PB
    const result = await logExercise(exercise.name, data);
    
    if (!result.success) {
      toast.error("❌ Failed to log exercise", {
        description: result.message || "Please try again",
      });
      return;
    }
    
    // Show PB celebration if applicable
    if (result.isPB) {
      toast.success("🏆 NEW PERSONAL BEST!", {
        description: result.message || `You beat your previous best!`,
        duration: 3000,
      });
    }
    
    // Navigate to next exercise or back to home
    if (currentIndex < exercises.length - 1) {
      const nextExercise = exercises[currentIndex + 1];
      if (!result.isPB) {
        toast.success("✅ Exercise completed!", {
          description: `Moving to: ${nextExercise.name}`,
        });
      }
      setTimeout(() => {
        navigate(`/exercise/${nextExercise.id}`);
      }, result.isPB ? 2000 : 500); // Longer delay for PB celebration
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
      
      if (!result.isPB) {
        toast.success("🎉 All exercises complete!", {
          description: "Great workout! Returning to overview...",
        });
      } else {
        toast.success("🎉 Workout complete + NEW PB!", {
          description: "Amazing session! Returning to overview...",
        });
      }
      setTimeout(() => {
        navigate("/");
      }, result.isPB ? 2500 : 1000);
    }
  };

  const handleRestTimer = (seconds: number) => {
    setRestDuration(seconds);
    setShowRestTimer(true);
  };

  const handleStartWorkout = () => {
    // Use todaysDuration if user has entered a value, otherwise fallback to exercise.durationMin
    const durationToUse = todaysDuration ? parseInt(todaysDuration) : exercise?.durationMin;
    if (durationToUse) {
      setWorkoutDuration(durationToUse * 60); // Convert minutes to seconds
      setShowWorkoutTimer(true);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      const prevExercise = exercises[currentIndex - 1];
      navigate(`/exercise/${prevExercise.id}`);
    }
  };

  const handleNext = () => {
    if (currentIndex < exercises.length - 1) {
      const nextExercise = exercises[currentIndex + 1];
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
      navigate("/");
      toast.success("🎉 All exercises complete!");
    }
  };

  // Route to specialized workout screens for grouped workouts
  if (exercise.type === "hiit") {
    return <HIITWorkout exercise={exercise} onComplete={handleGroupedWorkoutComplete} />;
  }

  if (exercise.type === "circuit") {
    return <CircuitWorkout exercise={exercise} onComplete={handleGroupedWorkoutComplete} />;
  }

  if (exercise.type === "amrap") {
    return <AMRAPWorkout exercise={exercise} onComplete={handleGroupedWorkoutComplete} />;
  }

  return (
    <div 
      className="min-h-screen bg-background"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="container max-w-2xl mx-auto px-2 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/today")}
              className="h-12 w-12 sm:h-14 sm:w-14 p-0 [&_svg]:!w-6 [&_svg]:!h-6 sm:[&_svg]:!w-8 sm:[&_svg]:!h-8 flex-shrink-0"
              title="Back to today's exercises"
            >
              <List strokeWidth={3} />
            </Button>
          </div>
        </div>
      </header>

      <main className="container max-w-2xl mx-auto px-2 sm:px-4 py-3 sm:py-6 space-y-4 sm:space-y-6 pb-24">
        {/* Static Header: Exercise Title + Notes + Media - Always visible for ALL exercise types */}
        <div className="space-y-4">
          {/* Exercise Title with Border */}
          <Card className="p-6 border-4 border-yellow-500">
            <h2 className="text-4xl font-bold text-foreground text-center">
              {exercise.name}
            </h2>
          </Card>
          
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

        {/* Target Card - Hide when timer is running for mobility exercises or when empty */}
        {!(exercise.type === "mobility" && showWorkoutTimer) && 
         !(exercise.type === "cardio" && !exercise.durationMin && !exercise.targetDistanceKm) &&
         !(exercise.type === "running" && !exercise.durationMin && !exercise.targetDistanceKm) && (
        <Card className="p-6 bg-secondary/10 border-secondary">
          <div className="text-center">
            {/* Hide "Target" label for mobility exercises */}
            {exercise.type !== "mobility" && (
              <p className="text-sm text-muted-foreground mb-2">Target</p>
            )}
            {(exercise.type === "cardio" || exercise.type === "running") ? (
              <>
                {exercise.durationMin && exercise.durationMin > 0 && (
                  <p className="text-5xl font-bold text-foreground mb-4">
                    {exercise.durationMin} min
                  </p>
                )}
                {exercise.targetDistanceKm && exercise.targetDistanceKm > 0 && (
                  <p className="text-2xl text-secondary font-semibold">
                    Distance: {exercise.targetDistanceKm?.toFixed(1)}km
                  </p>
                )}
              </>
            ) : exercise.type === "mobility" ? (
              <>
                <Label htmlFor="mobility-duration" className="text-xl font-bold block text-center mb-4">Duration (minutes)</Label>
                <div className="flex items-center justify-center gap-3">
                  <Button
                    type="button"
                    onClick={() => setTodaysDuration((prev) => Math.max(1, parseFloat(prev || exercise.durationMin?.toString() || "1") - 1).toString())}
                    className="h-32 w-24 text-5xl font-bold bg-yellow-500 hover:bg-yellow-600 text-black"
                    variant="default"
                  >
                    −
                  </Button>
                  <Input
                    id="mobility-duration"
                    type="number"
                    value={todaysDuration || exercise.durationMin?.toString()}
                    onChange={(e) => setTodaysDuration(e.target.value)}
                    className="text-center text-6xl h-32 border-2 font-bold flex-1"
                    placeholder={exercise.durationMin?.toString() || "8"}
                  />
                  <Button
                    type="button"
                    onClick={() => setTodaysDuration((prev) => (parseFloat(prev || exercise.durationMin?.toString() || "0") + 1).toString())}
                    className="h-32 w-24 text-5xl font-bold bg-yellow-500 hover:bg-yellow-600 text-black"
                    variant="default"
                  >
                    +
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-7xl font-bold text-foreground mb-4">
                  {exercise.sets} × {exercise.reps}
                </p>
                {exercise.type === "weights" && exercise.suggestedKg && (
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
        {exercise.type === "mobility" && exercise.durationMin && exercise.durationMin > 0 && (
          <>
            {showWorkoutTimer ? (
              <Card className="p-6 bg-primary/5 border-primary">
                <h3 className="text-2xl font-bold mb-4 text-center text-primary">Workout Timer</h3>
                <Timer
                  mode="countdown"
                  initialSeconds={workoutDuration}
                  autoStart={true}
                  onComplete={() => {
                    const completedDuration = Math.round(workoutDuration / 60);
                    toast.success("🎉 Workout Complete!", {
                      description: `${completedDuration} minutes completed!`,
                      duration: 3000,
                    });
                    setTodaysDuration(completedDuration.toString());
                    setShowWorkoutTimer(false);
                  }}
                  onCancel={() => setShowWorkoutTimer(false)}
                />
              </Card>
            ) : (
              <Button
                size="lg"
                onClick={handleStartWorkout}
                className="h-24 px-16 text-3xl font-bold w-full"
              >
                START COUNTDOWN
              </Button>
            )}
          </>
        )}
        
        {/* Workout Countdown Timer (for cardio/running exercises - shown later) */}
        {(exercise.type === "cardio" || exercise.type === "running") && exercise.durationMin && exercise.durationMin > 0 && (
          <>
            {showWorkoutTimer ? (
              <Card className="p-6 bg-primary/5 border-primary">
                <h3 className="text-2xl font-bold mb-4 text-center text-primary">Workout Timer</h3>
                <Timer
                  mode="countdown"
                  initialSeconds={workoutDuration}
                  autoStart={true}
                  onComplete={() => {
                    const completedDuration = Math.round(workoutDuration / 60);
                    toast.success("🎉 Workout Complete!", {
                      description: `${completedDuration} minutes completed!`,
                      duration: 3000,
                    });
                    setTodaysDuration(completedDuration.toString());
                    setShowWorkoutTimer(false);
                  }}
                  onCancel={() => setShowWorkoutTimer(false)}
                />
              </Card>
            ) : (
              <Button
                size="lg"
                onClick={handleStartWorkout}
                className="h-24 px-16 text-3xl font-bold w-full"
              >
                START COUNTDOWN
              </Button>
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
          
          {(exercise.type === "cardio" || exercise.type === "running") && (
            <>
              <div>
                <Label htmlFor="distance" className="text-xl font-bold">Distance (km)</Label>
                <div className="flex items-center gap-3 mt-3">
                  <Button
                    type="button"
                    onClick={() => setTodaysDistance((prev) => Math.max(0, parseFloat(prev || "0") - 0.1).toFixed(1))}
                    className="h-32 w-24 text-5xl font-bold bg-yellow-500 hover:bg-yellow-600 text-black"
                    variant="default"
                  >
                    -
                  </Button>
                  <Input
                    id="distance"
                    type="number"
                    step="0.1"
                    value={todaysDistance}
                    onChange={(e) => setTodaysDistance(e.target.value)}
                    className="text-6xl font-bold h-32 text-center border-2 flex-1"
                    placeholder="5.0"
                  />
                  <Button
                    type="button"
                    onClick={() => setTodaysDistance((prev) => (parseFloat(prev || "0") + 0.1).toFixed(1))}
                    className="h-32 w-24 text-5xl font-bold bg-yellow-500 hover:bg-yellow-600 text-black"
                    variant="default"
                  >
                    +
                  </Button>
                </div>
              </div>
              <div>
                <Label htmlFor="duration" className="text-xl font-bold">Duration (minutes)</Label>
                <div className="flex items-center gap-3 mt-3">
                  <Button
                    type="button"
                    onClick={() => setTodaysDuration((prev) => Math.max(0, parseFloat(prev || "0") - 1).toString())}
                    className="h-32 w-24 text-5xl font-bold bg-yellow-500 hover:bg-yellow-600 text-black"
                    variant="default"
                  >
                    -
                  </Button>
                  <Input
                    id="duration"
                    type="number"
                    value={todaysDuration}
                    onChange={(e) => setTodaysDuration(e.target.value)}
                    className="text-6xl font-bold h-32 text-center border-2 flex-1"
                    placeholder="20"
                  />
                  <Button
                    type="button"
                    onClick={() => setTodaysDuration((prev) => (parseFloat(prev || "0") + 1).toString())}
                    className="h-32 w-24 text-5xl font-bold bg-yellow-500 hover:bg-yellow-600 text-black"
                    variant="default"
                  >
                    +
                  </Button>
                </div>
              </div>
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
        <Card className="p-6 bg-yellow-500/10 border-4 border-yellow-500">
          <div className="flex flex-col items-center gap-4">
            <Label className="text-3xl font-bold text-foreground text-center">Rate to Continue</Label>
            
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
              Skip and complete without rating
            </Button>
          </div>
        </Card>

      </main>
    </div>
  );
};

export default ExerciseDetail;
