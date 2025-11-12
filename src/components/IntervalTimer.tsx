/**
 * IntervalTimer Component
 * 
 * A specialized timer for running interval training (e.g., 6×500m @ 90s rest).
 * 
 * Key Features:
 * - Shows "Round X of Y" progress
 * - STOPWATCH mode for each interval (counts up, not down)
 * - "STOP & SAVE" button to record time for each interval
 * - REST timer (countdown) between intervals
 * - Auto-advances to next round after rest
 * - Records all interval times for analysis
 * - Voice cues and beeps for transitions
 * 
 * Usage:
 * ```tsx
 * <IntervalTimer
 *   totalRounds={6}
 *   targetDistance={0.5} // 500m in km
 *   restSeconds={90}
 *   exerciseName="Run"
 *   onComplete={(times) => {
 *     // times = [125, 128, 126, 130, 127, 129] (seconds for each interval)
 *   }}
 * />
 * ```
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Timer as TimerIcon, Play, Pause, TrendingUp, TrendingDown, Award } from "lucide-react";
import { toast } from "sonner";
import { triggerSuccessHaptic } from "@/utils/haptics";
import { workoutCues } from "@/utils/workoutCues";
import { useWorkoutSession } from "@/contexts/WorkoutSessionContext";
import { FlameRating } from "@/components/FlameRating";

interface IntervalTimerProps {
  /** Total number of intervals/rounds (e.g., 6 for "6×500m") */
  totalRounds: number;
  
  /** Target distance per interval in kilometers (e.g., 0.5 for 500m) */
  targetDistance: number;
  
  /** Rest duration between intervals in seconds (e.g., 90) */
  restSeconds: number;
  
  /** Exercise name for voice cues (e.g., "Run") */
  exerciseName?: string;
  
  /** Called when all intervals are complete with array of times in seconds and rating */
  onComplete: (intervalTimes: number[], rating: number) => void;
  
  /** Called when user cancels the workout */
  onCancel?: () => void;
}

type Phase = "GET_READY" | "WORK" | "REST" | "COMPLETE";

export function IntervalTimer({
  totalRounds,
  targetDistance,
  restSeconds,
  exerciseName = "Run",
  onComplete,
  onCancel,
}: IntervalTimerProps) {
  // Current state
  const [phase, setPhase] = useState<Phase>("GET_READY");
  const [currentRound, setCurrentRound] = useState(1);
  const [timeElapsed, setTimeElapsed] = useState(0); // For stopwatch (work phase)
  const [timeRemaining, setTimeRemaining] = useState(10); // For countdown (get ready & rest phases)
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  // Store completed interval times (in seconds)
  const [intervalTimes, setIntervalTimes] = useState<number[]>([]);
  
  // Rating for completed workout
  const [rating, setRating] = useState(0);
  
  // Refs
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  
  // Wake lock for screen
  const { startWorkoutSession, endWorkoutSession } = useWorkoutSession();
  
  // Format distance for display
  const distanceDisplay = targetDistance < 1 
    ? `${Math.round(targetDistance * 1000)}m` 
    : `${targetDistance}km`;
  
  console.log('⏱️ IntervalTimer mounted:', {
    totalRounds,
    targetDistance,
    distanceDisplay,
    restSeconds,
    phase,
    currentRound,
  });
  
  // Keep screen awake during workout
  useEffect(() => {
    if (isRunning && !isPaused && phase !== "COMPLETE") {
      startWorkoutSession();
    }
    return () => {
      if (phase === "COMPLETE") {
        endWorkoutSession();
      }
    };
  }, [isRunning, isPaused, phase, startWorkoutSession, endWorkoutSession]);
  
  // Freeze page scrolling when timer is active
  useEffect(() => {
    const shouldFreeze = isRunning && phase !== "COMPLETE";
    
    if (shouldFreeze) {
      // Prevent scrolling
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.top = `-${window.scrollY}px`;
    } else {
      // Re-enable scrolling
      const scrollY = document.body.style.top;
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    }
    
    return () => {
      // Cleanup on unmount
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
    };
  }, [isRunning, phase]);
  
  // Initialize audio context
  const ensureAudio = useCallback(async () => {
    if (typeof window === 'undefined') return null;
    const AudioCtor = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | undefined;
    if (!AudioCtor) {
      console.warn('AudioContext not supported');
      return null;
    }

    if (!audioRef.current) {
      audioRef.current = new AudioCtor();
    }

    if (audioRef.current.state === 'suspended') {
      try {
        await audioRef.current.resume();
      } catch (err) {
        console.warn('Unable to resume audio context', err);
      }
    }

    return audioRef.current;
  }, []);
  
  // Play beep sound
  const playBeep = useCallback(async (frequency: number = 820, duration: number = 0.2) => {
    const context = await ensureAudio();
    if (!context) return;
    
    try {
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      
      gainNode.gain.setValueAtTime(0.4, context.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + duration);
      
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      
      oscillator.start(context.currentTime);
      oscillator.stop(context.currentTime + duration);
    } catch (err) {
      console.error('🔇 Error playing beep:', err);
    }
  }, [ensureAudio]);
  
  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current && audioRef.current.state !== 'closed') {
        audioRef.current.close().catch(() => undefined);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);
  
  // Main timer logic
  useEffect(() => {
    if (!isRunning || isPaused) return;
    
    timerRef.current = setInterval(() => {
      if (phase === "GET_READY" || phase === "REST") {
        // Countdown mode
        setTimeRemaining((prev) => {
          if (prev <= 0) {
            advancePhase();
            return 0;
          }
          
          // Beep and voice cues at specific times
          if (prev === 3 || prev === 2 || prev === 1) {
            playBeep();
            triggerSuccessHaptic();
            workoutCues.countdown(prev);
          }
          
          if (prev === 10) {
            workoutCues.last10Seconds();
          }
          
          return prev - 1;
        });
      } else if (phase === "WORK") {
        // Stopwatch mode - count up
        setTimeElapsed((prev) => {
          const newTime = prev + 1;
          
          // Announce every minute
          if (newTime % 60 === 0 && newTime > 0) {
            const minutes = newTime / 60;
            workoutCues.lapComplete(minutes);
          }
          
          return newTime;
        });
      }
    }, 1000);
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, isPaused, phase, playBeep]);
  
  // Advance to next phase
  const advancePhase = () => {
    if (phase === "GET_READY") {
      // Start first interval
      setPhase("WORK");
      setTimeElapsed(0);
      workoutCues.start();
      playBeep(560, 0.4); // Start beep
    } else if (phase === "REST") {
      // Start next interval
      setPhase("WORK");
      setTimeElapsed(0);
      workoutCues.start();
      playBeep(560, 0.4); // Start beep
    }
  };
  
  // Handle "STOP & SAVE" button click (end of interval)
  const handleStopInterval = () => {
    if (phase !== "WORK") return;
    
    // Save the time for this interval
    const newIntervalTimes = [...intervalTimes, timeElapsed];
    setIntervalTimes(newIntervalTimes);
    
    triggerSuccessHaptic();
    playBeep(500, 0.5); // Completion beep
    
    console.log(`✅ Interval ${currentRound} completed in ${timeElapsed}s`);
    
    // Check if this was the last interval
    if (currentRound === totalRounds) {
      // Workout complete! Show summary screen
      setPhase("COMPLETE");
      setIsRunning(false);
      workoutCues.finish();
      toast.success("🎉 Interval Training Complete!", {
        description: `Completed ${totalRounds} × ${distanceDisplay}`,
        duration: 5000,
      });
      // DON'T call onComplete yet - wait for user to rate and click COMPLETE button
    } else {
      // Move to rest phase
      setPhase("REST");
      setTimeRemaining(restSeconds);
      setCurrentRound(currentRound + 1);
      
      // Announce round complete and rest
      toast.success(`Round ${currentRound} Complete!`, {
        description: `Time: ${formatTime(timeElapsed)}. Rest for ${restSeconds}s.`,
        duration: 3000,
      });
      
      // Announce rest period
      setTimeout(() => {
        workoutCues.pause();
      }, 500);
    }
  };
  
  // Handle start button (from GET_READY phase)
  const handleStart = () => {
    setIsRunning(true);
    setTimeRemaining(10); // 10 second countdown
  };
  
  // Handle pause/resume during work phase
  const handleTogglePause = () => {
    if (phase === "WORK") {
      setIsPaused(!isPaused);
      if (!isPaused) {
        workoutCues.pause();
      } else {
        workoutCues.start();
      }
    }
  };
  
  // Handle cancel
  const handleCancel = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRunning(false);
    endWorkoutSession();
    onCancel?.();
  };
  
  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Calculate average pace (min/km)
  const calculatePace = (seconds: number) => {
    if (targetDistance === 0) return "0:00";
    const paceMinPerKm = seconds / 60 / targetDistance;
    const paceMin = Math.floor(paceMinPerKm);
    const paceSec = Math.round((paceMinPerKm - paceMin) * 60);
    return `${paceMin}:${paceSec.toString().padStart(2, '0')}`;
  };
  
  // Calculate progress percentage
  const progressPercentage = phase === "COMPLETE" 
    ? 100 
    : ((currentRound - 1) / totalRounds) * 100;
  
  return (
    <div className="flex flex-col items-center gap-6 w-full p-6 pt-20">
      {/* Progress Bar */}
      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
        <div 
          className="h-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
      
      {/* Header: Round Progress */}
      <Card className="w-full p-6 bg-yellow-500/5 border-yellow-500/30">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-2">
            {phase === "COMPLETE" ? "Workout Complete" : "Interval Training"}
          </p>
          <h2 className="text-4xl font-bold">
            Round {currentRound} of {totalRounds}
          </h2>
          <p className="text-2xl text-yellow-500 mt-2">
            {distanceDisplay}
          </p>
        </div>
      </Card>
      
      {/* Main Timer Display */}
      <div className="w-full">
        {phase === "GET_READY" && (
          <Card className="p-8 bg-yellow-500/10 border-yellow-500">
            <div className="text-center space-y-6">
              <TimerIcon className="w-16 h-16 mx-auto text-yellow-500" />
              <h3 className="text-3xl font-bold">Get Ready!</h3>
              <p className="text-lg text-muted-foreground">
                {restSeconds}s rest between intervals
              </p>
              {!isRunning ? (
                <Button
                  size="lg"
                  onClick={handleStart}
                  className="h-20 px-16 text-3xl font-bold w-full"
                  style={{ backgroundColor: '#FFCC00', color: '#000' }}
                >
                  START WORKOUT
                </Button>
              ) : (
                <div className="space-y-4">
                  <p className="text-6xl font-bold tabular-nums">
                    {timeRemaining}
                  </p>
                </div>
              )}
            </div>
          </Card>
        )}
        
        {phase === "WORK" && (
          <Card className="p-8 bg-green-500/10 border-green-500">
            <div className="text-center space-y-6">
              {/* Stopwatch Display */}
              <div 
                className="font-bold tabular-nums cursor-pointer select-none active:scale-95 transition-all"
                style={{ fontSize: 'clamp(80px, 20vw, 180px)', lineHeight: '1.1' }}
                onClick={handleTogglePause}
              >
                {formatTime(timeElapsed)}
              </div>
              
              {/* Pause/Resume indicator */}
              {isPaused && (
                <div className="flex items-center justify-center gap-2 text-yellow-500">
                  <Pause className="w-6 h-6" />
                  <span className="text-lg font-semibold">PAUSED - Tap timer to resume</span>
                </div>
              )}
              
              {/* Target Distance */}
              <div className="flex items-center justify-center gap-3">
                <span className="text-2xl text-muted-foreground">Target:</span>
                <span className="text-3xl font-bold text-green-500">{distanceDisplay}</span>
              </div>
              
              {/* Current Pace */}
              <div className="text-lg text-muted-foreground">
                Current pace: <span className="font-semibold text-foreground">{calculatePace(timeElapsed)}/km</span>
              </div>
              
              {/* Stop & Save Button */}
              <Button
                size="lg"
                onClick={handleStopInterval}
                disabled={isPaused}
                className="h-20 px-16 text-3xl font-bold w-full"
                style={{ backgroundColor: '#22c55e', color: '#fff' }}
              >
                STOP & SAVE
              </Button>
              
              {/* Pause/Resume Button */}
              <Button
                variant="outline"
                onClick={handleTogglePause}
                className="w-full h-12 text-lg"
              >
                {isPaused ? (
                  <>
                    <Play className="w-5 h-5 mr-2" />
                    Resume
                  </>
                ) : (
                  <>
                    <Pause className="w-5 h-5 mr-2" />
                    Pause
                  </>
                )}
              </Button>
            </div>
          </Card>
        )}
        
        {phase === "REST" && (
          <Card className="p-8 bg-blue-500/10 border-blue-500">
            <div className="text-center space-y-6">
              <h3 className="text-2xl font-bold">Rest Period</h3>
              
              {/* Countdown Timer */}
              <div 
                className="font-bold tabular-nums"
                style={{ 
                  fontSize: 'clamp(80px, 20vw, 180px)', 
                  lineHeight: '1.1',
                  color: timeRemaining <= 5 ? '#ef4444' : 'inherit'
                }}
              >
                {formatTime(timeRemaining)}
              </div>
              
              <p className="text-lg text-muted-foreground">
                Next: {distanceDisplay}
              </p>
              
              {/* Skip Rest Button */}
              <Button
                variant="outline"
                onClick={() => {
                  setTimeRemaining(0);
                  advancePhase();
                }}
                className="w-full h-12 text-lg"
              >
                Skip Rest
              </Button>
            </div>
          </Card>
        )}
        
        {phase === "COMPLETE" && (
          <div className="space-y-6 w-full">
            <Card className="p-8 bg-green-500/10 border-green-500">
              <div className="text-center space-y-6">
                <CheckCircle2 className="w-20 h-20 mx-auto text-green-500" />
                <h3 className="text-3xl font-bold">Workout Complete!</h3>
                
                {/* Summary Stats */}
                <div className="space-y-4 text-left">
                  <div className="flex justify-between text-lg">
                    <span className="text-muted-foreground">Total Distance:</span>
                    <span className="font-bold">{(targetDistance * totalRounds).toFixed(1)}km</span>
                  </div>
                  <div className="flex justify-between text-lg">
                    <span className="text-muted-foreground">Total Time:</span>
                    <span className="font-bold">
                      {formatTime(intervalTimes.reduce((sum, time) => sum + time, 0))}
                    </span>
                  </div>
                  <div className="flex justify-between text-lg">
                    <span className="text-muted-foreground">Average Pace:</span>
                    <span className="font-bold">
                      {calculatePace(intervalTimes.reduce((sum, time) => sum + time, 0) / totalRounds)}/km
                    </span>
                  </div>
                </div>
              </div>
            </Card>
            
            {/* Performance Analysis */}
            <Card className="p-6">
              <h4 className="text-xl font-bold mb-4 text-center">Performance Analysis</h4>
              <div className="space-y-4">
                {/* Best Lap */}
                {(() => {
                  const bestTime = Math.min(...intervalTimes);
                  const bestIdx = intervalTimes.indexOf(bestTime);
                  return (
                    <div className="flex items-center justify-between p-4 bg-green-500/10 rounded-lg border border-green-500/30">
                      <div className="flex items-center gap-3">
                        <Award className="w-6 h-6 text-green-500" />
                        <div>
                          <p className="text-sm text-muted-foreground">Fastest Lap</p>
                          <p className="font-bold">Round {bestIdx + 1}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-green-500">{formatTime(bestTime)}</p>
                        <p className="text-sm text-muted-foreground">{calculatePace(bestTime)}/km</p>
                      </div>
                    </div>
                  );
                })()}
                
                {/* Slowest Lap */}
                {(() => {
                  const slowestTime = Math.max(...intervalTimes);
                  const slowestIdx = intervalTimes.indexOf(slowestTime);
                  return (
                    <div className="flex items-center justify-between p-4 bg-red-500/10 rounded-lg border border-red-500/30">
                      <div className="flex items-center gap-3">
                        <TrendingDown className="w-6 h-6 text-red-500" />
                        <div>
                          <p className="text-sm text-muted-foreground">Slowest Lap</p>
                          <p className="font-bold">Round {slowestIdx + 1}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-red-500">{formatTime(slowestTime)}</p>
                        <p className="text-sm text-muted-foreground">{calculatePace(slowestTime)}/km</p>
                      </div>
                    </div>
                  );
                })()}
                
                {/* Consistency Score */}
                {(() => {
                  // Filter out outliers (rounds that are > 3x the median or < 0.1x the median)
                  // This prevents one bad round from skewing the consistency score
                  const sortedTimes = [...intervalTimes].sort((a, b) => a - b);
                  const median = sortedTimes[Math.floor(sortedTimes.length / 2)];
                  const filteredTimes = intervalTimes.filter(time => {
                    return time >= median * 0.1 && time <= median * 3;
                  });
                  
                  // Use filtered times for consistency, but need at least 2 rounds
                  const validTimes = filteredTimes.length >= 2 ? filteredTimes : intervalTimes;
                  const avgTime = validTimes.reduce((sum, time) => sum + time, 0) / validTimes.length;
                  const variance = validTimes.reduce((sum, time) => sum + Math.pow(time - avgTime, 2), 0) / validTimes.length;
                  const stdDev = Math.sqrt(variance);
                  
                  // Coefficient of Variation (CV) = stdDev / avgTime
                  // Consistency = 100 - (CV * 100), clamped between 0-100
                  // Lower CV = more consistent = higher score
                  const cv = avgTime > 0 ? stdDev / avgTime : 0;
                  const consistencyPercent = Math.max(0, Math.min(100, 100 - (cv * 100)));
                  
                  return (
                    <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <TrendingUp className="w-6 h-6 text-blue-500" />
                          <p className="font-bold">Consistency</p>
                        </div>
                        <p className="text-2xl font-bold text-blue-500">{consistencyPercent.toFixed(0)}%</p>
                      </div>
                      <div className="w-full bg-secondary/20 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all"
                          style={{ width: `${consistencyPercent}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {consistencyPercent > 90 ? "Excellent pacing!" : 
                         consistencyPercent > 75 ? "Good consistency" : 
                         "Try to maintain more even splits"}
                      </p>
                    </div>
                  );
                })()}
              </div>
            </Card>
            
            {/* Individual Interval Times */}
            <Card className="p-6">
              <h4 className="text-xl font-bold mb-4 text-center">Lap Times</h4>
              <div className="space-y-2">
                {intervalTimes.map((time, idx) => {
                  const avgTime = intervalTimes.reduce((sum, t) => sum + t, 0) / totalRounds;
                  const isFastest = time === Math.min(...intervalTimes);
                  const isSlowest = time === Math.max(...intervalTimes);
                  const diff = time - avgTime;
                  
                  return (
                    <div 
                      key={idx}
                      className={`flex items-center justify-between p-4 rounded-lg ${
                        isFastest ? 'bg-green-500/10 border border-green-500/30' :
                        isSlowest ? 'bg-red-500/10 border border-red-500/30' :
                        'bg-secondary/10'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {isFastest && <Award className="w-5 h-5 text-green-500" />}
                        <span className="font-semibold">Round {idx + 1}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xl font-bold">{formatTime(time)}</p>
                          <p className="text-sm text-muted-foreground">{calculatePace(time)}/km</p>
                        </div>
                        {diff !== 0 && (
                          <div className={`text-sm font-semibold ${diff > 0 ? 'text-red-500' : 'text-green-500'}`}>
                            {diff > 0 ? '+' : ''}{diff.toFixed(0)}s
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
            
            {/* Rating Section */}
            <Card className="p-6 rating-section">
              <h4 className="text-xl font-bold mb-4 text-center">How was your workout?</h4>
              <div className="flex justify-center">
                <FlameRating 
                  value={rating} 
                  onChange={(newRating) => {
                    setRating(newRating);
                    // Auto-complete when rating is selected
                    if (newRating > 0) {
                      setTimeout(() => {
                        triggerSuccessHaptic();
                        onComplete(intervalTimes, newRating);
                      }, 300); // Small delay for visual feedback
                    }
                  }} 
                  size="lg" 
                />
              </div>
            </Card>
          </div>
        )}
      </div>
      
      {/* Completed Intervals Progress */}
      {phase !== "GET_READY" && phase !== "COMPLETE" && (
        <Card className="w-full p-4">
          <div className="space-y-3">
            <p className="text-sm font-semibold text-center">Completed Intervals</p>
            <div className="flex gap-2 justify-center flex-wrap">
              {Array.from({ length: totalRounds }).map((_, idx) => (
                <div
                  key={idx}
                  className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                    idx < intervalTimes.length
                      ? 'bg-green-500 text-white'
                      : idx === currentRound - 1 && phase === "WORK"
                      ? 'bg-yellow-500 text-black animate-pulse'
                      : 'bg-secondary/20 text-muted-foreground'
                  }`}
                >
                  {idx < intervalTimes.length ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : (
                    idx + 1
                  )}
                </div>
              ))}
            </div>
            
            {/* Show completed times */}
            {intervalTimes.length > 0 && (
              <div className="text-center space-y-2 mt-4">
                <p className="text-sm font-semibold text-muted-foreground mb-2">Timed Intervals</p>
                {intervalTimes.map((time, idx) => (
                  <div key={idx} className="flex justify-between items-center px-4 py-2 bg-secondary/10 rounded-lg">
                    <span className="text-base font-semibold">Round {idx + 1}</span>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{formatTime(time)}</p>
                      <p className="text-sm text-muted-foreground">({calculatePace(time)}/km)</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}
      
      {/* Cancel Button */}
      {phase !== "COMPLETE" && (
        <Button
          variant="ghost"
          onClick={handleCancel}
          className="text-muted-foreground hover:text-foreground"
        >
          Cancel Workout
        </Button>
      )}
    </div>
  );
}

