import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getUserSheet, fetchTodayExercises } from "@/services/googleSheets";
import { getTodayExercises } from "@/services/supabasePlans";
import { Exercise } from "@/types/workout";

// 🔄 FEATURE FLAG: Toggle between Supabase and Google Sheets
const USE_SUPABASE = true; // Set to false to use Google Sheets

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

  // Flatten nested AMRAP/Circuit/HIIT exercises to individual cards (like old Google Sheets format)
  const flattenExercises = (exercises: Exercise[]): Exercise[] => {
    const flattened: Exercise[] = [];
    
    exercises.forEach((exercise, index) => {
      // Check if this is a grouped exercise (AMRAP/Circuit/HIIT with child exercises)
      const hasChildren = (exercise.type === "amrap" || exercise.type === "circuit" || exercise.type === "hiit") 
        && exercise.exercises && exercise.exercises.length > 0;
      
      if (hasChildren) {
        // Add the parent header (without the child exercises array to avoid ExerciseCard grouping)
        const parentHeader: Exercise = {
          ...exercise,
          isGroupHeader: true,
          exercises: undefined, // Remove children so ExerciseCard doesn't group them
        };
        flattened.push(parentHeader);
        
        // Add each child exercise as individual card
        exercise.exercises!.forEach((child: any, childIndex) => {
          const childType = `${exercise.type}_exercise` as any; // e.g., "amrap_exercise", "circuit_exercise"
          
          // Copy all properties from child, but override type and add marker
          // DON'T change the ID - child already has the correct session_block_items.id!
          const childExercise: Exercise = {
            ...child, // Preserve all existing data (sets, reps, ID, etc.)
            type: childType, // Override with child type (amrap_exercise, circuit_exercise, etc.)
            _isChildExercise: true,
          };
          flattened.push(childExercise);
        });
      } else {
        // Regular standalone exercise
        flattened.push(exercise);
      }
    });
    
    return flattened;
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get user data to check for clientId
      const userStr = localStorage.getItem("frank_rock_user");
      const user = userStr ? JSON.parse(userStr) : null;
      const clientId = user?.clientId;

      // Decide which data source to use
      if (USE_SUPABASE && clientId) {
        // 🆕 SUPABASE PATH
        const exerciseData = await getTodayExercises(clientId);
        
        // Flatten nested AMRAP/Circuit/HIIT to individual cards (like old Google Sheets)
        const flattenedData = flattenExercises(exerciseData);
        
        setExercises(flattenedData);
        setAllExercises(flattenedData);
        setUserSheet({ user: currentUser, source: "supabase" }); // Mock sheet object for compatibility
      } else {
        // 📄 GOOGLE SHEETS PATH (fallback)
        const sheet = await getUserSheet();
        setUserSheet(sheet);

        if (!sheet) {
          throw new Error("User sheet not found in master sheet");
        }

        const exerciseData = await fetchTodayExercises(currentUser, sheet);
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
          const trainingDay = localStorage.getItem(userKey) || "1";
          
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

