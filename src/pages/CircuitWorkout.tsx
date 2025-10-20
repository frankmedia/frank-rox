import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Timer } from "@/components/timer";
import { toast } from "sonner";
import type { Exercise } from "@/types/workout";

interface CircuitWorkoutProps {
  exercise: Exercise;
  onComplete: () => void;
}

export function CircuitWorkout({ exercise, onComplete }: CircuitWorkoutProps) {
  const navigate = useNavigate();
  const totalRounds = exercise.totalRounds || 3;
  const exercises = exercise.exercises || [];
  
  const [currentRound, setCurrentRound] = useState(1);
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set());
  const [showTimer, setShowTimer] = useState(false);
  const [timerDuration, setTimerDuration] = useState(90);
  
  const getCurrentRoundKey = (exerciseId: string, round: number) => `${exerciseId}-${round}`;
  
  const isExerciseComplete = (exerciseId: string) => {
    return completedExercises.has(getCurrentRoundKey(exerciseId, currentRound));
  };
  
  const toggleExercise = (exerciseId: string) => {
    const key = getCurrentRoundKey(exerciseId, currentRound);
    setCompletedExercises((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };
  
  const isRoundComplete = () => {
    return exercises.every((ex: Exercise) => isExerciseComplete(ex.id));
  };
  
  const handleNextRound = () => {
    if (currentRound < totalRounds) {
      setCurrentRound((prev) => prev + 1);
      toast.success(`Round ${currentRound} Complete! 💪`, {
        description: `Moving to Round ${currentRound + 1}`,
      });
    }
  };
  
  const handleComplete = () => {
    toast.success("✅ Circuit Complete!", {
      description: `${totalRounds} rounds finished!`,
    });
    onComplete();
  };
  
  const startRestTimer = (seconds: number) => {
    setTimerDuration(seconds);
    setShowTimer(true);
  };
  
  const progress = ((currentRound - 1) / totalRounds) * 100 + (isRoundComplete() ? (1 / totalRounds) * 100 : 0);
  
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
          <h1 className="text-xl font-bold">Circuit Workout</h1>
          <div className="w-10" />
        </div>
      </div>
      
      {/* Content */}
      <div className="container mx-auto p-4 space-y-6">
        {/* Exercise Name */}
        <Card className="p-6 border-4" style={{ borderColor: "#0033FF" }}>
          <h2 className="text-3xl font-bold text-center mb-2">{exercise.name}</h2>
          <p className="text-center text-muted-foreground">
            {totalRounds} rounds • {exercises.length} exercises per round
          </p>
        </Card>
        
        {/* Round Indicator */}
        <div className="text-center space-y-2">
          <div className="text-5xl font-bold" style={{ color: "#0033FF" }}>
            Round {currentRound} / {totalRounds}
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-secondary/20 rounded-full h-4 overflow-hidden">
            <div
              className="h-full transition-all duration-300"
              style={{ width: `${progress}%`, backgroundColor: "#0033FF" }}
            />
          </div>
        </div>
        
        {/* Exercise Checklist */}
        <div className="space-y-3">
          {exercises.map((ex: Exercise, idx: number) => (
            <Card
              key={`${ex.id}-${currentRound}`}
              className={`p-4 cursor-pointer transition-all border-2 ${
                isExerciseComplete(ex.id)
                  ? "bg-secondary/20 border-secondary"
                  : "hover:bg-muted/50 border-border"
              }`}
              onClick={() => toggleExercise(ex.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div
                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                      isExerciseComplete(ex.id)
                        ? "bg-secondary border-secondary"
                        : "border-muted-foreground"
                    }`}
                  >
                    {isExerciseComplete(ex.id) && <Check className="w-5 h-5 text-secondary-foreground" />}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold">{ex.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {ex.reps && `${ex.reps} reps`}
                      {ex.sets && ` • ${ex.sets} sets`}
                      {ex.suggestedKg && ` • ${ex.suggestedKg}kg`}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          ))}
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
        
        {/* Next Round / Complete Button */}
        {isRoundComplete() && (
          <>
            {currentRound < totalRounds ? (
              <Button
                size="lg"
                onClick={handleNextRound}
                className="h-16 w-full text-xl font-bold"
                style={{ backgroundColor: "#0033FF" }}
              >
                Next Round →
              </Button>
            ) : (
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

