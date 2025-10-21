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
                  <p className="text-muted-foreground leading-relaxed mb-3">
                    HYROX is a fitness race structured as <strong>8 rounds</strong> of: 
                    <strong> 1km run → 1 functional station</strong> (e.g., SkiErg, sled push, sled pull, burpee broad jumps, row, farmer's carry, sandbag lunges, wall balls).
                  </p>
                  <p className="text-sm text-foreground/70 italic">
                    Total distance: 8km running + 8 functional stations. Average completion time: 60-90 minutes.
                  </p>
                </div>

                {/* Energy Systems Table */}
                <div>
                  <h3 className="text-xl font-bold mb-3 text-foreground">Energy System Demands</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b-2" style={{ borderColor: '#FFCC00' }}>
                          <th className="text-left p-2 font-bold text-foreground">System</th>
                          <th className="text-left p-2 font-bold text-foreground">Duration</th>
                          <th className="text-left p-2 font-bold text-foreground">HYROX Application</th>
                        </tr>
                      </thead>
                      <tbody className="text-muted-foreground">
                        <tr className="border-b border-border">
                          <td className="p-2 font-semibold">Phosphocreatine</td>
                          <td className="p-2">0-10 seconds</td>
                          <td className="p-2">Sled push initiation, explosive movements</td>
                        </tr>
                        <tr className="border-b border-border">
                          <td className="p-2 font-semibold">Glycolytic</td>
                          <td className="p-2">10s - 2 min</td>
                          <td className="p-2">Station completion, SkiErg, rowing efforts</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-semibold">Oxidative</td>
                          <td className="p-2">2+ minutes</td>
                          <td className="p-2">Base for entire race, running between stations</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Why It's Different */}
                <div>
                  <h3 className="text-xl font-bold mb-2 text-foreground">Why It's Different</h3>
                  <p className="text-muted-foreground leading-relaxed mb-3">
                    It's a <strong>"hybrid" event</strong>: part endurance race, part functional fitness. 
                    This dual demand requires training that covers both <strong>running endurance</strong> and <strong>functional strength & conditioning</strong>.
                  </p>
                  <Card className="p-3 bg-secondary/10">
                    <p className="text-sm text-foreground">
                      <strong>Key Challenge:</strong> Maintaining running performance while building functional strength, without letting one interfere with the other.
                    </p>
                  </Card>
                </div>

                {/* Training Phases */}
                <div>
                  <h3 className="text-xl font-bold mb-3 text-foreground">Training Phases</h3>
                  <div className="space-y-4">
                    {/* Phase 1 */}
                    <Card className="p-4 border-2 border-primary/20">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold" style={{ backgroundColor: '#FFCC00', color: '#000' }}>1</div>
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
                        <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold" style={{ backgroundColor: '#FFCC00', color: '#000' }}>2</div>
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
                        <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold" style={{ backgroundColor: '#FFCC00', color: '#000' }}>3</div>
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
                        <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold" style={{ backgroundColor: '#FFCC00', color: '#000' }}>4</div>
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

                {/* Training Intensity Distribution */}
                <div>
                  <h3 className="text-xl font-bold mb-3 text-foreground">Training Intensity Distribution: The 80/20 Rule</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Research-backed approach for optimal endurance development:
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b-2" style={{ borderColor: '#FFCC00' }}>
                          <th className="text-left p-2 font-bold text-foreground">Intensity</th>
                          <th className="text-left p-2 font-bold text-foreground">% of Training</th>
                          <th className="text-left p-2 font-bold text-foreground">Heart Rate</th>
                          <th className="text-left p-2 font-bold text-foreground">Purpose</th>
                        </tr>
                      </thead>
                      <tbody className="text-muted-foreground">
                        <tr className="border-b border-border">
                          <td className="p-2 font-semibold">Low (Easy)</td>
                          <td className="p-2">80%</td>
                          <td className="p-2">&lt;70% HRmax</td>
                          <td className="p-2">Aerobic base, recovery</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-semibold">High (Hard)</td>
                          <td className="p-2">20%</td>
                          <td className="p-2">&gt;80% HRmax</td>
                          <td className="p-2">Race pace, power</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <Card className="p-3 bg-secondary/10 mt-3">
                    <p className="text-sm text-foreground">
                      <strong>Common Mistake:</strong> Training too much in the "gray zone" (70-80% HRmax) reduces both aerobic base and high-end power development.
                    </p>
                  </Card>
                </div>

                {/* Weekly Training Structure */}
                <div>
                  <h3 className="text-xl font-bold mb-3 text-foreground">Sample Weekly Training Structure</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b-2" style={{ borderColor: '#FFCC00' }}>
                          <th className="text-left p-2 font-bold text-foreground">Day</th>
                          <th className="text-left p-2 font-bold text-foreground">Session Type</th>
                          <th className="text-left p-2 font-bold text-foreground">Intensity</th>
                          <th className="text-left p-2 font-bold text-foreground">Duration</th>
                        </tr>
                      </thead>
                      <tbody className="text-muted-foreground">
                        <tr className="border-b border-border">
                          <td className="p-2 font-semibold">Monday</td>
                          <td className="p-2">Strength + Stations</td>
                          <td className="p-2">High</td>
                          <td className="p-2">60-75 min</td>
                        </tr>
                        <tr className="border-b border-border">
                          <td className="p-2 font-semibold">Tuesday</td>
                          <td className="p-2">Easy Run</td>
                          <td className="p-2">Low</td>
                          <td className="p-2">30-45 min</td>
                        </tr>
                        <tr className="border-b border-border">
                          <td className="p-2 font-semibold">Wednesday</td>
                          <td className="p-2">HIIT + Stations</td>
                          <td className="p-2">High</td>
                          <td className="p-2">45-60 min</td>
                        </tr>
                        <tr className="border-b border-border">
                          <td className="p-2 font-semibold">Thursday</td>
                          <td className="p-2">Active Recovery</td>
                          <td className="p-2">Low</td>
                          <td className="p-2">30 min</td>
                        </tr>
                        <tr className="border-b border-border">
                          <td className="p-2 font-semibold">Friday</td>
                          <td className="p-2">Intervals + Circuit</td>
                          <td className="p-2">Moderate</td>
                          <td className="p-2">60-75 min</td>
                        </tr>
                        <tr className="border-b border-border">
                          <td className="p-2 font-semibold">Saturday</td>
                          <td className="p-2">Long Run</td>
                          <td className="p-2">Low</td>
                          <td className="p-2">60-90 min</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-semibold">Sunday</td>
                          <td className="p-2">Rest / Mobility</td>
                          <td className="p-2">-</td>
                          <td className="p-2">-</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Station Training Focus */}
                <div>
                  <h3 className="text-xl font-bold mb-3 text-foreground">Station-Specific Training Protocols</h3>
                  <div className="grid gap-3">
                    <Card className="p-3 border-l-4" style={{ borderLeftColor: '#FFCC00' }}>
                      <h4 className="font-bold text-foreground mb-1">SkiErg</h4>
                      <p className="text-sm text-muted-foreground">5 x 500m @ 70-75% effort, 90s rest → Aerobic power + rhythm</p>
                    </Card>
                    <Card className="p-3 border-l-4" style={{ borderLeftColor: '#FFCC00' }}>
                      <h4 className="font-bold text-foreground mb-1">Sled Push/Pull</h4>
                      <p className="text-sm text-muted-foreground">6 x 50m @ 100% race weight, 90s rest → Power endurance</p>
                    </Card>
                    <Card className="p-3 border-l-4" style={{ borderLeftColor: '#FFCC00' }}>
                      <h4 className="font-bold text-foreground mb-1">Burpee Broad Jumps</h4>
                      <p className="text-sm text-muted-foreground">8 x 5 jumps, focus on rhythm → Movement efficiency</p>
                    </Card>
                    <Card className="p-3 border-l-4" style={{ borderLeftColor: '#FFCC00' }}>
                      <h4 className="font-bold text-foreground mb-1">Rowing</h4>
                      <p className="text-sm text-muted-foreground">4 x 1000m @ 75-80% effort, 2min rest → Lactate threshold</p>
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
                      <span><strong>Recovery:</strong> 7-9 hours sleep + active recovery sessions</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span style={{ color: '#FFCC00' }}>▸</span>
                      <span><strong>Consistency:</strong> Regular training builds the base for peak performance</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span style={{ color: '#FFCC00' }}>▸</span>
                      <span><strong>Concurrent Training:</strong> Separate strength and endurance by 6+ hours</span>
                    </li>
                  </ul>
                </div>

                {/* Recovery Science */}
                <div>
                  <h3 className="text-xl font-bold mb-3 text-foreground">Recovery & Adaptation</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b-2" style={{ borderColor: '#FFCC00' }}>
                          <th className="text-left p-2 font-bold text-foreground">Phase</th>
                          <th className="text-left p-2 font-bold text-foreground">Timeline</th>
                          <th className="text-left p-2 font-bold text-foreground">What's Happening</th>
                        </tr>
                      </thead>
                      <tbody className="text-muted-foreground">
                        <tr className="border-b border-border">
                          <td className="p-2 font-semibold">Immediate Fatigue</td>
                          <td className="p-2">0-24 hours</td>
                          <td className="p-2">Glycogen depletion, muscle damage</td>
                        </tr>
                        <tr className="border-b border-border">
                          <td className="p-2 font-semibold">Recovery</td>
                          <td className="p-2">24-72 hours</td>
                          <td className="p-2">Repair, glycogen restoration</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-semibold">Supercompensation</td>
                          <td className="p-2">72-120 hours</td>
                          <td className="p-2">Adaptation, stronger than before</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <Card className="p-3 bg-secondary/10 mt-3">
                    <p className="text-sm text-foreground">
                      <strong>Optimal Training:</strong> Apply next stimulus during supercompensation window (3-5 days after hard session)
                    </p>
                  </Card>
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
