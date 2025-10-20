/**
 * Tracks exercise completion for today's training day
 */

interface CompletionData {
  date: string;
  trainingDay: string;
  completedExercises: string[]; // exercise IDs
}

const STORAGE_KEY = "frank_rock_completion";

function getTodayKey(): string {
  return new Date().toISOString().split("T")[0]; // YYYY-MM-DD
}

export function getCompletionData(): CompletionData {
  const stored = localStorage.getItem(STORAGE_KEY);
  const today = getTodayKey();
  const currentTrainingDay = localStorage.getItem("currentTrainingDay") || "1";

  if (stored) {
    const data: CompletionData = JSON.parse(stored);
    // Reset if it's a new day or different training day
    if (data.date === today && data.trainingDay === currentTrainingDay) {
      return data;
    }
  }

  // Initialize new completion data
  const newData: CompletionData = {
    date: today,
    trainingDay: currentTrainingDay,
    completedExercises: [],
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
  return newData;
}

export function markExerciseComplete(exerciseId: string): void {
  const data = getCompletionData();
  if (!data.completedExercises.includes(exerciseId)) {
    data.completedExercises.push(exerciseId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
}

export function isExerciseComplete(exerciseId: string): boolean {
  const data = getCompletionData();
  return data.completedExercises.includes(exerciseId);
}

export function getCompletionStats(totalExercises: number): {
  completed: number;
  total: number;
  percentage: number;
  allComplete: boolean;
} {
  const data = getCompletionData();
  const completed = data.completedExercises.length;
  return {
    completed,
    total: totalExercises,
    percentage: totalExercises > 0 ? Math.round((completed / totalExercises) * 100) : 0,
    allComplete: completed === totalExercises && totalExercises > 0,
  };
}

export function resetCompletion(): void {
  localStorage.removeItem(STORAGE_KEY);
}

