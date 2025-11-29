import { useState, useEffect } from 'react';
import { useUser } from '@/contexts/UserContext';
import { Paywall } from './Paywall';

interface PurchaseGateProps {
  children: React.ReactNode;
  freeTrial?: number; // Number of free simulations before requiring purchase
}

export function PurchaseGate({ children, freeTrial = 2 }: PurchaseGateProps) {
  const { isPurchased, profile } = useUser();
  const [showPaywall, setShowPaywall] = useState(false);

  useEffect(() => {
    // Check if user has exceeded free trial
    if (!isPurchased && profile.stats.totalSims >= freeTrial) {
      setShowPaywall(true);
    }
  }, [isPurchased, profile.stats.totalSims, freeTrial]);

  // If purchased or within free trial, show content
  if (isPurchased || profile.stats.totalSims < freeTrial) {
    return <>{children}</>;
  }

  // Show paywall
  return (
    <>
      {children}
      {showPaywall && <Paywall onClose={() => setShowPaywall(false)} />}
    </>
  );
}


