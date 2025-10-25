import { useEffect, useState } from "react";
import { useIsFetching, useIsMutating } from "@tanstack/react-query";

export const TopProgressBar = () => {
  const fetching = useIsFetching();
  const mutating = useIsMutating();
  const active = fetching + mutating > 0;
  const [progress, setProgress] = useState<number>(0);

  useEffect(() => {
    if (active) {
      setProgress(10);
      const id = setInterval(() => {
        setProgress((p) => (p < 90 ? p + Math.random() * 10 : p));
      }, 200);
      return () => clearInterval(id);
    } else {
      // complete and then hide
      setProgress(100);
      const t = setTimeout(() => setProgress(0), 250);
      return () => clearTimeout(t);
    }
  }, [active]);

  // hidden when progress is 0
  if (progress === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-0.5 bg-transparent">
      <div
        className="h-0.5 bg-[#FFCC00] transition-all"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};


