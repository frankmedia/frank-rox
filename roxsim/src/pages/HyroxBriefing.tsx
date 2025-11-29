import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { X, ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { hapticImpact, HapticsImpactStyle } from '@/utils/hapticsBridge';
import { HyroxType } from '@/types';

interface HyroxStation {
  id: number;
  name: string;
  details: string;
  equipment?: string;
  type: 'run' | 'station';
  image?: string;
}

// Full HYROX stations for briefing
const FULL_HYROX_BRIEFING: HyroxStation[] = [
  { id: 1, name: 'Run', details: '1000m', type: 'run', equipment: 'Track/Treadmill' },
  { id: 2, name: 'SkiErg', details: '1000m', type: 'station', equipment: 'SkiErg Machine' },
  { id: 3, name: 'Run', details: '1000m', type: 'run', equipment: 'Track/Treadmill' },
  { id: 4, name: 'Sled Push', details: '50m', type: 'station', equipment: 'Sled + Weights' },
  { id: 5, name: 'Run', details: '1000m', type: 'run', equipment: 'Track/Treadmill' },
  { id: 6, name: 'Sled Pull', details: '50m', type: 'station', equipment: 'Sled + Rope' },
  { id: 7, name: 'Run', details: '1000m', type: 'run', equipment: 'Track/Treadmill' },
  { id: 8, name: 'Burpee Broad Jumps', details: '80m', type: 'station', equipment: 'Bodyweight' },
  { id: 9, name: 'Run', details: '1000m', type: 'run', equipment: 'Track/Treadmill' },
  { id: 10, name: 'Rowing', details: '1000m', type: 'station', equipment: 'Rowing Machine' },
  { id: 11, name: 'Run', details: '1000m', type: 'run', equipment: 'Track/Treadmill' },
  { id: 12, name: 'Farmers Carry', details: '200m', type: 'station', equipment: 'Kettlebells' },
  { id: 13, name: 'Run', details: '1000m', type: 'run', equipment: 'Track/Treadmill' },
  { id: 14, name: 'Sandbag Lunges', details: '100m', type: 'station', equipment: 'Sandbag' },
  { id: 15, name: 'Run', details: '1000m', type: 'run', equipment: 'Track/Treadmill' },
  { id: 16, name: 'Wall Balls', details: '100 Reps', type: 'station', equipment: 'Medicine Ball' },
];

// Half HYROX stations for briefing
const HALF_HYROX_BRIEFING: HyroxStation[] = [
  { id: 1, name: 'Run', details: '500m', type: 'run', equipment: 'Track/Treadmill' },
  { id: 2, name: 'SkiErg', details: '500m', type: 'station', equipment: 'SkiErg Machine' },
  { id: 3, name: 'Run', details: '500m', type: 'run', equipment: 'Track/Treadmill' },
  { id: 4, name: 'Sled Push', details: '25m', type: 'station', equipment: 'Sled + Weights' },
  { id: 5, name: 'Run', details: '500m', type: 'run', equipment: 'Track/Treadmill' },
  { id: 6, name: 'Sled Pull', details: '25m', type: 'station', equipment: 'Sled + Rope' },
  { id: 7, name: 'Run', details: '500m', type: 'run', equipment: 'Track/Treadmill' },
  { id: 8, name: 'Burpee Broad Jumps', details: '40m', type: 'station', equipment: 'Bodyweight' },
  { id: 9, name: 'Run', details: '500m', type: 'run', equipment: 'Track/Treadmill' },
  { id: 10, name: 'Rowing', details: '500m', type: 'station', equipment: 'Rowing Machine' },
  { id: 11, name: 'Run', details: '500m', type: 'run', equipment: 'Track/Treadmill' },
  { id: 12, name: 'Farmers Carry', details: '100m', type: 'station', equipment: 'Kettlebells' },
  { id: 13, name: 'Run', details: '500m', type: 'run', equipment: 'Track/Treadmill' },
  { id: 14, name: 'Sandbag Lunges', details: '50m', type: 'station', equipment: 'Sandbag' },
  { id: 15, name: 'Run', details: '500m', type: 'run', equipment: 'Track/Treadmill' },
  { id: 16, name: 'Wall Balls', details: '50 Reps', type: 'station', equipment: 'Medicine Ball' },
];

export function HyroxBriefing() {
  const { type } = useParams<{ type: HyroxType }>();
  const navigate = useNavigate();
  const [currentStation, setCurrentStation] = useState(0);
  
  const isFull = type === 'full';
  const stations = isFull ? FULL_HYROX_BRIEFING : HALF_HYROX_BRIEFING;
  const station = stations[currentStation];

  const handleNext = async () => {
    await hapticImpact(HapticsImpactStyle.Light);
    if (currentStation < stations.length - 1) {
      setCurrentStation(currentStation + 1);
    }
  };

  const handlePrev = async () => {
    await hapticImpact(HapticsImpactStyle.Light);
    if (currentStation > 0) {
      setCurrentStation(currentStation - 1);
    }
  };

  const handleClose = async () => {
    await hapticImpact(HapticsImpactStyle.Light);
    navigate('/');
  };

  const handleStartWorkout = async () => {
    await hapticImpact(HapticsImpactStyle.Heavy);
    navigate(`/simulation/${type}`);
  };

  const isRun = station.type === 'run';

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-white/10">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {isFull ? 'HYROX Full' : 'HYROX Half'} Briefing
          </h1>
          <p className="text-white/60 text-sm">
            {isFull ? '8km Run + 8 Stations' : '4km Run + 8 Stations'}
          </p>
        </div>
        <button
          onClick={handleClose}
          className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
        >
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        {/* Station Indicator */}
        <div className="mb-4">
          <span className="text-yellow-500 text-sm font-bold uppercase tracking-wider">
            Station {currentStation + 1} of {stations.length}
          </span>
        </div>

        {/* Station Visual */}
        <div className={`w-full max-w-md aspect-video ${
          isRun 
            ? 'bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-500/30' 
            : 'bg-gradient-to-br from-green-500/20 to-green-600/20 border-green-500/30'
        } rounded-2xl mb-6 overflow-hidden border flex items-center justify-center`}>
          <div className="text-8xl">
            {isRun ? '🏃' : station.name.includes('Ski') ? '⛷️' : 
             station.name.includes('Sled') ? '🛷' : 
             station.name.includes('Burpee') ? '💪' :
             station.name.includes('Rowing') ? '🚣' :
             station.name.includes('Farmers') ? '🏋️' :
             station.name.includes('Sandbag') ? '🎒' :
             station.name.includes('Wall') ? '🎯' : '💪'}
          </div>
        </div>

        {/* Station Info */}
        <div className="w-full max-w-md text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-3">{station.name}</h2>
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className={`${
              isRun ? 'bg-yellow-500/20 border-yellow-500/50' : 'bg-green-500/20 border-green-500/50'
            } border rounded-lg px-6 py-3`}>
              <p className={`${isRun ? 'text-yellow-500' : 'text-green-500'} font-bold text-2xl`}>
                {station.details}
              </p>
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 inline-block">
            <p className="text-white/60 text-sm">
              <span className="font-semibold text-white">Equipment:</span> {station.equipment}
            </p>
          </div>

          {/* Tips */}
          <div className="mt-6 bg-white/5 border border-white/10 rounded-xl p-4 text-left">
            <p className="text-white/80 text-sm">
              {isRun ? (
                <span>
                  💡 <strong>Tip:</strong> Maintain a steady pace. Don't go out too fast!
                </span>
              ) : station.name.includes('Ski') ? (
                <span>
                  💡 <strong>Tip:</strong> Use your core and arms. Pull hard, drive with legs!
                </span>
              ) : station.name.includes('Sled Push') ? (
                <span>
                  💡 <strong>Tip:</strong> Stay low, drive through your legs. Short, powerful steps!
                </span>
              ) : station.name.includes('Sled Pull') ? (
                <span>
                  💡 <strong>Tip:</strong> Keep tension on the rope. Pull hand over hand smoothly!
                </span>
              ) : station.name.includes('Burpee') ? (
                <span>
                  💡 <strong>Tip:</strong> Find a rhythm. Chest to floor, jump forward!
                </span>
              ) : station.name.includes('Rowing') ? (
                <span>
                  💡 <strong>Tip:</strong> Legs, core, arms. Push with legs first, then pull!
                </span>
              ) : station.name.includes('Farmers') ? (
                <span>
                  💡 <strong>Tip:</strong> Keep core tight. Don't drop the bells! Short steps!
                </span>
              ) : station.name.includes('Sandbag') ? (
                <span>
                  💡 <strong>Tip:</strong> High sandbag position. Step and stand fully!
                </span>
              ) : station.name.includes('Wall') ? (
                <span>
                  💡 <strong>Tip:</strong> Hit the target! Full squat depth. Catch and throw!
                </span>
              ) : (
                <span>
                  💡 <strong>Tip:</strong> Stay focused and maintain good form!
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Progress Dots */}
        <div className="flex gap-2 mb-6 flex-wrap justify-center max-w-md">
          {stations.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all ${
                index === currentStation
                  ? 'w-8 bg-yellow-500'
                  : index < currentStation
                  ? 'w-2 bg-yellow-500/50'
                  : 'w-2 bg-white/20'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="p-6 border-t border-white/10 pb-safe">
        <div className="flex gap-3 mb-3">
          <button
            onClick={handlePrev}
            disabled={currentStation === 0}
            className="flex-1 bg-white/10 text-white rounded-xl py-3 font-bold flex items-center justify-center gap-2 hover:bg-white/20 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>Previous</span>
          </button>
          <button
            onClick={handleNext}
            disabled={currentStation === stations.length - 1}
            className="flex-1 bg-white/10 text-white rounded-xl py-3 font-bold flex items-center justify-center gap-2 hover:bg-white/20 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <span>Next</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Start Workout Button */}
        {currentStation === stations.length - 1 && (
          <button
            onClick={handleStartWorkout}
            className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-black rounded-xl py-4 font-bold flex items-center justify-center gap-2 hover:shadow-xl transition-all active:scale-95 text-lg"
          >
            <Play className="w-6 h-6" />
            <span>Start {isFull ? 'Full' : 'Half'} HYROX!</span>
          </button>
        )}
      </div>
    </div>
  );
}

