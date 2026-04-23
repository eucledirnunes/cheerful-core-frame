
-- Função auto-fill de company_id baseado no usuário autenticado
CREATE OR REPLACE FUNCTION public.set_company_id_from_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.company_id IS NULL THEN
    NEW.company_id := public.get_user_company_id(auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

-- Função especial para mensagens: herda company_id da conversation
CREATE OR REPLACE FUNCTION public.set_message_company_id()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.company_id IS NULL THEN
    SELECT company_id INTO NEW.company_id FROM public.conversations WHERE id = NEW.conversation_id;
  END IF;
  IF NEW.company_id IS NULL THEN
    NEW.company_id := public.get_user_company_id(auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

-- Função especial para conversations: herda company_id do contato
CREATE OR REPLACE FUNCTION public.set_conversation_company_id()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.company_id IS NULL AND NEW.contact_id IS NOT NULL THEN
    SELECT company_id INTO NEW.company_id FROM public.contacts WHERE id = NEW.contact_id;
  END IF;
  IF NEW.company_id IS NULL THEN
    NEW.company_id := public.get_user_company_id(auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

-- Anexar triggers
CREATE TRIGGER trg_contacts_set_company BEFORE INSERT ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();
CREATE TRIGGER trg_conversations_set_company BEFORE INSERT ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.set_conversation_company_id();
CREATE TRIGGER trg_messages_set_company BEFORE INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.set_message_company_id();
CREATE TRIGGER trg_deals_set_company BEFORE INSERT ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();
CREATE TRIGGER trg_appointments_set_company BEFORE INSERT ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();
CREATE TRIGGER trg_campaigns_set_company BEFORE INSERT ON public.broadcast_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();
CREATE TRIGGER trg_kfiles_set_company BEFORE INSERT ON public.knowledge_files
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();
CREATE TRIGGER trg_wa_set_company BEFORE INSERT ON public.whatsapp_instances
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();
CREATE TRIGGER trg_tm_set_company BEFORE INSERT ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();
CREATE TRIGGER trg_teams_set_company BEFORE INSERT ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();
CREATE TRIGGER trg_tf_set_company BEFORE INSERT ON public.team_functions
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();
CREATE TRIGGER trg_tags_set_company BEFORE INSERT ON public.tag_definitions
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();
CREATE TRIGGER trg_pipeline_set_company BEFORE INSERT ON public.pipeline_stages
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();
CREATE TRIGGER trg_nina_set_company BEFORE INSERT ON public.nina_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();
CREATE TRIGGER trg_design_set_company BEFORE INSERT ON public.design_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();
