import { useEffect, useRef, useState } from "react";

interface PullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  resistance?: number;
}

export const usePullToRefresh = ({
  onRefresh,
  threshold = 120, // Increased from 80
  resistance = 3.5, // Increased from 2.5 for more resistance
}: PullToRefreshOptions) => {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const startY = useRef(0);
  const currentPullDistance = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let touchStartY = 0;
    let isPullingLocal = false;

    const handleTouchStart = (e: TouchEvent) => {
      // Only enable pull-to-refresh if scrolled to top AND not already refreshing
      if (container.scrollTop === 0 && !isRefreshing) {
        touchStartY = e.touches[0].clientY;
        startY.current = touchStartY;
        isPullingLocal = true;
        setIsPulling(true);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPullingLocal || isRefreshing) return;

      const currentY = e.touches[0].clientY;
      const distance = currentY - startY.current;

      // Only allow pulling down with minimum threshold
      if (distance > 0 && container.scrollTop === 0) {
        // Apply resistance
        const resistedDistance = distance / resistance;
        currentPullDistance.current = resistedDistance;
        setPullDistance(resistedDistance);

        // Only prevent default scroll if pulling significantly (30px minimum)
        if (distance > 30) {
          e.preventDefault();
        }
      } else {
        // If scrolled down, cancel the pull
        isPullingLocal = false;
        setIsPulling(false);
        setPullDistance(0);
      }
    };

    const handleTouchEnd = async () => {
      if (!isPullingLocal) return;
      
      if (currentPullDistance.current > threshold && !isRefreshing) {
        setIsRefreshing(true);
        setPullDistance(threshold); // Lock at threshold during refresh

        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
          setPullDistance(0);
          setIsPulling(false);
          isPullingLocal = false;
          currentPullDistance.current = 0;
        }
      } else {
        setPullDistance(0);
        setIsPulling(false);
        isPullingLocal = false;
        currentPullDistance.current = 0;
      }
    };

    container.addEventListener("touchstart", handleTouchStart, { passive: true });
    container.addEventListener("touchmove", handleTouchMove, { passive: false });
    container.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [threshold, resistance, isRefreshing, onRefresh]);

  return {
    containerRef,
    pullDistance,
    isRefreshing,
    isPulling,
  };
};

