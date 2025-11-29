import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Check, Hand } from 'lucide-react';
import { getStations } from '@/lib/hyroxStations';
import { formatTime } from '@/lib/utils';
import { useUser } from '@/contexts/UserContext';
import { hapticImpact, hapticVibrate, HapticsImpactStyle } from '@/utils/hapticsBridge';
import { soundEffects } from '@/utils/soundEffects';

export function CircuitSimulation() {
  const navigate = useNavigate();
  const { addSimulationResult } = useUser();
  const type = 'circuit';
  const workoutId = 'circuit_hiit';

  // Load saved state from localStorage
  const loadSavedState = () => {
    try {
      const saved = localStorage.getItem('roxsim_active_workout');
      if (saved) {
        const state = JSON.parse(saved);
        if (state.type === type) {
          console.log('Loading saved circuit state:', state);
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
  const [preStartCountdown, setPreStartCountdown] = useState<number | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);

  const intervalRef = useRef<number | null>(null);
  const lastMinuteBeepRef = useRef<number>(0);
  const stations = getStations(type);

  const currentStation = stations[currentStationIndex];
  const progress = Math.round(((currentStationIndex + 1) / stations.length) * 100);
  const isLastStation = currentStationIndex === stations.length - 1;

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (isActive || isInTransition) {
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
    }
  }, [currentStationIndex, isActive, isInTransition, currentTime, transitionTime, totalTransitionTime, stationTimes, stationStartTime, lastStationTime]);

  const clearSavedState = () => {
    localStorage.removeItem('roxsim_active_workout');
  };

  // Main timer effect
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

  // Minute marker beep and flash
  useEffect(() => {
    if (isActive && currentTime > 0 && currentTime % 60 === 0 && currentTime !== lastMinuteBeepRef.current) {
      lastMinuteBeepRef.current = currentTime;
      soundEffects.playMinuteBeep();
      setIsFlashing(true);
      hapticImpact(HapticsImpactStyle.Medium);
      setTimeout(() => setIsFlashing(false), 300);
    }
  }, [currentTime, isActive]);

  const handleStart = async () => {
    await hapticImpact(HapticsImpactStyle.Medium);
    soundEffects.playStart();
    
    if (currentTime === 0 && currentStationIndex === 0) {
      clearSavedState();
    }
    
    setPreStartCountdown(10);
  };

  const handleStartNextStation = async () => {
    await hapticImpact(HapticsImpactStyle.Heavy);
    soundEffects.playStart();
    
    setTotalTransitionTime((prev) => prev + transitionTime);
    setIsInTransition(false);
    setIsActive(true);
    setStationStartTime(currentTime);
    setTransitionTime(0);
  };

  // Pre-start countdown effect
  useEffect(() => {
    if (preStartCountdown !== null && preStartCountdown > 0) {
      const timer = setTimeout(() => {
        setPreStartCountdown(preStartCountdown - 1);
        soundEffects.playCountdownBeep();
        hapticImpact(HapticsImpactStyle.Light);
      }, 1000);

      return () => clearTimeout(timer);
    } else if (preStartCountdown === 0) {
      soundEffects.playStart();
      hapticImpact(HapticsImpactStyle.Heavy);
      setIsActive(true);
      setStationStartTime(0);
      setPreStartCountdown(null);
    }
  }, [preStartCountdown]);

  const handleCompleteStation = async () => {
    await hapticImpact(HapticsImpactStyle.Heavy);
    soundEffects.playSuccess();

    const stationTime = currentTime - stationStartTime;
    const newStationTimes = [...stationTimes, stationTime];
    setStationTimes(newStationTimes);
    setLastStationTime(stationTime);

    if (isLastStation) {
      await hapticVibrate();
      soundEffects.playComplete();
      
      addSimulationResult({
        type,
        workoutId,
        date: new Date(),
        totalTime: currentTime,
        stationTimes: newStationTimes,
        stations,
      });
      
      clearSavedState();
      
      navigate(`/results/${type}`, {
        state: {
          totalTime: currentTime,
          stationTimes: newStationTimes,
          stations,
          workoutId,
        },
      });
    } else {
      setIsActive(false);
      setIsInTransition(true);
      setCurrentStationIndex(currentStationIndex + 1);
    }
  };

  const handleExit = async () => {
    await hapticImpact(HapticsImpactStyle.Light);
    setShowExitModal(true);
  };

  const confirmExit = async () => {
    await hapticImpact(HapticsImpactStyle.Medium);
    clearSavedState();
    navigate('/');
  };

  const cancelExit = async () => {
    await hapticImpact(HapticsImpactStyle.Light);
    setShowExitModal(false);
  };

  if (!currentStation) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p>Invalid simulation type</p>
      </div>
    );
  }

  // Check if current station is a rest period
  const isRestPeriod = currentStation.type === 'rest';

  return (
    <div className="min-h-screen text-white flex flex-col bg-black pt-5 pb-32 relative overflow-hidden">
      {/* Yellow Flash Overlay */}
      {isFlashing && (
        <div className="fixed inset-0 bg-yellow-400 opacity-40 z-[100] pointer-events-none animate-pulse" />
      )}

      {/* Header */}
      <div className="sticky top-0 z-50 bg-black px-6 pt-8 pb-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Circuit HIIT</h1>
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
              Exercise {currentStationIndex + 1} of {stations.length}
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
              style={{ fontSize: 'clamp(200px, 50vw, 600px)' }}
            >
              {preStartCountdown}
            </p>
            <p className="text-white/60 mt-8 font-semibold text-center" style={{ fontSize: 'clamp(24px, 5vw, 60px)' }}>
              {currentStation.reps 
                ? `${currentStation.name} ${currentStation.reps}`
                : currentStation.name}
            </p>
          </div>
        )}

        {/* Fixed Timer Section */}
        <div className="sticky top-[140px] z-40 bg-black pt-2 pb-2">
          {/* Exercise Name */}
          <div className="text-center mb-1">
            <h2 className={`text-xl font-bold leading-none ${isRestPeriod ? 'text-blue-400' : 'text-white'}`}>
              {currentStation.reps 
                ? `${currentStation.name} ${currentStation.reps}`
                : currentStation.name}
            </h2>
            {isRestPeriod && (
              <p className="text-blue-400/60 text-sm mt-1">Rest Period</p>
            )}
          </div>

          {/* Main Timer */}
          <div className="text-center my-1">
            <p 
              className={`font-bold font-mono leading-none pt-[0.5em] pb-[1em] ${
                isInTransition ? 'text-white animate-pulse' : isRestPeriod ? 'text-blue-400' : 'text-white'
              }`}
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
            <div className="text-center my-4">
              <p className="text-yellow-600 text-sm font-semibold animate-pulse">
                Exercise Complete
              </p>
            </div>
          )}
        </div>

        {/* Small spacer */}
        <div className="mt-4"></div>

        {/* Bottom Stats */}
        <div className="grid grid-cols-3 gap-2 text-center px-3 mb-2">
          <div className="bg-white/5 rounded-lg py-2 px-1">
            <p className="text-white/40 text-[10px] uppercase tracking-wide mb-1">Last Exercise</p>
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
            <button
              onClick={handleStart}
              className="flex-1 bg-yellow-500 text-black rounded-xl py-6 font-bold flex items-center justify-center gap-2 hover:bg-yellow-400 transition-all active:scale-95 active:animate-pulse text-xl"
            >
              <Play className="w-7 h-7" />
              <span>Start Circuit</span>
            </button>
          ) : isInTransition ? (
            <button
              onClick={handleStartNextStation}
              className="flex-1 bg-yellow-500 text-black rounded-xl py-6 font-bold flex items-center justify-center gap-2 hover:bg-yellow-400 transition-all active:scale-95 active:animate-pulse text-xl"
            >
              <Play className="w-7 h-7" />
              <span>Start Exercise</span>
            </button>
          ) : (
            <button
              onClick={handleCompleteStation}
              className={`flex-1 ${isRestPeriod ? 'bg-blue-500 hover:bg-blue-600' : 'bg-green-500 hover:bg-green-600'} text-white rounded-xl py-6 font-bold flex items-center justify-center gap-2 transition-all active:scale-95 active:animate-pulse text-xl`}
            >
              {isLastStation ? (
                <>
                  <Check className="w-7 h-7" />
                  <span>Finish Circuit</span>
                </>
              ) : (
                <>
                  <Check className="w-7 h-7" />
                  <span>{isRestPeriod ? 'End Rest' : 'Complete'}</span>
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
