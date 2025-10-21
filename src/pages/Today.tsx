import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ExerciseCard } from "@/components/ExerciseCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trophy, ClipboardList, Flame, Info } from "lucide-react";
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
      console.error("Error loading training day:", e);
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
          
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-primary text-xs sm:text-sm"
              >
                <Info className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                <span className="hidden sm:inline">Hyrox Training</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                  <Flame className="w-6 h-6" style={{ color: '#FFCC00' }} />
                  Hyrox Training Methodology
                </DialogTitle>
                <DialogDescription className="text-base">
                  Understanding the science behind your training programme
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6 mt-4">
                {/* What is Hyrox */}
                <div>
                  <h3 className="text-xl font-bold mb-2 text-foreground">What is Hyrox?</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    HYROX is a fitness race structured as <strong>8 rounds</strong> of: 
                    <strong> 1km run → 1 functional station</strong> (e.g., SkiErg, sled push, sled pull, burpee broad jumps, row, farmer's carry, sandbag lunges, wall balls).
                  </p>
                </div>

                {/* Why It's Different */}
                <div>
                  <h3 className="text-xl font-bold mb-2 text-foreground">Why It's Different</h3>
                  <p className="text-muted-foreground leading-relaxed mb-3">
                    It's a <strong>"hybrid" event</strong>: part endurance race, part functional fitness. 
                    This dual demand requires training that covers both <strong>running endurance</strong> and <strong>functional strength & conditioning</strong>.
                  </p>
                </div>

                {/* Training Phases */}
                <div>
                  <h3 className="text-xl font-bold mb-3 text-foreground">Training Phases</h3>
                  <div className="space-y-4">
                    {/* Phase 1 */}
                    <Card className="p-4 border-2 border-primary/20">
                      <div className="flex items-start gap-3">
                        <div className="text-2xl font-bold" style={{ color: '#FFCC00' }}>1️⃣</div>
                        <div className="flex-1">
                          <h4 className="font-bold text-lg text-foreground mb-1">Base Phase (Weeks 1–2)</h4>
                          <p className="text-sm text-muted-foreground mb-2">
                            <strong>Focus:</strong> Aerobic Capacity + Technique<br/>
                            <strong>Energy System:</strong> Zone 2 / Aerobic
                          </p>
                          <p className="text-sm text-foreground">
                            Build volume safely, improve running & SkiErg efficiency
                          </p>
                        </div>
                      </div>
                    </Card>

                    {/* Phase 2 */}
                    <Card className="p-4 border-2 border-primary/20">
                      <div className="flex items-start gap-3">
                        <div className="text-2xl font-bold" style={{ color: '#FFCC00' }}>2️⃣</div>
                        <div className="flex-1">
                          <h4 className="font-bold text-lg text-foreground mb-1">Build Phase (Weeks 3–4)</h4>
                          <p className="text-sm text-muted-foreground mb-2">
                            <strong>Focus:</strong> Strength + Threshold<br/>
                            <strong>Energy System:</strong> Aerobic + Lactate Threshold
                          </p>
                          <p className="text-sm text-foreground">
                            Introduce faster runs, heavier carries, and circuits
                          </p>
                        </div>
                      </div>
                    </Card>

                    {/* Phase 3 */}
                    <Card className="p-4 border-2 border-primary/20">
                      <div className="flex items-start gap-3">
                        <div className="text-2xl font-bold" style={{ color: '#FFCC00' }}>3️⃣</div>
                        <div className="flex-1">
                          <h4 className="font-bold text-lg text-foreground mb-1">Peak Phase (Weeks 5–6)</h4>
                          <p className="text-sm text-muted-foreground mb-2">
                            <strong>Focus:</strong> HIIT + Simulation<br/>
                            <strong>Energy System:</strong> Anaerobic + Race Specific
                          </p>
                          <p className="text-sm text-foreground">
                            Add short, high-intensity intervals to replicate race fatigue
                          </p>
                        </div>
                      </div>
                    </Card>

                    {/* Phase 4 */}
                    <Card className="p-4 border-2 border-primary/20">
                      <div className="flex items-start gap-3">
                        <div className="text-2xl font-bold" style={{ color: '#FFCC00' }}>4️⃣</div>
                        <div className="flex-1">
                          <h4 className="font-bold text-lg text-foreground mb-1">Taper Phase (Final Week)</h4>
                          <p className="text-sm text-muted-foreground mb-2">
                            <strong>Focus:</strong> Sharpness + Recovery<br/>
                            <strong>Energy System:</strong> All systems
                          </p>
                          <p className="text-sm text-foreground">
                            Maintain performance without overload
                          </p>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>

                {/* Key Principles */}
                <div>
                  <h3 className="text-xl font-bold mb-2 text-foreground">Key Training Principles</h3>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span style={{ color: '#FFCC00' }}>▸</span>
                      <span><strong>Progressive Overload:</strong> Gradually increase volume and intensity</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span style={{ color: '#FFCC00' }}>▸</span>
                      <span><strong>Specificity:</strong> Train movements and energy systems used in the race</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span style={{ color: '#FFCC00' }}>▸</span>
                      <span><strong>Recovery:</strong> Adequate rest between high-intensity sessions</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span style={{ color: '#FFCC00' }}>▸</span>
                      <span><strong>Consistency:</strong> Regular training builds the base for peak performance</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground text-center italic">
                    Your Road to the Next Podium Starts Here 🏆
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
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
