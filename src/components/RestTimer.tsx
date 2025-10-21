import { Button } from "@/components/ui/button";
import { Timer as TimerIcon } from "lucide-react";

interface RestTimerProps {
  onSelectDuration: (seconds: number) => void;
  exerciseType?: "weights" | "cardio" | "bodyweight" | "mobility" | "running";
}

export function RestTimer({ onSelectDuration, exerciseType }: RestTimerProps) {
  // For cardio/mobility/running exercises, show longer rest intervals in minutes
  // For weights/bodyweight, show shorter intervals in seconds
  const isLongDuration = exerciseType === "cardio" || exerciseType === "mobility" || exerciseType === "running";
  
  const presets = isLongDuration 
    ? [120, 180, 300] // 2min, 3min, 5min for cardio/mobility
    : [30, 60, 90];    // 30s, 60s, 90s for weights/bodyweight

  return (
    <div className="flex items-center gap-3 justify-center">
      <TimerIcon className="w-6 h-6 text-muted-foreground" />
      <span className="text-lg font-medium text-muted-foreground">Rest:</span>
      {presets.map((duration) => (
        <Button
          key={duration}
          variant="outline"
          size="lg"
          onClick={() => onSelectDuration(duration)}
          className="font-bold text-xl px-6 h-14"
        >
          {isLongDuration ? `${duration / 60}min` : `${duration}s`}
        </Button>
      ))}
    </div>
  );
}
