// Simple sound effects using Web Audio API
// These work in both web and Capacitor apps

class SoundEffects {
  private audioContext: AudioContext | null = null;

  constructor() {
    // Initialize audio context on first interaction
    if (typeof window !== 'undefined') {
      try {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (e) {
        console.warn('Web Audio API not supported');
      }
    }
  }

  // Play a success sound (high pitch beep)
  playSuccess() {
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.value = 800; // High pitch
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.3);
  }

  // Play a completion sound (celebratory chirp)
  playComplete() {
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.setValueAtTime(523, this.audioContext.currentTime); // C5
    oscillator.frequency.setValueAtTime(659, this.audioContext.currentTime + 0.1); // E5
    oscillator.frequency.setValueAtTime(784, this.audioContext.currentTime + 0.2); // G5
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.5);
  }

  // Play a start sound
  playStart() {
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.value = 440; // A4
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.2);
  }

  // Play countdown warning beep (short)
  playCountdownBeep() {
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.value = 880; // A5 - high pitch warning
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.15);
  }

  // Play final countdown beep (long, continuous)
  playFinalBeep(duration: number = 1) {
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.value = 1000; // Higher pitch for urgency
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.4, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  // Play minute marker beep
  playMinuteBeep() {
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.value = 660; // E5 - motivational tone
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.35, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.25);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.25);
  }

  // Play boxing bell - for phase changes (work to rest)
  playBoxingBell() {
    if (!this.audioContext) return;

    // Classic boxing bell sound: metallic ding with multiple harmonics
    const now = this.audioContext.currentTime;
    
    // Create multiple oscillators for a richer bell sound
    const frequencies = [1200, 1800, 2400, 3200]; // Harmonics
    const gains = [0.5, 0.3, 0.2, 0.15];
    
    frequencies.forEach((freq, index) => {
      const oscillator = this.audioContext!.createOscillator();
      const gainNode = this.audioContext!.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext!.destination);

      oscillator.frequency.value = freq;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(gains[index], now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 2.0);

      oscillator.start(now);
      oscillator.stop(now + 2.0);
    });
  }

  // Play triple beep - for last 3 seconds
  playTripleBeep() {
    if (!this.audioContext) return;

    const times = [0, 0.3, 0.6];
    
    times.forEach(time => {
      const oscillator = this.audioContext!.createOscillator();
      const gainNode = this.audioContext!.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext!.destination);

      oscillator.frequency.value = 1000;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.4, this.audioContext!.currentTime + time);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext!.currentTime + time + 0.2);

      oscillator.start(this.audioContext!.currentTime + time);
      oscillator.stop(this.audioContext!.currentTime + time + 0.2);
    });
  }

  // Play halfway beep - distinct from countdown
  playHalfwayBeep() {
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.value = 700; // Mid-range pitch
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.35, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.4);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.4);
  }

  // Play air horn - for workout start
  playAirHorn() {
    if (!this.audioContext) return;

    const now = this.audioContext.currentTime;
    
    // Air horn sound: harsh, loud, attention-grabbing
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    // Frequency sweep for air horn effect
    oscillator.frequency.setValueAtTime(150, now);
    oscillator.frequency.linearRampToValueAtTime(200, now + 0.1);
    oscillator.type = 'sawtooth'; // Harsh sound
    
    gainNode.gain.setValueAtTime(0.6, now);
    gainNode.gain.setValueAtTime(0.6, now + 0.8);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    
    oscillator.start(now);
    oscillator.stop(now + 1.2);
  }

  // Play whistle - for attention/warnings
  playWhistle() {
    if (!this.audioContext) return;

    const now = this.audioContext.currentTime;
    
    // Whistle sound: high pitched clean tone
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.frequency.value = 2500; // Very high pitch
    oscillator.type = 'sine';
    
    // Short, sharp whistle
    gainNode.gain.setValueAtTime(0.4, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    
    oscillator.start(now);
    oscillator.stop(now + 0.3);
  }

  // Play buzzer - for incorrect/stop
  playBuzzer() {
    if (!this.audioContext) return;

    const now = this.audioContext.currentTime;
    
    // Buzzer sound: low harsh tone
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.frequency.value = 100; // Low frequency
    oscillator.type = 'sawtooth';
    
    gainNode.gain.setValueAtTime(0.5, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    
    oscillator.start(now);
    oscillator.stop(now + 0.5);
  }
}

export const soundEffects = new SoundEffects();

