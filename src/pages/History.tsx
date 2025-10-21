import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Medal, TrendingUp, Loader2 } from "lucide-react";
import { fetchWorkoutHistory, fetchUserStats } from "@/services/googleSheets";
import { WorkoutLog, UserStats } from "@/types/workout";
import { toast } from "sonner";

const History = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("history");
  const [history, setHistory] = useState<WorkoutLog[]>([]);
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
          isPB: false, // TODO: Calculate PB
          duration: log.duration,
          distance: log.distance,
          notes: log.notes,
        }));
        
        setHistory(historyData);
        
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
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
          </TabsList>

          <TabsContent value="progress" className="space-y-6">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : stats ? (
              <>
                {/* Weekly Stats */}
                <Card className="p-6">
                  <h3 className="text-sm text-muted-foreground mb-4">This Week</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-foreground">{stats.thisWeek.workouts}</p>
                      <p className="text-xs text-muted-foreground mt-1">Workouts</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-foreground">{stats.thisWeek.exercises}</p>
                      <p className="text-xs text-muted-foreground mt-1">Exercises</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-foreground">{stats.thisWeek.totalWeight}</p>
                      <p className="text-xs text-muted-foreground mt-1">Total kg</p>
                    </div>
                  </div>
                </Card>

                {/* Personal Bests */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-bold">Personal Bests</h3>
                  </div>
                  {stats.personalBests.length > 0 ? (
                    <div className="space-y-3">
                      {stats.personalBests.map((pb, index) => (
                        <Card key={index} className="p-4 bg-secondary/10 border-secondary/30">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Medal className="w-5 h-5 text-primary" />
                              <div>
                                <p className="font-semibold text-foreground">{pb.exercise}</p>
                                <p className="text-xs text-muted-foreground">{pb.date}</p>
                              </div>
                            </div>
                            <Badge className="bg-primary text-primary-foreground font-bold text-lg px-3 py-1">
                              {pb.value}
                            </Badge>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card className="p-6 text-center">
                      <p className="text-muted-foreground">No personal bests recorded yet</p>
                    </Card>
                  )}
                </div>
              </>
            ) : null}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : history.length > 0 ? (
              history.map((entry) => (
                <Card key={entry.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-foreground">{entry.exercise}</h3>
                        {entry.isPB && (
                          <Badge className="bg-primary/10 text-primary border border-primary/20 text-xs">
                            <Medal className="w-3 h-3 mr-1" />
                            PB
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{entry.date}</p>
                    </div>
                    <div className="text-right">
                      {entry.weight && (
                        <>
                          <p className="text-2xl font-bold text-secondary">{entry.weight}kg</p>
                        </>
                      )}
                      {entry.distance && (
                        <>
                          <p className="text-2xl font-bold text-secondary">{entry.distance.toFixed(1)}km</p>
                          <p className="text-xs text-muted-foreground">{entry.duration} min</p>
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No workout history yet</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default History;
