
-- 1. Adicionar coluna max_users na tabela plans
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS max_users INTEGER;

-- 2. Atualizar planos existentes com limites
UPDATE public.plans 
SET max_whatsapp_instances = 1, max_users = 2, max_contacts = 500, max_messages_per_month = 1000
WHERE slug = 'trial';

UPDATE public.plans 
SET max_whatsapp_instances = 5, max_users = 10, max_contacts = NULL, max_messages_per_month = NULL
WHERE slug = 'pro';

-- 3. Função para retornar os limites do plano ativo de uma empresa
CREATE OR REPLACE FUNCTION public.get_company_limits(_company_id uuid)
RETURNS TABLE (
  plan_id uuid,
  plan_name text,
  plan_slug text,
  status text,
  trial_ends_at timestamptz,
  max_users integer,
  max_whatsapp_instances integer,
  max_contacts integer,
  max_messages_per_month integer,
  current_users bigint,
  current_instances bigint,
  current_contacts bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id AS plan_id,
    p.name AS plan_name,
    p.slug AS plan_slug,
    cs.status,
    cs.trial_ends_at,
    p.max_users,
    p.max_whatsapp_instances,
    p.max_contacts,
    p.max_messages_per_month,
    (SELECT COUNT(*) FROM public.profiles WHERE company_id = _company_id) AS current_users,
    (SELECT COUNT(*) FROM public.whatsapp_instances WHERE company_id = _company_id AND is_active = true) AS current_instances,
    (SELECT COUNT(*) FROM public.contacts WHERE company_id = _company_id) AS current_contacts
  FROM public.company_subscriptions cs
  JOIN public.plans p ON p.id = cs.plan_id
  WHERE cs.company_id = _company_id
  ORDER BY cs.created_at DESC
  LIMIT 1;
$$;

-- 4. Função booleana de validação de limite de usuários
CREATE OR REPLACE FUNCTION public.check_company_can_add_user(_company_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit INTEGER;
  v_current BIGINT;
BEGIN
  SELECT max_users, current_users INTO v_limit, v_current
  FROM public.get_company_limits(_company_id);
  
  -- Sem limite definido = ilimitado
  IF v_limit IS NULL THEN RETURN TRUE; END IF;
  RETURN v_current < v_limit;
END;
$$;
