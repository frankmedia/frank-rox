// PWA Install Prompt Component
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { X, Download, Smartphone } from 'lucide-react';
import { usePWAInstall, getInstallInstructions } from '@/utils/pwaInstall';
import { motion, AnimatePresence } from 'framer-motion';

export function PWAInstallPrompt() {
  const { installable, installed, promptInstall } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    // Check if user previously dismissed
    const wasDismissed = localStorage.getItem('pwa_install_dismissed');
    if (wasDismissed) {
      setDismissed(true);
    }
  }, []);

  const handleInstall = async () => {
    const success = await promptInstall();
    if (!success) {
      // Show manual instructions if prompt failed
      setShowInstructions(true);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('pwa_install_dismissed', 'true');
  };

  // Don't show if already installed, dismissed, or not installable
  if (installed || dismissed || !installable) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-20 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm"
      >
        <Card className="p-4 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/50 backdrop-blur-lg">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-yellow-500 rounded-lg">
              <Smartphone className="w-5 h-5 text-black" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-sm mb-1">Install RoxPT App</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Get faster access and work offline. Install our app for the best experience!
              </p>
              
              {showInstructions && (
                <div className="mb-3 p-2 bg-black/30 rounded text-xs">
                  {getInstallInstructions()}
                </div>
              )}
              
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleInstall}
                  className="flex-1 bg-yellow-500 text-black hover:bg-yellow-600 gap-2"
                >
                  <Download className="w-4 h-4" />
                  Install
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDismiss}
                  className="px-2"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}

// Simpler banner version for header
export function PWAInstallBanner() {
  const { installable, installed, promptInstall } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const wasDismissed = localStorage.getItem('pwa_banner_dismissed');
    if (wasDismissed) {
      setDismissed(true);
    }
  }, []);

  const handleInstall = async () => {
    await promptInstall();
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('pwa_banner_dismissed', 'true');
  };

  if (installed || dismissed || !installable) {
    return null;
  }

  return (
    <div className="bg-yellow-500 text-black px-4 py-2 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 flex-1">
        <Download className="w-4 h-4" />
        <span className="text-sm font-medium">Install RoxPT for offline access</span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={handleInstall}
          className="text-black hover:bg-black/10 h-7 px-3"
        >
          Install
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleDismiss}
          className="text-black hover:bg-black/10 h-7 px-2"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

