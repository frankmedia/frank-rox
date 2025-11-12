import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useWakeLock } from "@/hooks/useWakeLock";

interface WorkoutSessionContextType {
  isWorkoutActive: boolean;
  startWorkoutSession: () => void;
  endWorkoutSession: () => void;
  isWakeLockActive: boolean;
}

const WorkoutSessionContext = createContext<WorkoutSessionContextType | undefined>(undefined);

export function WorkoutSessionProvider({ children }: { children: ReactNode }) {
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);
  
  // Global wake lock that stays active during entire workout session
  const { isWakeLockActive } = useWakeLock(isWorkoutActive);
  
  const startWorkoutSession = () => {
    console.log('🏋️ Starting workout session - screen will stay on');
    setIsWorkoutActive(true);
  };
  
  const endWorkoutSession = () => {
    console.log('✅ Ending workout session - screen can sleep');
    setIsWorkoutActive(false);
  };
  
  // Log wake lock status changes
  useEffect(() => {
    if (isWorkoutActive) {
      console.log('📱 Workout session active - wake lock enabled');
    } else {
      console.log('📱 Workout session inactive - wake lock disabled');
    }
  }, [isWorkoutActive]);
  
  return (
    <WorkoutSessionContext.Provider
      value={{
        isWorkoutActive,
        startWorkoutSession,
        endWorkoutSession,
        isWakeLockActive,
      }}
    >
      {children}
    </WorkoutSessionContext.Provider>
  );
}

export function useWorkoutSession() {
  const context = useContext(WorkoutSessionContext);
  if (context === undefined) {
    throw new Error("useWorkoutSession must be used within a WorkoutSessionProvider");
  }
  return context;
}







