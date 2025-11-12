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
  // Start paused; if autoStart is true we'll run a separate 5s ready phase then start.
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<number>();
  const audioContextRef = useRef<AudioContext | null>(null);
  const longPressTimerRef = useRef<number>();
  const [isLongPressing, setIsLongPressing] = useState(false);
  const mountedRef = useRef(true);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hasStartedRef = useRef(false);
  const [readyLeft, setReadyLeft] = useState<number>(0); // 5s pre-start
  const readyIntervalRef = useRef<number>();
  
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
      if (readyIntervalRef.current) {
        clearInterval(readyIntervalRef.current);
      }
    };
  }, []);
  
  // External control via CustomEvents on the container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const toggleHandler = (e: Event) => {
      const action = (e as CustomEvent<{ action?: 'pause' | 'resume' | 'toggle' }>).detail?.action;
      if (action === 'pause') {
        setIsRunning(false);
      } else if (action === 'resume') {
        hasStartedRef.current = true;
        setIsRunning(true);
      } else {
        setIsRunning((prev) => {
          const next = !prev;
          if (next) hasStartedRef.current = true;
          return next;
        });
      }
    };
    const stopHandler = () => {
      reset();
    };
    el.addEventListener('timer:toggle' as any, toggleHandler as any);
    el.addEventListener('timer:stop' as any, stopHandler as any);
    return () => {
      el.removeEventListener('timer:toggle' as any, toggleHandler as any);
      el.removeEventListener('timer:stop' as any, stopHandler as any);
    };
  }, []);
  
  // Reset timer if initialSeconds changes before first user start.
  useEffect(() => {
    console.log('⏱️ initialSeconds changed:', { old: seconds, new: initialSeconds });
    if (!hasStartedRef.current) {
      setSeconds(initialSeconds);
    }
  }, [initialSeconds]);

  // Auto-start with a 5s ready phase if requested
  useEffect(() => {
    if (autoStart && !hasStartedRef.current && readyLeft === 0) {
      setReadyLeft(5);
      readyIntervalRef.current = window.setInterval(() => {
        setReadyLeft((prev) => {
          const next = prev - 1;
          if (next <= 0) {
            if (readyIntervalRef.current) clearInterval(readyIntervalRef.current);
            hasStartedRef.current = true;
            setIsRunning(true);
            // Best-effort start beep
            ensureAudio().then(() => playBeep(60));
            return 0;
          } else {
            // Countdown beeps
            ensureAudio().then(() => playBeep(Math.min(5, next)));
            return next;
          }
        });
      }, 1000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);
  
  // Start/stop global workout session when timer runs
  // Also announce "GO!" when auto-starting
  useEffect(() => {
    if (isRunning) {
      startWorkoutSession();
    }
    // Note: We don't end the session when timer stops - only when workout is complete/exited
  }, [isRunning, startWorkoutSession]);
  
  // Track if we've announced start (only announce on user click, not autoStart)
  const hasAnnouncedStart = useRef(false);
  
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
      if (context.state === 'suspended') {
        // Best-effort resume; must be triggered by a user gesture
        context.resume().catch(() => {});
      }
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
        // Pause cue: slightly longer/warmer tone
        oscillator.frequency.value = 640;
        oscillator.type = 'triangle';
        
        gainNode.gain.setValueAtTime(0.35, context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.28);
        
        oscillator.start(context.currentTime);
        oscillator.stop(context.currentTime + 0.28);
      } else if (secondsLeft === 60) {
        // Start/Resume cue: fuller, longer tone
        oscillator.frequency.value = 560;
        oscillator.type = 'triangle';
        
        gainNode.gain.setValueAtTime(0.45, context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.4);
        
        oscillator.start(context.currentTime);
        oscillator.stop(context.currentTime + 0.4);
      }
    } catch (error) {
      console.error('Audio playback failed:', error);
    }
  };

  const ensureAudio = async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') {
      try { await ctx.resume(); } catch {}
    }
    return ctx;
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
              // Ensure a final completion beep even if last-second cadence didn't fire
              playBeep(1);
              workoutCues.finish();
              handleComplete();
              return 0;
            }
            return Math.max(0, Math.floor(prev - 1));
          } else {
            // Stopwatch mode - count up and announce milestones
            const newTime = Math.floor(prev + 1);
            
            // Announce every minute
            if (newTime % 60 === 0 && newTime > 0) {
              const minutes = newTime / 60;
              workoutCues.lapComplete(minutes); // e.g., "Lap 1 complete", "Lap 2 complete"
            }
            
            return Math.max(0, newTime);
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
    if (isRunning) {
      // End beep on manual stop
      playBeep(1);
    }
    setIsRunning(false);
    // Keep current display value so users can still see their elapsed/remaining time
    // (Don't reset to initialSeconds here; parent can reset by remounting component)
    // Notify parent so it can reveal follow-up inputs (e.g., distance entry)
    onCancel?.();
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
  const progressPct = (() => {
    if (mode !== "countdown" || !initialSeconds || initialSeconds <= 0) return 0;
    const elapsed = Math.max(0, initialSeconds - seconds);
    const pct = (elapsed / initialSeconds) * 100;
    return Math.min(100, Math.max(0, pct));
  })();
  
  return (
    <div 
      ref={containerRef}
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
      
      {/* Progress bar (countdown only) */}
      {mode === "countdown" && initialSeconds > 0 && (
        <div className="w-full">
          <div className="w-full h-2 rounded-full bg-secondary/20 overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
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
          if (readyLeft > 0) {
            // Already in ready phase; ignore taps
            return;
          }
          if (!isRunning) {
            // Starting timer - say "GO!" (only on first start)
            if (!hasAnnouncedStart.current) {
              workoutCues.start();
              hasAnnouncedStart.current = true;
            }
            hasStartedRef.current = true;
            // Unlock and play a short start beep
            ensureAudio().then(() => playBeep(60));
          } else {
            // Pausing timer
            workoutCues.pause();
            ensureAudio().then(() => playBeep(30));
          }
          setIsRunning(!isRunning);
        }}
      >
        {readyLeft > 0 ? readyLeft : formatTime(seconds)}
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
