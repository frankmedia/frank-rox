// Real-time heart rate zone display component
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Heart } from 'lucide-react';
import { startHeartRateMonitoring, calculateHeartRateZones } from '@/services/healthKit';
import type { HeartRateZone as HeartRateZoneType } from '@/types/health';

interface HeartRateZoneProps {
  age?: number;
  showZoneBar?: boolean;
  compact?: boolean;
}

export function HeartRateZone({ age = 30, showZoneBar = true, compact = false }: HeartRateZoneProps) {
  const [currentHR, setCurrentHR] = useState<number | null>(null);
  const [currentZone, setCurrentZone] = useState<HeartRateZoneType | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [zones] = useState(() => calculateHeartRateZones(age));

  useEffect(() => {
    setIsMonitoring(true);
    
    const cleanup = startHeartRateMonitoring((hr, zone) => {
      setCurrentHR(hr);
      setCurrentZone(zone);
    }, age);

    return () => {
      cleanup();
      setIsMonitoring(false);
    };
  }, [age]);

  if (!isMonitoring && !currentHR) {
    return null;
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Heart 
          className="w-5 h-5 animate-pulse" 
          style={{ color: currentZone?.color || '#ef4444' }}
          fill={currentZone?.color || '#ef4444'}
        />
        <span className="font-bold text-lg">{currentHR || '--'}</span>
        <span className="text-xs text-muted-foreground">BPM</span>
        {currentZone && (
          <Badge 
            variant="secondary" 
            className="text-xs"
            style={{ 
              backgroundColor: `${currentZone.color}20`,
              color: currentZone.color,
              borderColor: currentZone.color
            }}
          >
            Zone {currentZone.zone}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Card className="p-4 bg-gradient-to-br from-zinc-900 to-black border-zinc-800">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-yellow-500" />
          <span className="font-semibold">Heart Rate</span>
        </div>
        <div className="flex items-center gap-2">
          <Heart 
            className="w-6 h-6 animate-pulse" 
            style={{ color: currentZone?.color || '#ef4444' }}
            fill={currentZone?.color || '#ef4444'}
          />
          <span className="font-bold text-2xl">{currentHR || '--'}</span>
          <span className="text-sm text-muted-foreground">BPM</span>
        </div>
      </div>

      {currentZone && (
        <div className="mb-3">
          <Badge 
            variant="secondary" 
            className="w-full justify-center py-2 text-sm font-bold"
            style={{ 
              backgroundColor: `${currentZone.color}20`,
              color: currentZone.color,
              borderColor: currentZone.color
            }}
          >
            Zone {currentZone.zone}: {currentZone.name}
          </Badge>
          <p className="text-xs text-center text-muted-foreground mt-1">
            {currentZone.description}
          </p>
        </div>
      )}

      {showZoneBar && (
        <div className="space-y-2">
          <div className="flex gap-1 h-2 rounded-full overflow-hidden">
            {zones.map((zone) => (
              <div
                key={zone.zone}
                className={`flex-1 transition-opacity ${
                  currentZone?.zone === zone.zone ? 'opacity-100' : 'opacity-30'
                }`}
                style={{ backgroundColor: zone.color }}
              />
            ))}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Recovery</span>
            <span>Max</span>
          </div>
        </div>
      )}

      {!currentHR && (
        <div className="text-center text-xs text-muted-foreground mt-2">
          <p>Waiting for heart rate data...</p>
          <p className="mt-1">Make sure you have an Apple Watch or compatible device.</p>
        </div>
      )}
    </Card>
  );
}

// Minimal inline heart rate display for exercise cards
export function InlineHeartRate({ age = 30 }: { age?: number }) {
  const [currentHR, setCurrentHR] = useState<number | null>(null);
  const [currentZone, setCurrentZone] = useState<HeartRateZoneType | null>(null);

  useEffect(() => {
    const cleanup = startHeartRateMonitoring((hr, zone) => {
      setCurrentHR(hr);
      setCurrentZone(zone);
    }, age);

    return cleanup;
  }, [age]);

  if (!currentHR) return null;

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/50 backdrop-blur-sm">
      <Heart 
        className="w-3.5 h-3.5 animate-pulse" 
        style={{ color: currentZone?.color || '#ef4444' }}
        fill={currentZone?.color || '#ef4444'}
      />
      <span className="text-xs font-bold">{currentHR}</span>
      <span className="text-xs text-muted-foreground">Z{currentZone?.zone || '-'}</span>
    </div>
  );
}

