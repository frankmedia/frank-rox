import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowLeft, Medal, TrendingUp, Loader2, Calendar, Dumbbell, Clock, BookOpen, Trophy } from "lucide-react";
import { fetchWorkoutHistory, fetchUserStats } from "@/services/googleSheets";
import { WorkoutLog, UserStats } from "@/types/workout";
import { toast } from "sonner";
import { FlameRating } from "@/components/FlameRating";

interface DailyWorkout {
  date: string; // YYYY-MM-DD format
  displayDate: string; // "Today", "Yesterday", or "Mon 21 Oct"
  exercises: WorkoutLog[];
  totalExercises: number;
  totalWeight: number;
  totalDuration: number;
  totalDistance: number;
}

// Helper function to parse DD/MM/YYYY date format
const parseDate = (dateStr: string): Date => {
  // Handle "21/10/2025, 16:24" format (DD/MM/YYYY, HH:MM)
  const parts = dateStr.split(',')[0].split('/'); // Get "21/10/2025" part
  if (parts.length === 3) {
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1; // Month is 0-indexed
    const year = parseInt(parts[2]);
    return new Date(year, month, day);
  }
  // Fallback to regular Date parsing
  return new Date(dateStr);
};

// Helper function to format date
const formatDisplayDate = (dateStr: string): string => {
  const date = parseDate(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  // Reset time parts for comparison
  today.setHours(0, 0, 0, 0);
  yesterday.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  
  if (date.getTime() === today.getTime()) {
    return "Today";
  } else if (date.getTime() === yesterday.getTime()) {
    return "Yesterday";
  } else {
    // Format as "Mon 21 Oct"
    return date.toLocaleDateString("en-GB", { 
      weekday: "short", 
      day: "numeric", 
      month: "short" 
    });
  }
};

// Helper function to group workouts by date
const groupWorkoutsByDate = (logs: WorkoutLog[]): DailyWorkout[] => {
  const grouped = new Map<string, DailyWorkout>();
  
  logs.forEach((log) => {
    const date = parseDate(log.date);
    const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
    
    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, {
        date: dateKey,
        displayDate: formatDisplayDate(log.date),
        exercises: [],
        totalExercises: 0,
        totalWeight: 0,
        totalDuration: 0,
        totalDistance: 0,
      });
    }
    
    const day = grouped.get(dateKey)!;
    day.exercises.push(log);
    day.totalExercises++;
    
    // Sum up weights (handle both single weight and weights array)
    if (log.weights && log.weights.length > 0) {
      day.totalWeight += log.weights.reduce((sum, w) => sum + w, 0);
    } else if (log.weight) {
      day.totalWeight += log.weight;
    }
    
    if (log.duration) day.totalDuration += log.duration;
    if (log.distance) day.totalDistance += log.distance;
  });
  
  // Convert to array and sort by date (newest first)
  return Array.from(grouped.values()).sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
};

interface PersonalBest {
  exercise: string;
  type: "weight" | "time" | "distance";
  value: string;
  date: string;
}

const History = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("history");
  const [history, setHistory] = useState<WorkoutLog[]>([]);
  const [dailyWorkouts, setDailyWorkouts] = useState<DailyWorkout[]>([]);
  const [personalBests, setPersonalBests] = useState<PersonalBest[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load from user-specific localStorage
        const userStr = localStorage.getItem("frank_rock_user");
        if (!userStr) {
          setLoading(false);
          return;
        }
        
        const user = JSON.parse(userStr);
        const storageKey = `workoutHistory_${user.username}`;
        const existingLogs = localStorage.getItem(storageKey);
        const logs = existingLogs ? JSON.parse(existingLogs) : [];
        
        // Convert to WorkoutLog format
        const historyData: WorkoutLog[] = logs.map((log: any) => ({
          id: log.id,
          exercise: log.exerciseName,
          date: log.timestamp,
          weight: log.weight,
          weights: log.weights, // Array of weights per set
          isPB: false, // TODO: Calculate PB
          duration: log.duration,
          distance: log.distance,
          notes: log.notes,
          rating: typeof log.rating === 'number' ? log.rating : (log.rating ? parseInt(log.rating) : undefined), // Flame rating (0-5)
        }));
        
        setHistory(historyData);
        
        // Group workouts by date
        const grouped = groupWorkoutsByDate(historyData);
        setDailyWorkouts(grouped);
        
        // Calculate Personal Bests
        const pbs: PersonalBest[] = [];
        const exerciseMap = new Map<string, WorkoutLog[]>();
        
        // Group by exercise name
        historyData.forEach(log => {
          if (!exerciseMap.has(log.exercise)) {
            exerciseMap.set(log.exercise, []);
          }
          exerciseMap.get(log.exercise)!.push(log);
        });
        
        // Calculate PBs for each exercise
        exerciseMap.forEach((logs, exerciseName) => {
          // Weight-based exercises: find max weight
          const weightLogs = logs.filter(l => l.weight || (l.weights && l.weights.length > 0));
          if (weightLogs.length > 0) {
            let maxWeight = 0;
            let maxDate = "";
            
            weightLogs.forEach(log => {
              let weight = 0;
              if (log.weights && log.weights.length > 0) {
                weight = Math.max(...log.weights);
              } else if (log.weight) {
                weight = log.weight;
              }
              
              if (weight > maxWeight) {
                maxWeight = weight;
                maxDate = log.date;
              }
            });
            
            if (maxWeight > 0) {
              pbs.push({
                exercise: exerciseName,
                type: "weight",
                value: `${maxWeight}kg`,
                date: maxDate,
              });
            }
          }
          
          // Distance-based exercises: find fastest time for each distance
          const distanceLogs = logs.filter(l => l.distance && l.duration);
          const distanceMap = new Map<number, { time: number; date: string }>();
          
          distanceLogs.forEach(log => {
            const dist = log.distance!;
            const time = log.duration!;
            
            if (!distanceMap.has(dist) || time < distanceMap.get(dist)!.time) {
              distanceMap.set(dist, { time, date: log.date });
            }
          });
          
          distanceMap.forEach((best, distance) => {
            pbs.push({
              exercise: `${exerciseName} (${distance.toFixed(1)}km)`,
              type: "time",
              value: `${best.time} min`,
              date: best.date,
            });
          });
        });
        
        // Sort PBs by date (most recent first)
        pbs.sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime());
        setPersonalBests(pbs);
        
        // Calculate basic stats from logs
        const thisWeekLogs = logs.filter((log: any) => {
          const logDate = new Date(log.timestamp);
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return logDate >= weekAgo;
        });
        
        const statsData: UserStats = {
          thisWeek: {
            workouts: thisWeekLogs.length,
            exercises: thisWeekLogs.length,
            totalWeight: thisWeekLogs.reduce((sum: number, log: any) => sum + (log.weight || 0), 0),
          },
          personalBests: [], // TODO: Calculate PBs
        };
        
        setStats(statsData);
        
        console.log("✅ Loaded history from localStorage:", historyData.length, "entries");
      } catch (error) {
        console.error("Error loading history:", error);
        toast.error("Failed to load history", {
          description: "Could not load local storage data",
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="container max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="rounded-full"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold text-foreground">Progress</h1>
          </div>
        </div>
      </header>

      <main className="container max-w-2xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="history" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Logbook
            </TabsTrigger>
            <TabsTrigger value="pb" className="flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Personal Bests
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pb" className="space-y-6">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : personalBests.length > 0 ? (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-bold">Your Personal Records</h3>
                </div>
                <div className="space-y-3">
                  {personalBests.map((pb, index) => (
                    <Card key={index} className="p-4 bg-secondary/10 border-yellow-500 border-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Medal className="w-6 h-6" style={{ color: '#FFCC00' }} />
                          <div>
                            <p className="font-bold text-foreground text-lg">{pb.exercise}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatDisplayDate(pb.date)} • {new Date(pb.date.split(',')[0].split('/').reverse().join('-')).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                          </div>
                        </div>
                        <Badge className="bg-yellow-500 text-black font-bold text-2xl px-4 py-2">
                          {pb.value}
                        </Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ) : (
              <Card className="p-6 text-center">
                <p className="text-muted-foreground">No personal bests recorded yet</p>
                <p className="text-sm text-muted-foreground mt-2">Complete some workouts to start tracking your PRs!</p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : dailyWorkouts.length > 0 ? (
              <Accordion type="multiple" defaultValue={[dailyWorkouts[0]?.date]} className="space-y-4">
                {dailyWorkouts.map((day) => (
                  <AccordionItem key={day.date} value={day.date} className="border-none">
                    <Card className="overflow-hidden">
                      <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-secondary/10">
                        <div className="flex items-center justify-between w-full pr-2">
                          <div className="flex items-center gap-3">
                            <Calendar className="w-5 h-5 text-primary" />
                            <div className="text-left">
                              <h3 className="text-lg font-bold text-foreground">{day.displayDate}</h3>
                              <p className="text-xs text-muted-foreground">{day.totalExercises} exercises</p>
                            </div>
                          </div>
                          <div className="flex gap-4 text-sm">
                            {day.totalWeight > 0 && (
                              <div className="text-right">
                                <p className="font-bold text-foreground">{day.totalWeight}kg</p>
                                <p className="text-xs text-muted-foreground">Total</p>
                              </div>
                            )}
                            {day.totalDistance > 0 && (
                              <div className="text-right">
                                <p className="font-bold text-foreground">{day.totalDistance.toFixed(1)}km</p>
                                <p className="text-xs text-muted-foreground">Distance</p>
                              </div>
                            )}
                            {day.totalDuration > 0 && (
                              <div className="text-right">
                                <p className="font-bold text-foreground">{day.totalDuration}min</p>
                                <p className="text-xs text-muted-foreground">Duration</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4 pt-2">
                        <div className="space-y-3">
                          {day.exercises.map((entry) => (
                            <Card key={entry.id} className="p-3 bg-secondary/5">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Dumbbell className="w-4 h-4 text-primary" />
                                    <h4 className="font-semibold text-foreground">{entry.exercise}</h4>
                                    {entry.isPB && (
                                      <Badge className="bg-primary/10 text-primary border border-primary/20 text-xs">
                                        <Medal className="w-3 h-3 mr-1" />
                                        PB
                                      </Badge>
                                    )}
                                  </div>
                                  {entry.rating && entry.rating > 0 && (
                                    <div className="mt-1 ml-6">
                                      <FlameRating value={entry.rating} readonly size="sm" />
                                    </div>
                                  )}
                                </div>
                                <div className="text-right ml-4">
                                  {entry.weights && entry.weights.length > 0 ? (
                                    <div>
                                      <p className="text-xs font-semibold text-muted-foreground mb-1">Sets:</p>
                                      <p className="text-base font-bold text-secondary">
                                        {entry.weights.map((w, i) => `${w}kg`).join(" → ")}
                                      </p>
                                    </div>
                                  ) : entry.weight ? (
                                    <p className="text-xl font-bold text-secondary">{entry.weight}kg</p>
                                  ) : null}
                                  {entry.distance && (
                                    <div>
                                      <p className="text-xl font-bold text-secondary">{entry.distance.toFixed(1)}km</p>
                                      {entry.duration && (
                                        <p className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                                          <Clock className="w-3 h-3" />
                                          {entry.duration} min
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </Card>
                          ))}
                        </div>
                      </AccordionContent>
                    </Card>
                  </AccordionItem>
                ))}
              </Accordion>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No workouts logged yet</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default History;
