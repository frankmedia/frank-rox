import { useUser } from '@/contexts/UserContext';
import { Calendar, Trophy } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export function CompetitionCountdown() {
  const { competitionDate, daysUntilCompetition } = useUser();

  if (!competitionDate || daysUntilCompetition === null) {
    return null;
  }

  const isToday = daysUntilCompetition === 0;
  const isPast = daysUntilCompetition < 0;

  return (
    <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl p-4 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Trophy className="w-5 h-5 text-black drop-shadow-sm" />
          <div>
            <h3 className="text-sm font-bold text-black drop-shadow-sm" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>Competition Day</h3>
            <div className="flex items-center gap-2">
              <Calendar className="w-3 h-3 text-black drop-shadow-sm" />
              <span className="text-xs font-semibold text-black" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>{formatDate(competitionDate)}</span>
            </div>
          </div>
        </div>
        
        <div className="text-right">
          {isToday && (
            <p className="text-xl font-bold text-black animate-pulse" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
              TODAY! 🔥
            </p>
          )}
          
          {!isToday && !isPast && (
            <>
              <p className="text-2xl font-bold text-black leading-none" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                {daysUntilCompetition} {daysUntilCompetition === 1 ? 'day' : 'days'}
              </p>
              <p className="text-xs font-semibold text-black mt-1" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>Time to train!</p>
            </>
          )}
          
          {isPast && (
            <p className="text-base font-semibold text-black" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
              {Math.abs(daysUntilCompetition)} {Math.abs(daysUntilCompetition) === 1 ? 'day' : 'days'} ago
            </p>
          )}
        </div>
      </div>
    </div>
  );
}



