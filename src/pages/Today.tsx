import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ExerciseCard } from "@/components/ExerciseCard";
import { Button } from "@/components/ui/button";
import { Calendar, Trophy, User, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { TrainingDaySelector } from "@/components/TrainingDaySelector";
import { useData } from "@/contexts/DataContext";

const Today = () => {
  const navigate = useNavigate();
  const { exercises, loading, error } = useData();
  const [currentTrainingDay, setCurrentTrainingDay] = useState(() => {
    try {
      const userStr = localStorage.getItem("frank_rock_user");
      if (userStr) {
        const user = JSON.parse(userStr);
        const userKey = `currentTrainingDay_${user.username}`;
        return localStorage.getItem(userKey) || "1";
      }
    } catch (e) {
      console.error("Error loading training day:", e);
    }
    return "1";
  });
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set());
  
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  // Load completed exercises from today (user-specific)
  useEffect(() => {
    try {
      const userStr = localStorage.getItem("frank_rock_user");
      if (userStr) {
        const user = JSON.parse(userStr);
        const storageKey = `workoutHistory_${user.username}`;
        const workoutHistory = localStorage.getItem(storageKey);
        
        if (workoutHistory) {
          const logs = JSON.parse(workoutHistory);
          const todayDate = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
          
          const todayCompleted = new Set(
            logs
              .filter((log: any) => log.timestamp && log.timestamp.startsWith(todayDate))
              .map((log: any) => log.exerciseName)
          );
          
          setCompletedExercises(todayCompleted);
        }
      }
    } catch (e) {
      console.error("Error loading completed exercises:", e);
    }
  }, [exercises]); // Re-check when exercises change

  useEffect(() => {
    if (error) {
      toast.error("Failed to load exercises", {
        description: error,
      });
    } else if (!loading && exercises.length === 0) {
      toast.info("No exercises found", {
        description: "Check your Google Sheets configuration",
      });
    }
  }, [error, loading, exercises]);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="container max-w-2xl mx-auto px-4 py-4">
          <div className="flex flex-col items-center mb-3">
            <div className="flex items-center gap-3 mb-2">
              <img 
                src="https://www.svgrepo.com/show/461257/dumbbell-3.svg" 
                alt="Dumbbell" 
                className="w-10 h-10"
                style={{ filter: 'brightness(0) saturate(100%) invert(85%) sepia(78%) saturate(2476%) hue-rotate(359deg) brightness(104%) contrast(104%)' }}
              />
              <h1 className="text-3xl font-bold text-foreground">Frank Rox</h1>
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {today}
            </p>
          </div>
          
          {/* Training Day Selector */}
          <div className="flex items-center justify-center gap-2">
            <TrainingDaySelector onDayChange={setCurrentTrainingDay} />
          </div>
        </div>
      </header>

      {/* Today's Workout */}
      <main className="container max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-foreground">Training Day {currentTrainingDay}</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/history")}
            className="text-primary"
          >
            <Trophy className="w-4 h-4 mr-2" />
            History
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {exercises.map((exercise) => (
                <ExerciseCard
                  key={exercise.id}
                  exercise={exercise}
                  onClick={() => navigate(`/exercise/${exercise.id}`)}
                  isCompleted={completedExercises.has(exercise.name)}
                />
              ))}
            </div>

            {exercises.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No exercises planned for today</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Configure your Google Sheets to get started
                </p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Today;
