import { Capacitor } from '@capacitor/core';

declare global {
  interface Window {
    plugins?: {
      OneSignal?: any;
    };
  }
}

/**
 * Initialize OneSignal for push notifications
 * Call this on app startup - fully async and non-blocking
 */
export function initOneSignal() {
  // Run in next tick to not block UI
  setTimeout(() => {
    try {
      console.log('🔔 Starting OneSignal initialization...');
      
      if (!Capacitor.isNativePlatform()) {
        console.log('OneSignal: Not a native platform, skipping');
        return;
      }

      // Check if OneSignal plugin is available
      if (!window.plugins?.OneSignal) {
        console.warn('OneSignal plugin not found - skipping push notifications');
        return;
      }

      const OneSignal = window.plugins.OneSignal;

      // Your OneSignal App ID from .env
      const ONESIGNAL_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID;

      if (!ONESIGNAL_APP_ID) {
        console.error('OneSignal: VITE_ONESIGNAL_APP_ID not configured in .env');
        return;
      }

      console.log('🔔 OneSignal App ID found, initializing...');

      // Initialize OneSignal with Cordova API
      OneSignal.initialize(ONESIGNAL_APP_ID);
      console.log('✅ OneSignal initialized');

      // Setup notification click handler
      OneSignal.Notifications.addEventListener('click', (event: any) => {
        console.log('🔔 Notification clicked:', event);
      });

      // Request permission after delay
      setTimeout(() => {
        console.log('🔔 Requesting notification permission...');
        OneSignal.Notifications.requestPermission(true).then((accepted: boolean) => {
          console.log('🔔 Permission granted:', accepted);
          
          // Save to localStorage so Profile page shows it enabled
          if (accepted) {
            const settings = {
              enabled: true,
              monthlyReminders: true,
              workoutReminders: true,
              lastPromptDate: new Date().toISOString(),
            };
            localStorage.setItem('notification_settings', JSON.stringify(settings));
          }
          
          // Get player ID for Supabase (async, non-blocking)
          if (accepted && OneSignal.User?.pushSubscription) {
            // Use the new async API
            OneSignal.User.pushSubscription.getIdAsync().then((playerId: string) => {
              if (playerId) {
                console.log('🔔 Player ID:', playerId);
                // Begin async Supabase registration (non-blocking)
                saveTokenToSupabase(playerId);
              }
            }).catch((err: any) => {
              console.log('🔔 Could not get player ID:', err);
            });
          }
        }).catch((err: any) => {
          console.error('Permission request error:', err);
        });
      }, 3000); // Wait 3 seconds

    } catch (error) {
      console.error('🔔 OneSignal initialization error:', error);
      // Don't crash the app, just log the error
    }
  }, 0); // Run in next event loop tick
}

/**
 * Save OneSignal player ID to Supabase (optional - app works without this)
 */
async function saveTokenToSupabase(playerId: string) {
  try {
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
    
    if (!SUPABASE_URL) {
      console.log('🔔 Supabase not configured, skipping token save (this is OK)');
      return;
    }

    // Get device_id to link token to user
    const device_id = localStorage.getItem('roxsim_device_id');

    // Add timeout to prevent hanging
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    console.log('🔔 Registering device with Supabase URL:', SUPABASE_URL, { device_id });

    fetch(`${SUPABASE_URL}/functions/v1/register-device`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: playerId,
        platform: Capacitor.getPlatform(),
        device_id: device_id,
        preferences: {
          monthlyReminders: true,
          workoutReminders: true,
        },
      }),
      signal: controller.signal,
    })
      .then(async (response) => {
        clearTimeout(timeout);
        if (response.ok) {
          console.log('🔔 Device registered with Supabase');
        } else {
          const text = await response.text();
          console.log('🔔 Supabase registration failed (non-critical):', text);
        }
      })
      .catch((error) => {
        clearTimeout(timeout);
        console.log('🔔 Could not reach Supabase (app will still work):', error);
      });
  } catch (error) {
    console.log('🔔 Supabase registration setup error:', error);
  }
}
