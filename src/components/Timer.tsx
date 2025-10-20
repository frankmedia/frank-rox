import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw } from "lucide-react";

interface TimerProps {
  mode: "stopwatch" | "countdown";
  initialSeconds?: number;
  onComplete?: () => void;
}

export function Timer({ mode, initialSeconds = 0, onComplete }: TimerProps) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<number>();

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = window.setInterval(() => {
        setSeconds((prev) => {
          if (mode === "countdown") {
            if (prev <= 1) {
              setIsRunning(false);
              onComplete?.();
              return 0;
            }
            return prev - 1;
          } else {
            return prev + 1;
          }
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, mode, onComplete]);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const reset = () => {
    setIsRunning(false);
    setSeconds(initialSeconds);
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-8xl font-bold tabular-nums text-primary">
        {formatTime(seconds)}
      </div>
      <div className="flex gap-3">
        <Button
          size="lg"
          variant={isRunning ? "secondary" : "default"}
          onClick={() => setIsRunning(!isRunning)}
          className="rounded-full w-16 h-16"
        >
          {isRunning ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
        </Button>
        <Button
          size="lg"
          variant="outline"
          onClick={reset}
          className="rounded-full w-16 h-16"
        >
          <RotateCcw className="w-6 h-6" />
        </Button>
      </div>
    </div>
  );
}
