import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import type { Exercise } from "@/types/workout";

interface AMRAPWorkoutProps {
  exercise: Exercise;
  onComplete: () => void;
}

export function AMRAPWorkout({ exercise, onComplete }: AMRAPWorkoutProps) {
  const navigate = useNavigate();
  const timeCap = exercise.timeCap || 10; // minutes
  const exercises = exercise.exercises || [];
  
  const [isRunning, setIsRunning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(timeCap * 60); // in seconds
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [roundsCompleted, setRoundsCompleted] = useState(0);
  const [partialReps, setPartialReps] = useState(0);
  
  useEffect(() => {
    if (!isRunning || timeRemaining <= 0) return;
    
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          toast.success("⏰ Time's Up!", {
            description: `AMRAP Complete! ${roundsCompleted} full rounds ${partialReps > 0 ? `+ ${partialReps} reps` : ""}`,
            duration: 5000,
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isRunning, timeRemaining, roundsCompleted, partialReps]);
  
  const handleStart = () => {
    setIsRunning(true);
    setTimeRemaining(timeCap * 60);
    setRoundsCompleted(0);
    setPartialReps(0);
    setCurrentExerciseIndex(0);
    toast.info("🎯 AMRAP Started!", { description: "Go get it!" });
  };
  
  const handlePause = () => {
    setIsRunning(false);
  };
  
  const handleResume = () => {
    setIsRunning(true);
  };
  
  const handleExerciseComplete = () => {
    if (currentExerciseIndex === exercises.length - 1) {
      // Completed a full round
      setRoundsCompleted((prev) => prev + 1);
      setCurrentExerciseIndex(0);
      setPartialReps(0);
      toast.success(`Round ${roundsCompleted + 1} Complete! 🔥`);
    } else {
      // Move to next exercise in round
      setCurrentExerciseIndex((prev) => prev + 1);
      const currentEx = exercises[currentExerciseIndex];
      setPartialReps((prev) => prev + (currentEx.reps || 1));
    }
  };
  
  const handleComplete = () => {
    const totalScore = roundsCompleted + (partialReps / exercises.reduce((sum: number, ex: Exercise) => sum + (ex.reps || 0), 0));
    toast.success("✅ AMRAP Logged!", {
      description: `${roundsCompleted} rounds + ${partialReps} reps (${totalScore.toFixed(1)} total)`,
    });
    onComplete();
  };
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };
  
  const progress = ((timeCap * 60 - timeRemaining) / (timeCap * 60)) * 100;
  
  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border p-4">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-full"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-xl font-bold">AMRAP Workout</h1>
          <div className="w-10" />
        </div>
      </div>
      
      {/* Content */}
      <div className="container mx-auto p-4 space-y-6">
        {/* Exercise Name */}
        <Card className="p-6 border-4" style={{ borderColor: "#00FF4D" }}>
          <h2 className="text-3xl font-bold text-center mb-2">{exercise.name}</h2>
          <p className="text-center text-muted-foreground">
            {timeCap} minute time cap • As many rounds as possible
          </p>
        </Card>
        
        {!isRunning && timeRemaining === timeCap * 60 ? (
          // Start button
          <Button
            size="lg"
            onClick={handleStart}
            className="h-24 px-16 text-3xl font-bold w-full"
            style={{ backgroundColor: "#00FF4D", color: "#000" }}
          >
            START AMRAP
          </Button>
        ) : (
          <>
            {/* Timer Display */}
            <Card className="p-8 bg-primary/5" style={{ borderColor: "#00FF4D", borderWidth: "4px" }}>
              <div className="text-center space-y-4">
                <div className="text-sm font-bold uppercase tracking-wider" style={{ color: "#00FF4D" }}>
                  Time Remaining
                </div>
                
                <div className="text-9xl font-bold" style={{ color: timeRemaining <= 60 ? "#FF0000" : "#00FF4D" }}>
                  {formatTime(timeRemaining)}
                </div>
                
                <div className="text-2xl font-bold">
                  <span style={{ color: "#00FF4D" }}>{roundsCompleted}</span> rounds
                  {partialReps > 0 && <span className="text-muted-foreground"> + {partialReps} reps</span>}
                </div>
                
                {/* Progress Bar */}
                <div className="w-full bg-secondary/20 rounded-full h-4 overflow-hidden">
                  <div
                    className="h-full transition-all duration-300"
                    style={{ width: `${progress}%`, backgroundColor: "#00FF4D" }}
                  />
                </div>
              </div>
            </Card>
            
            {/* Exercise Checklist */}
            <div className="space-y-3">
              <h3 className="text-xl font-bold text-center">Exercises</h3>
              {exercises.map((ex: Exercise, idx: number) => (
                <Card
                  key={ex.id}
                  className={`p-4 border-2 ${
                    idx === currentExerciseIndex && isRunning
                      ? "border-4"
                      : "border-border"
                  }`}
                  style={idx === currentExerciseIndex && isRunning ? { borderColor: "#00FF4D" } : {}}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div
                        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                          idx < currentExerciseIndex || (!isRunning && timeRemaining === 0)
                            ? "bg-secondary border-secondary"
                            : "border-muted-foreground"
                        }`}
                      >
                        {(idx < currentExerciseIndex || (!isRunning && timeRemaining === 0)) && (
                          <Check className="w-5 h-5 text-secondary-foreground" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold">{ex.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {ex.reps && `${ex.reps} reps`}
                          {ex.suggestedKg && ` • ${ex.suggestedKg}kg`}
                        </p>
                      </div>
                    </div>
                    {idx === currentExerciseIndex && isRunning && (
                      <Button
                        size="sm"
                        onClick={handleExerciseComplete}
                        className="font-bold"
                        style={{ backgroundColor: "#00FF4D", color: "#000" }}
                      >
                        Done ✓
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
            
            {/* Controls */}
            <div className="flex gap-4 justify-center">
              {isRunning ? (
                <Button
                  size="lg"
                  onClick={handlePause}
                  className="h-16 px-8 text-xl font-bold"
                  variant="outline"
                >
                  Pause
                </Button>
              ) : timeRemaining > 0 ? (
                <Button
                  size="lg"
                  onClick={handleResume}
                  className="h-16 px-8 text-xl font-bold"
                  style={{ backgroundColor: "#00FF4D", color: "#000" }}
                >
                  Resume
                </Button>
              ) : null}
            </div>
            
            {/* Mark as Done */}
            {timeRemaining === 0 && (
              <Button
                size="lg"
                onClick={handleComplete}
                className="h-16 w-full text-xl font-bold"
                style={{ backgroundColor: "#FFCC00", color: "#000" }}
              >
                ✓ Mark as Done
              </Button>
            )}
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

