import { Book, Calendar, Clock } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { formatTime, formatDate } from '@/lib/utils';
import { getWorkoutById } from '@/lib/workouts';

export function Logbook() {
  const { profile } = useUser();

  return (
    <div className="min-h-screen bg-black text-white pb-36 pt-5">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black px-6 pt-8 pb-6 border-b border-white/10">
        <div className="flex items-center gap-3 mb-2">
          <Book className="w-8 h-8 text-yellow-500" />
          <h1 className="text-3xl font-bold">Logbook</h1>
        </div>
        <p className="text-white/60 text-sm">Complete workout history</p>
      </div>

      {/* Stats Summary */}
      <div className="px-6 py-6 border-b border-white/10">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/5 rounded-xl p-4 text-center border border-white/10">
            <p className="text-3xl font-bold text-yellow-500">{profile.stats.totalSims}</p>
            <p className="text-xs text-white/60 mt-1">Total Workouts</p>
          </div>
          <div className="bg-white/5 rounded-xl p-4 text-center border border-white/10">
            <p className="text-3xl font-bold text-white">
              {profile.history && profile.history.length > 0 
                ? formatTime(
                    Math.floor(
                      profile.history.reduce((sum, r) => sum + r.totalTime, 0) / profile.history.length
                    )
                  )
                : '--:--'}
            </p>
            <p className="text-xs text-white/60 mt-1">Avg Time</p>
          </div>
        </div>
      </div>

      {/* Workout History */}
      <div className="px-6 py-6">
        <h2 className="text-lg font-semibold mb-4">All Workouts</h2>

        {!profile.history || profile.history.length === 0 ? (
          <div className="bg-white/5 rounded-xl p-8 text-center border border-white/10">
            <Book className="w-12 h-12 mx-auto mb-3 text-white/20" />
            <p className="text-white/60">No workouts completed yet</p>
            <p className="text-sm text-white/40 mt-1">Start your first simulation to see it here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {profile.history
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((result) => {
                const workout = getWorkoutById(result.workoutId);
                return (
              <div
                key={result.id}
                className="bg-white/5 rounded-xl p-5 border border-white/10"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div>
                      <h3 className="font-bold text-lg capitalize">
                        {workout?.title || `${result.type} Hyrox`}
                      </h3>
                      <p className="text-xs text-white/50">
                        {workout?.subtitle || 'Hyrox Simulation'}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-white/50">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(result.date)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-yellow-500">
                      <Clock className="w-4 h-4" />
                      <span className="text-2xl font-bold font-mono">
                        {formatTime(result.totalTime)}
                      </span>
                    </div>
                    <p className="text-xs text-white/50">Total Time</p>
                  </div>
                </div>

                {/* Station Times Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {result.stations.map((station, index) => (
                    <div
                      key={station.id}
                      className="bg-black/20 rounded-lg p-2 flex items-center justify-between"
                    >
                      <span className="text-white/60 truncate">{station.name}</span>
                      <span className="font-mono font-semibold ml-2">
                        {formatTime(result.stationTimes[index] || 0)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )})}
          </div>
        )}
      </div>
    </div>
  );
}


