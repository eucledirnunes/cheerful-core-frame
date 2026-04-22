import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roleData } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', userData.user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Admin role required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Schema completo do projeto, extraído via pg_dump-like queries no information_schema/pg_catalog.
    // Como Supabase REST não expõe pg_dump, montamos um SQL "starter" baseado nos metadados disponíveis.
    const sections: string[] = [];

    sections.push(`-- =====================================================
-- SCHEMA EXPORT - Lovable Cloud
-- Generated: ${new Date().toISOString()}
-- =====================================================
-- Para migrar para outro Supabase:
-- 1. Crie um projeto Supabase vazio
-- 2. Vá em SQL Editor
-- 3. Cole TODO este arquivo e execute
-- =====================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "pg_net";

`);

    // Buscar enums (types)
    const { data: enumsRaw } = await admin.rpc('pg_typeof' as any, {}).then(
      () => ({ data: null }),
      () => ({ data: null })
    );

    // Como não podemos rodar SQL arbitrário via REST, usamos uma estratégia:
    // ler todas as migrations existentes do projeto via storage interno NÃO é possível.
    // Em vez disso, geramos um SQL declarativo a partir das tabelas conhecidas via Supabase REST schema introspection.
    
    // Buscar definição de tabelas via information_schema usando uma função SQL pré-existente, ou listar tabelas:
    const { data: tablesData, error: tablesErr } = await admin
      .from('information_schema.tables' as any)
      .select('*');

    // Fallback: usamos a lista hardcoded de tabelas conhecidas e geramos CREATE TABLE com base no schema da resposta
    const KNOWN_TABLES = [
      'profiles', 'user_roles', 'contacts', 'conversations', 'messages',
      'deals', 'deal_activities', 'pipeline_stages', 'appointments',
      'teams', 'team_members', 'team_functions', 'round_robin_state',
      'tag_definitions', 'broadcast_campaigns', 'broadcast_recipients',
      'whatsapp_instances', 'whatsapp_instance_secrets',
      'nina_settings', 'design_settings', 'system_settings',
      'knowledge_files', 'knowledge_chunks', 'conversation_states',
      'message_processing_queue', 'message_grouping_queue',
      'nina_processing_queue', 'send_queue',
    ];

    sections.push(`-- =====================================================
-- ENUMS / CUSTOM TYPES
-- =====================================================
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.conversation_status AS ENUM ('nina', 'human', 'closed', 'pending');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.message_status AS ENUM ('sent', 'delivered', 'read', 'failed', 'pending');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.message_type AS ENUM ('text', 'image', 'audio', 'video', 'document', 'location', 'contact');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.from_type AS ENUM ('user', 'contact', 'nina', 'system');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.queue_status AS ENUM ('pending', 'processing', 'completed', 'failed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.appointment_type AS ENUM ('meeting', 'call', 'demo', 'follow_up');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.member_status AS ENUM ('active', 'invited', 'inactive', 'suspended');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.member_role AS ENUM ('admin', 'manager', 'agent', 'viewer');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.whatsapp_provider_type AS ENUM ('official', 'evolution');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.whatsapp_instance_status AS ENUM ('connected', 'disconnected', 'connecting', 'error');
EXCEPTION WHEN duplicate_object THEN null; END $$;

`);

    // Para gerar CREATE TABLE preciso usar uma RPC SQL. Como não temos, vamos
    // pegar via REST a 1ª linha de cada tabela e inferir os nomes de coluna.
    // Isso já dá ao usuário um esqueleto utilizável.
    sections.push(`-- =====================================================
-- TABLES (schema reconstruído a partir de introspecção)
-- IMPORTANTE: este SQL é um esqueleto. Para um dump 100% fiel,
-- use pg_dump diretamente no banco original. Edite tipos conforme necessário.
-- =====================================================

`);

    for (const tableName of KNOWN_TABLES) {
      try {
        const { data: sample, error } = await admin
          .from(tableName)
          .select('*')
          .limit(1);
        if (error) continue;

        const cols = sample && sample.length > 0 ? Object.keys(sample[0]) : [];
        if (cols.length === 0) {
          sections.push(`-- Table: ${tableName} (vazia, definir colunas manualmente)\n-- CREATE TABLE public.${tableName} (...);\n\n`);
          continue;
        }

        const colDefs = cols.map((c) => {
          const val = sample![0][c];
          let type = 'text';
          if (c === 'id') type = 'uuid PRIMARY KEY DEFAULT gen_random_uuid()';
          else if (c.endsWith('_id')) type = 'uuid';
          else if (c.endsWith('_at') || c === 'created_at' || c === 'updated_at') type = 'timestamptz DEFAULT now()';
          else if (typeof val === 'boolean') type = 'boolean DEFAULT false';
          else if (typeof val === 'number') type = Number.isInteger(val) ? 'integer' : 'numeric';
          else if (Array.isArray(val)) type = 'text[]';
          else if (val !== null && typeof val === 'object') type = "jsonb DEFAULT '{}'::jsonb";
          return `  ${c} ${type}`;
        });

        sections.push(`CREATE TABLE IF NOT EXISTS public.${tableName} (\n${colDefs.join(',\n')}\n);\n\nALTER TABLE public.${tableName} ENABLE ROW LEVEL SECURITY;\n\n`);
      } catch (e) {
        sections.push(`-- Falhou introspecção de ${tableName}: ${(e as Error).message}\n\n`);
      }
    }

    sections.push(`-- =====================================================
-- FUNCTIONS (security definer essenciais)
-- =====================================================

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE user_count INTEGER; user_role public.app_role;
BEGIN
  SELECT COUNT(*) INTO user_count FROM public.profiles;
  IF user_count = 0 THEN user_role := 'admin'; ELSE user_role := 'user'; END IF;
  INSERT INTO public.profiles (user_id, full_name, has_logged_in, must_change_password)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), false, false);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, user_role);
  RETURN NEW;
END; $$;

-- Trigger para auto-criar profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- RLS POLICIES (básicas - revise conforme sua necessidade)
-- =====================================================

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own role" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Single-tenant: todos autenticados acessam tudo
CREATE POLICY "Authenticated full access" ON public.contacts FOR ALL TO authenticated
  USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated full access" ON public.conversations FOR ALL TO authenticated
  USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated full access" ON public.messages FOR ALL TO authenticated
  USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated full access" ON public.deals FOR ALL TO authenticated
  USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated full access" ON public.appointments FOR ALL TO authenticated
  USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- =====================================================
-- FIM DO SCHEMA
-- =====================================================
`);

    return new Response(sections.join(''), {
      headers: { ...corsHeaders, 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (error: any) {
    console.error('Schema export error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
