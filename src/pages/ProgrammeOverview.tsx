import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft } from "lucide-react";
import { motion } from "framer-motion";

// Custom SVG Icons
const RunnerIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M13.5 5.5c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2z"/>
    <path d="M9.8 8.7L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.9z"/>
  </svg>
);

const HeartIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
);

const DumbbellIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14.4 14.4L9.6 9.6"/>
    <path d="M18.657 21.485a2 2 0 1 1-2.829-2.828l-1.767 1.768a2 2 0 1 1-2.829-2.829l6.364-6.364a2 2 0 1 1 2.829 2.829l-1.768 1.767a2 2 0 1 1 2.829 2.829l-1.768 1.767-1.768 1.768z"/>
    <path d="M21.5 21.5l-1.4-1.4"/>
    <path d="M3.9 3.9l1.4 1.4"/>
    <path d="M6.404 12.768a2 2 0 1 1-2.829-2.829l1.768-1.767a2 2 0 1 1-2.829-2.829l2.828-2.828a2 2 0 1 1 2.829 2.828l1.767-1.768a2 2 0 1 1 2.829 2.829l-6.364 6.364z"/>
  </svg>
);

const RestIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="12" r="10" opacity="0.3"/>
    <rect x="9" y="9" width="2" height="6" rx="1"/>
    <rect x="13" y="9" width="2" height="6" rx="1"/>
  </svg>
);

type SessionBlock = {
  day: string;
  type: "run" | "strength" | "cardio" | "recovery";
  title: string;
  distance?: string;
  pace?: string;
  effort: "easy" | "moderate" | "hard";
  detail?: string;
};

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function ProgrammeOverview() {
  const navigate = useNavigate();
  const [programme, setProgramme] = useState<any>(null);
  const [weekView, setWeekView] = useState<1 | 2>(1);

  useEffect(() => {
    const programmeStr = localStorage.getItem("current_programme");
    if (!programmeStr) {
      navigate("/onboarding");
      return;
    }
    setProgramme(JSON.parse(programmeStr));
  }, [navigate]);

  if (!programme) return null;

  const { sessions: allSessions, focus, blockNumber } = programme;

  // Create a full week schedule with progression for Week 2
  const createWeekSchedule = (weekNum: number) => {
    const schedule: Array<{ day: string; session: SessionBlock | null; isRest: boolean }> = [];
    
    days.forEach(day => {
      let session = allSessions.find((s: SessionBlock) => s.day === day);
      
      // Week 2: Add ~10% volume/intensity progression
      if (session && weekNum === 2) {
        session = { ...session };
        
        // Increase volume for long runs
        if (session.title.includes("Long Run")) {
          session.distance = session.distance.replace(/(\d+)–(\d+)km/, (_, min, max) => 
            `${parseInt(min) + 1}–${parseInt(max) + 2}km`
          );
        }
        
        // Increase reps for intervals
        if (session.title.includes("Intervals")) {
          session.distance = session.distance.replace(/(\d+)×/, (_, reps) => 
            `${parseInt(reps) + 2}×`
          );
        }
        
        // Increase distance for tempo runs
        if (session.title.includes("Tempo")) {
          session.distance = session.distance.replace(/(\d+)–(\d+)km/, (_, min, max) => 
            `${parseInt(min) + 1}–${parseInt(max) + 1}km`
          ).replace(/(\d+)km/, (_, dist) => `${parseInt(dist) + 1}km`);
        }
        
        // Increase hill reps
        if (session.title.includes("Hill")) {
          session.distance = session.distance.replace(/(\d+)×/, (_, reps) => 
            `${parseInt(reps) + 2}×`
          );
        }
      }
      
      schedule.push({
        day,
        session: session || null,
        isRest: !session
      });
    });

    return schedule;
  };

  const week1Schedule = createWeekSchedule(1);
  const week2Schedule = createWeekSchedule(2);
  const currentSchedule = weekView === 1 ? week1Schedule : week2Schedule;

  const getIcon = (session: SessionBlock | null) => {
    if (!session) return RestIcon;
    switch (session.type) {
      case "run": return RunnerIcon;
      case "strength": return DumbbellIcon;
      case "cardio": return HeartIcon;
      case "recovery": return RestIcon;
      default: return HeartIcon;
    }
  };

  const getEffortColor = (effort?: "easy" | "moderate" | "hard") => {
    if (!effort) return "bg-zinc-700 border-zinc-600";
    switch (effort) {
      case "hard": return "bg-red-500/20 border-red-500/50";
      case "moderate": return "bg-orange-500/20 border-orange-500/50";
      case "easy": return "bg-green-500/20 border-green-500/50";
      default: return "bg-zinc-700 border-zinc-600";
    }
  };

  const getEffortLabel = (effort?: "easy" | "moderate" | "hard") => {
    if (!effort) return "Rest";
    return effort.charAt(0).toUpperCase() + effort.slice(1);
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="mr-2"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold">Your Programme</h1>
            <p className="text-xs text-muted-foreground">Block {blockNumber} - {focus.charAt(0).toUpperCase() + focus.slice(1)} Phase</p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-32">
        <div className="container max-w-3xl mx-auto px-4 py-6 space-y-6">
          {/* Programme Summary */}
          <Card className="p-5 bg-zinc-900 border-zinc-800">
            <h3 className="text-lg font-bold text-yellow-400 mb-2">2-Week Training Block</h3>
            <p className="text-sm text-white/70 mb-3">
              Your personalized training programme focused on <span className="text-yellow-400 font-semibold">{focus}</span> development. 
              Each session is designed to build your hybrid fitness progressively.
            </p>
            <div className="flex gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-white/60">Hard</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                <span className="text-white/60">Moderate</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-white/60">Easy</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-zinc-700"></div>
                <span className="text-white/60">Rest</span>
              </div>
            </div>
          </Card>

          {/* Week 1 */}
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-white">Week 1</h2>
            {week1Schedule.map((item, idx) => {
              const Icon = getIcon(item.session);
              const isRest = item.isRest;

              return (
                <motion.div
                  key={`week1-${item.day}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card className={`p-4 border-2 ${isRest ? 'bg-zinc-900/50 border-zinc-800' : getEffortColor(item.session?.effort)}`}>
                    <div className="flex items-start gap-4">
                      {/* Day Number */}
                      <div className="flex flex-col items-center flex-shrink-0">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isRest ? 'bg-zinc-800' : 'bg-yellow-400'}`}>
                          <span className={`text-lg font-bold ${isRest ? 'text-white' : 'text-black'}`}>
                            {idx + 1}
                          </span>
                        </div>
                        <span className="text-xs text-white/50 mt-1">{item.day.slice(0, 3)}</span>
                      </div>

                      {/* Session Details */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Icon className={`w-5 h-5 ${isRest ? 'text-zinc-600' : 'text-yellow-400'}`} />
                          <h4 className="text-base font-bold text-white">
                            {item.session?.title || "Rest Day"}
                          </h4>
                          {!isRest && (
                            <span className={`ml-auto text-xs px-2 py-1 rounded-full ${
                              item.session?.effort === "hard" ? "bg-red-500/30 text-red-300" :
                              item.session?.effort === "moderate" ? "bg-orange-500/30 text-orange-300" :
                              "bg-green-500/30 text-green-300"
                            }`}>
                              {getEffortLabel(item.session?.effort)}
                            </span>
                          )}
                        </div>

                        {item.session ? (
                          <>
                            {(item.session.distance || item.session.pace) && (
                              <div className="space-y-1 mb-2">
                                {item.session.distance && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <span className="text-white/50">Distance:</span>
                                    <span className="text-white font-semibold">{item.session.distance}</span>
                                  </div>
                                )}
                                {item.session.pace && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <span className="text-white/50">Pace:</span>
                                    <span className="text-white">{item.session.pace}</span>
                                  </div>
                                )}
                              </div>
                            )}
                            {item.session.detail && (
                              <p className="text-xs text-white/60 mt-2 italic">
                                {item.session.detail}
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="text-sm text-white/60">
                            Complete recovery day for adaptation and supercompensation
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {/* Week 2 */}
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-white">Week 2</h2>
            {week2Schedule.map((item, idx) => {
              const Icon = getIcon(item.session);
              const isRest = item.isRest;

              return (
                <motion.div
                  key={`${weekView}-${item.day}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card className={`p-4 border-2 ${isRest ? 'bg-zinc-900/50 border-zinc-800' : getEffortColor(item.session?.effort)}`}>
                    <div className="flex items-start gap-4">
                      {/* Day Number */}
                      <div className="flex flex-col items-center flex-shrink-0">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isRest ? 'bg-zinc-800' : 'bg-yellow-400'}`}>
                          <span className={`text-lg font-bold ${isRest ? 'text-white' : 'text-black'}`}>
                            {idx + 1}
                          </span>
                        </div>
                        <span className="text-xs text-white/50 mt-1">{item.day.slice(0, 3)}</span>
                      </div>

                      {/* Session Details */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Icon className={`w-5 h-5 ${isRest ? 'text-zinc-600' : 'text-yellow-400'}`} />
                          <h4 className="text-base font-bold text-white">
                            {item.session?.title || "Rest Day"}
                          </h4>
                          {!isRest && (
                            <span className={`ml-auto text-xs px-2 py-1 rounded-full ${
                              item.session?.effort === "hard" ? "bg-red-500/30 text-red-300" :
                              item.session?.effort === "moderate" ? "bg-orange-500/30 text-orange-300" :
                              "bg-green-500/30 text-green-300"
                            }`}>
                              {getEffortLabel(item.session?.effort)}
                            </span>
                          )}
                        </div>

                        {item.session ? (
                          <>
                            {(item.session.distance || item.session.pace) && (
                              <div className="space-y-1 mb-2">
                                {item.session.distance && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <span className="text-white/50">Distance:</span>
                                    <span className="text-white font-semibold">{item.session.distance}</span>
                                  </div>
                                )}
                                {item.session.pace && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <span className="text-white/50">Pace:</span>
                                    <span className="text-white">{item.session.pace}</span>
                                  </div>
                                )}
                              </div>
                            )}
                            {item.session.detail && (
                              <p className="text-xs text-white/60 mt-2 italic">
                                {item.session.detail}
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="text-sm text-white/60">
                            Complete recovery day for adaptation and supercompensation
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Fixed Bottom Button */}
      <div className="fixed left-0 right-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40">
        <div className="container max-w-3xl mx-auto px-4 pb-2">
          <div className="bg-background/95 backdrop-blur border border-border rounded-xl p-2 shadow-lg">
            <Button
              className="w-full h-14 text-lg font-bold"
              style={{ backgroundColor: "#FFCC00", color: "#000" }}
              onClick={() => navigate("/overview")}
            >
              Start Training 🚀
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

