import { useEffect, useRef } from 'react';
import { useUser } from '@/contexts/UserContext';
import {
  initializePurchases,
  getEntitlements,
  addPurchaseListener,
  removePurchaseListeners,
} from '@/lib/iap';
import { Capacitor } from '@capacitor/core';

export function useIAP() {
  const { updateEntitlements, resetHyroxTrials } = useUser();
  
  // Use refs to avoid dependency issues
  const updateEntitlementsRef = useRef(updateEntitlements);
  const resetHyroxTrialsRef = useRef(resetHyroxTrials);
  
  // Keep refs updated
  updateEntitlementsRef.current = updateEntitlements;
  resetHyroxTrialsRef.current = resetHyroxTrials;

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      console.log('useIAP: Not on native platform, skipping initialization');
      return;
    }

    let isInitialized = false;

    const syncEntitlements = async () => {
      try {
        const entitlements = await getEntitlements();
        console.log('useIAP: Synced entitlements:', entitlements);
        
        updateEntitlementsRef.current(entitlements);
        
        // If user has Hyrox pack, give them unlimited trials
        if (entitlements.hasHyroxPack) {
          resetHyroxTrialsRef.current(999);
        }
      } catch (error) {
        console.error('useIAP: Failed to sync entitlements:', error);
      }
    };

    const initialize = async () => {
      try {
        await initializePurchases();
        isInitialized = true;
        console.log('useIAP: Purchases initialized');

        // Sync entitlements on startup
        await syncEntitlements();

        // Listen for purchase updates
        addPurchaseListener(async (data) => {
          console.log('useIAP: Purchase update received, syncing entitlements');
          await syncEntitlements();
        });
      } catch (error) {
        console.error('useIAP: Failed to initialize purchases:', error);
      }
    };

    initialize();

    // Cleanup
    return () => {
      if (isInitialized) {
        removePurchaseListeners();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount
}

