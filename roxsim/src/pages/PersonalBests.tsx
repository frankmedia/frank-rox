import { Trophy, Award, TrendingUp } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { formatTime } from '@/lib/utils';

export function PersonalBests() {
  const { profile } = useUser();

  // Calculate best times per exercise
  const exercisePBs = new Map<string, { time: number; type: string }>();
  
  const history = profile.history || [];
  history.forEach((result) => {
    result.stations.forEach((station, index) => {
      const time = result.stationTimes[index];
      if (!time || time === 0 || isNaN(time)) return; // Skip if no valid time recorded
      
      const key = station.name;
      
      if (!exercisePBs.has(key) || time < exercisePBs.get(key)!.time) {
        exercisePBs.set(key, { time, type: station.type });
      }
    });
  });

  // Convert to array and sort - runs first, then by time
  const pbList = Array.from(exercisePBs.entries())
    .map(([exercise, data]) => ({
      exercise,
      time: data.time,
      type: data.type,
    }))
    .sort((a, b) => {
      // Runs first
      if (a.type === 'run' && b.type !== 'run') return -1;
      if (a.type !== 'run' && b.type === 'run') return 1;
      // Then by time (fastest first)
      return a.time - b.time;
    });

  return (
    <div className="min-h-screen bg-black text-white pb-36 pt-5">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black px-6 pt-8 pb-6 border-b border-white/10">
        <div className="flex items-center gap-3 mb-2">
          <Trophy className="w-8 h-8 text-yellow-500" />
          <h1 className="text-3xl font-bold">Personal Bests</h1>
        </div>
        <p className="text-white/60 text-sm">Your fastest times per exercise</p>
      </div>

      {/* Overall PBs */}
      <div className="px-6 py-6 border-b border-white/10">
        <h2 className="text-sm font-semibold mb-3 text-white/60 uppercase tracking-wide">Overall</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-xl p-4 text-center border border-yellow-500/30">
            <Award className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
            <p className="text-2xl font-bold font-mono">
              {profile.stats.bestFullTime ? formatTime(profile.stats.bestFullTime) : '--:--'}
            </p>
            <p className="text-xs text-white/60 mt-1">Best Full Hyrox</p>
          </div>
          <div className="bg-white/5 rounded-xl p-4 text-center border border-white/10">
            <Award className="w-6 h-6 mx-auto mb-2 text-white" />
            <p className="text-2xl font-bold font-mono">
              {profile.stats.bestHalfTime ? formatTime(profile.stats.bestHalfTime) : '--:--'}
            </p>
            <p className="text-xs text-white/60 mt-1">Best Half Hyrox</p>
          </div>
        </div>
      </div>

      {/* Exercise PBs */}
      <div className="px-6 py-6">
        <h2 className="text-sm font-semibold mb-3 text-white/60 uppercase tracking-wide">
          Per Exercise - Beat Your Records!
        </h2>

        {pbList.length === 0 ? (
          <div className="bg-white/5 rounded-xl p-8 text-center border border-white/10">
            <TrendingUp className="w-12 h-12 mx-auto mb-3 text-white/20" />
            <p className="text-white/60">No personal bests yet</p>
            <p className="text-sm text-white/40 mt-1">Complete workouts to set your records</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pbList.map(({ exercise, time, type }) => (
              <div
                key={exercise}
                className={`rounded-xl p-4 border flex items-center justify-between transition-colors ${
                  type === 'run' 
                    ? 'bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20' 
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    type === 'run' ? 'bg-yellow-500' : 'bg-orange-500'
                  }`}>
                    <Trophy className="w-5 h-5 text-black" />
                  </div>
                  <div>
                    <p className="font-bold">{exercise}</p>
                    <p className="text-xs text-white/50 capitalize">{type === 'run' ? 'Running' : 'Workout'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-2xl font-bold font-mono ${
                    type === 'run' ? 'text-yellow-500' : 'text-white'
                  }`}>
                    {formatTime(time)}
                  </p>
                  <p className="text-xs text-white/50">Best Time</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


