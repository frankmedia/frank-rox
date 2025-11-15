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
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      
      if (!planError && planData) {
        setPlan(planData as Plan);
      }

      // Load activity from Supabase (client-specific)
      const cycleDays = planData?.cycle_days || 14;
      const startDate = planData?.start_date ? new Date(planData.start_date) : null;

      const { data: logs, error: logsErr } = await supabase
        .from('workout_logs')
        .select('training_day, exercise_name, rating, weight, weights, sets, reps, duration_min, distance_km, is_pb, logged_at, plan_id, client_id')
        .eq('client_id', clientId)
        .order('logged_at', { ascending: true });

      // Completed/skipped status
      const { data: compRows } = await supabase
        .from('completed_days')
        .select('training_day, status, plan_id, client_id')
        .eq('client_id', clientId);

      const statusByDay: Record<number, 'completed' | 'skipped'> = {};
      (compRows || []).forEach((r: any) => { if (r.training_day != null) statusByDay[Number(r.training_day)] = r.status; });

      const days: DayActivity[] = Array.from({ length: cycleDays }, (_, idx) => {
        const dayNum = idx + 1;
        let dateStr = '';
        if (startDate) {
          const d = new Date(startDate);
          d.setDate(d.getDate() + idx);
          dateStr = d.toLocaleDateString('en-GB');
        }
        return {
          dayNumber: dayNum,
          date: dateStr,
          isRestDay: false,
          isSkipped: statusByDay[dayNum] === 'skipped',
          totalWorkouts: 0,
          workouts: [],
        } as DayActivity;
      });

      (logs || []).forEach((r: any, i: number) => {
        const d = Number(r.training_day) || 0;
        if (d <= 0 || d > days.length) return;
        const w: WorkoutLog = {
          id: `${d}-${i}`,
          exerciseName: r.exercise_name,
          rating: r.rating || undefined,
          weight: r.weight || (Array.isArray(r.weights) ? Math.max(...r.weights) : undefined),
          sets: r.sets || undefined,
          reps: r.reps || undefined,
          duration: r.duration_min || undefined,
          distance: r.distance_km || undefined,
          isPB: !!r.is_pb,
        };
        days[d - 1].workouts.push(w);
      });

      // Compute totals
      days.forEach((day) => {
        day.totalWorkouts = day.workouts.length;
        const ratings = day.workouts.filter(w => typeof w.rating === 'number').map(w => w.rating as number);
        day.avgRating = ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : undefined;
      });

      setDayActivities(days);

      // Load PT check-ins for this client from Supabase (most recent first)
      const { data: checkInRows, error: checkInErr } = await supabase
        .from('pt_checkins')
        .select('id, timestamp, sessions_completed, consistency, push_level, extra_training, nutrition_rating, recovery_issues, motivation, proud, improve, pt_feedback')
        .eq('client_id', clientId)
        .order('timestamp', { ascending: false });

      if (!checkInErr && checkInRows) {
        const mapped: PTCheckIn[] = checkInRows.map((r: any) => ({
          id: String(r.id),
          timestamp: r.timestamp,
          sessionsCompleted: r.sessions_completed,
          consistency: r.consistency,
          pushLevel: r.push_level,
          extraTraining: r.extra_training,
          nutritionRating: r.nutrition_rating,
          recoveryIssues: r.recovery_issues,
          motivation: r.motivation,
          proud: r.proud,
          improve: r.improve,
          ptFeedback: r.pt_feedback,
        }));
        setCheckIns(mapped);
      } else {
        setCheckIns([]);
      }
      
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
