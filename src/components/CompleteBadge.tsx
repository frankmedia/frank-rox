import { Check } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type BadgeSize = "sm" | "md";

const sizeClasses: Record<BadgeSize, { wrapper: string; icon: string }> = {
  sm: {
    wrapper: "h-8 w-8",
    icon: "h-5 w-5",
  },
  md: {
    wrapper: "h-9 w-9",
    icon: "h-5 w-5",
  },
};

interface CompleteBadgeProps {
  size?: BadgeSize;
  className?: string;
  animated?: boolean;
}

export const CompleteBadge = ({ size = "md", className, animated = false }: CompleteBadgeProps) => {
  const sizing = sizeClasses[size];
  const base = (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-[#22c55e] text-white shadow-[0_12px_30px_-16px_rgba(34,197,94,0.9)] ring-2 ring-emerald-400/40 ring-offset-2 ring-offset-black/40",
        sizing.wrapper,
        className,
      )}
    >
      <Check className={sizing.icon} />
    </div>
  );

  if (!animated) return base;

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 320, damping: 20 }}
    >
      {base}
    </motion.div>
  );
};

export default CompleteBadge;

