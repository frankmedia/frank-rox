-- Migration: Add competitions table and user competition entries
-- Date: 2025-01-29
-- Description: Support multiple named competitions with simulation dates

-- Create competitions table
CREATE TABLE IF NOT EXISTS public.roxsim_competitions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Competition details
  title TEXT NOT NULL,                          -- "Spring HYROX Challenge 2025"
  description TEXT,                             -- Competition details
  workout_type TEXT NOT NULL,                   -- 'hyrox_full', 'hyrox_half', 'deka_strong', 'deka_half'
  
  -- Dates
  simulation_date DATE NOT NULL,                -- When athletes should complete the simulation
  competition_date DATE,                        -- Actual competition/race date (optional)
  registration_start DATE NOT NULL,
  registration_end DATE NOT NULL,
  
  -- Additional info
  prize_description TEXT,
  is_active BOOLEAN DEFAULT true,
  
  -- Admin
  created_by TEXT,
  admin_notes TEXT
);

-- Create competition entries table (who signed up)
CREATE TABLE IF NOT EXISTS public.roxsim_competition_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Links
  competition_id UUID REFERENCES public.roxsim_competitions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.roxsim_users(id) ON DELETE CASCADE,
  
  -- Entry data (snapshot at time of entry)
  athlete_name TEXT NOT NULL,
  athlete_surname TEXT,
  athlete_email TEXT,
  athlete_sex TEXT,
  athlete_dob DATE,
  
  -- Status
  agreed_terms BOOLEAN DEFAULT true,
  has_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  UNIQUE(competition_id, user_id)
);

-- Create competition results table
CREATE TABLE IF NOT EXISTS public.roxsim_competition_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Links
  competition_id UUID REFERENCES public.roxsim_competitions(id) ON DELETE CASCADE,
  entry_id UUID REFERENCES public.roxsim_competition_entries(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.roxsim_users(id) ON DELETE SET NULL,
  
  -- Result data
  total_time INTEGER NOT NULL,                  -- Total time in seconds
  station_times INTEGER[],                      -- Array of station times
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Review status
  is_disqualified BOOLEAN DEFAULT false,
  disqualification_reason TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS roxsim_competitions_is_active_idx ON public.roxsim_competitions(is_active);
CREATE INDEX IF NOT EXISTS roxsim_competitions_simulation_date_idx ON public.roxsim_competitions(simulation_date);
CREATE INDEX IF NOT EXISTS roxsim_competitions_workout_type_idx ON public.roxsim_competitions(workout_type);

CREATE INDEX IF NOT EXISTS roxsim_competition_entries_competition_id_idx ON public.roxsim_competition_entries(competition_id);
CREATE INDEX IF NOT EXISTS roxsim_competition_entries_user_id_idx ON public.roxsim_competition_entries(user_id);

CREATE INDEX IF NOT EXISTS roxsim_competition_results_competition_id_idx ON public.roxsim_competition_results(competition_id);
CREATE INDEX IF NOT EXISTS roxsim_competition_results_entry_id_idx ON public.roxsim_competition_results(entry_id);
CREATE INDEX IF NOT EXISTS roxsim_competition_results_user_id_idx ON public.roxsim_competition_results(user_id);

-- Add comments
COMMENT ON TABLE public.roxsim_competitions IS 'Competition events with simulation dates';
COMMENT ON TABLE public.roxsim_competition_entries IS 'User signups for competitions';
COMMENT ON TABLE public.roxsim_competition_results IS 'Submitted results for competitions';

COMMENT ON COLUMN public.roxsim_competitions.simulation_date IS 'Date when athletes should complete their simulation';
COMMENT ON COLUMN public.roxsim_competitions.competition_date IS 'Optional actual race/competition date';

-- Enable Row Level Security
ALTER TABLE public.roxsim_competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roxsim_competition_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roxsim_competition_results ENABLE ROW LEVEL SECURITY;

-- Policies for competitions table (read-only for users)
CREATE POLICY "Anyone can view active competitions"
  ON public.roxsim_competitions
  FOR SELECT
  USING (is_active = true);

-- Policies for competition_entries table
CREATE POLICY "Anyone can view competition entries"
  ON public.roxsim_competition_entries
  FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own entries"
  ON public.roxsim_competition_entries
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own entries"
  ON public.roxsim_competition_entries
  FOR UPDATE
  USING (true);

-- Policies for competition_results table
CREATE POLICY "Anyone can view competition results"
  ON public.roxsim_competition_results
  FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own results"
  ON public.roxsim_competition_results
  FOR INSERT
  WITH CHECK (true);

-- Grant permissions
GRANT SELECT ON public.roxsim_competitions TO anon, authenticated;
GRANT INSERT, SELECT, UPDATE ON public.roxsim_competition_entries TO anon, authenticated;
GRANT INSERT, SELECT ON public.roxsim_competition_results TO anon, authenticated;

-- Trigger to auto-update updated_at on competitions
CREATE TRIGGER update_roxsim_competitions_updated_at
  BEFORE UPDATE ON public.roxsim_competitions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Note: Keep the old competition_date field in roxsim_users for backward compatibility
-- It can be used as a default/personal competition date
COMMENT ON COLUMN public.roxsim_users.competition_date IS 'Personal competition date (legacy field, competitions table is preferred)';

