import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Timer } from "@/components/Timer";
import { RestTimer } from "@/components/RestTimer";
import { Card } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Home } from "lucide-react";
import { toast } from "sonner";
import { fetchTodayExercises, logExercise } from "@/services/googleSheets";
import { Exercise } from "@/types/workout";
import { ExerciseMedia } from "@/components/ExerciseMedia";
import { HIITWorkout } from "./HIITWorkout";
import { CircuitWorkout } from "./CircuitWorkout";
import { AMRAPWorkout } from "./AMRAPWorkout";

const ExerciseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exercise, setExercise] = useState<Exercise | null>(null);

  const [todaysKg, setTodaysKg] = useState("");
  const [todaysDistance, setTodaysDistance] = useState("");
  const [todaysDuration, setTodaysDuration] = useState("");
  const [notes, setNotes] = useState("");
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [restDuration, setRestDuration] = useState(60);
  const [showWorkoutTimer, setShowWorkoutTimer] = useState(false);
  const [workoutDuration, setWorkoutDuration] = useState(0);

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
          
          // Pre-populate fields based on exercise data
          if (ex.type === "weights" && ex.suggestedKg) {
            setTodaysKg(ex.suggestedKg.toString());
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

  const handleMarkAsDone = async () => {
    if (!exercise) return;

    const data: any = {
      notes: notes || undefined,
    };

    if (exercise.type === "cardio") {
      data.distance = todaysDistance ? parseFloat(todaysDistance) : undefined;
      data.duration = todaysDuration ? parseInt(todaysDuration) : undefined;
    } else if (exercise.type === "mobility") {
      // Mobility exercises: duration only, no PB tracking
      data.duration = todaysDuration ? parseInt(todaysDuration) : undefined;
    } else if (exercise.type === "weights") {
      data.weight = todaysKg ? parseFloat(todaysKg) : undefined;
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
      if (!result.isPB) {
        toast.success("🎉 All exercises complete!", {
          description: "Great workout! Returning home...",
        });
      } else {
        toast.success("🎉 Workout complete + NEW PB!", {
          description: "Amazing session! Returning home...",
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="container max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate("/")}
              className="h-14 w-14 p-0"
              title="Back to workout overview"
            >
              <Home className="w-8 h-8" />
            </Button>
            <h1 className="text-2xl font-bold text-foreground flex-1 text-center px-2">{exercise.name}</h1>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="lg"
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className="h-14 w-14 p-0"
              >
                <ArrowLeft className="w-8 h-8" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={handleNext}
                disabled={currentIndex === exercises.length - 1}
                className="h-14 w-14 p-0"
              >
                <ArrowRight className="w-8 h-8" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Exercise Info */}
        <Card className="p-6 bg-secondary/10 border-secondary">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">Target</p>
            {exercise.type === "cardio" ? (
              <>
                <p className="text-5xl font-bold text-foreground mb-4">
                  {exercise.durationMin} min
                </p>
                <p className="text-2xl text-secondary font-semibold">
                  Distance: {exercise.targetDistanceKm?.toFixed(1)}km
                </p>
              </>
            ) : exercise.type === "mobility" ? (
              <>
                <p className="text-5xl font-bold text-foreground mb-4">
                  {exercise.durationMin} min
                </p>
                <p className="text-xl text-muted-foreground font-medium">
                  Mobility Work
                </p>
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

        {/* Workout Countdown Timer (for any exercise with duration) */}
        {exercise.durationMin && exercise.durationMin > 0 && (
          <>
            {showWorkoutTimer ? (
              <Card className="p-6 bg-primary/5 border-primary">
                <h3 className="text-2xl font-bold mb-4 text-center text-primary">Workout Timer</h3>
                <Timer
                  mode="countdown"
                  initialSeconds={workoutDuration}
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

        {/* Rest Timer */}
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

        {/* Input Form */}
        <div className="space-y-4">
          {exercise.type === "weights" && (
            <div>
              <Label htmlFor="weight" className="text-xl font-bold">Today's Weight (kg)</Label>
              <div className="flex items-center gap-3 mt-3">
                <Button
                  type="button"
                  onClick={() => setTodaysKg((prev) => Math.max(0, parseFloat(prev || "0") - 1).toString())}
                  className="h-32 w-24 text-5xl font-bold bg-yellow-500 hover:bg-yellow-600 text-black"
                  variant="default"
                >
                  -
                </Button>
                <Input
                  id="weight"
                  type="number"
                  value={todaysKg}
                  onChange={(e) => setTodaysKg(e.target.value)}
                  className="text-6xl font-bold h-32 text-center border-2 flex-1"
                  placeholder="100"
                />
                <Button
                  type="button"
                  onClick={() => setTodaysKg((prev) => (parseFloat(prev || "0") + 1).toString())}
                  className="h-32 w-24 text-5xl font-bold bg-yellow-500 hover:bg-yellow-600 text-black"
                  variant="default"
                >
                  +
                </Button>
              </div>
            </div>
          )}
          
          {exercise.type === "cardio" && (
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

          {exercise.type === "mobility" && (
            <div>
              <Label htmlFor="duration" className="text-xl font-bold">Duration (minutes)</Label>
              <div className="flex items-center gap-3 mt-3">
                <Button
                  type="button"
                  onClick={() => setTodaysDuration((prev) => Math.max(0, parseFloat(prev || "0") - 1).toString())}
                  className="h-32 w-24 text-5xl font-bold bg-yellow-500 hover:bg-yellow-600 text-black"
                  variant="default"
                >
                  −
                </Button>
                <Input
                  type="number"
                  id="duration"
                  value={todaysDuration}
                  onChange={(e) => setTodaysDuration(e.target.value)}
                  className="text-center text-6xl h-32 border-2 font-bold"
                  placeholder={exercise.durationMin?.toString() || "10"}
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
          )}
        </div>

        {/* Mark as Done */}
        <Button
          size="lg"
          className="w-full h-16 text-lg font-bold"
          onClick={handleMarkAsDone}
        >
          <CheckCircle2 className="w-6 h-6 mr-2" />
          Mark as Done
        </Button>

        {/* Notes Input - Below Complete Button */}
        <div>
          <Label htmlFor="notes" className="text-base">Notes (optional)</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="How did it feel? Any observations..."
            className="mt-2 min-h-[100px]"
          />
        </div>

        {/* Exercise Notes/Instructions - At Bottom */}
        {(exercise.notes || exercise.mediaUrl) && (
          <Card className="p-4 bg-primary/5 border-4 border-yellow-500">
            {/* Show media from mediaUrl field */}
            {exercise.mediaUrl && (
              <div className="mb-4 max-w-full">
                <ExerciseMedia url={exercise.mediaUrl} alt={`${exercise.name} demonstration`} />
              </div>
            )}
            
            {/* Show notes - check if it's a URL or text */}
            {exercise.notes && (() => {
              // Check if notes is just a URL (image or video)
              const trimmedNotes = exercise.notes.trim();
              const isUrl = trimmedNotes.startsWith('http://') || trimmedNotes.startsWith('https://');
              
              // Check if it looks like an image URL or video URL
              const isMediaUrl = isUrl && (
                /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?|$)/i.test(trimmedNotes) ||
                /(youtube\.com|youtu\.be|vimeo\.com)/i.test(trimmedNotes) ||
                /images\.|image\.|img\.|cdn\.|cloudfront\.|ctfassets\./i.test(trimmedNotes)
              );
              
              if (isMediaUrl) {
                // It's a media URL, render as media
                return (
                  <div className="mb-4 max-w-full">
                    <ExerciseMedia url={trimmedNotes} alt={`${exercise.name} demonstration`} />
                  </div>
                );
              } else {
                // It's text (or a non-media URL), render as text
                return (
                  <p className="text-sm text-foreground whitespace-pre-wrap">{exercise.notes}</p>
                );
              }
            })()}
          </Card>
        )}
      </main>
    </div>
  );
};

export default ExerciseDetail;
