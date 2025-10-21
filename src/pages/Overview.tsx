import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Flame, ChevronRight, Calendar, Dumbbell, PersonStanding, Activity } from "lucide-react";
import { fetchTodayExercises, getUserSheet, getMaxTrainingDay } from "@/services/googleSheets";
import { LoadingScreen } from "@/components/LoadingScreen";
import type { Exercise } from "@/types/workout";

interface DaySummary {
  day: number;
  exercises: Exercise[];
  totalExercises: number;
  hasWeights: boolean;
  hasRunning: boolean;
  hasCardio: boolean;
  hasMobility: boolean;
}

const Overview = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [daySummaries, setDaySummaries] = useState<DaySummary[]>([]);
  const [maxDay, setMaxDay] = useState(14);

  useEffect(() => {
    const loadDays = async () => {
      try {
        setLoading(true);

        // Get max training day
        const userSheet = await getUserSheet();
        if (!userSheet) return;

        const max = await getMaxTrainingDay();
        setMaxDay(max);

        // Load exercises for each day
        const summaries: DaySummary[] = [];

        for (let day = 1; day <= max; day++) {
          // Temporarily set the day in localStorage to fetch exercises
          const userStr = localStorage.getItem("frank_rock_user");
          if (!userStr) continue;

          const user = JSON.parse(userStr);
          const userKey = `currentTrainingDay_${user.username}`;
          const originalDay = localStorage.getItem(userKey);

          localStorage.setItem(userKey, day.toString());
          const exercises = await fetchTodayExercises(user.username, userSheet);

          // Restore original day
          if (originalDay) {
            localStorage.setItem(userKey, originalDay);
          }

          // Analyze exercise types
          const hasWeights = exercises.some(e => e.type === "weights");
          const hasRunning = exercises.some(e => e.type === "running");
          const hasCardio = exercises.some(e => e.type === "cardio");
          const hasMobility = exercises.some(e => e.type === "mobility");

          summaries.push({
            day,
            exercises,
            totalExercises: exercises.filter(e => e.type !== "intro").length,
            hasWeights,
            hasRunning,
            hasCardio,
            hasMobility,
          });
        }

        setDaySummaries(summaries);
      } catch (error) {
        console.error("Error loading days:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDays();
  }, []);

  const handleDayClick = (day: number) => {
    // Update current training day
    const userStr = localStorage.getItem("frank_rock_user");
    if (userStr) {
      const user = JSON.parse(userStr);
      const userKey = `currentTrainingDay_${user.username}`;
      localStorage.setItem(userKey, day.toString());
    }

    // Navigate to today page
    navigate("/today");
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="container max-w-2xl mx-auto px-2 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-center gap-2">
            <Flame className="w-8 h-8 sm:w-10 sm:h-10" style={{ color: '#FFCC00' }} />
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">RoxPT</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container max-w-2xl mx-auto px-2 sm:px-4 py-4 sm:py-6">
        <div className="mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2">
            Your {maxDay}-Day Training Programme
          </h2>
          <p className="text-muted-foreground">
            Select any day to view and complete your workout
          </p>
        </div>

        <div className="grid gap-3">
          {daySummaries.map((summary) => (
            <Card
              key={summary.day}
              className="p-4 hover:bg-secondary/10 transition-colors cursor-pointer border-2 hover:border-primary"
              onClick={() => handleDayClick(summary.day)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold"
                      style={{ backgroundColor: '#FFCC00', color: '#000' }}
                    >
                      {summary.day}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-foreground">
                        Day {summary.day}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {summary.totalExercises} exercises
                      </p>
                    </div>
                  </div>

                  {/* Exercise type icons */}
                  <div className="flex items-center gap-3 ml-15">
                    {summary.hasWeights && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Dumbbell className="w-4 h-4" />
                        <span>Weights</span>
                      </div>
                    )}
                    {summary.hasRunning && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <PersonStanding className="w-4 h-4" />
                        <span>Running</span>
                      </div>
                    )}
                    {summary.hasCardio && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>Cardio</span>
                      </div>
                    )}
                    {summary.hasMobility && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Activity className="w-4 h-4" />
                        <span>Mobility</span>
                      </div>
                    )}
                  </div>
                </div>

                <ChevronRight className="w-6 h-6 text-muted-foreground flex-shrink-0" />
              </div>
            </Card>
          ))}
        </div>

        <Button
          variant="outline"
          className="w-full mt-6"
          onClick={() => navigate("/today")}
        >
          Go to Today's Workout
        </Button>
      </main>
    </div>
  );
};

export default Overview;

