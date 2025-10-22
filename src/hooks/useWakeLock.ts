import { useEffect, useRef } from "react";

/**
 * Hook to prevent screen from sleeping during active timers
 * Uses the Screen Wake Lock API
 */
export const useWakeLock = (isActive: boolean) => {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator && isActive) {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
          console.log('🔓 Wake Lock activated - screen will stay on');
        }
      } catch (err) {
        console.error('Wake Lock request failed:', err);
      }
    };

    const releaseWakeLock = async () => {
      if (wakeLockRef.current) {
        try {
          await wakeLockRef.current.release();
          wakeLockRef.current = null;
          console.log('🔒 Wake Lock released - screen can sleep');
        } catch (err) {
          console.error('Wake Lock release failed:', err);
        }
      }
    };

    if (isActive) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }

    // Re-acquire wake lock if visibility changes (user switches tabs and comes back)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isActive) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      releaseWakeLock();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isActive]);

  return wakeLockRef;
};


