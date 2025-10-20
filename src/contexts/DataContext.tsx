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
  const [hasLoaded, setHasLoaded] = useState(false);

  const loadData = async () => {
    if (hasLoaded) {
      console.log("📦 Using cached data - skipping API call");
      return;
    }

    console.log("🚀 Loading all data (ONE TIME ONLY)...");
    setLoading(true);
    setError(null);

    try {
      // 1. Get user sheet (ONE API call)
      console.log("1️⃣ Fetching user sheet...");
      const sheet = await getUserSheet();
      setUserSheet(sheet);

      if (!sheet) {
        throw new Error("User sheet not found in master sheet");
      }

      // 2. Get exercises for current training day (ONE API call)
      console.log("2️⃣ Fetching exercises...");
      const exerciseData = await fetchTodayExercises();
      setExercises(exerciseData);
      setAllExercises(exerciseData);

      console.log("✅ All data loaded successfully!");
      console.log(`   - User: ${sheet.user}`);
      console.log(`   - Exercises: ${exerciseData.length}`);
      
      setHasLoaded(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load data";
      setError(message);
      console.error("❌ Data loading error:", err);
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    console.log("🔄 Manual refresh requested...");
    setHasLoaded(false);
    await loadData();
  };

  useEffect(() => {
    loadData();
  }, []);

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

