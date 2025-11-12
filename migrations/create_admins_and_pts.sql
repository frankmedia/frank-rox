-- Migration: Create admins and personal_trainers tables
-- Description: Three-tier system (Admin → PT → Client)
-- Each PT can have multiple clients, each client can have only one PT

-- ============================================
-- 1. CREATE ADMINS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_admins_email ON public.admins(email);
CREATE INDEX IF NOT EXISTS idx_admins_active ON public.admins(is_active);

-- ============================================
-- 2. CREATE PERSONAL TRAINERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.personal_trainers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  bio TEXT,
  certifications TEXT[], -- e.g., ["NASM-CPT", "CrossFit L2"]
  specializations TEXT[], -- e.g., ["Hyrox", "Strength", "Running"]
  profile_image_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  created_by_admin_id UUID REFERENCES public.admins(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_personal_trainers_email ON public.personal_trainers(email);
CREATE INDEX IF NOT EXISTS idx_personal_trainers_active ON public.personal_trainers(is_active);
CREATE INDEX IF NOT EXISTS idx_personal_trainers_created_by ON public.personal_trainers(created_by_admin_id);

-- ============================================
-- 3. UPDATE CLIENTS TABLE (add PT relationship)
-- ============================================
-- Add foreign key to link each client to ONE PT
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS assigned_pt_id UUID REFERENCES public.personal_trainers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_clients_assigned_pt ON public.clients(assigned_pt_id);

-- ============================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Admins table RLS
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_select_anon" ON public.admins;
CREATE POLICY "admins_select_anon" ON public.admins
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "admins_update_anon" ON public.admins;
CREATE POLICY "admins_update_anon" ON public.admins
  FOR UPDATE TO anon
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "admins_insert_anon" ON public.admins;
CREATE POLICY "admins_insert_anon" ON public.admins
  FOR INSERT TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "admins_delete_anon" ON public.admins;
CREATE POLICY "admins_delete_anon" ON public.admins
  FOR DELETE TO anon
  USING (true);

-- Personal Trainers table RLS
ALTER TABLE public.personal_trainers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "personal_trainers_select_anon" ON public.personal_trainers;
CREATE POLICY "personal_trainers_select_anon" ON public.personal_trainers
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "personal_trainers_update_anon" ON public.personal_trainers;
CREATE POLICY "personal_trainers_update_anon" ON public.personal_trainers
  FOR UPDATE TO anon
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "personal_trainers_insert_anon" ON public.personal_trainers;
CREATE POLICY "personal_trainers_insert_anon" ON public.personal_trainers
  FOR INSERT TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "personal_trainers_delete_anon" ON public.personal_trainers;
CREATE POLICY "personal_trainers_delete_anon" ON public.personal_trainers
  FOR DELETE TO anon
  USING (true);

-- ============================================
-- 5. GRANT PERMISSIONS TO ANON ROLE
-- ============================================
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.admins TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.personal_trainers TO anon;

-- ============================================
-- 6. SEED DATA
-- ============================================
-- Create the main admin account
INSERT INTO public.admins (email, password, name)
VALUES ('roxptadmin', '1gfGLi20jerpVaWJMTQ0', 'RoxPT Admin')
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- 7. HELPER VIEWS (optional, for analytics)
-- ============================================

-- View: PT with client count
CREATE OR REPLACE VIEW public.pt_client_counts AS
SELECT 
  pt.id,
  pt.name,
  pt.email,
  pt.is_active,
  COUNT(c.id) as client_count
FROM public.personal_trainers pt
LEFT JOIN public.clients c ON c.assigned_pt_id = pt.id
GROUP BY pt.id, pt.name, pt.email, pt.is_active;

-- Grant view access
GRANT SELECT ON public.pt_client_counts TO anon;

COMMENT ON TABLE public.admins IS 'Super users who can manage PTs and access all admin features';
COMMENT ON TABLE public.personal_trainers IS 'Personal trainers who manage clients and create programs';
COMMENT ON COLUMN public.clients.assigned_pt_id IS 'Foreign key to personal_trainers - each client has ONE PT';

