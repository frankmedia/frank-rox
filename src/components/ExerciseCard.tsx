import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Dumbbell, Medal, Activity, Zap, Repeat, Target, PersonStanding, HeartPulse, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { InlineHeartRate } from "@/components/HeartRateZone";

interface ExerciseCardProps {
  exercise: {
    id: string;
    name: string;
    type: "weights" | "cardio" | "bodyweight" | "mobility" | "running" | "hiit" | "circuit" | "amrap" | "intro" | "amrap_exercise" | "circuit_exercise" | "hiit_exercise" | "rehab";
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
  loggedDuration?: number;
  loggedDistance?: number;
  loggedWeight?: number;
  loggedWeights?: number[];
}

export function ExerciseCard({ exercise, onClick, isCompleted, loggedDuration, loggedDistance, loggedWeight, loggedWeights }: ExerciseCardProps) {
  const completed = isCompleted || exercise.completed;
  
  // Define border colors for new workout types
  const getBorderColor = () => {
    switch (exercise.type) {
      case "hiit":
      case "hiit_exercise": return "border-[#FF00B2]"; // Hot pink
      case "circuit":
      case "circuit_exercise": return "border-[#FFB74D]"; // Amber (better contrast 7.2:1)
      case "amrap":
      case "amrap_exercise": return "border-[#00E676]"; // Material green (better contrast)
      default: return "border-border hover:border-secondary/50";
    }
  };
  
  // Get icon based on exercise type
  const getIcon = () => {
    switch (exercise.type) {
      case "hiit": return <Zap className="w-5 h-5" style={{ color: "#FF00B2" }} />;
      case "hiit_exercise": return <Zap className="w-5 h-5" style={{ color: "#FF00B2" }} />;
      case "circuit": return <Repeat className="w-5 h-5" style={{ color: "#FFB74D" }} />;
      case "circuit_exercise": return <Repeat className="w-5 h-5" style={{ color: "#FFB74D" }} />;
      case "amrap": return <Target className="w-5 h-5" style={{ color: "#00E676" }} />;
      case "amrap_exercise": return <Target className="w-5 h-5" style={{ color: "#00E676" }} />;
      case "cardio": return <Clock className="w-5 h-5 text-primary" />;
      case "mobility": return <Activity className="w-5 h-5 text-primary" />;
      case "running": return <PersonStanding className="w-5 h-5 text-primary" />;
      case "rehab": return <HeartPulse className="w-5 h-5 text-blue-400" />;
      default: return <Dumbbell className="w-5 h-5 text-primary" />;
    }
  };
  
  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all duration-300 cursor-pointer",
        "bg-card hover:bg-card/80 border-2",
        getBorderColor()
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
          {/* Child exercises (amrap_exercise, circuit_exercise, hiit_exercise) render as simple cards */}
          {(exercise.type === "amrap_exercise" || exercise.type === "circuit_exercise" || exercise.type === "hiit_exercise") && (
            <div className="flex items-center gap-4 text-muted-foreground flex-wrap">
              {exercise.sets && exercise.reps && (
                <span className="text-4xl font-bold text-foreground">
                  {exercise.sets} × {exercise.reps}
                </span>
              )}
              {exercise.suggestedKg && exercise.suggestedKg > 0 && (
                <span className="text-lg">
                  <span className="font-semibold text-secondary">{exercise.suggestedKg}kg</span>
                </span>
              )}
              {exercise.durationMin && exercise.durationMin > 0 && (
                <span className="text-lg">
                  <span className="font-semibold text-secondary">
                    {exercise.durationMin < 1 
                      ? `${Math.round(exercise.durationMin * 60)} sec` 
                      : `${exercise.durationMin} min`}
                  </span>
                </span>
              )}
              {exercise.targetDistanceKm && exercise.targetDistanceKm > 0 && (
                <span className="text-lg">
                  <span className="font-semibold text-secondary">{exercise.targetDistanceKm.toFixed(1)}km</span>
                </span>
              )}
              {/* Only show "Bodyweight" if there's truly no data at all */}
              {!exercise.sets && !exercise.reps && !exercise.durationMin && !exercise.targetDistanceKm && !exercise.suggestedKg && (
                <span className="text-sm text-muted-foreground">Bodyweight</span>
              )}
            </div>
          )}

          {(exercise.type === "weights" || exercise.type === "bodyweight") && (
            <div className="flex items-center gap-4 text-muted-foreground">
              {exercise.sets && exercise.reps && (
                <span className="text-4xl font-bold text-foreground">
                  {exercise.sets} × {exercise.reps}
                </span>
              )}
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
                  {exercise.durationMin < 1 
                    ? `${Math.round(exercise.durationMin * 60)} sec` 
                    : `${exercise.durationMin} min`}
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
            <div className="flex items-center gap-4 text-muted-foreground flex-wrap">
              {exercise.durationMin && (
                <span className="text-4xl font-bold text-foreground">
                  {exercise.durationMin < 1 
                    ? `${Math.round(exercise.durationMin * 60)} sec` 
                    : `${exercise.durationMin} min`}
                </span>
              )}
              {loggedDuration && (
                <span className="text-2xl font-bold text-green-400">
                  ✓ {loggedDuration} min
                </span>
              )}
              {!loggedDuration && <span className="text-sm text-muted-foreground">Mobility</span>}
            </div>
          )}

          {exercise.type === "rehab" && (
            <div className="space-y-2">
              {/* Main display: sets × reps OR sets × Sets OR just duration */}
              {exercise.sets && exercise.reps ? (
                <div className="flex items-center gap-4 text-muted-foreground">
                  <span className="text-4xl font-bold text-foreground">
                    {exercise.sets} × {exercise.reps}
                  </span>
                  {exercise.durationMin && (
                    <span className="text-lg">
                      <span className="font-semibold text-blue-400">
                        {exercise.durationMin < 1 
                          ? `${Math.round(exercise.durationMin * 60)} sec` 
                          : `${exercise.durationMin} min`}
                      </span> per set
                    </span>
                  )}
                </div>
              ) : exercise.sets && !exercise.reps && exercise.durationMin ? (
                <div className="flex items-center gap-4 text-muted-foreground">
                  <span className="text-4xl font-bold text-foreground">
                    {exercise.sets} × {exercise.durationMin < 1 
                      ? `${Math.round(exercise.durationMin * 60)} sec` 
                      : `${exercise.durationMin} min`}
                  </span>
                </div>
              ) : exercise.durationMin && !exercise.sets ? (
                <div className="flex items-center gap-4 text-muted-foreground">
                  <span className="text-4xl font-bold text-foreground">
                    {exercise.durationMin < 1 
                      ? `${Math.round(exercise.durationMin * 60)} sec` 
                      : `${exercise.durationMin} min`}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-4 text-muted-foreground">
                  <span className="text-4xl font-bold text-foreground">
                    {exercise.sets} × Sets
                  </span>
                </div>
              )}
              
              {/* Weight if present */}
              {exercise.suggestedKg && exercise.suggestedKg > 0 && (
                <div className="text-lg text-muted-foreground">
                  Weight: <span className="font-semibold text-secondary">{exercise.suggestedKg}kg</span>
                </div>
              )}
              
              {/* Rehab label */}
              <div className="text-sm text-blue-400">Rehab Exercise</div>
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
                  Target: <span className="font-semibold text-secondary">
                    {exercise.durationMin < 1 
                      ? `${Math.round(exercise.durationMin * 60)} sec` 
                      : `${exercise.durationMin} min`}
                  </span>
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
                <span className="text-sm text-muted-foreground">
                  • {exercise.exercises?.length || 0} exercises per round
                </span>
              </div>
              {exercise.exercises && exercise.exercises.length > 0 && (
                <div className="text-lg space-y-2 mt-3">
                  {exercise.exercises.map((ex: any, idx: number) => {
                    let displayName = ex.name;
                    
                    // Add distance to name in brackets (only if explicitly set and reasonable: 0.01km to 100km)
                    if (ex.targetDistanceKm && ex.targetDistanceKm >= 0.01 && ex.targetDistanceKm <= 100) {
                      const meters = Math.round(ex.targetDistanceKm * 1000);
                      displayName = `${ex.name} [${meters}m]`;
                    }
                    
                    return (
                      <div key={idx} className="flex items-center gap-2 flex-wrap">
                        <span className="text-foreground text-xl">→</span>
                        <span className="text-foreground">{displayName}</span>
                        {(ex.reps || ex.suggestedKg || ex.durationMin) && (
                          <span className="font-semibold text-foreground/70">
                            (
                            {ex.reps && <span>{ex.reps} reps</span>}
                            {ex.reps && ex.suggestedKg && <span> • </span>}
                            {ex.suggestedKg && <span style={{ color: "#FFB74D" }}>{ex.suggestedKg}kg</span>}
                            {(ex.reps || ex.suggestedKg) && ex.durationMin && <span> • </span>}
                            {ex.durationMin && (
                              <span>
                                {ex.durationMin < 1 
                                  ? `${Math.round(ex.durationMin * 60)} sec` 
                                  : `${ex.durationMin} min`}
                              </span>
                            )}
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
                    
                    // Add distance to name in brackets (only if explicitly set and reasonable: 0.01km to 100km)
                    if (ex.targetDistanceKm && ex.targetDistanceKm >= 0.01 && ex.targetDistanceKm <= 100) {
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
                            {ex.durationMin && (
                              <span>
                                {ex.durationMin < 1 
                                  ? `${Math.round(ex.durationMin * 60)} sec` 
                                  : `${ex.durationMin} min`}
                              </span>
                            )}
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
          <div className="absolute top-2 right-2">
            <div className="bg-green-500 text-white rounded-full p-2 shadow-lg">
              <CheckCircle2 className="w-8 h-8" />
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
