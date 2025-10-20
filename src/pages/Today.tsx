import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ExerciseCard } from "@/components/ExerciseCard";
import { Button } from "@/components/ui/button";
import { Calendar, Trophy, User } from "lucide-react";

// Mock data - will be replaced with Google Sheets integration
const mockExercises = [
  {
    id: "1",
    name: "Barbell Squat",
    type: "strength" as const,
    sets: 4,
    reps: 8,
    suggestedKg: 100,
    personalBest: "120kg",
  },
  {
    id: "2",
    name: "Bench Press",
    type: "strength" as const,
    sets: 4,
    reps: 10,
    suggestedKg: 80,
    personalBest: "95kg",
  },
  {
    id: "3",
    name: "Running",
    type: "cardio" as const,
    durationMin: 20,
    targetDistanceKm: 5,
    personalBest: "04:32",
  },
  {
    id: "4",
    name: "Deadlift",
    type: "strength" as const,
    sets: 3,
    reps: 6,
    suggestedKg: 140,
    personalBest: "160kg",
  },
  {
    id: "5",
    name: "Rowing Machine",
    type: "cardio" as const,
    durationMin: 15,
    targetDistanceKm: 3,
  },
];

const Today = () => {
  const navigate = useNavigate();
  const [exercises] = useState(mockExercises);
  
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="container max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Frank Rock</h1>
              <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                <Calendar className="w-4 h-4" />
                {today}
              </p>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate("/profile")}
              className="rounded-full"
            >
              <User className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Today's Workout */}
      <main className="container max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-foreground">Today's Workout</h2>
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
          </div>
        )}
      </main>
    </div>
  );
};

export default Today;
