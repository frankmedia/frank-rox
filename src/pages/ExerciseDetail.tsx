import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Timer } from "@/components/Timer";
import { RestTimer } from "@/components/RestTimer";
import { Card } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const ExerciseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Mock data - will be replaced with Google Sheets
  const exercise = {
    id: "1",
    name: "Barbell Squat",
    type: "strength" as const,
    sets: 4,
    reps: 8,
    suggestedKg: 100,
  };

  const [todaysKg, setTodaysKg] = useState(exercise.suggestedKg.toString());
  const [rpe, setRpe] = useState("7");
  const [notes, setNotes] = useState("");
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [restDuration, setRestDuration] = useState(60);

  const handleMarkAsDone = () => {
    // Will integrate with Google Sheets API
    toast.success("Exercise logged successfully!", {
      description: `${exercise.name} - ${todaysKg}kg completed`,
    });
    navigate("/");
  };

  const handleRestTimer = (seconds: number) => {
    setRestDuration(seconds);
    setShowRestTimer(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="container max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="rounded-full"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold text-foreground">{exercise.name}</h1>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
            >
              <ArrowRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Exercise Info */}
        <Card className="p-6 bg-secondary/10 border-secondary">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">Target</p>
            <p className="text-7xl font-bold text-foreground mb-4">
              {exercise.sets} × {exercise.reps}
            </p>
            <p className="text-2xl text-secondary font-semibold">
              Suggested: {exercise.suggestedKg}kg
            </p>
          </div>
        </Card>

        {/* Rest Timer */}
        {showRestTimer ? (
          <Card className="p-6">
            <h3 className="text-lg font-bold mb-4 text-center">Rest Timer</h3>
            <Timer
              mode="countdown"
              initialSeconds={restDuration}
              onComplete={() => {
                toast.success("Rest complete!", {
                  description: "Ready for next set",
                });
                setShowRestTimer(false);
              }}
            />
          </Card>
        ) : (
          <RestTimer onSelectDuration={handleRestTimer} />
        )}

        {/* Input Form */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="weight" className="text-lg font-semibold">Today's Weight (kg)</Label>
            <Input
              id="weight"
              type="number"
              value={todaysKg}
              onChange={(e) => setTodaysKg(e.target.value)}
              className="text-5xl font-bold h-24 mt-2 text-center"
              placeholder="100"
            />
          </div>

          <div>
            <Label htmlFor="rpe" className="text-lg font-semibold">
              RPE (1-10) <span className="text-muted-foreground text-sm">- Rate of Perceived Exertion</span>
            </Label>
            <Input
              id="rpe"
              type="number"
              min="1"
              max="10"
              value={rpe}
              onChange={(e) => setRpe(e.target.value)}
              className="text-5xl font-bold h-24 mt-2 text-center"
              placeholder="7"
            />
          </div>

          <div>
            <Label htmlFor="notes" className="text-base">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="How did it feel? Any observations..."
              className="mt-2 min-h-[100px]"
            />
          </div>
        </div>

        {/* Mark as Done */}
        <Button
          size="lg"
          className="w-full h-16 text-lg font-bold"
          onClick={handleMarkAsDone}
        >
          <CheckCircle2 className="w-6 h-6 mr-2" />
          Mark as Done
        </Button>
      </main>
    </div>
  );
};

export default ExerciseDetail;
