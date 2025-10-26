-- Create races table
CREATE TABLE IF NOT EXISTS public.races (
  id BIGSERIAL PRIMARY KEY,
  client_id BIGINT NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  race_name TEXT NOT NULL,
  race_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS races_client_id_idx ON public.races(client_id);
CREATE INDEX IF NOT EXISTS races_race_date_idx ON public.races(race_date);

-- Disable RLS for now (using custom auth, not Supabase Auth)
-- ALTER TABLE public.races ENABLE ROW LEVEL SECURITY;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
CREATE TRIGGER update_races_updated_at BEFORE UPDATE ON public.races
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

