// Cache for loaded voices
let cachedVoices: SpeechSynthesisVoice[] = [];
let voicesLoaded = false;

// Load voices on initialization
if ('speechSynthesis' in window) {
  // Voices might load asynchronously
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoices = window.speechSynthesis.getVoices();
    voicesLoaded = true;
  };
  // Try to load immediately
  cachedVoices = window.speechSynthesis.getVoices();
  if (cachedVoices.length > 0) {
    voicesLoaded = true;
  }
}

/**
 * Text-to-Speech utility - works everywhere (PWA + Native)
 */
export const speak = (text: string, options?: { rate?: number; pitch?: number; volume?: number }) => {
  if ('speechSynthesis' in window) {
    // Don't cancel if already speaking - let it finish
    if (window.speechSynthesis.speaking) {
      return;
    }
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Get voices (use cached if available)
    const voices = voicesLoaded ? cachedVoices : window.speechSynthesis.getVoices();
    
    if (voices.length > 0) {
      // Prefer these voices in order (they sound better/more natural):
      const preferredVoices = [
        'Samantha',           // macOS/iOS - very natural
        'Alex',               // macOS - good quality
        'Karen',              // macOS/iOS
        'Google US English',  // Android
        'Microsoft David',    // Windows
        'Microsoft Zira',     // Windows
      ];
      
      let selectedVoice = voices.find(voice => 
        preferredVoices.some(preferred => voice.name.includes(preferred))
      );
      
      // If no preferred voice, use first en-US voice
      if (!selectedVoice) {
        selectedVoice = voices.find(voice => voice.lang.startsWith('en-US'));
      }
      
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
    }
    
    utterance.rate = options?.rate || 1.1;     // Slightly faster (more energetic)
    utterance.pitch = options?.pitch || 1.05;  // Slightly higher pitch (more engaging)
    utterance.volume = options?.volume || 1.0; // Volume (0 to 1)
    utterance.lang = 'en-US';
    
    // Add small pause at the end to prevent cut-off
    utterance.onend = () => {
      setTimeout(() => {
        // Small delay after speech ends
      }, 100);
    };
    
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
    speak("GO!", { rate: 1.2 });
  },
  
  restStart: () => {
    speak("Rest", { rate: 1.0 });
  },
  
  getReady: (nextExercise?: string) => {
    speak("Get ready!", { rate: 1.0 });
  },
  
  roundComplete: (round: number, totalRounds: number) => {
    speak("Round complete", { rate: 1.0 });
  },
  
  lastRound: () => {
    // Silent - don't announce
  },
  
  workoutComplete: () => {
    speak("Done!", { rate: 1.0 });
  },
};

