import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, SimulationResult, Entitlements, WorkoutId } from '@/types';
import { generateId } from '@/lib/utils';
import { syncUserProfile } from '@/lib/userSync';

interface UserContextType {
  profile: UserProfile;
  competitionDate: Date | null;
  setCompetitionDate: (date: Date | null) => void;
  updateProfile: (updates: Partial<Pick<UserProfile, 'name' | 'surname' | 'email' | 'dateOfBirth' | 'athletePhoto'>>) => void;
  addSimulationResult: (result: Omit<SimulationResult, 'id'>) => void;
  clearHistory: () => void;
  daysUntilCompetition: number | null;
  entitlements: Entitlements;
  updateEntitlements: (updates: Partial<Entitlements>) => void;
  freeHyroxRunsRemaining: number;
  decrementHyroxTrial: () => void;
  resetHyroxTrials: (count?: number) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const STORAGE_KEY = 'roxsims_user_profile';
const COMP_DATE_KEY = 'roxsims_competition_date';
const ENTITLEMENTS_KEY = 'roxsims_entitlements';
const HYROX_TRIALS_KEY = 'roxsims_hyrox_trials';
const DEFAULT_HYROX_TRIALS = 2;

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Convert date strings back to Date objects
      parsed.history = parsed.history.map((h: any) => ({
        ...h,
        date: new Date(h.date),
        workoutId:
          h.workoutId ||
          (h.type === 'full' ? 'hyrox_full' : 'hyrox_half'),
      }));
      return parsed;
    }
    return {
      name: 'Athlete',
      history: [],
      stats: {
        totalSims: 0,
        bestFullTime: null,
        bestHalfTime: null,
      },
    };
  });

  const [competitionDate, setCompetitionDateState] = useState<Date | null>(() => {
    const stored = localStorage.getItem(COMP_DATE_KEY);
    return stored ? new Date(stored) : null;
  });

  const [daysUntilCompetition, setDaysUntilCompetition] = useState<number | null>(null);

  const [entitlements, setEntitlements] = useState<Entitlements>(() => {
    const stored = localStorage.getItem(ENTITLEMENTS_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return { hasHyroxPack: false, hasFrankTheTank: false };
      }
    }
    return { hasHyroxPack: false, hasFrankTheTank: false };
  });

  const [freeHyroxRunsRemaining, setFreeHyroxRunsRemaining] = useState<number>(() => {
    const stored = localStorage.getItem(HYROX_TRIALS_KEY);
    if (stored !== null) {
      const parsed = parseInt(stored, 10);
      return Number.isFinite(parsed) ? parsed : DEFAULT_HYROX_TRIALS;
    }
    return DEFAULT_HYROX_TRIALS;
  });


  // Save profile to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  }, [profile]);

  // Sync to Supabase (debounced to avoid too many calls)
  useEffect(() => {
    const timer = setTimeout(() => {
      syncUserProfile(profile, competitionDate, entitlements);
    }, 1000);
    return () => clearTimeout(timer);
  }, [profile, competitionDate, entitlements]);

  // Save competition date to localStorage
  useEffect(() => {
    if (competitionDate) {
      localStorage.setItem(COMP_DATE_KEY, competitionDate.toISOString());
    } else {
      localStorage.removeItem(COMP_DATE_KEY);
    }
  }, [competitionDate]);

  // Calculate days until competition
  useEffect(() => {
    if (competitionDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const comp = new Date(competitionDate);
      comp.setHours(0, 0, 0, 0);
      const diffTime = comp.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setDaysUntilCompetition(diffDays);
    } else {
      setDaysUntilCompetition(null);
    }
  }, [competitionDate]);

  // Persist entitlements
  useEffect(() => {
    localStorage.setItem(ENTITLEMENTS_KEY, JSON.stringify(entitlements));
  }, [entitlements]);

  // Persist trials
  useEffect(() => {
    localStorage.setItem(HYROX_TRIALS_KEY, freeHyroxRunsRemaining.toString());
  }, [freeHyroxRunsRemaining]);

  const setCompetitionDate = (date: Date | null) => {
    setCompetitionDateState(date);
  };

  const updateProfile = (
    updates: Partial<Pick<UserProfile, 'name' | 'surname' | 'email' | 'dateOfBirth'>>
  ) => {
    setProfile((prev) => ({ ...prev, ...updates }));
  };

  const updateEntitlements = (updates: Partial<Entitlements>) => {
    setEntitlements((prev) => ({ ...prev, ...updates }));
  };

  const decrementHyroxTrial = () => {
    setFreeHyroxRunsRemaining((prev) => Math.max(prev - 1, 0));
  };

  const resetHyroxTrials = (count = DEFAULT_HYROX_TRIALS) => {
    setFreeHyroxRunsRemaining(count);
  };

  const addSimulationResult = (result: Omit<SimulationResult, 'id'>) => {
    // Validate workout is legit - must be at least 20 minutes (1200 seconds)
    const MIN_WORKOUT_TIME = 1200; // 20 minutes
    const isValidWorkout = result.totalTime >= MIN_WORKOUT_TIME;
    
    if (!isValidWorkout) {
      console.warn('⚠️ Workout too short to count towards progress:', result.totalTime, 'seconds. Minimum:', MIN_WORKOUT_TIME);
    }

    const newResult: SimulationResult = {
      ...result,
      id: generateId(),
    };

    setProfile((prev) => {
      const newHistory = [newResult, ...prev.history];
      const newStats = { ...prev.stats };
      
      // Only count towards totalSims if workout is valid (>= 20 minutes)
      if (isValidWorkout) {
        newStats.totalSims = prev.history.filter(h => h.totalTime >= MIN_WORKOUT_TIME).length + 1;
      } else {
        newStats.totalSims = prev.history.filter(h => h.totalTime >= MIN_WORKOUT_TIME).length;
      }

      // Update best times (only for valid workouts)
      if (isValidWorkout) {
        if (result.type === 'full') {
          if (!newStats.bestFullTime || result.totalTime < newStats.bestFullTime) {
            newStats.bestFullTime = result.totalTime;
          }
        } else if (result.type === 'half') {
          if (!newStats.bestHalfTime || result.totalTime < newStats.bestHalfTime) {
            newStats.bestHalfTime = result.totalTime;
          }
        }
      }

      return {
        ...prev,
        history: newHistory,
        stats: newStats,
      };
    });
  };

  const clearHistory = () => {
    setProfile((prev) => ({
      ...prev,
      history: [],
      stats: {
        totalSims: 0,
        bestFullTime: null,
        bestHalfTime: null,
      },
    }));
  };

  return (
    <UserContext.Provider
      value={{
        profile,
        competitionDate,
        setCompetitionDate,
        updateProfile,
        addSimulationResult,
        clearHistory,
        daysUntilCompetition,
        entitlements,
        updateEntitlements,
        freeHyroxRunsRemaining,
        decrementHyroxTrial,
        resetHyroxTrials,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

