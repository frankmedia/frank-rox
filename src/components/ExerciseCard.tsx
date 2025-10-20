import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Dumbbell, Medal } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExerciseCardProps {
  exercise: {
    id: string;
    name: string;
    type: "strength" | "cardio";
    sets?: number;
    reps?: number;
    suggestedKg?: number;
    durationMin?: number;
    targetDistanceKm?: number;
    personalBest?: string;
    completed?: boolean;
  };
  onClick?: () => void;
}

export function ExerciseCard({ exercise, onClick }: ExerciseCardProps) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden border-2 transition-all duration-300 cursor-pointer",
        exercise.completed
          ? "bg-secondary/20 border-secondary"
          : "bg-card hover:bg-card/80 border-border hover:border-secondary/50"
      )}
      onClick={onClick}
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {exercise.type === "strength" ? (
              <Dumbbell className="w-5 h-5 text-primary" />
            ) : (
              <Clock className="w-5 h-5 text-primary" />
            )}
            <h3 className="text-lg font-bold text-foreground">{exercise.name}</h3>
          </div>
          {exercise.personalBest && (
            <Badge className="bg-primary/10 text-primary border border-primary/20 font-bold">
              <Medal className="w-3 h-3 mr-1" />
              PB: {exercise.personalBest}
            </Badge>
          )}
        </div>

        <div className="space-y-2">
          {exercise.type === "strength" && (
            <div className="flex items-center gap-4 text-muted-foreground">
              <span className="text-4xl font-bold text-foreground">
                {exercise.sets} × {exercise.reps}
              </span>
              {exercise.suggestedKg && (
                <span className="text-lg">
                  Target: <span className="font-semibold text-secondary">{exercise.suggestedKg}kg</span>
                </span>
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
                  Target: <span className="font-semibold text-secondary">{exercise.targetDistanceKm}km</span>
                </span>
              )}
            </div>
          )}
        </div>

        {exercise.completed && (
          <div className="absolute top-0 right-0 w-16 h-16">
            <div className="absolute transform rotate-45 bg-secondary text-background text-xs font-bold py-1 right-[-30px] top-[10px] w-[100px] text-center">
              DONE
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
