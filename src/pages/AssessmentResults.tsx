import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Timer, Calendar, TrendingUp, Target, AlertCircle } from "lucide-react";
import { HyroxResults } from "@/utils/hyroxModel";
import { motion } from "framer-motion";

const AssessmentResults = () => {
  const navigate = useNavigate();
  const [results, setResults] = useState<HyroxResults | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem("frank_rock_user");
    if (userStr) {
      const user = JSON.parse(userStr);
      const resultsKey = `assessment_results_${user.username}`;
      const stored = localStorage.getItem(resultsKey);
      if (stored) {
        setResults(JSON.parse(stored));
      } else {
        navigate("/assessment");
      }
    }
  }, [navigate]);

  if (!results) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  const getScoreColor = (score: number): string => {
    if (score >= 7.5) return "text-green-500";
    if (score >= 5) return "text-yellow-500";
    return "text-red-500";
  };

  const getScoreBg = (score: number): string => {
    if (score >= 7.5) return "bg-green-500/20 border-green-500";
    if (score >= 5) return "bg-yellow-500/20 border-yellow-500";
    return "bg-red-500/20 border-red-500";
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="container max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/profile")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold">Your HYROX Profile</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Profile Archetype */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-6 bg-gradient-to-br from-yellow-500/20 to-yellow-500/5 border-2 border-yellow-500">
            <div className="text-center">
              <Badge className="mb-3 text-base py-1 px-3 bg-yellow-500 text-black">
                {results.profile.archetype}
              </Badge>
              <p className="text-3xl font-bold">{results.indices.TotalScore}/10</p>
              <p className="text-sm text-muted-foreground mt-1">Overall Readiness</p>
            </div>
          </Card>
        </motion.div>

        {/* Predicted Time */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Timer className="w-6 h-6 text-yellow-500" />
              <h2 className="text-lg font-bold">Predicted Time</h2>
            </div>
            <div className="text-center">
              <p className="text-5xl font-bold text-yellow-500">{results.predictedTime.estimate}</p>
              <div className="flex items-center justify-center gap-4 mt-3 text-sm text-muted-foreground">
                <span>Best: {results.predictedTime.lowRisk}</span>
                <span>•</span>
                <span>Worst: {results.predictedTime.highRisk}</span>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Training Plan */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="w-6 h-6 text-yellow-500" />
              <h2 className="text-lg font-bold">Training Plan</h2>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-3xl font-bold">{results.prescriptions.trainingDaysPerWeek}</p>
                <p className="text-xs text-muted-foreground mt-1">Days/Week</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold">{results.prescriptions.runsPerWeek}</p>
                <p className="text-xs text-muted-foreground mt-1">Runs/Week</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold">{results.prescriptions.recommendedBlockWeeks}</p>
                <p className="text-xs text-muted-foreground mt-1">Weeks</p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Index Scores */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="w-6 h-6 text-yellow-500" />
              <h2 className="text-lg font-bold">Your Scores</h2>
            </div>
            <div className="space-y-3">
              {[
                { 
                  label: "Running", 
                  score: results.indices.Running, 
                  icon: "🏃",
                  description: "1km pace, 30min distance, frequency, endurance"
                },
                { 
                  label: "Strength", 
                  score: results.indices.Strength, 
                  icon: "💪",
                  description: "Sled push/pull, wall balls, deadlift, lunges, farmer carry"
                },
                { 
                  label: "Engine", 
                  score: results.indices.Engine, 
                  icon: "⚡",
                  description: "Rowing, skiing, bike power, engine capacity"
                },
                { 
                  label: "Mobility", 
                  score: results.indices.Mobility, 
                  icon: "🧘",
                  description: "Mobility frequency, sleep hours & quality, injury severity"
                },
                { 
                  label: "Nutrition", 
                  score: results.indices.Nutrition, 
                  icon: "🍎",
                  description: "Water, protein, fruit/veg, fiber, supplements, diet type"
                },
                { 
                  label: "Lifestyle", 
                  score: results.indices.Lifestyle, 
                  icon: "🍸",
                  description: "Training frequency, stress, work schedule, recovery practices"
                },
              ].map((item) => (
                <div key={item.label} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{item.icon}</span>
                      <span className="font-medium">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-secondary rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full ${getScoreColor(item.score)}`}
                          style={{ backgroundColor: "currentColor" }}
                          initial={{ width: 0 }}
                          animate={{ width: `${(item.score / 10) * 100}%` }}
                          transition={{ duration: 0.5, delay: 0.4 }}
                        />
                      </div>
                      <span className={`font-bold text-lg w-10 text-right ${getScoreColor(item.score)}`}>
                        {item.score.toFixed(1)}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground ml-8">
                    {item.description}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Strengths & Limiters */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <div className="grid grid-cols-2 gap-4">
            {/* Focus Areas */}
            <Card className="p-6 bg-yellow-500/10 border-4 border-yellow-500 min-h-[180px]">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-7 h-7 text-yellow-500" />
                <h3 className="font-bold text-lg">Focus Areas</h3>
              </div>
              <div className="space-y-3">
                {results.profile.strengths.map((strength) => (
                  <Badge key={strength} variant="secondary" className="w-full justify-center text-base py-2 font-semibold bg-yellow-500/20 text-yellow-800 border-yellow-500">
                    {strength}
                  </Badge>
                ))}
              </div>
            </Card>

            {/* Limiters */}
            <Card className="p-6 bg-red-500/10 border-4 border-red-500 min-h-[180px]">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="w-7 h-7 text-red-500" />
                <h3 className="font-bold text-lg">Focus On</h3>
              </div>
              <div className="space-y-3">
                {results.weakStations.map((station) => (
                  <Badge key={station} variant="secondary" className="w-full justify-center text-base py-2 font-semibold">
                    {station}
                  </Badge>
                ))}
              </div>
            </Card>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button variant="outline" size="lg" onClick={() => navigate("/assessment")} className="flex-1 h-16 text-lg font-semibold">
            Retake Test
          </Button>
          <Button onClick={() => navigate("/today")} className="flex-1 h-16 text-lg font-bold bg-yellow-500 text-black hover:bg-yellow-600">
            Start Training
          </Button>
        </div>
      </main>
    </div>
  );
};

export default AssessmentResults;

