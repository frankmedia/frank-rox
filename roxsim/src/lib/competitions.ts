// Competition API functions
import { supabase } from './supabaseClient';
import { Competition, CompetitionEntry, CompetitionResult } from '@/types';

// Get all active competitions
export async function getActiveCompetitions(): Promise<Competition[]> {
  if (!supabase) {
    console.log('⚠️ Supabase not configured');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('roxsim_competitions')
      .select('*')
      .eq('is_active', true)
      .order('simulation_date', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('❌ Failed to fetch competitions:', err);
    return [];
  }
}

// Get user's competition entries
export async function getMyCompetitions(userId: string): Promise<(CompetitionEntry & { competition: Competition })[]> {
  if (!supabase) {
    console.log('⚠️ Supabase not configured');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('roxsim_competition_entries')
      .select(`
        *,
        competition:roxsim_competitions(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('❌ Failed to fetch my competitions:', err);
    return [];
  }
}

// Enter a competition
export async function enterCompetition(
  competitionId: string,
  userId: string,
  athleteData: {
    name: string;
    surname?: string;
    email?: string;
    sex?: string;
    dob?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    // Format DOB if provided (DD/MM/YYYY -> YYYY-MM-DD)
    let formattedDob: string | null = null;
    if (athleteData.dob && athleteData.dob.includes('/')) {
      const parts = athleteData.dob.split('/');
      if (parts.length === 3) {
        const [day, month, year] = parts;
        formattedDob = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }

    const { error } = await supabase
      .from('roxsim_competition_entries')
      .insert({
        competition_id: competitionId,
        user_id: userId,
        athlete_name: athleteData.name,
        athlete_surname: athleteData.surname || null,
        athlete_email: athleteData.email || null,
        athlete_sex: athleteData.sex || null,
        athlete_dob: formattedDob,
        agreed_terms: true,
      });

    if (error) {
      // Check if already entered
      if (error.code === '23505') {
        return { success: false, error: 'Already entered this competition' };
      }
      throw error;
    }

    return { success: true };
  } catch (err: any) {
    console.error('❌ Failed to enter competition:', err);
    return { success: false, error: err.message || 'Failed to enter competition' };
  }
}

// Submit competition result
export async function submitCompetitionResult(
  competitionId: string,
  entryId: string,
  userId: string,
  result: {
    totalTime: number;
    stationTimes: number[];
  }
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    // Insert result
    const { error: resultError } = await supabase
      .from('roxsim_competition_results')
      .insert({
        competition_id: competitionId,
        entry_id: entryId,
        user_id: userId,
        total_time: result.totalTime,
        station_times: result.stationTimes,
        completed_at: new Date().toISOString(),
      });

    if (resultError) throw resultError;

    // Update entry as completed
    const { error: entryError } = await supabase
      .from('roxsim_competition_entries')
      .update({
        has_completed: true,
        completed_at: new Date().toISOString(),
      })
      .eq('id', entryId);

    if (entryError) throw entryError;

    return { success: true };
  } catch (err: any) {
    console.error('❌ Failed to submit competition result:', err);
    return { success: false, error: err.message || 'Failed to submit result' };
  }
}

// Check if user is entered in a competition
export async function isEnteredInCompetition(
  competitionId: string,
  userId: string
): Promise<{ entered: boolean; entryId?: string; hasCompleted?: boolean }> {
  if (!supabase) {
    return { entered: false };
  }

  try {
    const { data, error } = await supabase
      .from('roxsim_competition_entries')
      .select('id, has_completed')
      .eq('competition_id', competitionId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return { entered: false };
      }
      throw error;
    }

    return {
      entered: true,
      entryId: data.id,
      hasCompleted: data.has_completed,
    };
  } catch (err) {
    console.error('❌ Failed to check competition entry:', err);
    return { entered: false };
  }
}

// Calculate days until date
export function daysUntil(dateString: string): number {
  const target = new Date(dateString);
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// Format date for display
export function formatCompetitionDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

