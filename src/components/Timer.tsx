import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useWakeLock } from "@/hooks/useWakeLock";

interface TimerProps {
  mode: "stopwatch" | "countdown";
  initialSeconds?: number;
  autoStart?: boolean;
  onComplete?: () => void;
  onCancel?: () => void;
}

export function Timer({ mode, initialSeconds = 0, autoStart = false, onComplete, onCancel }: TimerProps) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(autoStart);
  const intervalRef = useRef<number>();
  const audioContextRef = useRef<AudioContext | null>(null);

  // Keep screen awake during timer
  useWakeLock(isRunning);

  // Create beep sound
  const playBeep = (secondsLeft: number) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const context = audioContextRef.current;
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      
      if (secondsLeft === 1) {
        // Last second: longest, lowest pitch beep (completion signal)
        oscillator.frequency.value = 500;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.5, context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 1.5);
        
        oscillator.start(context.currentTime);
        oscillator.stop(context.currentTime + 1.5); // 1.5 seconds
      } else if (secondsLeft <= 5) {
        // Last 5 seconds: medium beeps for countdown
        oscillator.frequency.value = 900;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.35, context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.12);
        
        oscillator.start(context.currentTime);
        oscillator.stop(context.currentTime + 0.12);
      } else if (secondsLeft === 30) {
        // 30 seconds warning: single beep
        oscillator.frequency.value = 700;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.15);
        
        oscillator.start(context.currentTime);
        oscillator.stop(context.currentTime + 0.15);
      } else if (secondsLeft === 60) {
        // 1 minute warning: single beep
        oscillator.frequency.value = 650;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.15);
        
        oscillator.start(context.currentTime);
        oscillator.stop(context.currentTime + 0.15);
      }
    } catch (error) {
      console.error('Audio playback failed:', error);
    }
  };

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = window.setInterval(() => {
        setSeconds((prev) => {
          if (mode === "countdown") {
            // Play beep at specific times:
            // - 1 minute (60s), 30s, and every second from 5s to 1s
            if (prev === 60 || prev === 30 || (prev > 0 && prev <= 5)) {
              playBeep(prev);
            }
            
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

  const isLastFive = mode === "countdown" && seconds > 0 && seconds <= 5;
  
  return (
    <div 
      className={`flex flex-col items-center gap-6 w-full transition-all p-6 ${
        isLastFive && isRunning ? 'animate-pulse' : ''
      }`}
      style={{ 
        backgroundColor: isLastFive && isRunning ? '#EF4444' : 'transparent',
      }}
    >
      {/* Tap timer to start/pause */}
      <div 
        className={`font-bold tabular-nums cursor-pointer select-none active:scale-95 transition-all text-center ${
          isRunning ? 'opacity-100' : 'opacity-40'
        }`}
        style={{ 
          fontSize: 'clamp(95px, 23.4vw, 214px)', 
          lineHeight: '1.1',
          color: isLastFive && isRunning ? '#FFFFFF' : 'hsl(var(--primary))',
        }}
        onClick={() => setIsRunning(!isRunning)}
      >
        {formatTime(seconds)}
      </div>
      <div className="mt-12">
        {/* Stop button (resets timer) */}
        <div className="flex justify-center">
          <Button
            size="lg"
            variant="outline"
            onClick={reset}
            className="rounded-full w-20 h-20 text-lg"
            style={{
              color: isLastFive && isRunning ? '#FFFFFF' : undefined,
              borderColor: isLastFive && isRunning ? '#FFFFFF' : undefined,
            }}
          >
            Stop
          </Button>
        </div>
      </div>
    </div>
  );
}
