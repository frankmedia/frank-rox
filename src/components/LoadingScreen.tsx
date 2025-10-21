import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

const motivationalQuotes = [
  "💪 Loading your workout...",
  "🔥 Preparing your training plan...",
  "⚡ Get ready to dominate!",
  "🎯 Success is a journey, not a destination",
  "💥 Today's pain is tomorrow's power",
  "🏆 Champions are made in training",
  "🚀 Push yourself, nobody else will",
  "⭐ Your only limit is you",
  "💯 Make it happen!",
  "🔨 Forge your strength",
];

export function LoadingScreen() {
  const [quoteIndex, setQuoteIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % motivationalQuotes.length);
    }, 2000); // Change quote every 2 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-6">
      <Loader2 className="w-12 h-12 animate-spin text-primary" />
      <p className="text-lg sm:text-xl font-semibold text-foreground animate-pulse">
        {motivationalQuotes[quoteIndex]}
      </p>
    </div>
  );
}

