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
import { ExerciseMedia } from "@/components/ExerciseMedia";

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
          return { ...station, elapsed: now - station.startTime };
        }
        return station;
      })
    );
    
    // Update total elapsed
    const total = stationTimes.reduce((sum, s) => sum + s.elapsed, 0);
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
    setStationTimes((prev) =>
      prev.map((station, i) =>
        i === index
          ? {
              ...station,
              endTime: Date.now(),
              isRunning: false,
            }
          : station
      )
    );
  };
  
  const completeStation = (index: number) => {
    const currentTime = Date.now();
    
    setStationTimes((prev) =>
      prev.map((station, i) =>
        i === index
          ? {
              ...station,
              endTime: currentTime,
              isRunning: false,
              isComplete: true,
            }
          : station
      )
    );
    
    // Move to next station
    if (index < stations.length - 1) {
      setCurrentStation(index + 1);
      toast.success(`Station ${index + 1} complete!`);
    } else {
      // All stations complete
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
      
      {/* Large Timer on Top */}
      <div className="bg-gradient-to-br from-zinc-900 to-black border-b border-border py-8 px-4">
        <div className="text-center space-y-2">
          <div className="text-sm text-muted-foreground uppercase tracking-wide">
            Total Elapsed Time
          </div>
          <div className="text-6xl font-mono font-bold text-yellow-500">
            {formatTime(totalElapsed)}
          </div>
          <div className="text-sm text-muted-foreground">
            Station {currentStation + 1} of {stations.length}
          </div>
        </div>
      </div>
      
      {/* Stations List */}
      <div className="p-4 space-y-3">
        {stations.map((station, index) => {
          const stationTime = stationTimes[index];
          if (!stationTime) return null;
          
          const isCurrent = index === currentStation;
          const isPast = index < currentStation;
          const isFuture = index > currentStation;
          
          return (
            <Card
              key={station.id}
              className={`p-4 transition-all ${
                isCurrent
                  ? "border-yellow-500 border-2 shadow-lg"
                  : stationTime.isComplete
                  ? "border-green-500 bg-green-500/5"
                  : "opacity-50"
              }`}
            >
              <div className="space-y-3">
                {/* Station Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-muted-foreground">
                        #{index + 1}
                      </span>
                      <h3 className="font-bold text-lg">{station.name}</h3>
                      {stationTime.isComplete && (
                        <Check className="w-5 h-5 text-green-500" />
                      )}
                    </div>
                    
                    {/* Station Details */}
                    <div className="text-sm text-muted-foreground mt-1 space-y-1">
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
                    <div className={`text-2xl font-mono font-bold ${
                      stationTime.isRunning ? "text-yellow-500" : ""
                    }`}>
                      {formatTime(stationTime.elapsed)}
                    </div>
                  </div>
                </div>
                
                {/* Media */}
                {station.mediaUrl && (
                  <div className="mt-2">
                    <ExerciseMedia url={station.mediaUrl} alt={station.name} />
                  </div>
                )}
                
                {/* Controls */}
                {isCurrent && !stationTime.isComplete && (
                  <div className="flex gap-2 mt-3">
                    {!stationTime.isRunning ? (
                      <Button
                        onClick={() => startStation(index)}
                        className="flex-1 bg-yellow-500 hover:bg-yellow-600"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        {stationTime.startTime ? "Resume" : "Start"}
                      </Button>
                    ) : (
                      <>
                        <Button
                          onClick={() => pauseStation(index)}
                          variant="outline"
                          className="flex-1"
                        >
                          <Pause className="w-4 h-4 mr-2" />
                          Pause
                        </Button>
                        <Button
                          onClick={() => completeStation(index)}
                          className="flex-1 bg-green-500 hover:bg-green-600"
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Complete
                        </Button>
                      </>
                    )}
                  </div>
                )}
                
                {stationTime.isComplete && (
                  <div className="text-center text-sm text-green-500 font-semibold">
                    ✓ Completed in {formatTime(stationTime.elapsed)}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
      
      {/* Complete Simulation Button */}
      {simulationComplete && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
          <Button
            onClick={handleComplete}
            className="w-full bg-green-500 hover:bg-green-600 text-white py-6 text-lg font-bold"
          >
            <Check className="w-6 h-6 mr-2" />
            Finish Simulation
          </Button>
        </div>
      )}
    </div>
  );
}

