/**
 * Share workout using native share sheet (Web Share API)
 */
export const shareWorkout = async (day: string, exercises: any[]) => {
  if (!navigator.share) {
    // Fallback: copy to clipboard
    const text = generateWorkoutText(day, exercises);
    await navigator.clipboard.writeText(text);
    return { success: true, fallback: true };
  }

  try {
    const text = generateWorkoutText(day, exercises);
    await navigator.share({
      title: `RoxPT Training Day ${day}`,
      text,
      url: window.location.href,
    });
    return { success: true, fallback: false };
  } catch (error: any) {
    if (error.name === "AbortError") {
      // User cancelled the share
      return { success: false, cancelled: true };
    }
    console.error("Share failed:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Generate formatted workout text for sharing
 */
const generateWorkoutText = (day: string, exercises: any[]) => {
  let text = `🔥 RoxPT Training Day ${day}\n\n`;
  
  exercises.forEach((ex, i) => {
    if (ex.type === "intro") return; // Skip intro cards
    if (ex._isChildExercise) return; // Skip child exercises (they're in groups)
    
    text += `${i + 1}. ${ex.name}\n`;
    
    if (ex.type === "weights") {
      text += `   ${ex.sets} sets × ${ex.reps} reps`;
      if (ex.suggestedKg) text += ` @ ${ex.suggestedKg}kg`;
      text += "\n";
    } else if (ex.type === "cardio" || ex.type === "running") {
      if (ex.durationMin) text += `   ${ex.durationMin} min`;
      if (ex.targetDistanceKm) text += ` • ${ex.targetDistanceKm}km`;
      text += "\n";
    } else if (ex.type === "mobility") {
      if (ex.durationMin) text += `   ${ex.durationMin} min\n`;
    } else if (ex.type === "hiit") {
      text += `   ${ex.totalRounds || ex.sets} intervals`;
      if (ex.workRestRatio) text += ` (${ex.workRestRatio})`;
      text += "\n";
    } else if (ex.type === "circuit") {
      text += `   ${ex.totalRounds} rounds:\n`;
      ex.exercises?.forEach((child: any) => {
        text += `   → ${child.name}`;
        if (child.reps) text += ` (${child.reps} reps)`;
        text += "\n";
      });
    } else if (ex.type === "amrap") {
      text += `   ${ex.timeCap} min time cap\n`;
      ex.exercises?.forEach((child: any) => {
        text += `   → ${child.name}`;
        if (child.reps) text += ` (${child.reps} reps)`;
        text += "\n";
      });
    }
    
    text += "\n";
  });
  
  text += "💪 Built for Hyrox. Tuned for You.";
  
  return text;
};

