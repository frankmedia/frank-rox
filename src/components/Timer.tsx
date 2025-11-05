import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useWorkoutSession } from "@/contexts/WorkoutSessionContext";
import { workoutCues } from "@/utils/workoutCues";

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
  const mountedRef = useRef(true);
  
  console.log('⏱️ Timer render:', { mode, initialSeconds, autoStart, seconds, isRunning });

  // Use global workout session to keep screen awake
  const { startWorkoutSession, endWorkoutSession, isWakeLockActive } = useWorkoutSession();
  
  // Track mount/unmount for cleanup
  useEffect(() => {
    mountedRef.current = true;
    console.log('⏱️ Timer mounted');
    
    return () => {
      mountedRef.current = false;
      console.log('⏱️ Timer unmounted');
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        console.log('⏱️ Timer interval cleared on unmount');
      }
    };
  }, []);
  
  // Reset timer if initialSeconds changes
  useEffect(() => {
    console.log('⏱️ initialSeconds changed:', { old: seconds, new: initialSeconds });
    setSeconds(initialSeconds);
  }, [initialSeconds]);
  
  // Start/stop global workout session when timer runs
  // Also announce "GO!" when auto-starting
  useEffect(() => {
    if (isRunning) {
      startWorkoutSession();
    }
    // Note: We don't end the session when timer stops - only when workout is complete/exited
  }, [isRunning, startWorkoutSession]);
  
  // Announce "GO!" when timer first starts (autoStart or manual)
  const hasAnnouncedStart = useRef(false);
  useEffect(() => {
    if (isRunning && !hasAnnouncedStart.current) {
      workoutCues.start();
      hasAnnouncedStart.current = true;
    }
    if (!isRunning && seconds === initialSeconds) {
      // Reset flag when timer is reset
      hasAnnouncedStart.current = false;
    }
  }, [isRunning, seconds, initialSeconds]);
  
  // Memoized completion callback to prevent unnecessary re-renders
  const handleComplete = useCallback(() => {
    if (!mountedRef.current) {
      console.warn('⏱️ Timer completed but component is unmounted');
      return;
    }
    console.log('⏱️ Timer completed, calling onComplete');
    onComplete?.();
  }, [onComplete]);

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
    console.log('⏱️ Timer interval effect triggered:', { isRunning, mode });
    
    if (isRunning) {
      // Clear any existing interval first (defensive)
      if (intervalRef.current) {
        console.log('⏱️ Clearing existing interval before creating new one');
        clearInterval(intervalRef.current);
      }
      
      intervalRef.current = window.setInterval(() => {
        if (!mountedRef.current) {
          console.warn('⏱️ Timer tick but component is unmounted, clearing interval');
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
          return;
        }
        
        setSeconds((prev) => {
          if (mode === "countdown") {
            // Play beep at specific times:
            // - 1 minute (60s), 30s, and every second from 5s to 1s
            if (prev === 60 || prev === 30 || (prev > 0 && prev <= 5)) {
              playBeep(prev);
            }
            
            // Voice cues at specific times
            if (prev === 60) {
              workoutCues.lastMinute();
            } else if (prev === 30) {
              workoutCues.last30Seconds();
            } else if (prev === 10) {
              workoutCues.last10Seconds();
            } else if (prev <= 3 && prev > 0) {
              workoutCues.countdown(prev);
            }
            
            if (prev <= 1) {
              console.log('⏱️ Countdown reached 0, stopping timer');
              setIsRunning(false);
              workoutCues.finish();
              handleComplete();
              return 0;
            }
            return prev - 1;
          } else {
            // Stopwatch mode - count up and announce milestones
            const newTime = prev + 1;
            
            // Announce every minute
            if (newTime % 60 === 0 && newTime > 0) {
              const minutes = newTime / 60;
              workoutCues.lapComplete(minutes); // e.g., "Lap 1 complete", "Lap 2 complete"
            }
            
            return newTime;
          }
        });
      }, 1000);
      
      console.log('⏱️ Timer interval started:', intervalRef.current);
    } else {
      if (intervalRef.current) {
        console.log('⏱️ Timer paused, clearing interval');
        clearInterval(intervalRef.current);
        intervalRef.current = undefined;
      }
    }

    return () => {
      if (intervalRef.current) {
        console.log('⏱️ Timer interval effect cleanup, clearing interval');
        clearInterval(intervalRef.current);
        intervalRef.current = undefined;
      }
    };
  }, [isRunning, mode, handleComplete]);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const reset = () => {
    console.log('⏱️ Timer reset');
    setIsRunning(false);
    setSeconds(initialSeconds);
  };
  
  // Handle page visibility changes (mobile browsers often pause timers when tab is hidden)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('⏱️ Page hidden, timer state:', { isRunning, seconds });
      } else {
        console.log('⏱️ Page visible again, timer state:', { isRunning, seconds });
        // Timer should continue automatically since state is preserved
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isRunning, seconds]);

  const isLastFive = mode === "countdown" && seconds > 0 && seconds <= 5;
  
  return (
    <div 
      className={`flex flex-col items-center gap-6 w-full transition-all p-6 ${
        isLastFive && isRunning ? 'animate-pulse' : ''
      }`}
      style={{ 
        backgroundColor: isLastFive && isRunning ? '#EF4444' : 'transparent',
      }}
      data-timer-elapsed={seconds}
    >
      {/* Wake Lock Status Indicator */}
        {isRunning && (
          <div className="flex items-center justify-center mb-2">
            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
          </div>
        )}
      
      {/* Tap timer to start/pause */}
      <div 
        className={`font-bold tabular-nums cursor-pointer select-none active:scale-95 transition-all text-center ${
          isRunning ? 'opacity-100 animate-breathe' : 'opacity-40'
        }`}
        style={{ 
          fontSize: 'clamp(95px, 23.4vw, 214px)', 
          lineHeight: '1.1',
          color: isLastFive && isRunning ? '#FFFFFF' : 'hsl(var(--primary))',
        }}
        onClick={() => {
          if (!isRunning) {
            // Starting timer - say "GO!"
            workoutCues.start();
          } else {
            // Pausing timer
            workoutCues.pause();
          }
          setIsRunning(!isRunning);
        }}
      >
        {formatTime(seconds)}
      </div>
      
      {/* Add CSS animation for subtle pulse effect - once every 10 seconds */}
      <style>{`
        @keyframes subtle-pulse {
          0%, 95%, 100% { opacity: 1; transform: scale(1); }
          97.5% { opacity: 0.97; transform: scale(1.003); }
        }
        .animate-breathe {
          animation: subtle-pulse 10s ease-in-out infinite;
        }
      `}</style>
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
