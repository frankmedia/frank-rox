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
  
  // Track completed rounds per exercise: { exerciseId: [1, 2, 3] }
  const [completedRounds, setCompletedRounds] = useState<Record<string, number[]>>({});
  const [showTimer, setShowTimer] = useState(false);
  const [timerDuration, setTimerDuration] = useState(90);
  
  const toggleNextRound = (exerciseId: string) => {
    setCompletedRounds((prev) => {
      const exerciseRounds = prev[exerciseId] || [];
      
      // If all rounds are complete, clear all
      if (exerciseRounds.length === totalRounds) {
        return {
          ...prev,
          [exerciseId]: [],
        };
      }
      
      // Otherwise, add the next round
      const nextRound = exerciseRounds.length + 1;
      return {
        ...prev,
        [exerciseId]: [...exerciseRounds, nextRound].sort((a, b) => a - b),
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
  
  const getTotalCompleted = () => {
    return Object.values(completedRounds).reduce((sum, rounds) => sum + rounds.length, 0);
  };
  
  const getTotalRequired = () => {
    return exercises.length * totalRounds;
  };
  
  const progress = (getTotalCompleted() / getTotalRequired()) * 100;
  
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
        <Card className="p-6 border-4" style={{ borderColor: "#FF6600" }}>
          <h2 className="text-3xl font-bold text-center mb-2">{exercise.name}</h2>
          <p className="text-center text-muted-foreground">
            {totalRounds} rounds • {exercises.length} exercises per round
          </p>
        </Card>
        
        {/* Progress Display */}
        <div className="text-center space-y-2">
          <div className="text-5xl font-bold" style={{ color: "#FF6600" }}>
            {getTotalCompleted()} / {getTotalRequired()}
          </div>
          <p className="text-sm text-muted-foreground">Sets completed</p>
          
          {/* Progress Bar */}
          <div className="w-full bg-secondary/20 rounded-full h-4 overflow-hidden">
            <div
              className="h-full transition-all duration-300"
              style={{ width: `${progress}%`, backgroundColor: "#FF6600" }}
            />
          </div>
        </div>
        
        {/* Exercise List with Round Circles */}
        <div className="space-y-3">
          {exercises.map((ex: Exercise) => (
            <Card
              key={ex.id}
              className="p-4 border-2 cursor-pointer hover:bg-muted/50 transition-all"
              onClick={() => toggleNextRound(ex.id)}
            >
              <div className="space-y-3">
                {/* Exercise Name and Details */}
                <div>
                  <h3 className="text-lg font-bold">{ex.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {ex.reps && `${ex.reps} reps`}
                    {ex.sets && ` • ${ex.sets} sets`}
                    {ex.suggestedKg && ` • ${ex.suggestedKg}kg`}
                  </p>
                </div>
                
                {/* Round Circles - indicators only, not buttons */}
                <div className="flex items-center gap-3">
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
                          <span className="text-sm font-bold text-muted-foreground">{roundNumber}</span>
                        )}
                      </div>
                    );
                  })}
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
