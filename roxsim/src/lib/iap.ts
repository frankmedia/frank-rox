// In-App Purchase with RevenueCat
import { Capacitor } from '@capacitor/core';
import {
  Purchases,
  LOG_LEVEL,
  CustomerInfo,
  PurchasesPackage,
} from '@revenuecat/purchases-capacitor';

export const PRODUCT_IDS = {
  HYROX_PACK: 'com.roxsims.hyrox_pack',
  FRANK_TANK: 'com.roxsims.frank_tank',
} as const;

export const ENTITLEMENT_IDS = {
  HYROX_PACK: 'hyrox_pack',
  FRANK_TANK: 'frank_tank',
} as const;

// RevenueCat API Keys from environment variables
const REVENUECAT_ANDROID_KEY = (import.meta as any).env?.VITE_REVENUECAT_API_KEY_ANDROID || 'goog_nZiqYfHwfHQiicWnNQxEhLjamOp';
const REVENUECAT_IOS_KEY = (import.meta as any).env?.VITE_REVENUECAT_API_KEY_IOS || 'appl_tCnTrFTVICMTbXvioNftqPjrmav';

let isInitialized = false;

// Initialize RevenueCat
export async function initializePurchases(): Promise<void> {
  if (isInitialized) {
    console.log('IAP: Already initialized');
    return;
  }

  if (!Capacitor.isNativePlatform()) {
    console.log('IAP: Not on native platform, skipping');
    return;
  }

  try {
    const apiKey = Capacitor.getPlatform() === 'ios' 
      ? REVENUECAT_IOS_KEY 
      : REVENUECAT_ANDROID_KEY;

    console.log('IAP: Configuring RevenueCat for', Capacitor.getPlatform());
    console.log('🔑 IAP: Using API key:', apiKey);
    console.log('🔑 IAP: iOS key constant:', REVENUECAT_IOS_KEY);
    console.log('🔑 IAP: Android key constant:', REVENUECAT_ANDROID_KEY);
    
    await Purchases.configure({
      apiKey,
      appUserID: undefined, // Use anonymous ID
    });

    // Set log level for debugging
    await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });

    isInitialized = true;
    console.log('IAP: RevenueCat initialized successfully');
  } catch (error) {
    console.error('IAP: Failed to initialize RevenueCat:', error);
    throw error;
  }
}

// Get available offerings (with web mock support)
export async function getOfferings(): Promise<PurchasesPackage[]> {
  const platform = Capacitor.getPlatform();
  
  // WEB PLATFORM: Return mock offerings so UI works in browser
  if (platform === 'web') {
    console.log('🛒 IAP: Running on WEB - returning MOCK offerings');
    // Return empty array for web - hardcoded prices in UI will show
  return [];
}

  // NATIVE PLATFORM: Real RevenueCat
  try {
    console.log('🛒 IAP: Getting offerings from RevenueCat...');
    console.log('🛒 IAP: Platform:', platform);
    console.log('🛒 IAP: Is initialized:', isInitialized);
    
    const offerings = await Purchases.getOfferings();
    console.log('🛒 IAP: ========== FULL OFFERINGS OBJECT ==========');
    console.log('🛒 IAP:', JSON.stringify(offerings, null, 2));
    console.log('🛒 IAP: ============================================');
    
    if (offerings.current) {
      const packages = offerings.current.availablePackages;
      console.log('🛒 IAP: ✅ Current offering found with', packages.length, 'packages');
      
      packages.forEach((pkg, idx) => {
        console.log(`🛒 IAP: Package ${idx + 1}/${packages.length}:`, {
          identifier: pkg.identifier,
          productId: pkg.product.identifier,
          price: pkg.product.priceString,
          title: pkg.product.title,
          description: pkg.product.description,
        });
      });
      
      if (packages.length === 0) {
        console.error('🛒 IAP: ❌❌❌ OFFERINGS RETURNED BUT NO PACKAGES FOUND');
        console.error('🛒 IAP: This means:');
        console.error('🛒 IAP:   1. Products exist in Play Console but are DRAFT/INACTIVE');
        console.error('🛒 IAP:   2. RevenueCat offering has no products attached');
        console.error('🛒 IAP:   3. App bundle ID mismatch between Play/RevenueCat');
      }
      
      return packages;
    }
    
    console.error('🛒 IAP: ❌❌❌ NO CURRENT OFFERING FOUND');
    console.error('🛒 IAP: offerings.current is null/undefined');
    console.error('🛒 IAP: Go to RevenueCat → Offerings → Make sure one is marked "Current"');
    return [];
  } catch (error: any) {
    console.error('🛒 IAP: ❌❌❌ EXCEPTION GETTING OFFERINGS:', error);
    console.error('🛒 IAP: Error name:', error.name);
    console.error('🛒 IAP: Error message:', error.message);
    console.error('🛒 IAP: Error code:', error.code);
    console.error('🛒 IAP: Full error:', JSON.stringify(error, null, 2));
    return [];
  }
}

// Purchase a package
export async function purchasePackage(pkg: PurchasesPackage): Promise<CustomerInfo | null> {
  const platform = Capacitor.getPlatform();
  
  if (platform === 'web') {
    console.error('💳 IAP: ❌ Cannot purchase on WEB platform');
    throw new Error('In-app purchases only work on native platforms (Android/iOS)');
  }
  
  try {
    console.log('💳 IAP: ========== STARTING PURCHASE ==========');
    console.log('💳 IAP: Package identifier:', pkg.identifier);
    console.log('💳 IAP: Product ID:', pkg.product.identifier);
    console.log('💳 IAP: Price:', pkg.product.priceString);
    console.log('💳 IAP: Title:', pkg.product.title);
    console.log('💳 IAP: =========================================');
    
    const result = await Purchases.purchasePackage({ aPackage: pkg });
    
    console.log('💳 IAP: ========== PURCHASE RESULT ==========');
    console.log('💳 IAP: ✅ Purchase successful!');
    console.log('💳 IAP: CustomerInfo:', JSON.stringify(result.customerInfo, null, 2));
    console.log('💳 IAP: Active entitlements:', Object.keys(result.customerInfo.entitlements.active));
    console.log('💳 IAP: =========================================');
    
    return result.customerInfo;
  } catch (error: any) {
    if (error.userCancelled) {
      console.log('💳 IAP: ℹ️ User cancelled purchase');
      return null;
    }
    
    console.error('💳 IAP: ❌❌❌ PURCHASE FAILED');
    console.error('💳 IAP: Error name:', error.name);
    console.error('💳 IAP: Error message:', error.message);
    console.error('💳 IAP: Error code:', error.code);
    console.error('💳 IAP: Full error:', JSON.stringify(error, null, 2));
    console.error('💳 IAP: =========================================');
    throw error;
  }
}

// Restore purchases
export async function restorePurchases(): Promise<CustomerInfo> {
  try {
    console.log('IAP: Restoring purchases...');
    const result = await Purchases.restorePurchases();
    console.log('IAP: Purchases restored:', result);
    return result.customerInfo;
  } catch (error) {
    console.error('IAP: Failed to restore purchases:', error);
    throw error;
  }
}

// Get current customer info and entitlements
export async function getEntitlements(): Promise<{
  hasHyroxPack: boolean;
  hasFrankTheTank: boolean;
}> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    
    const hasHyroxPack = customerInfo.customerInfo.entitlements.active[ENTITLEMENT_IDS.HYROX_PACK] !== undefined;
    const hasFrankTheTank = customerInfo.customerInfo.entitlements.active[ENTITLEMENT_IDS.FRANK_TANK] !== undefined;
    
    console.log('IAP: Entitlements:', { hasHyroxPack, hasFrankTheTank });
    
    return {
      hasHyroxPack,
      hasFrankTheTank,
    };
  } catch (error) {
    console.error('IAP: Failed to get entitlements:', error);
    return {
      hasHyroxPack: false,
      hasFrankTheTank: false,
    };
  }
}

// Listen to purchase updates
export function addPurchaseListener(callback: (customerInfo: CustomerInfo) => void): void {
  Purchases.addCustomerInfoUpdateListener((info) => {
    console.log('IAP: Customer info updated:', info);
    callback(info.customerInfo);
  });
}

// Remove listeners
export function removePurchaseListeners(): void {
  // RevenueCat doesn't have a specific remove method, listeners are managed internally
  console.log('IAP: Listeners managed by RevenueCat');
}
