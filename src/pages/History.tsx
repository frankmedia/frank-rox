import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Medal, TrendingUp } from "lucide-react";

// Mock data
const mockHistory = [
  {
    id: "1",
    exercise: "Barbell Squat",
    date: "Sun, 21 Jan 2024 at 12:44 AM",
    weight: 100,
    rpe: 7,
    isPB: true,
  },
  {
    id: "2",
    exercise: "Bench Press",
    date: "Sun, 21 Jan 2024 at 12:45 AM",
    weight: 80,
    rpe: 8,
    isPB: false,
  },
  {
    id: "3",
    exercise: "Deadlift",
    date: "Sat, 20 Jan 2024 at 11:30 PM",
    weight: 140,
    rpe: 9,
    isPB: true,
  },
];

const mockStats = {
  thisWeek: {
    workouts: 3,
    exercises: 15,
    totalWeight: 4500,
  },
  personalBests: [
    { exercise: "Deadlift", value: "160kg", date: "21 Jan 2024" },
    { exercise: "Barbell Squat", value: "120kg", date: "21 Jan 2024" },
    { exercise: "Bench Press", value: "95kg", date: "20 Jan 2024" },
  ],
};

const History = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("progress");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="container max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="rounded-full"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold text-foreground">Progress</h1>
          </div>
        </div>
      </header>

      <main className="container max-w-2xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="progress">Progress</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="progress" className="space-y-6">
            {/* Weekly Stats */}
            <Card className="p-6">
              <h3 className="text-sm text-muted-foreground mb-4">This Week</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-foreground">{mockStats.thisWeek.workouts}</p>
                  <p className="text-xs text-muted-foreground mt-1">Workouts</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-foreground">{mockStats.thisWeek.exercises}</p>
                  <p className="text-xs text-muted-foreground mt-1">Exercises</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-foreground">{mockStats.thisWeek.totalWeight}</p>
                  <p className="text-xs text-muted-foreground mt-1">Total kg</p>
                </div>
              </div>
            </Card>

            {/* Personal Bests */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold">Personal Bests</h3>
              </div>
              <div className="space-y-3">
                {mockStats.personalBests.map((pb, index) => (
                  <Card key={index} className="p-4 bg-secondary/10 border-secondary/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Medal className="w-5 h-5 text-primary" />
                        <div>
                          <p className="font-semibold text-foreground">{pb.exercise}</p>
                          <p className="text-xs text-muted-foreground">{pb.date}</p>
                        </div>
                      </div>
                      <Badge className="bg-primary text-primary-foreground font-bold text-lg px-3 py-1">
                        {pb.value}
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            {mockHistory.map((entry) => (
              <Card key={entry.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-foreground">{entry.exercise}</h3>
                      {entry.isPB && (
                        <Badge className="bg-primary/10 text-primary border border-primary/20 text-xs">
                          <Medal className="w-3 h-3 mr-1" />
                          PB
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{entry.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-secondary">{entry.weight}kg</p>
                    <p className="text-xs text-muted-foreground">RPE: {entry.rpe}</p>
                  </div>
                </div>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default History;
