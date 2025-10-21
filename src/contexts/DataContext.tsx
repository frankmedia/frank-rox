import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getUserSheet, fetchTodayExercises } from "@/services/googleSheets";
import { Exercise } from "@/types/workout";

interface DataContextType {
  exercises: Exercise[];
  allExercises: Exercise[];
  loading: boolean;
  error: string | null;
  userSheet: any;
  refresh: () => Promise<void>;
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

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Get user sheet (ONE API call)
      const sheet = await getUserSheet();
      setUserSheet(sheet);

      if (!sheet) {
        throw new Error("User sheet not found in master sheet");
      }

      // 2. Get exercises for current training day (ONE API call)
      const exerciseData = await fetchTodayExercises();
      setExercises(exerciseData);
      setAllExercises(exerciseData);

    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load data";
      setError(message);
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
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

