import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ExerciseCard } from "@/components/ExerciseCard";
import { Button } from "@/components/ui/button";
import { Calendar, Trophy, User, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { DebugPanel } from "@/components/DebugPanel";
import { TrainingDaySelector } from "@/components/TrainingDaySelector";
import { useData } from "@/contexts/DataContext";

const Today = () => {
  const navigate = useNavigate();
  const { exercises, loading, error } = useData();
  const [currentTrainingDay, setCurrentTrainingDay] = useState(() => {
    return localStorage.getItem("currentTrainingDay") || "1";
  });
  
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

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
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Frank Rock</h1>
              <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                <Calendar className="w-4 h-4" />
                {today}
              </p>
            </div>
          </div>
          
          {/* Training Day Selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground font-medium">Training Day:</span>
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

      {/* Debug Panel */}
      <DebugPanel />
    </div>
  );
};

export default Today;
