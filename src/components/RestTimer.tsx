import { Button } from "@/components/ui/button";
import { Timer as TimerIcon } from "lucide-react";

interface RestTimerProps {
  onSelectDuration: (seconds: number) => void;
}

export function RestTimer({ onSelectDuration }: RestTimerProps) {
  const presets = [30, 60, 90];

  return (
    <div className="flex items-center gap-3">
      <TimerIcon className="w-5 h-5 text-muted-foreground" />
      <span className="text-sm font-medium text-muted-foreground">Rest:</span>
      {presets.map((duration) => (
        <Button
          key={duration}
          variant="outline"
          size="sm"
          onClick={() => onSelectDuration(duration)}
          className="font-bold"
        >
          {duration}s
        </Button>
      ))}
    </div>
  );
}
