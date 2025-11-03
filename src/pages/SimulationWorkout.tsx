import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Play, Pause, Check, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import type { Exercise } from "@/types/workout";
import { triggerSuccessHaptic } from "@/utils/haptics";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/utils/supabaseClient";
import confetti from "canvas-confetti";

interface SimulationWorkoutProps {
  exercise: Exercise;
  onComplete: () => void;
}

interface StationTime {
  stationIndex: number;
  stationName: string;
  startTime: number | null;
  endTime: number | null;
  elapsed: number;
  accumulatedTime: number; // Track time from previous pause/resume cycles
  isRunning: boolean;
  isComplete: boolean;
}

export function SimulationWorkout({ exercise, onComplete }: SimulationWorkoutProps) {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const stations = exercise.exercises || [];
  
  // User data
  const [username, setUsername] = useState<string>("");
  const [trainingDay, setTrainingDay] = useState<number>(1);
  
  // Current station tracking
  const [currentStation, setCurrentStation] = useState(0);
  const [stationTimes, setStationTimes] = useState<StationTime[]>([]);
  const [totalElapsed, setTotalElapsed] = useState(0);
  const [simulationStarted, setSimulationStarted] = useState(false);
  const [simulationComplete, setSimulationComplete] = useState(false);
  
  // Timer
  const [now, setNow] = useState(Date.now());
  
  // Initialize station times
  useEffect(() => {
    const initial = stations.map((station, index) => ({
      stationIndex: index,
      stationName: station.name,
      startTime: null,
      endTime: null,
      elapsed: 0,
      accumulatedTime: 0,
      isRunning: false,
      isComplete: false,
    }));
    setStationTimes(initial);
    
    // Load user data
    try {
      const userStr = localStorage.getItem("frank_rock_user");
      if (userStr) {
        const user = JSON.parse(userStr);
        const userUsername = user.username || "";
        setUsername(userUsername);
        
        const userKey = `currentTrainingDay_${userUsername}`;
        const day = parseInt(localStorage.getItem(userKey) || "1");
        setTrainingDay(day);
        
        // Try to load saved progress
        const savedKey = `simulation_${userUsername}_${day}_${exercise.id}`;
        const saved = localStorage.getItem(savedKey);
        if (saved) {
          const data = JSON.parse(saved);
          setStationTimes(data.stationTimes || initial);
          setCurrentStation(data.currentStation || 0);
          setTotalElapsed(data.totalElapsed || 0);
          setSimulationStarted(data.simulationStarted || false);
          setSimulationComplete(data.simulationComplete || false);
        }
      }
    } catch (e) {
      console.error("Error loading simulation data:", e);
    }
  }, [exercise.id, stations.length]);
  
  // Timer tick
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 100);
    return () => clearInterval(interval);
  }, []);
  
  // Calculate elapsed times
  useEffect(() => {
    setStationTimes((prev) =>
      prev.map((station) => {
        if (station.isRunning && station.startTime) {
          // Current segment time + accumulated time from previous pause/resume cycles
          const accumulated = station.accumulatedTime || 0;
          const currentSegment = now - station.startTime;
          return { ...station, elapsed: accumulated + currentSegment };
        }
        return station;
      })
    );
    
    // Update total elapsed
    const total = stationTimes.reduce((sum, s) => sum + (s.elapsed || 0), 0);
    setTotalElapsed(total);
  }, [now]);
  
  // Save progress to localStorage
  useEffect(() => {
    if (username && trainingDay && exercise.id) {
      const savedKey = `simulation_${username}_${trainingDay}_${exercise.id}`;
      localStorage.setItem(
        savedKey,
        JSON.stringify({
          stationTimes,
          currentStation,
          totalElapsed,
          simulationStarted,
          simulationComplete,
        })
      );
    }
  }, [stationTimes, currentStation, totalElapsed, simulationStarted, simulationComplete, username, trainingDay, exercise.id]);
  
  const startStation = (index: number) => {
    if (index !== currentStation) return; // Can only start current station
    if (stationTimes[index]?.isComplete) return; // Already complete
    
    setStationTimes((prev) =>
      prev.map((station, i) =>
        i === index
          ? { ...station, startTime: Date.now(), isRunning: true }
          : station
      )
    );
    
    if (!simulationStarted) {
      setSimulationStarted(true);
    }
    
    triggerSuccessHaptic();
  };
  
  const pauseStation = (index: number) => {
    const currentTime = Date.now();
    setStationTimes((prev) =>
      prev.map((station, i) => {
        if (i === index && station.startTime) {
          // Save the accumulated time when pausing
          const segmentTime = currentTime - station.startTime;
          return {
            ...station,
            endTime: currentTime,
            accumulatedTime: station.accumulatedTime + segmentTime,
            elapsed: station.accumulatedTime + segmentTime,
            isRunning: false,
          };
        }
        return station;
      })
    );
  };
  
  const completeStation = (index: number) => {
    const currentTime = Date.now();
    
    setStationTimes((prev) =>
      prev.map((station, i) => {
        if (i === index) {
          // Calculate final time: accumulated + current segment
          const accumulated = station.accumulatedTime || 0;
          const currentSegment = station.startTime ? currentTime - station.startTime : 0;
          const finalElapsed = accumulated + currentSegment;
          
          return {
            ...station,
            endTime: currentTime,
            elapsed: finalElapsed,
            accumulatedTime: finalElapsed,
            isRunning: false,
            isComplete: true,
          };
        }
        return station;
      })
    );
    
    // Confetti on station complete
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#ffffff', '#cccccc', '#999999']
    });
    
    triggerSuccessHaptic();
    
    // Move to next station
    if (index < stations.length - 1) {
      setCurrentStation(index + 1);
      toast.success(`Station ${index + 1} complete!`);
    } else {
      // All stations complete - BIG CONFETTI!
      confetti({
        particleCount: 200,
        spread: 120,
        origin: { y: 0.6 },
        colors: ['#ffffff', '#cccccc', '#999999'],
        ticks: 300
      });
      
      setSimulationComplete(true);
      toast.success("🎉 Simulation complete!");
      
      // Save to Supabase
      syncToSupabase();
    }
    
    triggerSuccessHaptic();
  };
  
  const syncToSupabase = async () => {
    if (!authUser?.clientId || !username) return;
    
    try {
      // Get the plan ID
      const { data: planData } = await supabase
        .from("plans")
        .select("id")
        .eq("client_id", authUser.clientId)
        .eq("is_active", true)
        .single();
      
      if (!planData?.id) return;
      
      // Store split times
      const splits = stationTimes.map((station) => ({
        station: station.stationName,
        elapsed: station.elapsed,
        complete: station.isComplete,
      }));
      
      await supabase.from("workout_logs").insert({
        client_id: authUser.clientId,
        plan_id: planData.id,
        training_day: trainingDay,
        exercise_name: exercise.name,
        exercise_type: "simulation",
        details: {
          total_time: totalElapsed,
          splits,
          completed_at: new Date().toISOString(),
        },
      });
      
      console.log("✅ Simulation synced to Supabase");
    } catch (e) {
      console.error("Error syncing simulation:", e);
    }
  };
  
  const formatTime = (ms: number) => {
    if (!ms || isNaN(ms)) return "0:00";
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };
  
  const handleComplete = async () => {
    if (!simulationComplete) {
      toast.error("Complete all stations first!");
      return;
    }
    
    // Mark exercise as complete
    if (username && trainingDay) {
      const key = `completedExercises_${username}_${trainingDay}`;
      const completed = JSON.parse(localStorage.getItem(key) || "[]");
      if (!completed.includes(exercise.id)) {
        completed.push(exercise.id);
        localStorage.setItem(key, JSON.stringify(completed));
      }
    }
    
    // Clear saved progress
    if (username && trainingDay && exercise.id) {
      const savedKey = `simulation_${username}_${trainingDay}_${exercise.id}`;
      localStorage.removeItem(savedKey);
    }
    
    onComplete();
  };
  
  const resetSimulation = () => {
    if (!window.confirm("Reset all progress for this simulation?")) return;
    
    const initial = stations.map((station, index) => ({
      stationIndex: index,
      stationName: station.name,
      startTime: null,
      endTime: null,
      elapsed: 0,
      accumulatedTime: 0,
      isRunning: false,
      isComplete: false,
    }));
    
    setStationTimes(initial);
    setCurrentStation(0);
    setTotalElapsed(0);
    setSimulationStarted(false);
    setSimulationComplete(false);
    
    // Clear saved progress
    if (username && trainingDay && exercise.id) {
      const savedKey = `simulation_${username}_${trainingDay}_${exercise.id}`;
      localStorage.removeItem(savedKey);
    }
    
    toast.success("Simulation reset");
  };
  
  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-bold text-lg flex-1 text-center">{exercise.name}</h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={resetSimulation}
            className="text-xs text-muted-foreground"
          >
            Reset
          </Button>
        </div>
      </header>
      
      {/* Large Timer on Top - BLACK & WHITE - CLICKABLE TO PAUSE */}
      <div 
        className="bg-black border-b border-white/20 py-16 px-4 cursor-pointer active:bg-white/5 transition-colors"
        onClick={() => {
          const currentStationTime = stationTimes[currentStation];
          if (!currentStationTime) return;
          
          if (currentStationTime.isRunning) {
            pauseStation(currentStation);
          } else if (!currentStationTime.isComplete && currentStationTime.startTime) {
            startStation(currentStation);
          }
        }}
      >
        <div className="text-center space-y-4">
          <div className="text-xs text-white/50 uppercase tracking-widest">
            Total Elapsed Time {stationTimes[currentStation]?.isRunning ? '(Tap to Pause)' : '(Tap to Resume)'}
          </div>
          <div className="text-[120px] md:text-[160px] font-mono font-bold text-white leading-none">
            {formatTime(totalElapsed)}
          </div>
          <div className="text-lg text-white/70 mt-6">
            Station {currentStation + 1} of {stations.length}
          </div>
        </div>
      </div>
      
      {/* Stations List */}
      <div className="p-4 space-y-3 pb-24">
        {stations
          .map((station, index) => ({ station, index, stationTime: stationTimes[index] }))
          .sort((a, b) => {
            // Current station always on top
            if (a.index === currentStation) return -1;
            if (b.index === currentStation) return 1;
            
            // Then incomplete stations (in order)
            if (!a.stationTime?.isComplete && b.stationTime?.isComplete) return -1;
            if (a.stationTime?.isComplete && !b.stationTime?.isComplete) return 1;
            
            // Within same group, maintain original order
            return a.index - b.index;
          })
          .map(({ station, index, stationTime }) => {
          if (!stationTime) return null;
          
          const isCurrent = index === currentStation;
          const isPast = index < currentStation;
          const isFuture = index > currentStation;
          
          return (
            <Card
              key={station.id}
              className={`p-4 transition-all bg-black ${
                isCurrent
                  ? "border-white border-2 shadow-lg"
                  : stationTime.isComplete
                  ? "border-white/40 bg-white/5"
                  : "opacity-50 border-white/20"
              }`}
            >
              <div className="space-y-3">
                {/* Station Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-white/60">
                        #{index + 1}
                      </span>
                      <h3 className="font-bold text-lg text-white">{station.name}</h3>
                      {stationTime.isComplete && (
                        <Check className="w-5 h-5 text-white" />
                      )}
                    </div>
                    
                    {/* Station Details */}
                    <div className="text-sm text-white/60 mt-1 space-y-1">
                      {station.distance && station.distance > 0 && (
                        <div>Distance: {station.distance * 1000}m</div>
                      )}
                      {station.reps && station.reps > 0 && (
                        <div>Reps: {station.reps}</div>
                      )}
                      {station.weight && <div>Weight: {station.weight}</div>}
                    </div>
                  </div>
                  
                  {/* Timer Display */}
                  <div className="text-right">
                    <div className={`text-6xl font-mono font-bold leading-none ${
                      stationTime.isRunning ? "text-white" : "text-white/80"
                    }`}>
                      {formatTime(stationTime.elapsed)}
                    </div>
                  </div>
                </div>
                
                {/* Controls */}
                {isCurrent && !stationTime.isComplete && (
                  <div className="flex gap-2 mt-3">
                    {!stationTime.isRunning ? (
                      <Button
                        onClick={() => startStation(index)}
                        className="flex-1 bg-white text-black hover:bg-white/90"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        {stationTime.startTime ? "Resume" : "Start"}
                      </Button>
                    ) : (
                      <>
                        <Button
                          onClick={() => pauseStation(index)}
                          variant="outline"
                          className="flex-[1] border-white text-white hover:bg-white/10"
                        >
                          <Pause className="w-4 h-4 mr-2" />
                          Pause
                        </Button>
                        <Button
                          onClick={() => completeStation(index)}
                          className="flex-[3] bg-white text-black hover:bg-white/90"
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Complete
                        </Button>
                      </>
                    )}
                  </div>
                )}
                
                {stationTime.isComplete && (
                  <div className="text-center text-sm text-white/80 font-semibold">
                    ✓ Completed in {formatTime(stationTime.elapsed)}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
      
      {/* Performance Breakdown & Complete Button - FULL SCREEN */}
      {simulationComplete && (
        <div className="fixed inset-0 bg-black z-50 overflow-y-auto">
          {/* Header */}
          <header className="sticky top-0 z-10 bg-black border-b border-white/20">
            <div className="flex items-center justify-between px-4 py-3">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-5 h-5 text-white" />
              </Button>
              <h1 className="font-bold text-lg text-white flex-1 text-center">Results</h1>
              <div className="w-10"></div>
            </div>
          </header>
          
          <div className="p-6 space-y-6">
            {/* Summary Stats */}
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-white">🎉 SIMULATION COMPLETE!</h2>
              <div className="text-6xl font-mono font-bold text-white">
                {formatTime(totalElapsed)}
              </div>
              <p className="text-white/60 text-sm">Total Time</p>
            </div>
            
            {/* Split Times Breakdown */}
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-white border-b border-white/20 pb-2">
                Split Times
              </h3>
              {stationTimes.map((station, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between py-2 px-3 bg-white/5 rounded border border-white/10"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-white/60 text-sm font-mono">
                      #{index + 1}
                    </span>
                    <span className="text-white text-sm font-medium">
                      {station.stationName}
                    </span>
                  </div>
                  <span className="text-white font-mono font-bold">
                    {formatTime(station.elapsed)}
                  </span>
                </div>
              ))}
            </div>
            
            {/* Action Buttons */}
            <div className="space-y-3 pb-24">
              <Button
                onClick={handleComplete}
                className="w-full bg-white text-black hover:bg-white/90 py-6 text-lg font-bold"
              >
                <Check className="w-6 h-6 mr-2" />
                Finish & Save Result
              </Button>
              <Button
                onClick={() => {
                  if (window.confirm("Reset simulation and start again?")) {
                    setSimulationComplete(false);
                    resetSimulation();
                  }
                }}
                variant="outline"
                className="w-full border-white text-white hover:bg-white/10 py-4"
              >
                Reset & Start Again
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

