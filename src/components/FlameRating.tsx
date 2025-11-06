import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

interface FlameRatingProps {
  value: number; // 0-5
  onChange?: (rating: number) => void;
  readonly?: boolean;
  size?: "sm" | "md" | "lg";
}

export function FlameRating({ value, onChange, readonly = false, size = "md" }: FlameRatingProps) {
  const flames = [1, 2, 3, 4, 5];
  
  const sizeClasses = {
    sm: "w-5 h-5",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  const gapClasses = {
    sm: "gap-1.5", // More space for history
    md: "gap-2",
    lg: "gap-4", // More spacing for exercise detail
  };
  
  const buttonClasses = {
    sm: "", // No negative margin
    md: "",
    lg: "",
  };

  const handleClick = (rating: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent click from bubbling to parent elements
    e.preventDefault(); // Prevent any default behavior
    
    if (readonly || !onChange) return;
    // Always set the rating (don't toggle off)
    onChange(rating);
  };

  return (
    <div className={cn("flex items-center", gapClasses[size])}>
      {flames.map((flame) => (
        <button
          key={flame}
          type="button"
          onClick={(e) => handleClick(flame, e)}
          disabled={readonly}
          className={cn(
            "transition-all p-0 border-0 bg-transparent m-0 leading-none",
            buttonClasses[size],
            !readonly && "cursor-pointer hover:scale-110 active:scale-95",
            readonly && "cursor-default"
          )}
        >
          <Flame
            className={cn(
              sizeClasses[size],
              "transition-all",
              flame <= value
                ? "fill-[#FFCC00] stroke-[#FFCC00]"
                : "fill-transparent stroke-muted-foreground"
            )}
          />
        </button>
      ))}
    </div>
  );
}

