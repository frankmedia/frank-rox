// Sync user data to Supabase
import { supabase } from './supabaseClient';
import { UserProfile } from '@/types';
import { Capacitor } from '@capacitor/core';

// Generate a unique device ID
function getDeviceId(): string {
  const stored = localStorage.getItem('roxsim_device_id');
  if (stored) return stored;
  
  const newId = `${Capacitor.getPlatform()}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  localStorage.setItem('roxsim_device_id', newId);
  return newId;
}

// Sync user profile to Supabase
export async function syncUserProfile(
  profile: UserProfile,
  competitionDate: Date | null,
  entitlements: { hasHyroxPack: boolean; hasFrankTheTank: boolean }
): Promise<void> {
  if (!supabase) {
    console.log('⚠️ Supabase not configured, skipping user sync');
    return;
  }

  const deviceId = getDeviceId();
  
  // Format date of birth properly (DD/MM/YYYY -> YYYY-MM-DD)
  let formattedDob: string | null = null;
  if (profile.dateOfBirth) {
    try {
      // Check if it's in DD/MM/YYYY format
      if (profile.dateOfBirth.includes('/')) {
        const parts = profile.dateOfBirth.split('/');
        if (parts.length === 3) {
          const [day, month, year] = parts;
          formattedDob = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
      } else {
        // Already in YYYY-MM-DD format or other
        formattedDob = profile.dateOfBirth;
      }
    } catch (e) {
      console.warn('Invalid date of birth format:', profile.dateOfBirth);
    }
  }
  
  const userData = {
    device_id: deviceId,
    name: profile.name || null,
    surname: profile.surname || null,
    email: profile.email || null,
    date_of_birth: formattedDob,
    sex: profile.sex || null,
    athlete_photo: profile.athletePhoto || null,
    total_sims: profile.stats.totalSims,
    best_full_time: profile.stats.bestFullTime,
    best_half_time: profile.stats.bestHalfTime,
    competition_date: competitionDate ? competitionDate.toISOString().split('T')[0] : null,
    has_hyrox_pack: entitlements.hasHyroxPack,
    has_frank_tank: entitlements.hasFrankTheTank,
    last_platform: Capacitor.getPlatform(),
    app_version: '1.0.0',
  };

  try {
    console.log('📤 Syncing user data to Supabase...', { deviceId });

    // Check if user exists
    const { data: existing } = await supabase
      .from('roxsim_users')
      .select('id')
      .eq('device_id', deviceId)
      .single();

    if (existing) {
      // Update existing user
      const { error } = await supabase
        .from('roxsim_users')
        .update(userData)
        .eq('device_id', deviceId);

      if (error) throw error;
      console.log('✅ User data updated');
    } else {
      // Insert new user
      const { error } = await supabase
        .from('roxsim_users')
        .insert(userData);

      if (error) throw error;
      console.log('✅ New user created');
    }
  } catch (err) {
    console.error('❌ Failed to sync user data:', err);
  }
}

// Get user ID for linking feedback
export async function getUserId(): Promise<string | null> {
  if (!supabase) return null;

  const deviceId = getDeviceId();

  try {
    const { data } = await supabase
      .from('roxsim_users')
      .select('id')
      .eq('device_id', deviceId)
      .single();

    return data?.id || null;
  } catch {
    return null;
  }
}

