import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ExerciseCard } from "@/components/ExerciseCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trophy, ClipboardList, Flame } from "lucide-react";
import { toast } from "sonner";
import { TrainingDaySelector } from "@/components/TrainingDaySelector";
import { useData } from "@/contexts/DataContext";
import { LoadingScreen } from "@/components/LoadingScreen";

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
    }
    return "1";
  });
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set());

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
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="container max-w-2xl mx-auto px-2 sm:px-4 py-2 sm:py-3">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            {/* Logo - Left Side */}
            <div 
              className="flex items-center gap-1 sm:gap-2 cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
              onClick={() => navigate("/")}
            >
              <Flame className="w-6 h-6 sm:w-8 sm:h-8" style={{ color: '#FFCC00' }} />
              <h1 className="text-lg sm:text-2xl font-bold text-foreground">RoxPT</h1>
            </div>
            
            {/* Training Day Selector - Right */}
            <TrainingDaySelector onDayChange={setCurrentTrainingDay} />
          </div>
        </div>
      </header>

      {/* Today's Workout */}
      <main className="container max-w-2xl mx-auto px-2 sm:px-4 py-3 sm:py-6">
        <div className="flex items-center justify-between mb-3 sm:mb-6">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">Training Day {currentTrainingDay}</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/history")}
            className="text-primary text-xs sm:text-sm"
          >
            <Trophy className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">History</span>
          </Button>
        </div>

        {loading ? (
          <LoadingScreen />
        ) : (
          <>
            {/* Intro Card (optional) */}
            {exercises.find(ex => ex.type === "intro") && (
              <Card 
                className="p-8 mb-6 border-4"
                style={{ borderColor: "#FFCC00" }}
              >
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <ClipboardList className="w-10 h-10 flex-shrink-0" style={{ color: "#FFCC00" }} />
                    <h3 className="text-4xl font-bold" style={{ color: "#FFCC00" }}>
                      {exercises.find(ex => ex.type === "intro")?.name}
                    </h3>
                  </div>
                  <p className="text-xl text-foreground leading-relaxed">
                    {exercises.find(ex => ex.type === "intro")?.notes || "No description provided."}
                  </p>
                </div>
              </Card>
            )}
            
            <div className="space-y-4">
              {exercises.map((exercise) => {
                // Skip intro cards - they're displayed above
                if (exercise.type === "intro") {
                  return null;
                }
                
                // Skip rendering child exercises that are part of a group
                // They're already displayed inside their parent card
                if ((exercise as any)._isChildExercise) {
                  return null;
                }
                
                return (
                  <ExerciseCard
                    key={exercise.id}
                    exercise={exercise}
                    onClick={() => navigate(`/exercise/${exercise.id}`)}
                    isCompleted={completedExercises.has(exercise.name)}
                  />
                );
              })}
            </div>

            {exercises.filter(ex => ex.type !== "intro").length === 0 && (
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
