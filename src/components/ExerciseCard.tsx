import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Dumbbell, Medal, Activity, Zap, Repeat, Target, PersonStanding } from "lucide-react";
import { cn } from "@/lib/utils";
import { InlineHeartRate } from "@/components/HeartRateZone";

interface ExerciseCardProps {
  exercise: {
    id: string;
    name: string;
    type: "weights" | "cardio" | "bodyweight" | "mobility" | "running" | "hiit" | "circuit" | "amrap" | "intro";
    sets?: number;
    reps?: number;
    suggestedKg?: number;
    durationMin?: number;
    targetDistanceKm?: number;
    personalBest?: string;
    completed?: boolean;
    mediaUrl?: string;
    exercises?: any[]; // Child exercises for grouped types
    totalRounds?: number;
    timeCap?: number;
    workRestRatio?: string;
  };
  onClick?: () => void;
  isCompleted?: boolean;
}

export function ExerciseCard({ exercise, onClick, isCompleted }: ExerciseCardProps) {
  const completed = isCompleted || exercise.completed;
  
  // Define border colors for new workout types
  const getBorderColor = () => {
    if (completed) return "border-yellow-500";
    switch (exercise.type) {
      case "hiit": return "border-[#FF00B2]"; // Hot pink
      case "circuit": return "border-[#FFB74D]"; // Amber (better contrast 7.2:1)
      case "amrap": return "border-[#00E676]"; // Material green (better contrast)
      default: return "border-border hover:border-secondary/50";
    }
  };
  
  // Get icon based on exercise type
  const getIcon = () => {
    switch (exercise.type) {
      case "hiit": return <Zap className="w-5 h-5" style={{ color: "#FF00B2" }} />;
      case "circuit": return <Repeat className="w-5 h-5" style={{ color: "#FFB74D" }} />;
      case "amrap": return <Target className="w-5 h-5" style={{ color: "#00E676" }} />;
      case "cardio": return <Clock className="w-5 h-5 text-primary" />;
      case "mobility": return <Activity className="w-5 h-5 text-primary" />;
      case "running": return <PersonStanding className="w-5 h-5 text-primary" />;
      default: return <Dumbbell className="w-5 h-5 text-primary" />;
    }
  };
  
  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all duration-300 cursor-pointer",
        completed
          ? "bg-secondary/10 border-4 border-yellow-500"
          : `bg-card hover:bg-card/80 border-4 ${getBorderColor()}`
      )}
      onClick={onClick}
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {getIcon()}
            <h3 className="text-lg font-bold text-foreground">{exercise.name}</h3>
          </div>
          <div className="flex items-center gap-2">
            {/* Heart rate zone tracking for cardio/running/HIIT/circuit/AMRAP */}
            {["cardio", "running", "hiit", "circuit", "amrap"].includes(exercise.type) && (
              <InlineHeartRate />
            )}
            {exercise.personalBest && exercise.type !== "mobility" && !["hiit", "circuit", "amrap"].includes(exercise.type) && (
              <Badge className="bg-primary/10 text-primary border border-primary/20 font-bold">
                <Medal className="w-3 h-3 mr-1" />
                PB: {exercise.personalBest}
              </Badge>
            )}
          </div>
        </div>

        <div className="space-y-2">
          {(exercise.type === "weights" || exercise.type === "bodyweight") && (
            <div className="flex items-center gap-4 text-muted-foreground">
              <span className="text-4xl font-bold text-foreground">
                {exercise.sets} × {exercise.reps}
              </span>
              {exercise.type === "weights" && exercise.suggestedKg && (
                <span className="text-lg">
                  Target: <span className="font-semibold text-secondary">{exercise.suggestedKg}kg</span>
                </span>
              )}
              {exercise.type === "bodyweight" && (
                <span className="text-sm text-muted-foreground">Bodyweight</span>
              )}
            </div>
          )}

          {exercise.type === "cardio" && (
            <div className="flex items-center gap-4 text-muted-foreground">
              {exercise.durationMin && (
                <span className="text-4xl font-bold text-foreground">
                  {exercise.durationMin} min
                </span>
              )}
              {exercise.targetDistanceKm && (
                <span className="text-lg">
                  Target: <span className="font-semibold text-secondary">{exercise.targetDistanceKm.toFixed(1)}km</span>
                </span>
              )}
            </div>
          )}

          {exercise.type === "mobility" && (
            <div className="flex items-center gap-4 text-muted-foreground">
              {exercise.durationMin && (
                <span className="text-4xl font-bold text-foreground">
                  {exercise.durationMin} min
                </span>
              )}
              <span className="text-sm text-muted-foreground">Mobility</span>
            </div>
          )}

          {exercise.type === "running" && (
            <div className="flex items-center gap-4 text-muted-foreground">
              {exercise.targetDistanceKm && (
                <span className="text-4xl font-bold text-foreground">
                  {exercise.targetDistanceKm.toFixed(1)}km
                </span>
              )}
              {exercise.durationMin && (
                <span className="text-lg">
                  Target: <span className="font-semibold text-secondary">{exercise.durationMin} min</span>
                </span>
              )}
            </div>
          )}
          
          {exercise.type === "hiit" && (
            <div className="space-y-2">
              <div>
                <span className="text-4xl font-bold text-foreground block mb-2">
                  {exercise.totalRounds || 8} intervals
                </span>
                <span className="text-lg text-foreground/70">
                  {exercise.notes || exercise.workRestRatio || "20s/10s"}
                </span>
              </div>
            </div>
          )}
          
          {exercise.type === "circuit" && (
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <span className="text-4xl font-bold text-foreground">
                  {exercise.totalRounds || 3} rounds
                </span>
              </div>
              {exercise.exercises && exercise.exercises.length > 0 && (
                <div className="text-lg space-y-2 mt-3">
                  {exercise.exercises.map((ex: any, idx: number) => {
                    let displayName = ex.name;
                    
                    // Add distance to name in brackets
                    if (ex.targetDistanceKm) {
                      const meters = Math.round(ex.targetDistanceKm * 1000);
                      displayName = `${ex.name} [${meters}m]`;
                    }
                    
                    return (
                      <div key={idx} className="flex items-center gap-2 flex-wrap">
                        <span className="text-foreground text-xl">→</span>
                        <span className="text-foreground">{displayName}</span>
                        <span className="font-semibold text-foreground/70">
                          (
                          {ex.reps && <span>{ex.reps} reps</span>}
                          {ex.reps && ex.suggestedKg && <span> • </span>}
                          {ex.suggestedKg && <span style={{ color: "#FFB74D" }}>{ex.suggestedKg}kg</span>}
                          {(ex.reps || ex.suggestedKg) && ex.durationMin && <span> • </span>}
                          {ex.durationMin && <span>{ex.durationMin} min</span>}
                          )
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          
          {exercise.type === "amrap" && (
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <span className="text-4xl font-bold text-foreground">
                  {exercise.timeCap || 10} min
                </span>
                <span className="text-lg text-foreground/70">AMRAP</span>
              </div>
              {exercise.exercises && exercise.exercises.length > 0 && (
                <div className="text-lg space-y-2 mt-3">
                  {exercise.exercises.map((ex: any, idx: number) => {
                    let displayName = ex.name;
                    
                    // Add distance to name in brackets
                    if (ex.targetDistanceKm) {
                      const meters = Math.round(ex.targetDistanceKm * 1000);
                      displayName = `${ex.name} [${meters}m]`;
                    }
                    
                    return (
                      <div key={idx} className="flex items-center gap-2 flex-wrap">
                        <span className="text-foreground text-xl">→</span>
                        <span className="text-foreground">{displayName}</span>
                        {(ex.suggestedKg || ex.durationMin) && (
                          <span className="font-semibold text-foreground/70">
                            (
                            {ex.suggestedKg && <span style={{ color: "#00E676" }}>{ex.suggestedKg}kg</span>}
                            {ex.suggestedKg && ex.durationMin && <span> • </span>}
                            {ex.durationMin && <span>{ex.durationMin} min</span>}
                            )
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {completed && (
          <div className="absolute top-0 right-0 w-16 h-16">
            <div className="absolute transform rotate-45 bg-yellow-500 text-black text-xs font-bold py-1 right-[-30px] top-[10px] w-[100px] text-center">
              ✓ DONE
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
