import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getUserSheet, fetchTodayExercises } from "@/services/googleSheets";
import { getTodayExercises } from "@/services/supabasePlans";
import { Exercise } from "@/types/workout";
import { supabase } from "@/utils/supabaseClient";

// 🔄 FEATURE FLAG: Toggle between Supabase and Google Sheets
const USE_SUPABASE = true; // Set to true to use Supabase (RECOMMENDED)

interface DataContextType {
  exercises: Exercise[];
  allExercises: Exercise[];
  loading: boolean;
  error: string | null;
  userSheet: any;
  refresh: () => Promise<void>;
  useSupabase: boolean; // Expose flag to components
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
};

interface DataProviderProps {
  children: ReactNode;
}

export const DataProvider = ({ children }: DataProviderProps) => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userSheet, setUserSheet] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<string>("");
  const [currentTrainingDay, setCurrentTrainingDay] = useState<string>("");

  // Keep exercises as-is with their child exercises intact
  // The ExerciseCard component already handles displaying grouped circuits/AMRAP/HIIT
  const flattenExercises = (exercises: Exercise[]): Exercise[] => {
    // No longer flattening - ExerciseCard handles grouped display properly
    return exercises;
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get user data to check for clientId
      const userStr = localStorage.getItem("frank_rock_user");
      const user = userStr ? JSON.parse(userStr) : null;
      const clientId = user?.clientId;

      console.log(`🔄 DataContext loading data for user: ${currentUser}, training day: ${currentTrainingDay}, clientId: ${clientId}, USE_SUPABASE: ${USE_SUPABASE}`);

      // Check if this is a new plan (different from last loaded plan)
      // If so, clear completion data to avoid showing old ticks on new program
      if (USE_SUPABASE && clientId) {
        const { data: plan } = await supabase
          .from('plans')
          .select('id')
          .eq('client_id', clientId)
          .eq('status', 'active')
          .single();
        
        if (plan && user?.username) {
          const lastPlanIdKey = `lastActivePlanId_${user.username}`;
          const lastPlanId = localStorage.getItem(lastPlanIdKey);
          const currentPlanId = String(plan.id);
          
          // Only clear if plan actually changed (not on first load)
          if (lastPlanId && lastPlanId !== currentPlanId) {
            console.log('🔄 Plan changed in DataContext, clearing completion data', { old: lastPlanId, new: currentPlanId });
            
            // Get today's date to preserve today's workout cache
            const today = new Date().toISOString().split('T')[0];
            const workoutCacheKey = `workout_cache_${user.username}`;
            const currentCache = localStorage.getItem(workoutCacheKey);
            let preserveToday = false;
            
            // Check if today's cache is from today - if so, preserve it
            if (currentCache) {
              try {
                const cache = JSON.parse(currentCache);
                if (cache.date === today) {
                  console.log('💾 Preserving today\'s workout progress during plan switch');
                  preserveToday = true;
                }
              } catch (e) {
                console.error('Error parsing workout cache:', e);
              }
            }
            
            // Clear localStorage completion data for previous days only
            const completedDaysKey = `completedDays_${user.username}`;
            localStorage.removeItem(completedDaysKey);
            
            // Clear old workout cache ONLY if it's not from today
            if (!preserveToday) {
              localStorage.removeItem(workoutCacheKey);
            }
            
            // Also clear old completion data from Supabase for previous plans
            console.log('🗑️ Removing old plan completion records from database');
            await supabase
              .from('completed_days')
              .delete()
              .eq('client_id', clientId)
              .neq('plan_id', currentPlanId);
          } else if (!lastPlanId) {
            // First time loading - don't clear anything, just set the plan ID
            console.log('✨ First plan load, preserving any existing data', { planId: currentPlanId });
          }
          
          // Update last plan ID
          localStorage.setItem(lastPlanIdKey, currentPlanId);
        }
      }

      // Decide which data source to use
      if (USE_SUPABASE && clientId) {
        // 🆕 SUPABASE PATH
        console.log("📊 Loading from SUPABASE...");
        const exerciseData = await getTodayExercises(clientId);
        
        console.log(`✅ Loaded ${exerciseData.length} exercises from Supabase:`, exerciseData.map(e => e.name));
        
        // Keep exercises grouped (circuits/AMRAP/HIIT with their child exercises)
        const processedData = flattenExercises(exerciseData);
        
        setExercises(processedData);
        setAllExercises(processedData);
        setUserSheet({ user: currentUser, source: "supabase" }); // Mock sheet object for compatibility
      } else {
        // 📄 GOOGLE SHEETS PATH (fallback)
        console.log("📄 Loading from GOOGLE SHEETS...");
        const sheet = await getUserSheet();
        setUserSheet(sheet);

        if (!sheet) {
          throw new Error("User sheet not found in master sheet");
        }

        const exerciseData = await fetchTodayExercises(currentUser, sheet);
        console.log(`✅ Loaded ${exerciseData.length} exercises from Google Sheets:`, exerciseData.map(e => e.name));
        
        setExercises(exerciseData);
        setAllExercises(exerciseData);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load data";
      setError(message);
      console.error("❌ Data loading error:", err);
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    await loadData();
  };

  // Watch for user changes
  useEffect(() => {
    try {
      const userStr = localStorage.getItem("frank_rock_user");
      if (userStr) {
        const user = JSON.parse(userStr);
        const username = user.username || "";
        
        if (username !== currentUser) {
          setCurrentUser(username);
        }
      }
    } catch (e) {
      console.error("Error detecting user:", e);
    }
  }, []);

  // Watch for training day changes (poll localStorage every 500ms)
  useEffect(() => {
    const checkTrainingDay = () => {
      try {
        const userStr = localStorage.getItem("frank_rock_user");
        if (userStr) {
          const user = JSON.parse(userStr);
          const userKey = `currentTrainingDay_${user.username}`;
          let trainingDay = localStorage.getItem(userKey) || "1";
          
          // Validate day is never 0 or negative
          const dayNum = parseInt(trainingDay);
          if (isNaN(dayNum) || dayNum < 1) {
            console.warn(`⚠️ Invalid training day in DataContext: ${trainingDay}, resetting to 1`);
            trainingDay = "1";
            localStorage.setItem(userKey, "1"); // Fix it in localStorage too
          }
          
          if (trainingDay !== currentTrainingDay) {
            setCurrentTrainingDay(trainingDay);
          }
        }
      } catch (e) {
        console.error("Error detecting training day:", e);
      }
    };

    // Check immediately and then every 500ms
    checkTrainingDay();
    const interval = setInterval(checkTrainingDay, 500);
    return () => clearInterval(interval);
  }, [currentTrainingDay]);

  // Load data when user or training day changes
  useEffect(() => {
    if (currentUser && currentTrainingDay) {
      loadData();
    } else if (currentUser || currentTrainingDay) {
      // If we have partial data, keep loading state
      setLoading(true);
    } else {
      // If we have no data yet, show loading
      setLoading(true);
    }
  }, [currentUser, currentTrainingDay]);

  return (
    <DataContext.Provider
      value={{
        exercises,
        allExercises,
        loading,
        error,
        userSheet,
        refresh,
        useSupabase: USE_SUPABASE,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

