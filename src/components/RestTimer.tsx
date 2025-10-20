import { Button } from "@/components/ui/button";
import { Timer as TimerIcon } from "lucide-react";

interface RestTimerProps {
  onSelectDuration: (seconds: number) => void;
}

export function RestTimer({ onSelectDuration }: RestTimerProps) {
  const presets = [30, 60, 90];

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
          {duration}s
        </Button>
      ))}
    </div>
  );
}
