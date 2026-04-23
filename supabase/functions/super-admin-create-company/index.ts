import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAdmin = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Verifica que o solicitante é super_admin
    const userClient = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: roleRow } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'super_admin')
      .maybeSingle()

    if (!roleRow) {
      return new Response(JSON.stringify({ error: 'Apenas super admin pode criar empresas' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const {
      company_name,
      slug,
      admin_email,
      admin_full_name,
      plan_id,
      trial_days = 14,
      status = 'active',
      temp_password, // NOVO: senha temporária opcional
    } = await req.json()

    if (!company_name || !admin_email || !admin_full_name) {
      return new Response(JSON.stringify({ error: 'company_name, admin_email e admin_full_name são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const useTempPassword = typeof temp_password === 'string' && temp_password.trim().length >= 6

    // 1) Cria a empresa
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .insert({
        name: company_name,
        slug: slug || null,
        status: 'active',
      })
      .select()
      .single()

    if (companyError) {
      console.error('Erro ao criar empresa:', companyError)
      return new Response(JSON.stringify({ error: companyError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2) Cria assinatura (se plano informado)
    if (plan_id) {
      const now = new Date()
      const trialEnd = status === 'trial'
        ? new Date(now.getTime() + (trial_days || 14) * 86400000).toISOString()
        : null
      const periodEnd = new Date(now.getTime() + 30 * 86400000).toISOString()

      const { error: subError } = await supabaseAdmin.from('company_subscriptions').insert({
        company_id: company.id,
        plan_id,
        status,
        trial_ends_at: trialEnd,
        current_period_start: now.toISOString(),
        current_period_end: periodEnd,
      })
      if (subError) console.error('Erro ao criar subscription:', subError)
    }

    const siteUrl = req.headers.get('origin') || req.headers.get('referer')?.replace(/\/$/, '') || ''
    let inviteLink: string | null = null
    let invitedUserId: string | null = null
    let createdWithPassword = false

    // 3a) MODO SENHA TEMPORÁRIA: cria usuário diretamente com senha + auto confirma email
    if (useTempPassword) {
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: admin_email,
        password: temp_password.trim(),
        email_confirm: true,
        user_metadata: {
          full_name: admin_full_name,
          company_id: company.id,
          invited_role: 'admin',
        },
      })

      if (createErr) {
        // Se usuário já existe, atualiza senha
        if (createErr.code === 'email_exists' || createErr.status === 422) {
          const { data: list } = await supabaseAdmin.auth.admin.listUsers()
          const existing = list?.users.find((u) => u.email?.toLowerCase() === admin_email.toLowerCase())
          if (existing) {
            invitedUserId = existing.id
            await supabaseAdmin.auth.admin.updateUserById(existing.id, {
              password: temp_password.trim(),
              email_confirm: true,
            })
            createdWithPassword = true
          } else {
            return new Response(JSON.stringify({
              error: `Empresa criada mas falha ao criar usuário: ${createErr.message}`,
              company_id: company.id,
            }), { status: 207, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
          }
        } else {
          console.error('Erro ao criar usuário com senha:', createErr)
          return new Response(JSON.stringify({
            error: `Empresa criada mas falha ao criar usuário: ${createErr.message}`,
            company_id: company.id,
          }), { status: 207, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
      } else {
        invitedUserId = created?.user?.id ?? null
        createdWithPassword = true
      }

      if (invitedUserId) {
        await supabaseAdmin.from('profiles').upsert(
          {
            user_id: invitedUserId,
            full_name: admin_full_name,
            company_id: company.id,
            must_change_password: true, // força troca no 1º login
          },
          { onConflict: 'user_id' }
        )
        await supabaseAdmin.from('user_roles').upsert(
          { user_id: invitedUserId, role: 'admin' },
          { onConflict: 'user_id,role', ignoreDuplicates: true }
        )
        await supabaseAdmin.from('companies')
          .update({ owner_user_id: invitedUserId })
          .eq('id', company.id)
          .is('owner_user_id', null)
      }

      return new Response(JSON.stringify({
        success: true,
        company_id: company.id,
        user_id: invitedUserId,
        created_with_password: createdWithPassword,
        login_url: `${siteUrl}/auth`,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3b) MODO INVITE (link mágico)
    const { data: newInvite, error: inviteError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'invite',
      email: admin_email,
      options: {
        data: {
          full_name: admin_full_name,
          company_id: company.id,
          invited_role: 'admin',
        },
        redirectTo: `${siteUrl}/set-password`,
      },
    })

    if (inviteError && (inviteError.code === 'email_exists' || inviteError.status === 422)) {
      const { data: magic } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: admin_email,
        options: { redirectTo: `${siteUrl}/set-password` },
      })
      inviteLink = magic?.properties?.action_link ?? null
      invitedUserId = magic?.user?.id ?? null

      if (invitedUserId) {
        await supabaseAdmin.from('profiles').upsert(
          { user_id: invitedUserId, full_name: admin_full_name, company_id: company.id, must_change_password: true },
          { onConflict: 'user_id' }
        )
        await supabaseAdmin.from('user_roles').upsert(
          { user_id: invitedUserId, role: 'admin' },
          { onConflict: 'user_id,role', ignoreDuplicates: true }
        )
        await supabaseAdmin.from('companies')
          .update({ owner_user_id: invitedUserId })
          .eq('id', company.id)
          .is('owner_user_id', null)
      }
    } else if (inviteError) {
      console.error('Erro ao convidar admin:', inviteError)
      return new Response(JSON.stringify({
        error: `Empresa criada mas falha ao convidar admin: ${inviteError.message}`,
        company_id: company.id,
      }), {
        status: 207,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    } else {
      inviteLink = newInvite?.properties?.action_link ?? null
      invitedUserId = newInvite?.user?.id ?? null
    }

    return new Response(JSON.stringify({
      success: true,
      company_id: company.id,
      invite_link: inviteLink,
      user_id: invitedUserId,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Erro inesperado:', error)
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Erro interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
