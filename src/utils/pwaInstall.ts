// PWA Installation utilities
import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;

/**
 * Hook to detect if the app can be installed as PWA
 */
export const usePWAInstall = () => {
  const [installable, setInstallable] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
      return;
    }

    // Listen for the beforeinstallprompt event
    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e as BeforeInstallPromptEvent;
      setInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Listen for successful installation
    window.addEventListener('appinstalled', () => {
      setInstalled(true);
      setInstallable(false);
      deferredPrompt = null;
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const promptInstall = async (): Promise<boolean> => {
    if (!deferredPrompt) {
      return false;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      deferredPrompt = null;
      setInstallable(false);
      return true;
    }

    return false;
  };

  return {
    installable,
    installed,
    promptInstall
  };
};

/**
 * Check if running as installed PWA
 */
export const isPWA = (): boolean => {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true;
};

/**
 * Get platform-specific install instructions
 */
export const getInstallInstructions = (): string => {
  const userAgent = window.navigator.userAgent.toLowerCase();
  
  if (/iphone|ipad|ipod/.test(userAgent)) {
    return 'Tap the Share button, then "Add to Home Screen"';
  }
  
  if (/android/.test(userAgent)) {
    return 'Tap the menu button, then "Add to Home Screen" or "Install App"';
  }
  
  if (/chrome/.test(userAgent)) {
    return 'Click the install button in the address bar';
  }
  
  if (/safari/.test(userAgent)) {
    return 'Click Share, then "Add to Home Screen"';
  }
  
  return 'Look for the install option in your browser menu';
};

