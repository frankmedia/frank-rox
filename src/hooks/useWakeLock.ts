import { useEffect, useRef, useState } from "react";

/**
 * Hook to prevent screen from sleeping during active timers
 * Uses the Screen Wake Lock API with fallback for unsupported browsers
 */
export const useWakeLock = (isActive: boolean) => {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [isWakeLockActive, setIsWakeLockActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const keepAliveIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    // Check if Wake Lock API is supported
    const supported = 'wakeLock' in navigator;
    setIsSupported(supported);
    
    if (supported) {
      console.log('✅ Wake Lock API is supported on this device');
    } else {
      console.warn('⚠️ Wake Lock API not supported, using fallback method');
    }
  }, []);

  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator && isActive) {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
          setIsWakeLockActive(true);
          console.log('🔓 Wake Lock activated - screen will stay on');
          
          // Listen for wake lock release
          wakeLockRef.current.addEventListener('release', () => {
            console.log('🔒 Wake Lock was released');
            setIsWakeLockActive(false);
          });
        } else if (!('wakeLock' in navigator) && isActive) {
          // Fallback: use invisible video method for iOS Safari and other unsupported browsers
          activateFallbackMethod();
        }
      } catch (err: any) {
        console.error('Wake Lock request failed:', err);
        // If Wake Lock fails, try fallback
        if (isActive) {
          activateFallbackMethod();
        }
      }
    };

    const releaseWakeLock = async () => {
      if (wakeLockRef.current) {
        try {
          await wakeLockRef.current.release();
          wakeLockRef.current = null;
          setIsWakeLockActive(false);
          console.log('🔒 Wake Lock released - screen can sleep');
        } catch (err) {
          console.error('Wake Lock release failed:', err);
        }
      }
      deactivateFallbackMethod();
    };

    const activateFallbackMethod = () => {
      console.log('🔄 Activating fallback method to keep screen on');
      
      // Method 1: Play invisible looping video (works on iOS)
      if (!videoRef.current) {
        videoRef.current = document.createElement('video');
        videoRef.current.setAttribute('playsinline', '');
        videoRef.current.setAttribute('muted', '');
        videoRef.current.style.position = 'fixed';
        videoRef.current.style.opacity = '0';
        videoRef.current.style.pointerEvents = 'none';
        videoRef.current.style.width = '1px';
        videoRef.current.style.height = '1px';
        videoRef.current.loop = true;
        
        // Create a minimal video data URL (1-frame video)
        const minimalVideoBase64 = 'AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQAAAu1tZGF0AAACrQYF//+p3EXpvebZSLeWLNgg2SPu73gyNjQgLSBjb3JlIDE1NSByMjkwMSA3ZDBmZjIyIC0gSC4yNjQvTVBFRy00IEFWQyBjb2RlYyAtIENvcHlsZWZ0IDIwMDMtMjAxOCAtIGh0dHA6Ly93d3cudmlkZW9sYW4ub3JnL3gyNjQuaHRtbCAtIG9wdGlvbnM6IGNhYmFjPTEgcmVmPTMgZGVibG9jaz0xOjA6MCBhbmFseXNlPTB4MzoweDExMyBtZT1oZXggc3VibWU9NyBwc3k9MSBwc3lfcmQ9MS4wMDowLjAwIG1peGVkX3JlZj0xIG1lX3JhbmdlPTE2IGNocm9tYV9tZT0xIHRyZWxsaXM9MSA4eDhkY3Q9MSBjcW09MCBkZWFkem9uZT0yMSwxMSBmYXN0X3Bza2lwPTEgY2hyb21hX3FwX29mZnNldD0tMiB0aHJlYWRzPTEgbG9va2FoZWFkX3RocmVhZHM9MSBzbGljZWRfdGhyZWFkcz0wIG5yPTAgZGVjaW1hdGU9MSBpbnRlcmxhY2VkPTAgYmx1cmF5X2NvbXBhdD0wIGNvbnN0cmFpbmVkX2ludHJhPTAgYmZyYW1lcz0zIGJfcHlyYW1pZD0yIGJfYWRhcHQ9MSBiX2JpYXM9MCBkaXJlY3Q9MSB3ZWlnaHRiPTEgb3Blbl9nb3A9MCB3ZWlnaHRwPTIga2V5aW50PTI1MCBrZXlpbnRfbWluPTEwIHNjZW5lY3V0PTQwIGludHJhX3JlZnJlc2g9MCByY19sb29rYWhlYWQ9NDAgcmM9Y3JmIG1idHJlZT0xIGNyZj0yMy4wIHFjb21wPTAuNjAgcXBtaW49MCBxcG1heD02OSBxcHN0ZXA9NCBpcF9yYXRpbz0xLjQwIGFxPTE6MS4wMACAAAAA';
        videoRef.current.src = `data:video/mp4;base64,${minimalVideoBase64}`;
        
        document.body.appendChild(videoRef.current);
        
        videoRef.current.play().catch((e) => {
          console.warn('Fallback video play failed:', e);
        });
      }
      
      // Method 2: Periodic no-op operations to keep page "active"
      if (!keepAliveIntervalRef.current) {
        keepAliveIntervalRef.current = window.setInterval(() => {
          // Trigger a minimal DOM operation to keep the page active
          document.body.setAttribute('data-wake-lock', Date.now().toString());
        }, 5000); // Every 5 seconds
      }
      
      setIsWakeLockActive(true);
    };

    const deactivateFallbackMethod = () => {
      // Remove video element
      if (videoRef.current) {
        videoRef.current.pause();
        if (videoRef.current.parentNode) {
          videoRef.current.parentNode.removeChild(videoRef.current);
        }
        videoRef.current = null;
      }
      
      // Clear interval
      if (keepAliveIntervalRef.current) {
        clearInterval(keepAliveIntervalRef.current);
        keepAliveIntervalRef.current = null;
      }
      
      setIsWakeLockActive(false);
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
      } else if (document.visibilityState === 'hidden') {
        console.log('⏸️ Page hidden, wake lock may be paused');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      releaseWakeLock();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isActive]);

  return { wakeLockRef, isSupported, isWakeLockActive };
};


