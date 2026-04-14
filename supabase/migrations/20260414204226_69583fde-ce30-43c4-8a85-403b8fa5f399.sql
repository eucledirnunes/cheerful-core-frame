
-- Function to handle new user registration (create profile + role)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count INTEGER;
  user_role public.app_role;
BEGIN
  -- Count existing users to determine if this is the first user
  SELECT COUNT(*) INTO user_count FROM public.profiles;
  
  -- First user gets admin role, others get user role
  IF user_count = 0 THEN
    user_role := 'admin';
  ELSE
    user_role := 'user';
  END IF;

  -- Create profile
  INSERT INTO public.profiles (user_id, full_name, has_logged_in, must_change_password)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    false,
    false
  );

  -- Assign role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role);

  RETURN NEW;
END;
$$;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to auto-create deal when contact is created
CREATE OR REPLACE FUNCTION public.auto_create_deal_on_contact()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  first_stage_id UUID;
BEGIN
  SELECT id INTO first_stage_id
  FROM public.pipeline_stages
  WHERE is_active = true
  ORDER BY position ASC
  LIMIT 1;

  IF first_stage_id IS NOT NULL THEN
    INSERT INTO public.deals (title, contact_id, stage_id, user_id)
    VALUES (
      COALESCE(NEW.name, NEW.phone_number),
      NEW.id,
      first_stage_id,
      NEW.user_id
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_create_deal_on_contact ON public.contacts;
CREATE TRIGGER auto_create_deal_on_contact
  AFTER INSERT ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.auto_create_deal_on_contact();

-- Function to update conversation last message timestamp
CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.conversations
  SET last_message_at = NOW(), updated_at = NOW()
  WHERE id = NEW.conversation_id;

  UPDATE public.contacts
  SET last_activity = NOW(), updated_at = NOW()
  WHERE id = (SELECT contact_id FROM public.conversations WHERE id = NEW.conversation_id);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_conversation_last_message_trigger ON public.messages;
CREATE TRIGGER update_conversation_last_message_trigger
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.update_conversation_last_message();

-- Function to ensure single default WhatsApp instance
CREATE OR REPLACE FUNCTION public.ensure_single_default_instance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE public.whatsapp_instances
    SET is_default = false
    WHERE id != NEW.id AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ensure_single_default ON public.whatsapp_instances;
CREATE TRIGGER ensure_single_default
  BEFORE INSERT OR UPDATE ON public.whatsapp_instances
  FOR EACH ROW EXECUTE FUNCTION public.ensure_single_default_instance();

-- Generic updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS update_contacts_updated_at ON public.contacts;
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_conversations_updated_at ON public.conversations;
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_conversation_states_updated_at ON public.conversation_states;
CREATE TRIGGER update_conversation_states_updated_at BEFORE UPDATE ON public.conversation_states FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_nina_processing_queue_updated_at ON public.nina_processing_queue;
CREATE TRIGGER update_nina_processing_queue_updated_at BEFORE UPDATE ON public.nina_processing_queue FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_message_processing_queue_updated_at ON public.message_processing_queue;
CREATE TRIGGER update_message_processing_queue_updated_at BEFORE UPDATE ON public.message_processing_queue FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_send_queue_updated_at ON public.send_queue;
CREATE TRIGGER update_send_queue_updated_at BEFORE UPDATE ON public.send_queue FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_nina_settings_updated_at ON public.nina_settings;
CREATE TRIGGER update_nina_settings_updated_at BEFORE UPDATE ON public.nina_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_tag_definitions_updated_at ON public.tag_definitions;
CREATE TRIGGER update_tag_definitions_updated_at BEFORE UPDATE ON public.tag_definitions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
