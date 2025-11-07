import { Capacitor } from "@capacitor/core";

type SpeakOptions = {
  rate?: number;
  pitch?: number;
  volume?: number;
  locale?: string;
};

let cachedVoices: SpeechSynthesisVoice[] = [];
let voicesLoaded = false;

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoices = window.speechSynthesis.getVoices();
    voicesLoaded = true;
  };

  cachedVoices = window.speechSynthesis.getVoices();
  if (cachedVoices.length > 0) {
    voicesLoaded = true;
  }
}

let nativeTTSModule: Promise<typeof import("@capacitor-community/text-to-speech")> | null = null;

const speakNative = async (text: string, options?: SpeakOptions) => {
  try {
    if (!nativeTTSModule) {
      nativeTTSModule = import("@capacitor-community/text-to-speech");
    }

    const { TextToSpeech } = await nativeTTSModule;

    await TextToSpeech.speak({
      text,
      locale: options?.locale || "en-US",
      rate: options?.rate ?? 1,
      pitch: options?.pitch ?? 1,
      volume: options?.volume ?? 1,
      category: "ambient",
    });

    return true;
  } catch (err) {
    console.warn("Native TTS not available", err);
    return false;
  }
};

const speakWeb = (text: string, options?: SpeakOptions) => {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return false;
  }

  if (window.speechSynthesis.speaking) {
    return false;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  const voices = voicesLoaded ? cachedVoices : window.speechSynthesis.getVoices();

  if (voices.length > 0) {
    const preferredVoices = [
      "Samantha",
      "Alex",
      "Karen",
      "Google US English",
      "Microsoft David",
      "Microsoft Zira",
    ];

    let selectedVoice = voices.find((voice) =>
      preferredVoices.some((preferred) => voice.name.includes(preferred))
    );

    if (!selectedVoice) {
      selectedVoice = voices.find((voice) => voice.lang.startsWith(options?.locale || "en-US"));
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
  }

  utterance.rate = options?.rate ?? 0.95;
  utterance.pitch = options?.pitch ?? 1.0;
  utterance.volume = options?.volume ?? 1.0;
  utterance.lang = options?.locale || "en-US";

  window.speechSynthesis.speak(utterance);
  return true;
};

export const speak = async (text: string, options?: SpeakOptions) => {
  if (!text) return;

  if (Capacitor.isNativePlatform()) {
    const success = await speakNative(text, options);
    if (success) return;
  }

  speakWeb(text, options);
};


