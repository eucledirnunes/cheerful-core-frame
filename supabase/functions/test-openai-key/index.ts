import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { api_key } = await req.json();
    if (!api_key || typeof api_key !== 'string' || api_key.length < 20) {
      return new Response(JSON.stringify({ ok: false, error: 'Chave inválida' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Lightweight validation: list models endpoint
    const resp = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${api_key}` }
    });

    if (!resp.ok) {
      const txt = await resp.text();
      return new Response(JSON.stringify({
        ok: false,
        status: resp.status,
        error: resp.status === 401 ? 'Chave inválida ou expirada' : `OpenAI retornou ${resp.status}`,
        details: txt.slice(0, 200)
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const data = await resp.json();
    const hasWhisper = (data?.data || []).some((m: any) => m.id === 'whisper-1');

    return new Response(JSON.stringify({
      ok: true,
      message: hasWhisper ? 'Chave válida — Whisper disponível ✓' : 'Chave válida (mas Whisper não listado)',
      whisper_available: hasWhisper
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : 'Erro' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
