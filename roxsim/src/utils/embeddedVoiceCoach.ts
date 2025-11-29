// Professional voice coach using pre-generated ElevenLabs audio files
// All audio is embedded and plays instantly without API calls

class EmbeddedVoiceCoach {
  private currentAudio: HTMLAudioElement | null = null;
  private isSpeaking: boolean = false;
  private basePath = '/voices/rachel';

  private playAudio(filename: string, volume: number = 1.0) {
    // Stop any currently playing audio
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
    }

    const audioPath = `${this.basePath}/${filename}.mp3`;
    this.currentAudio = new Audio(audioPath);
    this.currentAudio.volume = volume;
    this.isSpeaking = true;

    this.currentAudio.onended = () => {
      this.isSpeaking = false;
    };
    
    this.currentAudio.onerror = (error) => {
      console.error(`Error playing audio: ${audioPath}`, error);
      this.isSpeaking = false;
    };

    this.currentAudio.play().catch(e => {
      console.error("Error playing audio:", e);
      this.isSpeaking = false;
    });
  }

  // Exercise announcements
  announceExercise(exerciseName: string) {
    // Map exercise names to audio files
    const exerciseMap: { [key: string]: string } = {
      'Push-ups': 'pushups',
      'Squats': 'squats',
      'Burpees': 'burpees',
      'Plank': 'plank',
      'Running': 'running',
      'Ski Erg': 'ski-erg',
      'Sled Push': 'sled-push',
      'Sled Pull': 'sled-pull',
      'Rowing': 'rowing',
      'Farmers Carry': 'farmers-carry',
      'Sandbag Lunges': 'sandbag-lunges',
      'Wall Balls': 'wall-balls',
    };

    const filename = exerciseMap[exerciseName];
    if (filename) {
      this.playAudio(filename);
    } else {
      console.warn(`No audio file for exercise: ${exerciseName}`);
    }
  }

  announceStart() {
    this.playAudio('go');
  }

  announceStop() {
    this.playAudio('stop');
  }

  announceRest() {
    this.playAudio('rest');
  }

  announceGetReady(exerciseName?: string) {
    this.playAudio('get-ready');
    // Could chain exercise name after if needed
  }

  announceCountdown(seconds: number) {
    if (seconds === 3) {
      this.playAudio('countdown-321');
    } else if (seconds === 10) {
      this.playAudio('ten');
    } else if (seconds === 5) {
      this.playAudio('five');
    } else if (seconds === 3) {
      this.playAudio('three');
    } else if (seconds === 2) {
      this.playAudio('two');
    } else if (seconds === 1) {
      this.playAudio('one');
    }
  }

  announceHalfway() {
    this.playAudio('halfway');
  }

  announceTimeRemaining(seconds: number) {
    if (seconds === 10) {
      this.playAudio('ten-seconds');
    } else if (seconds === 30) {
      this.playAudio('thirty-seconds');
    } else if (seconds === 60) {
      this.playAudio('one-minute');
    } else if (seconds === 90) {
      this.playAudio('ninety-seconds');
    } else if (seconds === 120) {
      this.playAudio('two-minutes');
    }
  }

  announceComplete() {
    this.playAudio('complete');
  }

  announceMotivation(message: string) {
    // For now, motivation messages use browser speech
    // Could add more pre-generated phrases if needed
    console.log('Motivation:', message);
  }

  cancelSpeech() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
    }
    this.isSpeaking = false;
  }

  getIsSpeaking() {
    return this.isSpeaking;
  }

  setConfig(config: any) {
    // For compatibility with old voiceCoach interface
    console.log('Config set:', config);
  }
}

export const voiceCoach = new EmbeddedVoiceCoach();
