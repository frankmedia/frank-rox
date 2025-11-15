-- Migration: Create app_settings table for storing global configuration (e.g. welcome videos)

CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_settings_select_anon" ON public.app_settings;
CREATE POLICY "app_settings_select_anon" ON public.app_settings
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "app_settings_insert_anon" ON public.app_settings;
CREATE POLICY "app_settings_insert_anon" ON public.app_settings
  FOR INSERT TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "app_settings_update_anon" ON public.app_settings;
CREATE POLICY "app_settings_update_anon" ON public.app_settings
  FOR UPDATE TO anon
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "app_settings_delete_anon" ON public.app_settings;
CREATE POLICY "app_settings_delete_anon" ON public.app_settings
  FOR DELETE TO anon
  USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO anon;

INSERT INTO public.app_settings (key, value)
VALUES ('welcome_video', jsonb_build_object('url', NULL, 'title', NULL, 'updatedAt', NOW()))
ON CONFLICT (key) DO NOTHING;

