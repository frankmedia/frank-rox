import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, Pause, SkipForward, X, Check, Hand } from 'lucide-react';
import { getStations } from '@/lib/hyroxStations';
import { formatTime } from '@/lib/utils';
import { HyroxType, WorkoutId } from '@/types';
import { useUser } from '@/contexts/UserContext';
import { hapticImpact, hapticVibrate, HapticsImpactStyle } from '@/utils/hapticsBridge';
import { soundEffects } from '@/utils/soundEffects';

export function Simulation() {
  const { type } = useParams<{ type: HyroxType }>();
  const navigate = useNavigate();
  const {
    addSimulationResult,
    entitlements,
    freeHyroxRunsRemaining,
    decrementHyroxTrial,
  } = useUser();
  const workoutId: WorkoutId =
    type === 'frank'
      ? 'frank_tank'
      : type === 'secret'
      ? 'kettlebell_secret'
      : type === 'deka'
      ? 'deka_strong'
      : type === 'deka_half'
      ? 'deka_half'
      : type === 'half'
      ? 'hyrox_half'
      : 'hyrox_full';

  // Load saved state from localStorage
  const loadSavedState = () => {
    try {
      const saved = localStorage.getItem('roxsim_active_workout');
      if (saved) {
        const state = JSON.parse(saved);
        // Only load if it's the same workout type
        if (state.type === type) {
          console.log('Loading saved workout state:', state);
          return state;
        }
      }
    } catch (err) {
      console.error('Error loading saved state:', err);
    }
    return null;
  };

  const savedState = loadSavedState();

  const [currentStationIndex, setCurrentStationIndex] = useState(savedState?.currentStationIndex || 0);
  const [isActive, setIsActive] = useState(savedState?.isActive || false);
  const [isInTransition, setIsInTransition] = useState(savedState?.isInTransition || false);
  const [currentTime, setCurrentTime] = useState(savedState?.currentTime || 0);
  const [transitionTime, setTransitionTime] = useState(savedState?.transitionTime || 0);
  const [totalTransitionTime, setTotalTransitionTime] = useState(savedState?.totalTransitionTime || 0);
  const [stationTimes, setStationTimes] = useState<number[]>(savedState?.stationTimes || []);
  const [stationStartTime, setStationStartTime] = useState(savedState?.stationStartTime || 0);
  const [lastStationTime, setLastStationTime] = useState(savedState?.lastStationTime || 0);
  const [isPressing, setIsPressing] = useState(false);
  const [pressProgress, setPressProgress] = useState(0);
  const [isPressingNext, setIsPressingNext] = useState(false);
  const [nextPressProgress, setNextPressProgress] = useState(0);
  const [preStartCountdown, setPreStartCountdown] = useState<number | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);

  const intervalRef = useRef<number | null>(null);
  const lastMinuteBeepRef = useRef<number>(0);
  const pressTimerRef = useRef<number | null>(null);
  const pressProgressIntervalRef = useRef<number | null>(null);
  const pressStartRef = useRef<number>(0);
  const nextPressTimerRef = useRef<number | null>(null);
  const nextPressProgressIntervalRef = useRef<number | null>(null);
  const stations = type ? getStations(type) : [];

  const currentStation = stations[currentStationIndex];
  const progress = Math.round(((currentStationIndex + 1) / stations.length) * 100);
  const isLastStation = currentStationIndex === stations.length - 1;

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (type && (isActive || isInTransition)) {
      const stateToSave = {
        type,
        currentStationIndex,
        isActive,
        isInTransition,
        currentTime,
        transitionTime,
        totalTransitionTime,
        stationTimes,
        stationStartTime,
        lastStationTime,
        timestamp: Date.now(),
      };
      localStorage.setItem('roxsim_active_workout', JSON.stringify(stateToSave));
      console.log('Workout state saved to localStorage');
    }
  }, [type, currentStationIndex, isActive, isInTransition, currentTime, transitionTime, totalTransitionTime, stationTimes, stationStartTime, lastStationTime]);

  // Clear saved state when workout is completed or exited
  const clearSavedState = () => {
    localStorage.removeItem('roxsim_active_workout');
    console.log('Cleared saved workout state');
  };

  // Main timer effect - runs during active exercise AND transition
  useEffect(() => {
    if (isActive || isInTransition) {
      intervalRef.current = window.setInterval(() => {
        setCurrentTime((prev) => prev + 1);
        if (isInTransition) {
          setTransitionTime((prev) => prev + 1);
        }
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
  }, [isActive, isInTransition]);

  // Minute marker beep and flash - only during active workout
  useEffect(() => {
    if (isActive && currentTime > 0 && currentTime % 60 === 0 && currentTime !== lastMinuteBeepRef.current) {
      lastMinuteBeepRef.current = currentTime;
      
      // Play beep
      soundEffects.playMinuteBeep();
      
      // Trigger yellow flash
      setIsFlashing(true);
      hapticImpact(HapticsImpactStyle.Medium);
      
      // Remove flash after 300ms
      setTimeout(() => {
        setIsFlashing(false);
      }, 300);
    }
  }, [currentTime, isActive]);

  const handleStart = async () => {
    if (type === 'frank' && !entitlements.hasFrankTheTank) {
      alert('Unlock Frank the Tank to start this workout.');
      navigate('/');
      return;
    }
    if (
      type &&
      (type === 'full' || type === 'half' || type === 'deka' || type === 'deka_half') &&
      !entitlements.hasHyroxPack &&
      freeHyroxRunsRemaining <= 0
    ) {
      alert('You have used all free trials. Unlock the Hyrox Pack to continue.');
      return;
    }
    await hapticImpact(HapticsImpactStyle.Medium);
    soundEffects.playStart();
    
    // Clear any old saved state when starting fresh
    if (currentTime === 0 && currentStationIndex === 0) {
      clearSavedState();
      console.log('Starting fresh simulation - cleared old saved state');
    }
    
    // Start 10-second pre-countdown
    setPreStartCountdown(10);
  };

  const handleStartNextStation = async () => {
    await hapticImpact(HapticsImpactStyle.Heavy);
    soundEffects.playStart();
    
    // End transition, add transition time to total
    setTotalTransitionTime((prev) => prev + transitionTime);
    setIsInTransition(false);
    setIsActive(true);
    setStationStartTime(currentTime);
    setTransitionTime(0); // Reset current transition time for next transition
  };

  // Pre-start countdown effect
  useEffect(() => {
    if (preStartCountdown !== null && preStartCountdown > 0) {
      const timer = setTimeout(() => {
        setPreStartCountdown(preStartCountdown - 1);
        // Beep on each second
        soundEffects.playCountdownBeep();
        hapticImpact(HapticsImpactStyle.Light);
      }, 1000);

      return () => clearTimeout(timer);
    } else if (preStartCountdown === 0) {
      // Countdown finished, start the workout!
      soundEffects.playStart();
      hapticImpact(HapticsImpactStyle.Heavy);
      setIsActive(true);
      setStationStartTime(0);
      setPreStartCountdown(null);
    }
  }, [preStartCountdown]);

  // Long press handlers for Start/Pause buttons
  const handlePressStart = (action: () => void) => {
    pressStartRef.current = Date.now();
    setIsPressing(true);
    setPressProgress(0);

    // Update progress bar
    pressProgressIntervalRef.current = window.setInterval(() => {
      const elapsed = Date.now() - pressStartRef.current;
      const progress = Math.min((elapsed / 1000) * 100, 100);
      setPressProgress(progress);

      if (progress >= 100 && pressProgressIntervalRef.current) {
        clearInterval(pressProgressIntervalRef.current);
      }
    }, 16); // ~60fps

    // Trigger action after 1 second
    pressTimerRef.current = window.setTimeout(async () => {
      if (pressProgressIntervalRef.current) {
        clearInterval(pressProgressIntervalRef.current);
      }
      await hapticImpact(HapticsImpactStyle.Heavy);
      action();
      setIsPressing(false);
      setPressProgress(0);
    }, 1000);
  };

  const handlePressEnd = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    if (pressProgressIntervalRef.current) {
      clearInterval(pressProgressIntervalRef.current);
      pressProgressIntervalRef.current = null;
    }
    setIsPressing(false);
    setPressProgress(0);
  };

  // Long press handlers for Complete/Next button (0.35 seconds - 30% faster)
  const handleNextPressStart = (action: () => void) => {
    setIsPressingNext(true);
    setNextPressProgress(0);

    // Update progress bar
    nextPressProgressIntervalRef.current = window.setInterval(() => {
      setNextPressProgress((prev) => Math.min(prev + 5, 100));
    }, 17.5); // Update every 17.5ms for smooth progress (350ms / 20 = 17.5ms)

    // Trigger action after 0.35 seconds
    nextPressTimerRef.current = window.setTimeout(async () => {
      if (nextPressProgressIntervalRef.current) {
        clearInterval(nextPressProgressIntervalRef.current);
      }
      await hapticImpact(HapticsImpactStyle.Heavy);
      action();
      setIsPressingNext(false);
      setNextPressProgress(0);
    }, 350);
  };

  const handleNextPressEnd = () => {
    if (nextPressTimerRef.current) {
      clearTimeout(nextPressTimerRef.current);
      nextPressTimerRef.current = null;
    }
    if (nextPressProgressIntervalRef.current) {
      clearInterval(nextPressProgressIntervalRef.current);
      nextPressProgressIntervalRef.current = null;
    }
    setIsPressingNext(false);
    setNextPressProgress(0);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pressTimerRef.current) {
        clearTimeout(pressTimerRef.current);
      }
      if (pressProgressIntervalRef.current) {
        clearInterval(pressProgressIntervalRef.current);
      }
      if (nextPressTimerRef.current) {
        clearTimeout(nextPressTimerRef.current);
      }
      if (nextPressProgressIntervalRef.current) {
        clearInterval(nextPressProgressIntervalRef.current);
      }
    };
  }, []);

  const handleCompleteStation = async () => {
    console.log('Complete Station clicked', { 
      currentStationIndex, 
      isLastStation, 
      totalStations: stations.length 
    });
    
    await hapticImpact(HapticsImpactStyle.Heavy);
    soundEffects.playSuccess();

    const stationTime = currentTime - stationStartTime;
    const newStationTimes = [...stationTimes, stationTime];
    setStationTimes(newStationTimes);
    setLastStationTime(stationTime);

    console.log('Station completed', { stationTime, totalStationTimes: newStationTimes.length });

    if (isLastStation) {
      // Simulation complete
      console.log('🔥🔥🔥 LAST STATION! Starting finish sequence...');
      console.log('🔥 Current state:', { 
        type, 
        workoutId, 
        currentTime, 
        stationTimesCount: newStationTimes.length,
        stationsCount: stations.length 
      });
      
      await hapticVibrate();
      soundEffects.playComplete();
      
      if (type) {
        console.log('🔥 Adding simulation result...');
        addSimulationResult({
          type,
          workoutId,
          date: new Date(),
          totalTime: currentTime,
          stationTimes: newStationTimes,
          stations,
        });
        if (!entitlements.hasHyroxPack && (type === 'full' || type === 'half' || type === 'deka' || type === 'deka_half')) {
          console.log('🔥 Decrementing trial (Hyrox/DEKA share same trials)...');
          decrementHyroxTrial();
        }
        console.log('🔥 Result saved to user profile');
      }
      
      console.log('🔥 Clearing saved state...');
      clearSavedState(); // Clear saved state on completion
      
      console.log('🔥🔥🔥 NAVIGATING TO RESULTS:', `/results/${type}`);
      console.log('🔥 Navigation state:', { 
        totalTime: currentTime, 
        stationTimes: newStationTimes,
        workoutId,
        stationsCount: stations.length
      });
      
      navigate(`/results/${type}`, {
        state: {
          totalTime: currentTime,
          stationTimes: newStationTimes,
          stations,
          workoutId,
        },
      });
      
      console.log('🔥 Navigate called successfully!');
    } else {
      // Enter transition mode
      console.log('Not last station, entering transition mode');
      setIsActive(false);
      setIsInTransition(true);
      setCurrentStationIndex(currentStationIndex + 1);
      
      // Show motivational message
    }
  };

  const handleExit = async () => {
    await hapticImpact(HapticsImpactStyle.Light);
    setShowExitModal(true);
  };

  const confirmExit = async () => {
    await hapticImpact(HapticsImpactStyle.Medium);
    clearSavedState(); // Clear saved state on exit
    navigate('/');
  };

  const cancelExit = async () => {
    await hapticImpact(HapticsImpactStyle.Light);
    setShowExitModal(false);
  };

  if (!type || !currentStation) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p>Invalid simulation type</p>
      </div>
    );
  }

  return (
    <div className="h-screen text-white flex flex-col bg-black relative overflow-hidden">
      {/* Yellow Flash Overlay */}
      {isFlashing && (
        <div className="fixed inset-0 bg-yellow-400 opacity-40 z-[100] pointer-events-none animate-pulse" />
      )}

      {/* Header */}
      <div className="flex-shrink-0 z-50 bg-black px-6 pt-4 pb-3 border-b border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold capitalize">
            {type === 'frank' 
              ? 'Frank the Tank' 
              : type === 'deka' 
              ? 'DEKA Strong' 
              : type === 'deka_half'
              ? 'DEKA Half'
              : `${type} Hyrox`}
          </h1>
          <button
            onClick={handleExit}
            className="w-14 h-14 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg"
          >
            <Hand className="w-7 h-7 text-white" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mb-2">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-white/60">
              Station {currentStationIndex + 1} of {stations.length}
            </span>
            <span className="text-white/60">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-yellow-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col px-4">
        {/* Pre-Start Countdown Overlay */}
        {preStartCountdown !== null && (
          <div className="absolute inset-0 bg-black z-50 flex flex-col items-center justify-center px-4">
            <p className="text-white/60 mb-8 uppercase tracking-wide font-bold" style={{ fontSize: 'clamp(40px, 8vw, 100px)' }}>
              Get Ready!
            </p>
            <p 
              className={`font-bold font-mono leading-none text-yellow-500 ${
                preStartCountdown <= 3 ? 'animate-pulse' : ''
              }`}
              style={{ 
                fontSize: 'clamp(200px, 50vw, 600px)',
                animation: preStartCountdown > 0 ? 'flash 1s ease-in-out' : 'none'
              }}
            >
              {preStartCountdown}
            </p>
            <div className="text-center mt-8">
              <p className="text-white/60 font-semibold" style={{ fontSize: 'clamp(24px, 5vw, 60px)' }}>
                {currentStation.name}
              </p>
              {(currentStation.reps || (currentStation.distance && currentStation.type === 'station')) && (
                <p className="text-red-500 font-bold mt-2" style={{ fontSize: 'clamp(20px, 4vw, 48px)' }}>
                  {currentStation.reps 
                    ? `${currentStation.reps} Reps`
                    : `${currentStation.distance}m`}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Fixed Timer Section */}
        <div className="sticky top-[140px] z-40 bg-black pt-2 pb-2">
        {/* Exercise Name */}
          <div className="text-center mb-1">
          <h2 className="text-xl font-bold text-white leading-tight">
            {currentStation.name}
          </h2>
          {(currentStation.reps || (currentStation.distance && currentStation.type === 'station')) && (
            <p className="text-2xl font-bold text-red-500 mt-1">
              {currentStation.reps 
                ? `${currentStation.reps} Reps`
                : `${currentStation.distance}m`}
            </p>
          )}
        </div>

        {/* Main Timer - COMPACT */}
        <div className="text-center my-1">
          <p 
              className={`font-bold font-mono leading-none text-white pt-4 pb-6 ${isInTransition ? 'animate-pulse' : ''}`}
            style={{ 
              fontSize: (currentTime - stationStartTime) >= 3600 
                  ? 'clamp(90px, 22.5vw, 180px)'
                  : 'clamp(105px, 27vw, 210px)',
              letterSpacing: '-0.03em'
            }}
          >
            {isInTransition ? formatTime(0) : formatTime(currentTime - stationStartTime)}
          </p>
        </div>

        {/* Status indicator */}
        {isInTransition && (
          <div className="text-center my-1">
            <p className="text-yellow-500 text-sm font-semibold animate-pulse">
              Station Complete
            </p>
          </div>
        )}
        </div>

        {/* Small spacer */}
        <div className="mt-4"></div>

        {/* Bottom Stats - ALWAYS VISIBLE */}
        <div className="grid grid-cols-3 gap-2 text-center px-3 mb-2">
          <div className="bg-white/5 rounded-lg py-2 px-1">
            <p className="text-white/40 text-[10px] uppercase tracking-wide mb-1">Last Station</p>
            <p className="text-white text-xl font-bold font-mono leading-none">{formatTime(lastStationTime)}</p>
          </div>
          <div className="bg-yellow-500/10 rounded-lg py-2 px-1 border border-yellow-500/20">
            <p className="text-yellow-500/60 text-[10px] uppercase tracking-wide mb-1">Total</p>
            <p className="text-yellow-500 text-2xl font-bold font-mono leading-none">{formatTime(currentTime)}</p>
          </div>
          <div className="bg-white/5 rounded-lg py-2 px-1">
            <p className={`text-white/40 text-[10px] uppercase tracking-wide mb-1 ${isInTransition ? 'animate-pulse' : ''}`}>
              Transitions
            </p>
            <p className={`text-xl font-bold font-mono leading-none ${isInTransition ? 'text-yellow-500 animate-pulse' : 'text-white'}`}>
              {formatTime(totalTransitionTime + transitionTime)}
            </p>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Controls */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-black border-t border-white/10 px-4 py-6 pb-safe">
        <div className="flex gap-2 justify-center w-full">
          {!isActive && !isInTransition ? (
            // Initial start - SIMPLE CLICK WITH PULSE
            <button
              onClick={handleStart}
              className="flex-1 bg-yellow-500 text-black rounded-xl py-6 font-bold flex items-center justify-center gap-2 hover:bg-yellow-400 transition-all active:scale-95 active:animate-pulse text-xl"
            >
              <Play className="w-7 h-7" />
              <span>Start Workout</span>
            </button>
          ) : isInTransition ? (
            // Transition mode - SIMPLE CLICK WITH PULSE
            <button
              onClick={handleStartNextStation}
              className="flex-1 bg-yellow-500 text-black rounded-xl py-6 font-bold flex items-center justify-center gap-2 hover:bg-yellow-400 transition-all active:scale-95 active:animate-pulse text-xl"
            >
              <Play className="w-7 h-7" />
              <span>Start Station</span>
            </button>
            ) : (
              // Active exercise - SIMPLE CLICK WITH PULSE
              <button
                onClick={handleCompleteStation}
                className="flex-1 bg-green-500 text-white rounded-xl py-6 font-bold flex items-center justify-center gap-2 hover:bg-green-600 transition-all active:scale-95 active:animate-pulse text-xl"
              >
                {isLastStation ? (
                  <>
                    <Check className="w-7 h-7" />
                    <span>Finish</span>
                  </>
                ) : (
                  <>
                    <Check className="w-7 h-7" />
                    <span>Complete Station</span>
                  </>
                )}
              </button>
            )}
        </div>
      </div>

      {/* Exit Confirmation Modal */}
      {showExitModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-6">
          <div className="bg-gradient-to-br from-zinc-900 to-black rounded-3xl max-w-sm w-full border border-red-500/30 shadow-2xl p-6">
            <h2 className="text-2xl font-bold text-white mb-3 text-center">Exit Workout?</h2>
            <p className="text-white/70 text-center mb-6">
              Are you sure you want to exit? Your progress will be lost.
            </p>
            <div className="flex gap-3">
              <button
                onClick={cancelExit}
                className="flex-1 bg-white/10 text-white rounded-xl py-4 font-bold hover:bg-white/20 transition-all active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={confirmExit}
                className="flex-1 bg-red-500 text-white rounded-xl py-4 font-bold hover:bg-red-600 transition-all active:scale-95"
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


