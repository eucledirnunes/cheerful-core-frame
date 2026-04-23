
-- ============================================================
-- 1. TABELAS NOVAS: companies, plans, company_subscriptions
-- ============================================================

CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'active', -- active, suspended, cancelled
  owner_user_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  price_monthly NUMERIC(10,2) DEFAULT 0,
  is_trial BOOLEAN NOT NULL DEFAULT false,
  trial_days INTEGER DEFAULT 0,
  max_whatsapp_instances INTEGER, -- NULL = ilimitado
  max_contacts INTEGER,
  max_messages_per_month INTEGER,
  max_team_members INTEGER,
  features JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.company_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.plans(id),
  status TEXT NOT NULL DEFAULT 'trial', -- trial, active, past_due, cancelled
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ DEFAULT now(),
  current_period_end TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

CREATE INDEX idx_subs_company ON public.company_subscriptions(company_id);
CREATE INDEX idx_subs_plan ON public.company_subscriptions(plan_id);

-- ============================================================
-- 2. PLANOS PADRÃO
-- ============================================================
INSERT INTO public.plans (name, slug, description, price_monthly, is_trial, trial_days, max_whatsapp_instances, max_contacts, max_messages_per_month, max_team_members, display_order)
VALUES
  ('Trial', 'trial', 'Plano de teste gratuito por 14 dias', 0, true, 14, 1, 100, 1000, 2, 1),
  ('Pro', 'pro', 'Plano profissional sem limites', 297.00, false, 0, NULL, NULL, NULL, NULL, 2);

-- ============================================================
-- 3. COMPANY DO SUPER ADMIN + ATRIBUIR DADOS EXISTENTES
-- ============================================================
DO $$
DECLARE
  v_admin_id UUID;
  v_company_id UUID;
  v_pro_plan_id UUID;
BEGIN
  -- Pega o admin atual (Cledir)
  SELECT user_id INTO v_admin_id FROM public.user_roles WHERE role = 'admin' LIMIT 1;

  IF v_admin_id IS NOT NULL THEN
    -- Cria a company para ele
    INSERT INTO public.companies (name, slug, owner_user_id, status)
    VALUES ('AIVVO', 'aivvo', v_admin_id, 'active')
    RETURNING id INTO v_company_id;

    -- Promove para super_admin
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_admin_id, 'super_admin')
    ON CONFLICT DO NOTHING;

    -- Assina o plano Pro vitalício
    SELECT id INTO v_pro_plan_id FROM public.plans WHERE slug = 'pro';
    INSERT INTO public.company_subscriptions (company_id, plan_id, status, current_period_end)
    VALUES (v_company_id, v_pro_plan_id, 'active', now() + interval '100 years');
  END IF;
END $$;

-- ============================================================
-- 4. ADICIONAR company_id NAS ENTIDADES PRINCIPAIS
-- ============================================================
ALTER TABLE public.profiles            ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;
ALTER TABLE public.contacts            ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.conversations       ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.messages            ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.deals               ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.appointments        ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.broadcast_campaigns ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.knowledge_files     ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.whatsapp_instances  ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.team_members        ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.teams               ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.team_functions      ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.tag_definitions     ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.pipeline_stages     ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.nina_settings       ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.design_settings     ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- Backfill: tudo existente pertence à company do admin
UPDATE public.profiles            SET company_id = (SELECT id FROM public.companies LIMIT 1);
UPDATE public.contacts            SET company_id = (SELECT id FROM public.companies LIMIT 1);
UPDATE public.conversations       SET company_id = (SELECT id FROM public.companies LIMIT 1);
UPDATE public.messages            SET company_id = (SELECT id FROM public.companies LIMIT 1);
UPDATE public.deals               SET company_id = (SELECT id FROM public.companies LIMIT 1);
UPDATE public.appointments        SET company_id = (SELECT id FROM public.companies LIMIT 1);
UPDATE public.broadcast_campaigns SET company_id = (SELECT id FROM public.companies LIMIT 1);
UPDATE public.knowledge_files     SET company_id = (SELECT id FROM public.companies LIMIT 1);
UPDATE public.whatsapp_instances  SET company_id = (SELECT id FROM public.companies LIMIT 1);
UPDATE public.team_members        SET company_id = (SELECT id FROM public.companies LIMIT 1);
UPDATE public.teams               SET company_id = (SELECT id FROM public.companies LIMIT 1);
UPDATE public.team_functions      SET company_id = (SELECT id FROM public.companies LIMIT 1);
UPDATE public.tag_definitions     SET company_id = (SELECT id FROM public.companies LIMIT 1);
UPDATE public.pipeline_stages     SET company_id = (SELECT id FROM public.companies LIMIT 1);
UPDATE public.nina_settings       SET company_id = (SELECT id FROM public.companies LIMIT 1);
UPDATE public.design_settings     SET company_id = (SELECT id FROM public.companies LIMIT 1);

-- Índices
CREATE INDEX idx_contacts_company       ON public.contacts(company_id);
CREATE INDEX idx_conversations_company  ON public.conversations(company_id);
CREATE INDEX idx_messages_company       ON public.messages(company_id);
CREATE INDEX idx_deals_company          ON public.deals(company_id);
CREATE INDEX idx_appointments_company   ON public.appointments(company_id);
CREATE INDEX idx_profiles_company       ON public.profiles(company_id);
CREATE INDEX idx_wa_instances_company   ON public.whatsapp_instances(company_id);

-- ============================================================
-- 5. FUNÇÕES HELPER (security definer)
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'super_admin')
$$;

CREATE OR REPLACE FUNCTION public.get_user_company_id(_user_id UUID DEFAULT auth.uid())
RETURNS UUID
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.user_belongs_to_company(_company_id UUID, _user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_super_admin(_user_id) OR EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = _user_id AND company_id = _company_id
  )
$$;

-- ============================================================
-- 6. ATUALIZAR handle_new_user PARA SUPORTAR MULTI-TENANT
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_count INTEGER;
  v_role public.app_role;
  v_company_id UUID;
  v_invited_company_id UUID;
  v_trial_plan_id UUID;
BEGIN
  SELECT COUNT(*) INTO v_user_count FROM public.profiles;

  -- Empresa explicitamente atribuída via metadata (ex: super admin convidando para sua empresa)
  v_invited_company_id := NULLIF(NEW.raw_user_meta_data->>'company_id', '')::UUID;

  IF v_user_count = 0 THEN
    -- Primeiro usuário do sistema = super admin (já tratado pela DO block, mas mantém fallback)
    v_role := 'super_admin';
    INSERT INTO public.companies (name, owner_user_id)
    VALUES (COALESCE(NEW.raw_user_meta_data->>'company_name', 'Minha Empresa'), NEW.id)
    RETURNING id INTO v_company_id;
  ELSIF v_invited_company_id IS NOT NULL THEN
    -- Usuário convidado para empresa existente
    v_company_id := v_invited_company_id;
    v_role := 'user';
  ELSE
    -- Self-signup: cria nova empresa + plano trial
    v_role := 'admin';
    INSERT INTO public.companies (name, owner_user_id)
    VALUES (COALESCE(NEW.raw_user_meta_data->>'company_name', NEW.email), NEW.id)
    RETURNING id INTO v_company_id;

    SELECT id INTO v_trial_plan_id FROM public.plans WHERE slug = 'trial' LIMIT 1;
    IF v_trial_plan_id IS NOT NULL THEN
      INSERT INTO public.company_subscriptions (company_id, plan_id, status, trial_ends_at, current_period_end)
      VALUES (v_company_id, v_trial_plan_id, 'trial', now() + interval '14 days', now() + interval '14 days');
    END IF;
  END IF;

  INSERT INTO public.profiles (user_id, full_name, has_logged_in, must_change_password, company_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    false,
    false,
    v_company_id
  );

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role);

  RETURN NEW;
END;
$$;

-- (Re)cria o trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 7. RLS DAS NOVAS TABELAS
-- ============================================================
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_subscriptions ENABLE ROW LEVEL SECURITY;

-- Companies: usuário vê a sua, super admin vê tudo
CREATE POLICY "Users can view their company" ON public.companies
  FOR SELECT TO authenticated
  USING (public.is_super_admin() OR id = public.get_user_company_id());

CREATE POLICY "Super admin can manage companies" ON public.companies
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "Admin can update own company" ON public.companies
  FOR UPDATE TO authenticated
  USING (id = public.get_user_company_id() AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (id = public.get_user_company_id() AND public.has_role(auth.uid(), 'admin'));

-- Plans: leitura pública (autenticada), só super admin gerencia
CREATE POLICY "Anyone authenticated can view plans" ON public.plans
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admin manages plans" ON public.plans
  FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- Subscriptions: empresa vê a sua, super admin gerencia
CREATE POLICY "Users view own subscription" ON public.company_subscriptions
  FOR SELECT TO authenticated
  USING (public.is_super_admin() OR company_id = public.get_user_company_id());
CREATE POLICY "Super admin manages subscriptions" ON public.company_subscriptions
  FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- ============================================================
-- 8. ATUALIZAR RLS DAS TABELAS PRINCIPAIS PARA MULTI-TENANT
-- ============================================================

-- Helper macro: política unificada por company_id + super_admin override
-- Aplicado via DROP+CREATE em cada tabela

-- CONTACTS
DROP POLICY IF EXISTS "Authenticated users can access all contacts" ON public.contacts;
CREATE POLICY "Tenant isolation contacts" ON public.contacts
  FOR ALL TO authenticated
  USING (public.is_super_admin() OR company_id = public.get_user_company_id())
  WITH CHECK (public.is_super_admin() OR company_id = public.get_user_company_id());

-- CONVERSATIONS
DROP POLICY IF EXISTS "Authenticated users can access all conversations" ON public.conversations;
CREATE POLICY "Tenant isolation conversations" ON public.conversations
  FOR ALL TO authenticated
  USING (public.is_super_admin() OR company_id = public.get_user_company_id())
  WITH CHECK (public.is_super_admin() OR company_id = public.get_user_company_id());

-- MESSAGES
DROP POLICY IF EXISTS "Authenticated users can access all messages" ON public.messages;
CREATE POLICY "Tenant isolation messages" ON public.messages
  FOR ALL TO authenticated
  USING (public.is_super_admin() OR company_id = public.get_user_company_id())
  WITH CHECK (public.is_super_admin() OR company_id = public.get_user_company_id());

-- DEALS
DROP POLICY IF EXISTS "Authenticated users can access all deals" ON public.deals;
CREATE POLICY "Tenant isolation deals" ON public.deals
  FOR ALL TO authenticated
  USING (public.is_super_admin() OR company_id = public.get_user_company_id())
  WITH CHECK (public.is_super_admin() OR company_id = public.get_user_company_id());

-- APPOINTMENTS
DROP POLICY IF EXISTS "Authenticated users can access all appointments" ON public.appointments;
CREATE POLICY "Tenant isolation appointments" ON public.appointments
  FOR ALL TO authenticated
  USING (public.is_super_admin() OR company_id = public.get_user_company_id())
  WITH CHECK (public.is_super_admin() OR company_id = public.get_user_company_id());

-- BROADCAST CAMPAIGNS
DROP POLICY IF EXISTS "Users can select own campaigns" ON public.broadcast_campaigns;
DROP POLICY IF EXISTS "Users can insert own campaigns" ON public.broadcast_campaigns;
DROP POLICY IF EXISTS "Users can update own campaigns" ON public.broadcast_campaigns;
DROP POLICY IF EXISTS "Users can delete own campaigns" ON public.broadcast_campaigns;
CREATE POLICY "Tenant isolation campaigns" ON public.broadcast_campaigns
  FOR ALL TO authenticated
  USING (public.is_super_admin() OR company_id = public.get_user_company_id())
  WITH CHECK (public.is_super_admin() OR company_id = public.get_user_company_id());

-- KNOWLEDGE FILES
DROP POLICY IF EXISTS "Authenticated users can manage knowledge_files" ON public.knowledge_files;
CREATE POLICY "Tenant isolation knowledge_files" ON public.knowledge_files
  FOR ALL TO authenticated
  USING (public.is_super_admin() OR company_id = public.get_user_company_id())
  WITH CHECK (public.is_super_admin() OR company_id = public.get_user_company_id());

-- WHATSAPP INSTANCES
DROP POLICY IF EXISTS "Authenticated users can read whatsapp_instances" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "Authenticated users can update whatsapp_instances" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "Admins can manage all whatsapp_instances" ON public.whatsapp_instances;
CREATE POLICY "Tenant isolation whatsapp_instances" ON public.whatsapp_instances
  FOR ALL TO authenticated
  USING (public.is_super_admin() OR company_id = public.get_user_company_id())
  WITH CHECK (public.is_super_admin() OR company_id = public.get_user_company_id());

-- TEAM MEMBERS
DROP POLICY IF EXISTS "Admins can modify team_members" ON public.team_members;
DROP POLICY IF EXISTS "Authenticated can read team_members" ON public.team_members;
CREATE POLICY "Tenant read team_members" ON public.team_members
  FOR SELECT TO authenticated
  USING (public.is_super_admin() OR company_id = public.get_user_company_id());
CREATE POLICY "Admin manages team_members in company" ON public.team_members
  FOR ALL TO authenticated
  USING (public.is_super_admin() OR (company_id = public.get_user_company_id() AND public.has_role(auth.uid(), 'admin')))
  WITH CHECK (public.is_super_admin() OR (company_id = public.get_user_company_id() AND public.has_role(auth.uid(), 'admin')));

-- TEAMS
DROP POLICY IF EXISTS "Admins can modify teams" ON public.teams;
DROP POLICY IF EXISTS "Authenticated can read teams" ON public.teams;
CREATE POLICY "Tenant read teams" ON public.teams
  FOR SELECT TO authenticated
  USING (public.is_super_admin() OR company_id = public.get_user_company_id());
CREATE POLICY "Admin manages teams in company" ON public.teams
  FOR ALL TO authenticated
  USING (public.is_super_admin() OR (company_id = public.get_user_company_id() AND public.has_role(auth.uid(), 'admin')))
  WITH CHECK (public.is_super_admin() OR (company_id = public.get_user_company_id() AND public.has_role(auth.uid(), 'admin')));

-- TEAM FUNCTIONS
DROP POLICY IF EXISTS "Admins can modify team_functions" ON public.team_functions;
DROP POLICY IF EXISTS "Authenticated can read team_functions" ON public.team_functions;
CREATE POLICY "Tenant read team_functions" ON public.team_functions
  FOR SELECT TO authenticated
  USING (public.is_super_admin() OR company_id = public.get_user_company_id());
CREATE POLICY "Admin manages team_functions" ON public.team_functions
  FOR ALL TO authenticated
  USING (public.is_super_admin() OR (company_id = public.get_user_company_id() AND public.has_role(auth.uid(), 'admin')))
  WITH CHECK (public.is_super_admin() OR (company_id = public.get_user_company_id() AND public.has_role(auth.uid(), 'admin')));

-- TAG DEFINITIONS
DROP POLICY IF EXISTS "Admins can modify tag_definitions" ON public.tag_definitions;
DROP POLICY IF EXISTS "Authenticated can read tag_definitions" ON public.tag_definitions;
CREATE POLICY "Tenant read tag_definitions" ON public.tag_definitions
  FOR SELECT TO authenticated
  USING (public.is_super_admin() OR company_id = public.get_user_company_id());
CREATE POLICY "Admin manages tag_definitions" ON public.tag_definitions
  FOR ALL TO authenticated
  USING (public.is_super_admin() OR (company_id = public.get_user_company_id() AND public.has_role(auth.uid(), 'admin')))
  WITH CHECK (public.is_super_admin() OR (company_id = public.get_user_company_id() AND public.has_role(auth.uid(), 'admin')));

-- PIPELINE STAGES
DROP POLICY IF EXISTS "Admins can modify pipeline_stages" ON public.pipeline_stages;
DROP POLICY IF EXISTS "Authenticated can read pipeline_stages" ON public.pipeline_stages;
CREATE POLICY "Tenant read pipeline_stages" ON public.pipeline_stages
  FOR SELECT TO authenticated
  USING (public.is_super_admin() OR company_id = public.get_user_company_id());
CREATE POLICY "Admin manages pipeline_stages" ON public.pipeline_stages
  FOR ALL TO authenticated
  USING (public.is_super_admin() OR (company_id = public.get_user_company_id() AND public.has_role(auth.uid(), 'admin')))
  WITH CHECK (public.is_super_admin() OR (company_id = public.get_user_company_id() AND public.has_role(auth.uid(), 'admin')));

-- NINA SETTINGS
DROP POLICY IF EXISTS "Admins can modify nina_settings" ON public.nina_settings;
DROP POLICY IF EXISTS "Authenticated can read nina_settings" ON public.nina_settings;
CREATE POLICY "Tenant read nina_settings" ON public.nina_settings
  FOR SELECT TO authenticated
  USING (public.is_super_admin() OR company_id = public.get_user_company_id());
CREATE POLICY "Admin manages nina_settings" ON public.nina_settings
  FOR ALL TO authenticated
  USING (public.is_super_admin() OR (company_id = public.get_user_company_id() AND public.has_role(auth.uid(), 'admin')))
  WITH CHECK (public.is_super_admin() OR (company_id = public.get_user_company_id() AND public.has_role(auth.uid(), 'admin')));

-- DESIGN SETTINGS
DROP POLICY IF EXISTS "Admins can modify design_settings" ON public.design_settings;
DROP POLICY IF EXISTS "Authenticated can read design_settings" ON public.design_settings;
CREATE POLICY "Tenant read design_settings" ON public.design_settings
  FOR SELECT TO authenticated
  USING (public.is_super_admin() OR company_id = public.get_user_company_id());
CREATE POLICY "Admin manages design_settings" ON public.design_settings
  FOR ALL TO authenticated
  USING (public.is_super_admin() OR (company_id = public.get_user_company_id() AND public.has_role(auth.uid(), 'admin')))
  WITH CHECK (public.is_super_admin() OR (company_id = public.get_user_company_id() AND public.has_role(auth.uid(), 'admin')));

-- ============================================================
-- 9. PROFILES: super admin enxerga todos; usuários só o próprio.
--    Deletar usuários só super admin (via auth.users, mas profiles não permite delete).
-- ============================================================
CREATE POLICY "Super admin views all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.is_super_admin() OR auth.uid() = user_id OR company_id = public.get_user_company_id());

CREATE POLICY "Super admin updates profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- ============================================================
-- 10. USER ROLES: só super admin pode dar/tirar roles de outros
-- ============================================================
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
CREATE POLICY "Super admin manages all roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- ============================================================
-- 11. TRIGGERS DE updated_at NAS NOVAS TABELAS
-- ============================================================
CREATE TRIGGER trg_companies_updated BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_plans_updated BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_subs_updated BEFORE UPDATE ON public.company_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
