import { useState, useEffect } from 'react';
import { X, Crown, Check, Zap } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { hapticImpact, HapticsImpactStyle } from '@/utils/hapticsBridge';
import { getOfferings, purchasePackage } from '@/lib/iap';
import type { PurchasesPackage } from '@revenuecat/purchases-capacitor';

interface PaywallProps {
  onClose?: () => void;
  productId: string; // Exact product ID to show: 'com.roxsims.hyrox_pack' or 'com.roxsims.frank_tank'
  title: string; // Title to display: 'Unlock Hyrox Pack' or 'Unlock Frank the Tank'
}

export function Paywall({ onClose, productId, title }: PaywallProps) {
  console.log('🚀🚀🚀 PAYWALL OPENED - Product ID:', productId, '- Title:', title);
  const { updateEntitlements } = useUser();
  const [isProcessing, setIsProcessing] = useState(false);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<PurchasesPackage | null>(null);
  const [error, setError] = useState<string>('');

  // Load available packages from RevenueCat
  const loadPackages = async () => {
    try {
      console.log('💰 PAYWALL: ========== LOADING PACKAGES ==========');
      console.log('💰 PAYWALL: Looking for product ID:', productId);
      
      const availablePackages = await getOfferings();
      
      console.log('💰 PAYWALL: Received', availablePackages.length, 'packages from getOfferings()');
      
      setPackages(availablePackages);
      
      if (availablePackages.length === 0) {
        console.error('💰 PAYWALL: ❌❌❌ ZERO PACKAGES RETURNED');
        console.error('💰 PAYWALL: This means:');
        console.error('💰 PAYWALL:   1. Running on web (expected) OR');
        console.error('💰 PAYWALL:   2. RevenueCat offerings are empty (native - BAD)');
        console.error('💰 PAYWALL: Hardcoded fallback price will be shown in UI');
        setError(`Product "${productId}" not found. Check RevenueCat configuration.`);
        return;
      }
      
      // Find the EXACT product by ID
      console.log('💰 PAYWALL: Searching for exact match...');
      availablePackages.forEach((pkg, idx) => {
        const match = pkg.product.identifier === productId;
        console.log(`💰 PAYWALL: [${idx + 1}/${availablePackages.length}] ${pkg.product.identifier} === ${productId}? ${match ? '✅ MATCH' : '❌ no'}`);
      });

      const matchingPackage = availablePackages.find(pkg => pkg.product.identifier === productId);
      
      if (matchingPackage) {
        console.log('💰 PAYWALL: ✅✅✅ FOUND EXACT MATCH!');
        console.log('💰 PAYWALL:   Product ID:', matchingPackage.product.identifier);
        console.log('💰 PAYWALL:   Price:', matchingPackage.product.priceString);
        console.log('💰 PAYWALL:   Title:', matchingPackage.product.title);
        setSelectedPackage(matchingPackage);
        setError(''); // Clear any previous errors
      } else {
        console.error('💰 PAYWALL: ❌❌❌ NO MATCH FOUND FOR:', productId);
        console.error('💰 PAYWALL: Available product IDs:', availablePackages.map(p => p.product.identifier));
        console.error('💰 PAYWALL: ');
        console.error('💰 PAYWALL: CHECK THESE IN REVENUECAT:');
        console.error('💰 PAYWALL:   1. Go to Offerings → default');
        console.error('💰 PAYWALL:   2. Verify package has product:', productId);
        console.error('💰 PAYWALL:   3. Product must be ACTIVE in Play Console');
        console.error('💰 PAYWALL: ');
        setError(`Product "${productId}" not configured in RevenueCat offering.`);
      }
      
      console.log('💰 PAYWALL: =========================================');
    } catch (err) {
      console.error('💰 PAYWALL: ❌ EXCEPTION loading packages:', err);
      setError('Unable to load products. Please try again.');
    }
  };

  useEffect(() => {
    console.log('🔄 useEffect triggered - Loading product:', productId);
    loadPackages();
  }, [productId]);

  const handlePurchase = async () => {
    console.log('💳 PAYWALL: ========== PURCHASE BUTTON CLICKED ==========');
    console.log('💳 PAYWALL: selectedPackage:', selectedPackage ? 'EXISTS' : 'NULL');
    
    if (!selectedPackage) {
      console.error('💳 PAYWALL: ❌❌❌ CANNOT PURCHASE - NO PACKAGE SELECTED');
      console.error('💳 PAYWALL: This means getOfferings() returned no matching product.');
      console.error('💳 PAYWALL: User clicked but button should have been disabled.');
      console.error('💳 PAYWALL: ');
      console.error('💳 PAYWALL: TO FIX:');
      console.error('💳 PAYWALL:   1. Verify app package ID:', 'com.roxsims.app');
      console.error('💳 PAYWALL:   2. Verify product exists in Play Console:', productId);
      console.error('💳 PAYWALL:   3. Verify product is ACTIVE (not draft) in Play Console');
      console.error('💳 PAYWALL:   4. Verify product is in RevenueCat offering "default"');
      console.error('💳 PAYWALL:   5. Verify RevenueCat Android bundle ID is: com.roxsims.app');
      console.error('💳 PAYWALL: ');
      setError('Product not available. Please check RevenueCat and Play Console setup.');
      return;
    }
    
    console.log('💳 PAYWALL: Package details:', {
      identifier: selectedPackage.identifier,
      productId: selectedPackage.product.identifier,
      price: selectedPackage.product.priceString,
      title: selectedPackage.product.title
    });
    
    await hapticImpact(HapticsImpactStyle.Medium);
    setIsProcessing(true);
    setError('');

    try {
      console.log('💳 PAYWALL: Calling purchasePackage() from iap.ts...');
      const customerInfo = await purchasePackage(selectedPackage);
      console.log('💳 PAYWALL: purchasePackage() returned:', customerInfo ? 'CustomerInfo object' : 'null (cancelled)');

      if (customerInfo) {
        // Purchase successful! Update entitlements
        console.log('💳 PAYWALL: ✅ PURCHASE SUCCESS! Checking entitlements...');
        console.log('💳 PAYWALL: Active entitlements:', Object.keys(customerInfo.entitlements.active));
        
        const hasHyroxPack = customerInfo.entitlements.active['hyrox_pack'] !== undefined;
        const hasFrankTheTank = customerInfo.entitlements.active['frank_tank'] !== undefined;
        
        console.log('💳 PAYWALL: Entitlements found:', { hasHyroxPack, hasFrankTheTank });
        
        updateEntitlements({
          hasHyroxPack,
          hasFrankTheTank,
        });
        
        await hapticImpact(HapticsImpactStyle.Heavy);
        console.log('💳 PAYWALL: ✅✅✅ ALL DONE! Closing paywall.');
        console.log('💳 PAYWALL: =========================================');
        if (onClose) onClose();
      } else {
        // User cancelled
        console.log('💳 PAYWALL: ℹ️ User cancelled purchase');
        console.log('💳 PAYWALL: =========================================');
        setError('Purchase was cancelled.');
      }
    } catch (err: any) {
      console.error('💳 PAYWALL: ❌❌❌ PURCHASE EXCEPTION:', err);
      console.error('💳 PAYWALL: Error name:', err?.name);
      console.error('💳 PAYWALL: Error message:', err?.message);
      console.error('💳 PAYWALL: =========================================');
      setError(err?.message || 'Purchase failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = async () => {
    await hapticImpact(HapticsImpactStyle.Light);
    if (onClose) onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-zinc-900 to-black rounded-3xl max-w-md w-full border border-yellow-500/20 shadow-2xl max-h-[90vh] overflow-y-auto relative">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="sticky top-2 left-full -ml-12 p-2 hover:bg-black/80 rounded-full transition-colors z-50 bg-black/70"
        >
          <X className="w-6 h-6 text-white" />
        </button>

        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-500 to-orange-500 px-6 pt-4 pb-5 text-center relative -mt-10">
          <div className="absolute top-0 left-0 right-0 h-full bg-[url('/api/placeholder/400/200')] opacity-10 bg-cover bg-center" />
          <Crown className="w-10 h-10 mx-auto mb-2 text-black relative z-10" />
          <h2 className="text-xl font-bold text-black mb-1 relative z-10">
            {title}
          </h2>
          <p className="text-black/80 text-xs relative z-10">One-time purchase. Lifetime access.</p>
        </div>

        {/* Features */}
        <div className="p-4 space-y-2">
          <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
            <div className="text-center mb-3">
              <div className="inline-block bg-yellow-500/20 px-3 py-1 rounded-full mb-2">
                <span className="text-yellow-500 font-bold text-xs">ONE-TIME PAYMENT</span>
              </div>
              <p className="text-3xl font-bold text-white mb-1">
                {productId.includes('frank') ? '$4.99' : '$7.99'}
              </p>
              <p className="text-white/60 text-xs">No subscriptions. No hidden fees.</p>
            </div>

            <div className="space-y-1.5">
              {productId.includes('frank_tank') ? (
                <>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-white font-semibold text-sm">Frank the Tank Workout</p>
                      <p className="text-white/60 text-xs">Ultimate challenge workout</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-white font-semibold text-sm">Lifetime Access</p>
                      <p className="text-white/60 text-xs">Complete this workout anytime</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-white font-semibold text-sm">Minimal Equipment</p>
                      <p className="text-white/60 text-xs">All you need is determination</p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div>
                      <p className="text-white font-semibold text-sm">Full & Half Hyrox Simulations</p>
                      <p className="text-white/60 text-xs">Complete training programs</p>
                </div>
              </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div>
                      <p className="text-white font-semibold text-sm">Unlimited Simulations</p>
                      <p className="text-white/60 text-xs">Train as much as you want</p>
                </div>
              </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div>
                      <p className="text-white font-semibold text-sm">Performance Tracking</p>
                      <p className="text-white/60 text-xs">Track PBs and history</p>
                </div>
              </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div>
                      <p className="text-white font-semibold text-sm">Competition Countdown</p>
                      <p className="text-white/60 text-xs">Stay motivated for race day</p>
                </div>
              </div>
                </>
              )}
            </div>
          </div>

          {/* Error Message - Only show critical errors, not "not found" if we have fallback */}
          {error && !error.includes('not found') && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-2">
              <p className="text-red-300 text-xs text-center">{error}</p>
            </div>
          )}

          {/* Purchase Button */}
          <button
            onClick={handlePurchase}
            disabled={isProcessing || !selectedPackage}
            className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-black rounded-xl py-2.5 font-bold text-base flex items-center justify-center gap-2 hover:shadow-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Crown className="w-5 h-5" />
                Purchase for {productId.includes('frank') ? '$4.99' : '$7.99'}
              </>
            )}
          </button>

        </div>
      </div>
    </div>
  );
}

