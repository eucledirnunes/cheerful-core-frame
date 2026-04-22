import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Tabelas que podem ser exportadas como CSV
const EXPORTABLE_TABLES = [
  'profiles',
  'user_roles',
  'contacts',
  'conversations',
  'messages',
  'deals',
  'deal_activities',
  'pipeline_stages',
  'appointments',
  'teams',
  'team_members',
  'team_functions',
  'tag_definitions',
  'broadcast_campaigns',
  'broadcast_recipients',
  'whatsapp_instances',
  'nina_settings',
  'design_settings',
  'system_settings',
  'knowledge_files',
  'conversation_states',
];

function toCSV(rows: any[]): string {
  if (!rows || rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (val: any) => {
    if (val === null || val === undefined) return '';
    const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(','));
  }
  return lines.join('\n');
}

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

    // Verifica usuário e role admin
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

    const { table, action } = await req.json();

    // Listar tabelas exportáveis
    if (action === 'list') {
      return new Response(JSON.stringify({ tables: EXPORTABLE_TABLES }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Export usuários (auth.users)
    if (table === '__users__') {
      const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
      if (error) throw error;
      const rows = data.users.map((u) => ({
        id: u.id,
        email: u.email,
        phone: u.phone,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        email_confirmed_at: u.email_confirmed_at,
        full_name: u.user_metadata?.full_name || '',
      }));
      return new Response(toCSV(rows), {
        headers: { ...corsHeaders, 'Content-Type': 'text/csv' },
      });
    }

    // Export storage (lista arquivos de todos os buckets)
    if (table === '__storage__') {
      const { data: buckets } = await admin.storage.listBuckets();
      const allFiles: any[] = [];
      for (const b of buckets || []) {
        const { data: files } = await admin.storage.from(b.id).list('', { limit: 1000 });
        for (const f of files || []) {
          allFiles.push({
            bucket: b.id,
            name: f.name,
            size: f.metadata?.size,
            mimetype: f.metadata?.mimetype,
            created_at: f.created_at,
            updated_at: f.updated_at,
            public_url: b.public
              ? `${supabaseUrl}/storage/v1/object/public/${b.id}/${f.name}`
              : null,
          });
        }
      }
      return new Response(toCSV(allFiles), {
        headers: { ...corsHeaders, 'Content-Type': 'text/csv' },
      });
    }

    // Export tabela específica
    if (!EXPORTABLE_TABLES.includes(table)) {
      return new Response(JSON.stringify({ error: 'Table not allowed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data, error } = await admin.from(table).select('*').limit(50000);
    if (error) throw error;

    return new Response(toCSV(data || []), {
      headers: { ...corsHeaders, 'Content-Type': 'text/csv' },
    });
  } catch (error: any) {
    console.error('Export error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
