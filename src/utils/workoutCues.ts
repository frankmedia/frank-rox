/**
 * Text-to-Speech utility - works everywhere (PWA + Native)
 */
export const speak = (text: string, options?: { rate?: number; pitch?: number; volume?: number }) => {
  if ('speechSynthesis' in window) {
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options?.rate || 1.0;     // Speed (0.1 to 10)
    utterance.pitch = options?.pitch || 1.0;   // Pitch (0 to 2)
    utterance.volume = options?.volume || 1.0; // Volume (0 to 1)
    utterance.lang = 'en-US';
    
    window.speechSynthesis.speak(utterance);
  }
};

/**
 * Combined workout cues - speech only
 */
export const workoutCues = {
  // Start of workout or timer
  start: () => {
    speak("GO!", { rate: 1.2 });
  },
  
  // Countdown (call for each second)
  countdown: (seconds: number) => {
    if (seconds <= 3 && seconds > 0) {
      speak(seconds.toString(), { rate: 1.3 });
    }
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
  
  // 10 seconds remaining
  last10Seconds: () => {
    speak("10 seconds!", { rate: 1.1 });
  },
  
  // Workout complete
  finish: () => {
    speak("Stop! Well done!", { rate: 0.9 });
  },
  
  // Lap/round complete
  lapComplete: (lap: number, totalLaps?: number) => {
    const message = totalLaps 
      ? `Lap ${lap} of ${totalLaps} complete`
      : `Lap ${lap} complete`;
    speak(message, { rate: 1.0 });
  },
  
  // Rest period start
  rest: (seconds: number) => {
    speak(`Rest for ${seconds} seconds`, { rate: 1.0 });
  },
  
  // Rest ending soon
  restEnding: () => {
    speak("Get ready!", { rate: 1.1 });
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
    const message = exerciseName ? `Go! ${exerciseName}` : "Go! Work!";
    speak(message, { rate: 1.2 });
  },
  
  restStart: () => {
    speak("Rest", { rate: 0.9 });
  },
  
  getReady: (nextExercise?: string) => {
    const message = nextExercise ? `Get ready for ${nextExercise}` : "Get ready!";
    speak(message, { rate: 1.0 });
  },
  
  roundComplete: (round: number, totalRounds: number) => {
    speak(`Round ${round} of ${totalRounds} complete`, { rate: 1.0 });
  },
  
  lastRound: () => {
    speak("Final round, give it everything!", { rate: 1.0 });
  },
  
  workoutComplete: () => {
    speak("Workout complete! Amazing work!", { rate: 0.9 });
  },
};

