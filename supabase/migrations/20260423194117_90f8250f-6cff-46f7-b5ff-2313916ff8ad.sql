-- 1. Função para validar limite de instâncias WhatsApp
CREATE OR REPLACE FUNCTION public.check_company_can_add_whatsapp_instance(_company_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_limit INTEGER;
  v_current BIGINT;
BEGIN
  SELECT max_whatsapp_instances, current_instances INTO v_limit, v_current
  FROM public.get_company_limits(_company_id);
  
  IF v_limit IS NULL THEN RETURN TRUE; END IF;
  RETURN v_current < v_limit;
END;
$$;

-- 2. Atualizar handle_new_user para suportar invited_role no metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_count INTEGER;
  v_role public.app_role;
  v_company_id UUID;
  v_invited_company_id UUID;
  v_invited_role TEXT;
  v_trial_plan_id UUID;
BEGIN
  SELECT COUNT(*) INTO v_user_count FROM public.profiles;

  v_invited_company_id := NULLIF(NEW.raw_user_meta_data->>'company_id', '')::UUID;
  v_invited_role := NULLIF(NEW.raw_user_meta_data->>'invited_role', '');

  IF v_user_count = 0 THEN
    v_role := 'super_admin';
    INSERT INTO public.companies (name, owner_user_id)
    VALUES (COALESCE(NEW.raw_user_meta_data->>'company_name', 'Minha Empresa'), NEW.id)
    RETURNING id INTO v_company_id;
  ELSIF v_invited_company_id IS NOT NULL THEN
    -- Convidado para empresa existente: usa invited_role se fornecido (admin/user)
    v_company_id := v_invited_company_id;
    IF v_invited_role IN ('admin', 'user') THEN
      v_role := v_invited_role::public.app_role;
    ELSE
      v_role := 'user';
    END IF;
    -- Se vira admin e a empresa não tem owner, atribui
    IF v_role = 'admin' THEN
      UPDATE public.companies
      SET owner_user_id = NEW.id
      WHERE id = v_company_id AND owner_user_id IS NULL;
    END IF;
  ELSE
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