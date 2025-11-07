import { speak } from "@/utils/ttsBridge";

/**
 * Combined workout cues - speech only
 */
export const workoutCues = {
  // Start of workout or timer
  start: () => {
    speak("Go!", { rate: 0.95 });
  },
  
  // Countdown (call for each second) - SILENT (beeps only)
  countdown: (seconds: number) => {
    // Don't speak - let beeps handle it
  },
  
  // Halfway through
  halfway: () => {
    speak("Halfway there!", { rate: 1.0 });
  },
  
  // 1 minute remaining
  lastMinute: () => {
    speak("One minute remaining!", { rate: 1.0 });
  },
  
  // 30 seconds remaining
  last30Seconds: () => {
    speak("30 seconds left, push hard!", { rate: 1.0 });
  },
  
  // 10 seconds remaining - SILENT (beeps only)
  last10Seconds: () => {
    // Don't speak - let beeps handle it
  },
  
  // Workout complete
  finish: () => {
    speak("Done!", { rate: 1.0 });
  },
  
  // Lap/round complete
  lapComplete: (lap: number, totalLaps?: number) => {
    speak("Round complete", { rate: 1.0 });
  },
  
  // Rest period start
  rest: (seconds: number) => {
    speak("Rest", { rate: 1.0 });
  },
  
  // Rest ending soon
  restEnding: () => {
    speak("Get ready", { rate: 0.95 });
  },
  
  // Next exercise announcement
  nextExercise: (exerciseName: string) => {
    speak(`Next: ${exerciseName}`, { rate: 0.95 });
  },
  
  // Generic pause
  pause: () => {
    speak("Paused", { rate: 1.0 });
  },
  
  // Generic resume
  resume: () => {
    speak("Resume!", { rate: 1.1 });
  },
};

/**
 * Running-specific cues
 */
export const runningCues = {
  start: () => {
    speak("Start running now!", { rate: 1.1 });
  },
  
  halfway: () => {
    speak("Halfway there, keep going!", { rate: 0.95 });
  },
  
  quarterMark: (quarter: 1 | 2 | 3) => {
    const messages = {
      1: "Quarter way done!",
      2: "Halfway there, keep pushing!",
      3: "Three quarters done, finish strong!"
    };
    speak(messages[quarter], { rate: 1.0 });
  },
  
  lastMinute: () => {
    speak("One minute left, push hard!", { rate: 1.0 });
  },
  
  last30Seconds: () => {
    speak("30 seconds, give it everything!", { rate: 1.0 });
  },
  
  last10Seconds: () => {
    speak("10 seconds, sprint!", { rate: 1.1 });
  },
  
  finish: () => {
    speak("Stop! Great run!", { rate: 0.9 });
  },
  
  kmComplete: (km: number) => {
    speak(`${km} kilometer${km === 1 ? '' : 's'} complete`, { rate: 1.0 });
  },
};

/**
 * HIIT/Circuit specific cues
 */
export const hiitCues = {
  workStart: (exerciseName?: string) => {
    speak("Go", { rate: 0.95 });
  },
  
  restStart: () => {
    speak("Rest", { rate: 0.9 });
  },
  
  getReady: (nextExercise?: string) => {
    speak("Get ready", { rate: 0.95 });
  },
  
  roundComplete: (round: number, totalRounds: number) => {
    speak("Round complete", { rate: 0.9 });
  },
  
  lastRound: () => {
    // Silent - don't announce
  },
  
  workoutComplete: () => {
    speak("Done", { rate: 0.9 });
  },
};

