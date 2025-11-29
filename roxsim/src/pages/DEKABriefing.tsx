import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { hapticImpact, HapticsImpactStyle } from '@/utils/hapticsBridge';

interface DEKAZone {
  zone: number;
  name: string;
  details: string;
  equipment: string;
  image: string;
}

const DEKA_ZONES: DEKAZone[] = [
  {
    zone: 1,
    name: 'RAM Alt Reverse Lunge',
    details: '30 Reps',
    equipment: 'RAM Bar',
    image: '/deka-stations/z1.jpg',
  },
  {
    zone: 2,
    name: 'Row',
    details: '500 Meters',
    equipment: 'Rowing Machine',
    image: '/deka-stations/z2.jpg',
  },
  {
    zone: 3,
    name: 'Box Jump/Step Over',
    details: '20 Reps',
    equipment: 'Plyo Box',
    image: '/deka-stations/z3.jpg',
  },
  {
    zone: 4,
    name: 'Med Ball Sit-Up Throw',
    details: '25 Reps',
    equipment: 'Medicine Ball',
    image: '/deka-stations/z4.jpg',
  },
  {
    zone: 5,
    name: 'Ski Erg',
    details: '500 Meters',
    equipment: 'Ski Erg',
    image: '/deka-stations/z5.jpg',
  },
  {
    zone: 6,
    name: 'Farmers Carry',
    details: '100 Meters',
    equipment: 'Dumbbells/Kettlebells',
    image: '/deka-stations/z6.jpg',
  },
  {
    zone: 7,
    name: 'Air Bike',
    details: '25 Cal',
    equipment: 'Air Bike',
    image: '/deka-stations/z7.jpg',
  },
  {
    zone: 8,
    name: 'Dead Ball Wall Over',
    details: '20 Reps',
    equipment: 'Dead Ball',
    image: '/deka-stations/z8.jpg',
  },
  {
    zone: 9,
    name: 'Tank Push/Pull',
    details: '100 Meters',
    equipment: 'Tank/Sled',
    image: '/deka-stations/z9.jpg',
  },
  {
    zone: 10,
    name: 'RAM Burpee',
    details: '20 Reps',
    equipment: 'RAM Bar',
    image: '/deka-stations/z10.jpg',
  },
];

interface DEKABriefingProps {
  onStart: () => void;
  onClose: () => void;
}

export function DEKABriefing({ onStart, onClose }: DEKABriefingProps) {
  const [currentZone, setCurrentZone] = useState(0);
  const zone = DEKA_ZONES[currentZone];
  
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  const handleNext = async () => {
    await hapticImpact(HapticsImpactStyle.Light);
    if (currentZone < DEKA_ZONES.length - 1) {
      setCurrentZone(currentZone + 1);
    }
  };

  const handlePrev = async () => {
    await hapticImpact(HapticsImpactStyle.Light);
    if (currentZone > 0) {
      setCurrentZone(currentZone - 1);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = async () => {
    const swipeThreshold = 50;
    const diff = touchStartX.current - touchEndX.current;

    if (Math.abs(diff) > swipeThreshold) {
      if (diff > 0) {
        // Swiped left - go to next
        handleNext();
      } else {
        // Swiped right - go to previous
        handlePrev();
      }
    }
  };

  const handleClose = async () => {
    await hapticImpact(HapticsImpactStyle.Light);
    onClose();
  };

  const handleStartWorkout = async () => {
    await hapticImpact(HapticsImpactStyle.Medium);
    onStart();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white">DEKA Briefing</h1>
          <p className="text-white/60 text-xs">Learn the 10 zones</p>
        </div>
        <button
          onClick={handleClose}
          className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
        >
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Main Content - Swipeable */}
      <div 
        className="flex-1 flex flex-col items-center justify-center px-6 py-4 overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Zone Indicator */}
        <div className="mb-3">
          <span className="text-red-500 text-sm font-bold uppercase tracking-wider">
            Zone {zone.zone} of {DEKA_ZONES.length}
          </span>
        </div>

        {/* Image */}
        <div className="w-full max-w-md aspect-video bg-gradient-to-br from-red-500/20 to-red-600/20 rounded-2xl mb-4 overflow-hidden border border-red-500/30 flex items-center justify-center">
          <img
            src={zone.image}
            alt={zone.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              const parent = e.currentTarget.parentElement;
              if (parent) {
                parent.innerHTML = `<div class="text-6xl">🏋️</div>`;
              }
            }}
          />
        </div>

        {/* Zone Info */}
        <div className="w-full max-w-md text-center mb-4">
          <h2 className="text-2xl font-bold text-white mb-3">{zone.name}</h2>
          <div className="mb-3">
            <p className="text-3xl font-black text-red-500">{zone.details}</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 inline-block">
            <p className="text-white/60 text-sm">
              <span className="font-semibold text-white">Equipment:</span> {zone.equipment}
            </p>
          </div>
        </div>

        {/* Progress Dots */}
        <div className="flex gap-2 mb-4">
          {DEKA_ZONES.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all ${
                index === currentZone
                  ? 'w-8 bg-red-500'
                  : index < currentZone
                  ? 'w-2 bg-red-500/50'
                  : 'w-2 bg-white/20'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="p-4 border-t border-white/10" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}>
        <div className="flex gap-3 mb-3">
          <button
            onClick={handlePrev}
            disabled={currentZone === 0}
            className="flex-1 bg-white/10 text-white rounded-xl py-3 font-bold flex items-center justify-center gap-2 hover:bg-white/20 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed text-sm"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>
          <button
            onClick={handleNext}
            disabled={currentZone === DEKA_ZONES.length - 1}
            className="flex-1 bg-white/10 text-white rounded-xl py-3 font-bold flex items-center justify-center gap-2 hover:bg-white/20 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed text-sm"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Start Workout Button */}
        {currentZone === DEKA_ZONES.length - 1 && (
          <button
            onClick={handleStartWorkout}
            className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl py-3 font-bold flex items-center justify-center gap-2 hover:shadow-xl transition-all active:scale-95"
          >
            <Play className="w-5 h-5" />
            <span>Ready to Train!</span>
          </button>
        )}
        
        {/* Skip Button */}
        <button
          onClick={handleStartWorkout}
          className="w-full text-white/50 text-sm hover:text-white transition-colors py-2 mt-2"
        >
          Skip Briefing
        </button>
      </div>
    </div>
  );
}

