import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/utils/supabaseClient";
import { Activity, TrendingUp, Heart, Flame, CheckCircle, XCircle, Pause } from "lucide-react";

interface Client {
  id: string;
  name: string;
  email: string;
}

interface Plan {
  id: string;
  name: string;
  start_date: string;
  cycle_days: number;
}

interface WorkoutLog {
  id: string;
  exerciseName: string;
  rating?: number;
  weight?: number;
  sets?: number;
  reps?: number;
  duration?: number;
  distance?: number;
  notes?: string;
  isPB?: boolean;
}

interface DayActivity {
  dayNumber: number;
  date: string;
  workouts: WorkoutLog[];
  isRestDay: boolean;
  isSkipped: boolean;
  avgRating?: number;
  totalWorkouts: number;
}

interface PTCheckIn {
  id: string;
  timestamp: string;
  sessionsCompleted: string;
  consistency: string;
  pushLevel: string;
  extraTraining: string;
  nutritionRating: string;
  recoveryIssues: string;
  motivation: string;
  proud: string;
  improve: string;
  ptFeedback: string;
}

const ClientFeedback = () => {
  const { clientId } = useParams();
  const [client, setClient] = useState<Client | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [dayActivities, setDayActivities] = useState<DayActivity[]>([]);
  const [checkIns, setCheckIns] = useState<PTCheckIn[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClientData();
  }, [clientId]);

  const loadClientData = async () => {
    if (!clientId) return;
    
    try {
      setLoading(true);
      
      // Load client info
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("id, name, email")
        .eq("id", clientId)
        .single();
      
      if (clientError) throw clientError;
      setClient(clientData as Client);

      // Load active plan for this client
      const { data: planData, error: planError } = await supabase
        .from("plans")
        .select("id, name, start_date, cycle_days")
        .eq("client_id", clientId)
        .eq("status", "active")
        .single();
      
      if (!planError && planData) {
        setPlan(planData as Plan);
      }

      // Generate HYROX-focused dummy data for 14 days
      const dummyDays: DayActivity[] = [
        {
          dayNumber: 1,
          date: "20/10/2025",
          isRestDay: false,
          isSkipped: false,
          totalWorkouts: 4,
          avgRating: 4.5,
          workouts: [
            { id: "1-1", exerciseName: "Z2 Easy Run", rating: 5, duration: 30, distance: 5.0, notes: "Focus on cadence and breathing" },
            { id: "1-2", exerciseName: "Hip Mobility", rating: 4, duration: 10, notes: "Felt loose" },
            { id: "1-3", exerciseName: "Core Plank", rating: 4, duration: 3, sets: 3, notes: "60s holds" },
            { id: "1-4", exerciseName: "Foam Rolling", rating: 5, duration: 15, notes: "Recovery" }
          ]
        },
        {
          dayNumber: 2,
          date: "21/10/2025",
          isRestDay: false,
          isSkipped: false,
          totalWorkouts: 5,
          avgRating: 4.2,
          workouts: [
            { id: "2-1", exerciseName: "Walking Lunges", rating: 4, sets: 4, reps: 20, notes: "Technique day" },
            { id: "2-2", exerciseName: "Farmer Carries", rating: 4, weight: 32, duration: 3, distance: 0.05, notes: "2x24kg KBs, 50m" },
            { id: "2-3", exerciseName: "Goblet Squats", rating: 5, weight: 24, sets: 3, reps: 15, notes: "Deep squats" },
            { id: "2-4", exerciseName: "90/90 Hip Switches", rating: 4, sets: 3, reps: 10, notes: "Mobility" },
            { id: "2-5", exerciseName: "Dead Bugs", rating: 4, sets: 3, reps: 12, notes: "Core" }
          ]
        },
        {
          dayNumber: 3,
          date: "22/10/2025",
          isRestDay: false,
          isSkipped: false,
          totalWorkouts: 7,
          avgRating: 4.3,
          workouts: [
            { id: "3-1", exerciseName: "400m Run", rating: 5, duration: 1.8, distance: 0.4, notes: "HYROX sim - Station 1" },
            { id: "3-2", exerciseName: "SkiErg", rating: 4, duration: 2.5, distance: 0.5, notes: "1000m, pushed hard" },
            { id: "3-3", exerciseName: "400m Run", rating: 4, duration: 2, distance: 0.4, notes: "Recovery pace" },
            { id: "3-4", exerciseName: "Sled Push", rating: 4, weight: 102, duration: 1.5, distance: 0.05, notes: "50m, heavy!" },
            { id: "3-5", exerciseName: "400m Run", rating: 4, duration: 2, distance: 0.4, notes: "Steady" },
            { id: "3-6", exerciseName: "Burpee Broad Jumps", rating: 4, reps: 80, duration: 5, notes: "HYROX station" },
            { id: "3-7", exerciseName: "Stretching", rating: 5, duration: 10, notes: "Post-workout mobility" }
          ]
        },
        {
          dayNumber: 4,
          date: "23/10/2025",
          isRestDay: true,
          isSkipped: false,
          totalWorkouts: 0,
          workouts: []
        },
        {
          dayNumber: 5,
          date: "24/10/2025",
          isRestDay: false,
          isSkipped: false,
          totalWorkouts: 6,
          avgRating: 4.5,
          workouts: [
            { id: "5-1", exerciseName: "Shoulder Mobility", rating: 4, duration: 10, notes: "Upper body prep" },
            { id: "5-2", exerciseName: "Push-ups", rating: 5, sets: 4, reps: 15, notes: "Chest activation" },
            { id: "5-3", exerciseName: "Pull-ups", rating: 5, sets: 4, reps: 8, notes: "Felt strong!" },
            { id: "5-4", exerciseName: "Dumbbell Rows", rating: 4, weight: 28, sets: 4, reps: 12, notes: "Each arm" },
            { id: "5-5", exerciseName: "Face Pulls", rating: 4, sets: 3, reps: 15, notes: "Rear delts" },
            { id: "5-6", exerciseName: "Sandbag Carries", rating: 5, weight: 20, duration: 2, distance: 0.1, notes: "100m, HYROX prep" }
          ]
        },
        {
          dayNumber: 6,
          date: "25/10/2025",
          isRestDay: false,
          isSkipped: false,
          totalWorkouts: 5,
          avgRating: 4.8,
          workouts: [
            { id: "6-1", exerciseName: "Back Squat", rating: 5, weight: 120, sets: 5, reps: 5, isPB: true, notes: "New PR! 🎉" },
            { id: "6-2", exerciseName: "Deadlift", rating: 5, weight: 140, sets: 3, reps: 5, isPB: true, notes: "Another PB!" },
            { id: "6-3", exerciseName: "Romanian Deadlifts", rating: 5, weight: 80, sets: 3, reps: 10, notes: "Hamstrings" },
            { id: "6-4", exerciseName: "Bulgarian Split Squats", rating: 4, weight: 20, sets: 3, reps: 10, notes: "Each leg" },
            { id: "6-5", exerciseName: "Wall Balls", rating: 5, weight: 9, sets: 3, reps: 30, notes: "HYROX station practice" }
          ]
        },
        {
          dayNumber: 7,
          date: "26/10/2025",
          isRestDay: false,
          isSkipped: true,
          totalWorkouts: 0,
          workouts: []
        },
        {
          dayNumber: 8,
          date: "27/10/2025",
          isRestDay: false,
          isSkipped: false,
          totalWorkouts: 8,
          avgRating: 3.9,
          workouts: [
            { id: "8-1", exerciseName: "600m Run", rating: 4, duration: 3, distance: 0.6, notes: "HYROX sim start" },
            { id: "8-2", exerciseName: "SkiErg", rating: 4, duration: 2.5, distance: 0.5, notes: "1000m" },
            { id: "8-3", exerciseName: "600m Run", rating: 4, duration: 3, distance: 0.6, notes: "Between stations" },
            { id: "8-4", exerciseName: "Sled Pull", rating: 3, weight: 78, duration: 2, distance: 0.05, notes: "50m, tough!" },
            { id: "8-5", exerciseName: "600m Run", rating: 4, duration: 3.2, distance: 0.6, notes: "Tired legs" },
            { id: "8-6", exerciseName: "Burpee Broad Jumps", rating: 3, reps: 80, duration: 6, notes: "Exhausting" },
            { id: "8-7", exerciseName: "600m Run", rating: 4, duration: 3.3, distance: 0.6, notes: "Final push" },
            { id: "8-8", exerciseName: "Rowing Machine", rating: 4, duration: 4, distance: 1.0, notes: "1000m finish" }
          ]
        },
        {
          dayNumber: 9,
          date: "28/10/2025",
          isRestDay: false,
          isSkipped: false,
          totalWorkouts: 3,
          avgRating: 4.7,
          workouts: [
            { id: "9-1", exerciseName: "Z2 Easy Run", rating: 5, duration: 30, distance: 5.2, notes: "Recovery run" },
            { id: "9-2", exerciseName: "Yoga Flow", rating: 4, duration: 20, notes: "Full body stretch" },
            { id: "9-3", exerciseName: "Breathing Drills", rating: 5, duration: 10, notes: "Cadence work" }
          ]
        },
        {
          dayNumber: 10,
          date: "29/10/2025",
          isRestDay: false,
          isSkipped: false,
          totalWorkouts: 6,
          avgRating: 4.2,
          workouts: [
            { id: "10-1", exerciseName: "Walking Lunges", rating: 4, sets: 4, reps: 20, notes: "Technique" },
            { id: "10-2", exerciseName: "Farmer Carries", rating: 4, weight: 36, duration: 3, distance: 0.05, notes: "Heavier!" },
            { id: "10-3", exerciseName: "Goblet Squats", rating: 4, weight: 28, sets: 3, reps: 15, notes: "Increased weight" },
            { id: "10-4", exerciseName: "Sled Push", rating: 4, weight: 102, duration: 1.8, distance: 0.05, notes: "50m practice" },
            { id: "10-5", exerciseName: "Hip Mobility", rating: 4, duration: 10, notes: "Feeling looser" },
            { id: "10-6", exerciseName: "Plank Variations", rating: 4, duration: 5, sets: 3, notes: "Core strength" }
          ]
        },
        {
          dayNumber: 11,
          date: "30/10/2025",
          isRestDay: false,
          isSkipped: false,
          totalWorkouts: 7,
          avgRating: 4.1,
          workouts: [
            { id: "11-1", exerciseName: "400m Run", rating: 4, duration: 1.9, distance: 0.4, notes: "HYROX sim" },
            { id: "11-2", exerciseName: "SkiErg", rating: 4, duration: 2.4, distance: 0.5, notes: "1000m, improving!" },
            { id: "11-3", exerciseName: "400m Run", rating: 4, duration: 2, distance: 0.4 },
            { id: "11-4", exerciseName: "Rowing Machine", rating: 4, duration: 3.8, distance: 1.0, notes: "1000m" },
            { id: "11-5", exerciseName: "400m Run", rating: 4, duration: 2.1, distance: 0.4 },
            { id: "11-6", exerciseName: "Wall Balls", rating: 4, weight: 9, reps: 100, duration: 4, notes: "HYROX station" },
            { id: "11-7", exerciseName: "Mobility", rating: 5, duration: 10, notes: "Cool down" }
          ]
        },
        {
          dayNumber: 12,
          date: "31/10/2025",
          isRestDay: true,
          isSkipped: false,
          totalWorkouts: 0,
          workouts: []
        },
        {
          dayNumber: 13,
          date: "01/11/2025",
          isRestDay: false,
          isSkipped: false,
          totalWorkouts: 5,
          avgRating: 4.4,
          workouts: [
            { id: "13-1", exerciseName: "Box Jumps", rating: 5, sets: 5, reps: 10, notes: "Explosive!" },
            { id: "13-2", exerciseName: "Kettlebell Swings", rating: 4, weight: 24, sets: 4, reps: 20, notes: "Hip drive" },
            { id: "13-3", exerciseName: "Burpees", rating: 4, sets: 4, reps: 15, notes: "Circuit finisher" },
            { id: "13-4", exerciseName: "Battle Ropes", rating: 4, duration: 2, sets: 4, notes: "30s intervals" },
            { id: "13-5", exerciseName: "Assault Bike", rating: 4, duration: 10, distance: 3.5, notes: "AMRAP cals" }
          ]
        },
        {
          dayNumber: 14,
          date: "02/11/2025",
          isRestDay: false,
          isSkipped: false,
          totalWorkouts: 6,
          avgRating: 4.3,
          workouts: [
            { id: "14-1", exerciseName: "1km Run", rating: 4, duration: 5, distance: 1.0, notes: "HYROX pace" },
            { id: "14-2", exerciseName: "SkiErg", rating: 4, duration: 2.3, distance: 0.5, notes: "1000m PB attempt" },
            { id: "14-3", exerciseName: "Sled Push", rating: 4, weight: 102, duration: 1.6, distance: 0.05, notes: "Faster!" },
            { id: "14-4", exerciseName: "Burpee Broad Jumps", rating: 5, reps: 80, duration: 4.5, notes: "Best time yet!" },
            { id: "14-5", exerciseName: "Rowing Machine", rating: 4, duration: 3.7, distance: 1.0, notes: "1000m" },
            { id: "14-6", exerciseName: "Wall Balls", rating: 4, weight: 9, reps: 100, duration: 3.8, notes: "Strong finish" }
          ]
        }
      ];

      setDayActivities(dummyDays);

      // Generate dummy PT check-in data (1 check-in at the end of the 14-day period)
      const dummyCheckIns: PTCheckIn[] = [
        {
          id: "checkin-1",
          timestamp: "2025-11-02T09:00:00Z",
          sessionsCompleted: "7+",
          consistency: "ups-downs",
          pushLevel: "very-hard",
          extraTraining: "Added a 5km run on Sunday, went for long walks with the dog, and did a 30min bike ride with my partner.",
          nutritionRating: "pretty-good",
          recoveryIssues: "Sleep has been poor this week (work stress). Hamstrings felt tight after HYROX simulation. Lower back a bit sore after farmer carries. Using foam roller daily.",
          motivation: "ok",
          proud: "Completed 11 out of 12 training days! Hit new PBs on SkiErg 500m (1:38) and back squats (120kg). Pushed through even when tired.",
          improve: "Want to work on burpee broad jump technique - still losing time on transitions. Need to prioritize sleep better.",
          ptFeedback: "Could we add more sled work? That's my weakest station. Also feeling a bit overtrained - should I take an extra rest day? Any tips for managing lower back soreness?"
        }
      ];

      setCheckIns(dummyCheckIns);
      
    } catch (e: any) {
      console.error("Failed to load client data:", e);
    } finally {
      setLoading(false);
    }
  };

  const getRatingEmoji = (rating?: number) => {
    if (!rating) return "—";
    return "🔥".repeat(rating);
  };

  const getOverallStats = () => {
    const completed = dayActivities.filter(d => !d.isRestDay && !d.isSkipped && d.totalWorkouts > 0);
    const totalWorkouts = dayActivities.reduce((sum, d) => sum + d.totalWorkouts, 0);
    const allRatings = dayActivities.flatMap(d => d.workouts.filter(w => w.rating).map(w => w.rating!));
    const avgRating = allRatings.length > 0 ? (allRatings.reduce((a, b) => a + b, 0) / allRatings.length).toFixed(1) : "0";
    const pbs = dayActivities.flatMap(d => d.workouts).filter(w => w.isPB).length;
    const skipped = dayActivities.filter(d => d.isSkipped).length;
    
    return { completed: completed.length, totalWorkouts, avgRating, pbs, skipped };
  };

  const stats = getOverallStats();

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  if (!client) {
    return <div className="p-4">Client not found</div>;
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold">{client.name} - Activity Feed</h1>
          <p className="text-sm text-zinc-400">{client.email}</p>
          {plan && <p className="text-sm text-yellow-500 mt-1">{plan.name}</p>}
        </div>
        <Link to="/admin/clients" className="text-sm text-yellow-500 hover:underline">
          ← Back to clients
        </Link>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-xs text-zinc-400">Days Completed</span>
          </div>
          <div className="text-2xl font-semibold">{stats.completed} / 14</div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-yellow-500" />
            <span className="text-xs text-zinc-400">Total Workouts</span>
          </div>
          <div className="text-2xl font-semibold">{stats.totalWorkouts}</div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Flame className="w-4 h-4 text-orange-500" />
            <span className="text-xs text-zinc-400">Avg Rating</span>
          </div>
          <div className="text-2xl font-semibold">{stats.avgRating} / 5</div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="text-xs text-zinc-400">Personal Bests</span>
          </div>
          <div className="text-2xl font-semibold">{stats.pbs}</div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="w-4 h-4 text-red-500" />
            <span className="text-xs text-zinc-400">Skipped Days</span>
          </div>
          <div className="text-2xl font-semibold">{stats.skipped}</div>
        </div>
      </div>

      {/* Day-by-Day Grid */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <h2 className="text-lg font-semibold mb-4">14-Day Activity Timeline</h2>
        
        {/* Week 1 */}
        <div className="flex gap-3 mb-3">
          {(() => {
            const week1Days = dayActivities.slice(0, 7);
            const emptyCount = week1Days.filter(d => d.isRestDay || d.isSkipped || d.totalWorkouts === 0).length;
            const trainingCount = 7 - emptyCount;
            
            return week1Days.map((day) => {
              const isEmpty = day.isRestDay || day.isSkipped || day.totalWorkouts === 0;
              
              return (
                <div
                  key={day.dayNumber}
                  className={`rounded-lg p-2 border ${
                    isEmpty ? 'w-20 flex-shrink-0' : 'flex-1'
                  } ${
                    isEmpty ? 'min-h-[100px]' : 'min-h-[200px]'
                  } ${
                    day.isRestDay
                      ? "bg-zinc-800/30 border-zinc-700"
                      : day.isSkipped
                      ? "bg-red-500/10 border-red-500/30"
                      : day.totalWorkouts > 0
                      ? "bg-green-500/10 border-green-500/30"
                      : "bg-zinc-800/50 border-zinc-700"
                  }`}
                >
              {/* Day Header */}
              <div className="text-center mb-2 pb-2 border-b border-zinc-700">
                <div className="text-xl font-bold text-yellow-500">
                  Day {day.dayNumber}
                </div>
                <div className="text-xs text-zinc-400">{day.date}</div>
              </div>

              {/* Status Badge */}
              <div className="mb-2 flex justify-center">
                {day.isRestDay && (
                  <div className="inline-flex items-center justify-center text-zinc-400 bg-zinc-800 rounded w-7 h-7">
                    <Pause className="w-4 h-4" />
                  </div>
                )}
                {day.isSkipped && !day.isRestDay && (
                  <div className="inline-flex items-center justify-center text-red-400 bg-red-500/20 rounded w-7 h-7">
                    <XCircle className="w-4 h-4" />
                  </div>
                )}
                {!day.isRestDay && !day.isSkipped && day.totalWorkouts > 0 && (
                  <div className="inline-flex items-center justify-center text-green-400 bg-green-500/20 rounded w-7 h-7">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                )}
                {!day.isRestDay && !day.isSkipped && day.totalWorkouts === 0 && (
                  <div className="text-xs text-zinc-500 bg-zinc-800 rounded px-2 py-1">
                    Pending
                  </div>
                )}
              </div>

              {/* Workout Details */}
              {day.totalWorkouts > 0 && (
                <div className="space-y-2">
                  <div className="text-xs text-zinc-400 mb-1">
                    {day.totalWorkouts} exercises • {getRatingEmoji(day.avgRating)}
                  </div>
                  
                  {/* All Exercises with Full Details */}
                  <div className="space-y-1.5">
                    {day.workouts.map((workout) => (
                      <div
                        key={workout.id}
                        className="bg-black/30 rounded px-1.5 py-1.5 text-xs border border-zinc-800"
                      >
                        {/* Exercise Name - Full, no truncate */}
                        <div className="font-medium text-xs mb-1 leading-tight">
                          {workout.exerciseName}
                          {workout.isPB && <span className="ml-1">🏆</span>}
                        </div>

                        {/* Rating on separate line */}
                        <div className="mb-1">
                          {getRatingEmoji(workout.rating)}
                        </div>

                        {/* Key Stats - Prominent */}
                        <div className="space-y-0.5 text-[11px] font-medium">
                          {workout.weight && <div className="text-yellow-400">{workout.weight} kg</div>}
                          {workout.sets && workout.reps && <div className="text-white">{workout.sets} × {workout.reps}</div>}
                          {workout.sets && !workout.reps && <div className="text-white">{workout.sets} sets</div>}
                          {workout.distance && <div className="text-green-400">{workout.distance} km</div>}
                          {workout.duration && <div className="text-blue-400">{workout.duration} min</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
              );
            });
          })()}
        </div>

        {/* Week 2 */}
        <div className="flex gap-3">
          {(() => {
            const week2Days = dayActivities.slice(7, 14);
            const emptyCount = week2Days.filter(d => d.isRestDay || d.isSkipped || d.totalWorkouts === 0).length;
            const trainingCount = 7 - emptyCount;
            
            return week2Days.map((day) => {
              const isEmpty = day.isRestDay || day.isSkipped || day.totalWorkouts === 0;
              
              return (
                <div
                  key={day.dayNumber}
                  className={`rounded-lg p-2 border ${
                    isEmpty ? 'w-20 flex-shrink-0' : 'flex-1'
                  } ${
                    isEmpty ? 'min-h-[100px]' : 'min-h-[200px]'
                  } ${
                    day.isRestDay
                      ? "bg-zinc-800/30 border-zinc-700"
                      : day.isSkipped
                      ? "bg-red-500/10 border-red-500/30"
                      : day.totalWorkouts > 0
                      ? "bg-green-500/10 border-green-500/30"
                      : "bg-zinc-800/50 border-zinc-700"
                  }`}
                >
              {/* Day Header */}
              <div className="text-center mb-2 pb-2 border-b border-zinc-700">
                <div className="text-xl font-bold text-yellow-500">
                  Day {day.dayNumber}
                </div>
                <div className="text-xs text-zinc-400">{day.date}</div>
              </div>

              {/* Status Badge */}
              <div className="mb-2 flex justify-center">
                {day.isRestDay && (
                  <div className="inline-flex items-center justify-center text-zinc-400 bg-zinc-800 rounded w-7 h-7">
                    <Pause className="w-4 h-4" />
                  </div>
                )}
                {day.isSkipped && !day.isRestDay && (
                  <div className="inline-flex items-center justify-center text-red-400 bg-red-500/20 rounded w-7 h-7">
                    <XCircle className="w-4 h-4" />
                  </div>
                )}
                {!day.isRestDay && !day.isSkipped && day.totalWorkouts > 0 && (
                  <div className="inline-flex items-center justify-center text-green-400 bg-green-500/20 rounded w-7 h-7">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                )}
                {!day.isRestDay && !day.isSkipped && day.totalWorkouts === 0 && (
                  <div className="text-xs text-zinc-500 bg-zinc-800 rounded px-2 py-1">
                    Pending
                  </div>
                )}
              </div>

              {/* Workout Details */}
              {day.totalWorkouts > 0 && (
                <div className="space-y-2">
                  <div className="text-xs text-zinc-400 mb-1">
                    {day.totalWorkouts} exercises • {getRatingEmoji(day.avgRating)}
                  </div>
                  
                  {/* All Exercises with Full Details */}
                  <div className="space-y-1.5">
                    {day.workouts.map((workout) => (
                      <div
                        key={workout.id}
                        className="bg-black/30 rounded px-1.5 py-1.5 text-xs border border-zinc-800"
                      >
                        {/* Exercise Name - Full, no truncate */}
                        <div className="font-medium text-xs mb-1 leading-tight">
                          {workout.exerciseName}
                          {workout.isPB && <span className="ml-1">🏆</span>}
                        </div>

                        {/* Rating on separate line */}
                        <div className="mb-1">
                          {getRatingEmoji(workout.rating)}
                        </div>

                        {/* Key Stats - Prominent */}
                        <div className="space-y-0.5 text-[11px] font-medium">
                          {workout.weight && <div className="text-yellow-400">{workout.weight} kg</div>}
                          {workout.sets && workout.reps && <div className="text-white">{workout.sets} × {workout.reps}</div>}
                          {workout.sets && !workout.reps && <div className="text-white">{workout.sets} sets</div>}
                          {workout.distance && <div className="text-green-400">{workout.distance} km</div>}
                          {workout.duration && <div className="text-blue-400">{workout.duration} min</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
              );
            });
          })()}
        </div>
      </div>

      {/* PT Check-Ins Section */}
      {checkIns.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <h2 className="text-lg font-semibold mb-3">📋 PT Check-In Responses</h2>
          
          <div className="space-y-3">
            {checkIns.map((checkIn) => (
              <div key={checkIn.id} className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3">
                {/* Check-in Header */}
                <div className="text-base font-semibold text-yellow-500 mb-3">
                  {new Date(checkIn.timestamp).toLocaleDateString('en-GB', { 
                    day: 'numeric', 
                    month: 'short', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>

                {/* Questions & Answers */}
                <div className="space-y-3 text-sm">
                  <div className="pb-2 border-b border-zinc-800">
                    <div className="text-zinc-500">🏋️‍♂️ How many training sessions did you complete in the last 2 weeks?</div>
                    <div className="font-medium text-white">{checkIn.sessionsCompleted}</div>
                  </div>
                  
                  <div className="pb-2 border-b border-zinc-800">
                    <div className="text-zinc-500">How consistent did you feel overall?</div>
                    <div className="font-medium text-white capitalize">{checkIn.consistency.replace('-', ' ')}</div>
                  </div>
                  
                  <div className="pb-2 border-b border-zinc-800">
                    <div className="text-zinc-500">How hard did you push yourself in most workouts?</div>
                    <div className="font-medium text-white capitalize">{checkIn.pushLevel.replace('-', ' ')}</div>
                  </div>
                  
                  {checkIn.extraTraining && (
                    <div className="pb-2 border-b border-zinc-800">
                      <div className="text-zinc-500">Did you do any extra training?</div>
                      <div className="text-white">{checkIn.extraTraining}</div>
                    </div>
                  )}
                  
                  <div className="pb-2 border-b border-zinc-800">
                    <div className="text-zinc-500">🍽️ How would you rate your nutrition lately?</div>
                    <div className="font-medium text-white capitalize">{checkIn.nutritionRating.replace('-', ' ')}</div>
                  </div>
                  
                  {checkIn.recoveryIssues && (
                    <div className="pb-2 border-b border-zinc-800">
                      <div className="text-zinc-500">Any issues with recovery, energy, or soreness?</div>
                      <div className="text-white">{checkIn.recoveryIssues}</div>
                    </div>
                  )}
                  
                  <div className="pb-2 border-b border-zinc-800">
                    <div className="text-zinc-500">💬 How motivated are you feeling right now?</div>
                    <div className="font-medium text-white capitalize">{checkIn.motivation.replace('-', ' ')}</div>
                  </div>
                  
                  {checkIn.proud && (
                    <div className="pb-2 border-b border-zinc-800">
                      <div className="text-zinc-500">What's something you're proud of from the last 2 weeks?</div>
                      <div className="text-white">{checkIn.proud}</div>
                    </div>
                  )}
                  
                  {checkIn.improve && (
                    <div className="pb-2 border-b border-zinc-800">
                      <div className="text-zinc-500">What's something you'd like to improve before the next check-in?</div>
                      <div className="text-white">{checkIn.improve}</div>
                    </div>
                  )}
                  
                  {checkIn.ptFeedback && (
                    <div className="pt-1 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded">
                      <div className="text-yellow-400 font-semibold">Anything specific you'd like your PT to focus on or adjust in your plan?</div>
                      <div className="text-white">{checkIn.ptFeedback}</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default ClientFeedback;
