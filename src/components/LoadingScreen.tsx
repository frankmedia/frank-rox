import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

const getMotivationalQuotes = () => {
  // Get username from localStorage
  let username = "there";
  try {
    const userStr = localStorage.getItem("frank_rock_user");
    if (userStr) {
      const user = JSON.parse(userStr);
      username = user.username || "there";
    }
  } catch (e) {
    // Ignore
  }

  return [
    `👋 Hey ${username}!`,
    "Let me load your personalised training programme...",
    "⚡ Get ready to dominate!",
    "🎯 Success is a journey, not a destination",
    "💥 Today's pain is tomorrow's power",
    "🏆 Champions are made in training",
    "🚀 Push yourself, nobody else will",
    "⭐ Your only limit is you",
    "💯 Make it happen!",
    "🔨 Forge your strength",
  ];
};

export function LoadingScreen() {
  const motivationalQuotes = getMotivationalQuotes();
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [charIndex, setCharIndex] = useState(0);

  const currentQuote = motivationalQuotes[quoteIndex];

  // Typewriter effect
  useEffect(() => {
    if (charIndex < currentQuote.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(currentQuote.substring(0, charIndex + 1));
        setCharIndex(charIndex + 1);
      }, 50); // 50ms per character
      return () => clearTimeout(timeout);
    }
  }, [charIndex, currentQuote]);

  // Change quote every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % motivationalQuotes.length);
      setCharIndex(0);
      setDisplayedText("");
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
      <Loader2 className="w-16 h-16 sm:w-20 sm:h-20 animate-spin text-primary" />
      <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground min-h-[3rem] px-4 text-center max-w-2xl">
        {displayedText}
        <span className="animate-pulse">|</span>
      </p>
    </div>
  );
}
