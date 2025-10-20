import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import type { Exercise } from "@/types/workout";

interface HIITWorkoutProps {
  exercise: Exercise;
  onComplete: () => void;
}

export function HIITWorkout({ exercise, onComplete }: HIITWorkoutProps) {
  const navigate = useNavigate();
  const [isRunning, setIsRunning] = useState(false);
  const [currentInterval, setCurrentInterval] = useState(0);
  const [isWorkPhase, setIsWorkPhase] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(0);
  
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
  
  const handleComplete = () => {
    toast.success("✅ HIIT Workout Logged!");
    onComplete();
  };
  
  const progress = ((currentInterval / totalIntervals) * 100).toFixed(0);
  
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
          <h1 className="text-xl font-bold">HIIT Workout</h1>
          <div className="w-10" />
        </div>
      </div>
      
      {/* Content */}
      <div className="container mx-auto p-4 space-y-6">
        {/* Exercise Name */}
        <Card className="p-6 border-4" style={{ borderColor: "#FF00B2" }}>
          <h2 className="text-3xl font-bold text-center mb-2">{exercise.name}</h2>
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
              ) : (
                <Button
                  size="lg"
                  onClick={handleResume}
                  className="h-16 px-8 text-xl font-bold"
                  style={{ backgroundColor: "#FF00B2" }}
                >
                  Resume
                </Button>
              )}
              <Button
                size="lg"
                onClick={handleReset}
                className="h-16 px-8 text-xl font-bold"
                variant="outline"
              >
                Restart
              </Button>
            </div>
            
            {/* Mark as Done */}
            {currentInterval >= totalIntervals - 1 && !isRunning && (
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

