import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2, Plus, Building2, Package, Users, Pencil, Trash2, ShieldAlert, KeyRound } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_monthly: number;
  is_trial: boolean;
  is_active: boolean;
  trial_days: number | null;
  max_users: number | null;
  max_whatsapp_instances: number | null;
  max_contacts: number | null;
  max_messages_per_month: number | null;
  display_order: number;
}

interface Company {
  id: string;
  name: string;
  slug: string | null;
  status: string;
  owner_user_id: string | null;
  created_at: string;
}

interface Subscription {
  id: string;
  company_id: string;
  plan_id: string;
  status: string;
  trial_ends_at: string | null;
  current_period_end: string | null;
  created_at: string;
}

const SuperAdmin: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSuper, setIsSuper] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subs, setSubs] = useState<Subscription[]>([]);

  // Dialog states
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [companyDialogOpen, setCompanyDialogOpen] = useState(false);
  const [subDialogOpen, setSubDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [resetCompany, setResetCompany] = useState<Company | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'super_admin')
      .maybeSingle()
      .then(({ data }) => {
        const ok = !!data;
        setIsSuper(ok);
        if (!ok) {
          toast.error('Acesso negado: apenas super admin');
          navigate('/dashboard', { replace: true });
        }
      });
  }, [user, navigate]);

  const loadAll = async () => {
    setLoading(true);
    const [{ data: c }, { data: p }, { data: s }] = await Promise.all([
      supabase.from('companies').select('*').order('created_at', { ascending: false }),
      supabase.from('plans').select('*').order('display_order', { ascending: true }),
      supabase.from('company_subscriptions').select('*').order('created_at', { ascending: false }),
    ]);
    setCompanies((c as Company[]) || []);
    setPlans((p as Plan[]) || []);
    setSubs((s as Subscription[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (isSuper) loadAll();
  }, [isSuper]);

  if (isSuper === null || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSuper) return null;

  const planMap = new Map(plans.map((p) => [p.id, p]));
  const subByCompany = new Map(subs.map((s) => [s.company_id, s]));

  return (
    <div className="h-full overflow-y-auto p-6 lg:p-10">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Super Admin</h1>
            <p className="text-muted-foreground text-sm">
              Gerenciamento de empresas, planos e assinaturas
            </p>
          </div>
        </header>

        <Tabs defaultValue="companies" className="space-y-6">
          <TabsList>
            <TabsTrigger value="companies"><Building2 className="w-4 h-4 mr-2" />Empresas</TabsTrigger>
            <TabsTrigger value="plans"><Package className="w-4 h-4 mr-2" />Planos</TabsTrigger>
            <TabsTrigger value="subs"><Users className="w-4 h-4 mr-2" />Assinaturas</TabsTrigger>
          </TabsList>

          {/* ============ COMPANIES TAB ============ */}
          <TabsContent value="companies">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Empresas ({companies.length})</CardTitle>
                  <CardDescription>Cadastro manual de novos clientes</CardDescription>
                </div>
                <Button onClick={() => { setEditingCompany(null); setCompanyDialogOpen(true); }}>
                  <Plus className="w-4 h-4 mr-2" />Nova Empresa
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Trial até</TableHead>
                      <TableHead>Criada em</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companies.map((c) => {
                      const sub = subByCompany.get(c.id);
                      const plan = sub ? planMap.get(sub.plan_id) : null;
                      return (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.name}</TableCell>
                          <TableCell>
                            {plan ? <Badge variant="secondary">{plan.name}</Badge> : <span className="text-muted-foreground text-sm">—</span>}
                          </TableCell>
                          <TableCell>
                            <Badge variant={c.status === 'active' ? 'default' : 'outline'}>{c.status}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {sub?.trial_ends_at ? new Date(sub.trial_ends_at).toLocaleDateString('pt-BR') : '—'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(c.created_at).toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="ghost" title="Resetar senha do admin" onClick={() => setResetCompany(c)}>
                              <KeyRound className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => { setEditingCompany(c); setCompanyDialogOpen(true); }}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {companies.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhuma empresa cadastrada</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ============ PLANS TAB ============ */}
          <TabsContent value="plans">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Planos ({plans.length})</CardTitle>
                  <CardDescription>Limites por instância, usuários, contatos e mensagens</CardDescription>
                </div>
                <Button onClick={() => { setEditingPlan(null); setPlanDialogOpen(true); }}>
                  <Plus className="w-4 h-4 mr-2" />Novo Plano
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead>Preço/mês</TableHead>
                      <TableHead className="text-center">Usuários</TableHead>
                      <TableHead className="text-center">Instâncias</TableHead>
                      <TableHead className="text-center">Contatos</TableHead>
                      <TableHead className="text-center">Msgs/mês</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plans.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">
                          {p.name}
                          {p.is_trial && <Badge variant="outline" className="ml-2 text-xs">Trial</Badge>}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground font-mono">{p.slug}</TableCell>
                        <TableCell>R$ {Number(p.price_monthly).toFixed(2)}</TableCell>
                        <TableCell className="text-center">{p.max_users ?? '∞'}</TableCell>
                        <TableCell className="text-center">{p.max_whatsapp_instances ?? '∞'}</TableCell>
                        <TableCell className="text-center">{p.max_contacts ?? '∞'}</TableCell>
                        <TableCell className="text-center">{p.max_messages_per_month ?? '∞'}</TableCell>
                        <TableCell>
                          <Badge variant={p.is_active ? 'default' : 'outline'}>{p.is_active ? 'Ativo' : 'Inativo'}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="ghost" onClick={() => { setEditingPlan(p); setPlanDialogOpen(true); }}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ============ SUBSCRIPTIONS TAB ============ */}
          <TabsContent value="subs">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Assinaturas ({subs.length})</CardTitle>
                  <CardDescription>Vincule empresas a planos e gerencie status</CardDescription>
                </div>
                <Button onClick={() => setSubDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />Nova Assinatura
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empresa</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Trial até</TableHead>
                      <TableHead>Período até</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subs.map((s) => {
                      const company = companies.find((c) => c.id === s.company_id);
                      const plan = planMap.get(s.plan_id);
                      return (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{company?.name || '—'}</TableCell>
                          <TableCell><Badge variant="secondary">{plan?.name || '—'}</Badge></TableCell>
                          <TableCell><Badge>{s.status}</Badge></TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {s.trial_ends_at ? new Date(s.trial_ends_at).toLocaleDateString('pt-BR') : '—'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {s.current_period_end ? new Date(s.current_period_end).toLocaleDateString('pt-BR') : '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="ghost" onClick={async () => {
                              if (!confirm('Excluir esta assinatura?')) return;
                              const { error } = await supabase.from('company_subscriptions').delete().eq('id', s.id);
                              if (error) toast.error(error.message);
                              else { toast.success('Assinatura removida'); loadAll(); }
                            }}>
                              <Trash2 className="w-3.5 h-3.5 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <PlanDialog
        open={planDialogOpen}
        onOpenChange={setPlanDialogOpen}
        plan={editingPlan}
        onSaved={loadAll}
      />
      <CompanyDialog
        open={companyDialogOpen}
        onOpenChange={setCompanyDialogOpen}
        company={editingCompany}
        onSaved={loadAll}
      />
      <SubscriptionDialog
        open={subDialogOpen}
        onOpenChange={setSubDialogOpen}
        companies={companies}
        plans={plans}
        onSaved={loadAll}
      />
      <ResetPasswordDialog
        company={resetCompany}
        onOpenChange={(o) => { if (!o) setResetCompany(null); }}
      />
    </div>
  );
};

// =================== Plan Dialog ===================
const PlanDialog: React.FC<{
  open: boolean;
  onOpenChange: (b: boolean) => void;
  plan: Plan | null;
  onSaved: () => void;
}> = ({ open, onOpenChange, plan, onSaved }) => {
  const [form, setForm] = useState<Partial<Plan>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (plan) setForm(plan);
    else setForm({
      name: '', slug: '', description: '', price_monthly: 0, is_trial: false, is_active: true,
      trial_days: 0, max_users: 1, max_whatsapp_instances: 1, max_contacts: null, max_messages_per_month: null,
      display_order: 0,
    });
  }, [plan, open]);

  const save = async () => {
    if (!form.name || !form.slug) { toast.error('Nome e slug são obrigatórios'); return; }
    setSaving(true);
    const payload = {
      name: form.name,
      slug: form.slug,
      description: form.description || null,
      price_monthly: Number(form.price_monthly) || 0,
      is_trial: !!form.is_trial,
      is_active: !!form.is_active,
      trial_days: Number(form.trial_days) || 0,
      max_users: form.max_users === null || form.max_users === undefined ? null : Number(form.max_users),
      max_whatsapp_instances: form.max_whatsapp_instances === null ? null : Number(form.max_whatsapp_instances),
      max_contacts: form.max_contacts === null ? null : Number(form.max_contacts),
      max_messages_per_month: form.max_messages_per_month === null ? null : Number(form.max_messages_per_month),
      display_order: Number(form.display_order) || 0,
    };
    const { error } = plan
      ? await supabase.from('plans').update(payload).eq('id', plan.id)
      : await supabase.from('plans').insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(plan ? 'Plano atualizado' : 'Plano criado');
    onOpenChange(false);
    onSaved();
  };

  const numField = (key: keyof Plan, label: string, hint = 'vazio = ilimitado') => (
    <div>
      <Label>{label}</Label>
      <Input
        type="number"
        value={form[key] === null || form[key] === undefined ? '' : String(form[key])}
        onChange={(e) => setForm({ ...form, [key]: e.target.value === '' ? null : Number(e.target.value) })}
        placeholder={hint}
      />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{plan ? 'Editar Plano' : 'Novo Plano'}</DialogTitle>
          <DialogDescription>Defina limites e preço. Campos vazios = ilimitado.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          <div>
            <Label>Nome</Label>
            <Input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Slug</Label>
            <Input value={form.slug || ''} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })} />
          </div>
          <div className="col-span-2">
            <Label>Descrição</Label>
            <Textarea value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          </div>
          <div>
            <Label>Preço mensal (R$)</Label>
            <Input type="number" step="0.01" value={form.price_monthly ?? 0} onChange={(e) => setForm({ ...form, price_monthly: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Ordem de exibição</Label>
            <Input type="number" value={form.display_order ?? 0} onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) })} />
          </div>
          {numField('max_users', 'Máx. Usuários')}
          {numField('max_whatsapp_instances', 'Máx. Instâncias WhatsApp')}
          {numField('max_contacts', 'Máx. Contatos')}
          {numField('max_messages_per_month', 'Máx. Mensagens/mês')}
          <div>
            <Label>Dias de trial</Label>
            <Input type="number" value={form.trial_days ?? 0} onChange={(e) => setForm({ ...form, trial_days: Number(e.target.value) })} />
          </div>
          <div className="flex items-center gap-6 pt-6">
            <div className="flex items-center gap-2">
              <Switch checked={!!form.is_trial} onCheckedChange={(v) => setForm({ ...form, is_trial: v })} />
              <Label>É trial</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={!!form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <Label>Ativo</Label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// =================== Company Dialog ===================
const CompanyDialog: React.FC<{
  open: boolean;
  onOpenChange: (b: boolean) => void;
  company: Company | null;
  onSaved: () => void;
}> = ({ open, onOpenChange, company, onSaved }) => {
  const [form, setForm] = useState<Partial<Company>>({});
  const [adminEmail, setAdminEmail] = useState('');
  const [adminName, setAdminName] = useState('');
  const [planId, setPlanId] = useState<string>('');
  const [subStatus, setSubStatus] = useState<string>('active');
  const [trialDays, setTrialDays] = useState(14);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [saving, setSaving] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [accessMode, setAccessMode] = useState<'invite' | 'password'>('invite');
  const [tempPassword, setTempPassword] = useState('');
  const [createdLogin, setCreatedLogin] = useState<{ email: string; password: string; loginUrl: string } | null>(null);

  useEffect(() => {
    if (company) setForm(company);
    else setForm({ name: '', slug: '', status: 'active' });
    setAdminEmail(''); setAdminName(''); setPlanId(''); setSubStatus('active'); setTrialDays(14);
    setInviteLink(null); setAccessMode('invite'); setTempPassword(''); setCreatedLogin(null);
  }, [company, open]);

  useEffect(() => {
    if (!open || company) return;
    supabase.from('plans').select('*').eq('is_active', true).order('display_order')
      .then(({ data }) => {
        const list = (data as Plan[]) || [];
        setPlans(list);
        const trial = list.find((p) => p.is_trial);
        if (trial) { setPlanId(trial.id); setSubStatus('trial'); setTrialDays(trial.trial_days || 14); }
        else if (list[0]) setPlanId(list[0].id);
      });
  }, [open, company]);

  const save = async () => {
    if (!form.name) { toast.error('Nome é obrigatório'); return; }

    if (company) {
      // EDIT — apenas dados da empresa
      setSaving(true);
      const { error } = await supabase.from('companies').update({
        name: form.name, slug: form.slug || null, status: form.status || 'active',
      }).eq('id', company.id);
      setSaving(false);
      if (error) { toast.error(error.message); return; }
      toast.success('Empresa atualizada');
      onOpenChange(false);
      onSaved();
      return;
    }

    // CREATE — chama edge function que cria empresa + assinatura + convida admin
    if (!adminEmail.trim() || !adminName.trim()) {
      toast.error('Email e nome do admin são obrigatórios');
      return;
    }
    if (!planId) { toast.error('Selecione um plano'); return; }
    if (accessMode === 'password' && tempPassword.trim().length < 6) {
      toast.error('A senha temporária precisa ter no mínimo 6 caracteres');
      return;
    }

    setSaving(true);
    const { data, error } = await supabase.functions.invoke('super-admin-create-company', {
      body: {
        company_name: form.name,
        slug: form.slug || null,
        admin_email: adminEmail.trim(),
        admin_full_name: adminName.trim(),
        plan_id: planId,
        status: subStatus,
        trial_days: trialDays,
        temp_password: accessMode === 'password' ? tempPassword.trim() : undefined,
      },
    });
    setSaving(false);
    if (error || data?.error) {
      toast.error(data?.error || error?.message || 'Erro ao criar empresa');
      return;
    }
    toast.success(accessMode === 'password' ? 'Empresa criada com senha temporária' : 'Empresa criada e admin convidado');
    if (data?.created_with_password) {
      setCreatedLogin({
        email: adminEmail.trim(),
        password: tempPassword.trim(),
        loginUrl: data?.login_url || `${window.location.origin}/auth`,
      });
    } else if (data?.invite_link) {
      setInviteLink(data.invite_link);
    } else {
      onOpenChange(false);
    }
    onSaved();
  };

  const copyLink = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    toast.success('Link copiado');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{company ? 'Editar Empresa' : 'Nova Empresa'}</DialogTitle>
          <DialogDescription>
            {company
              ? 'Atualize os dados da empresa.'
              : 'Cadastre a empresa e convide o admin inicial. No primeiro acesso ele define a senha e poderá gerenciar usuários.'}
          </DialogDescription>
        </DialogHeader>

        {inviteLink ? (
          <div className="space-y-4 py-4">
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-sm font-medium mb-2">Link de acesso do admin</p>
              <p className="text-xs text-muted-foreground mb-3">
                Envie este link para <strong>{adminEmail}</strong>. Ele define a senha e entra como admin da empresa.
              </p>
              <div className="flex gap-2">
                <Input value={inviteLink} readOnly className="text-xs font-mono" />
                <Button onClick={copyLink} size="sm">Copiar</Button>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Concluir</Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <div className="space-y-4 py-4">
              <div>
                <Label>Nome da empresa *</Label>
                <Input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Acme Ltda" />
              </div>
              <div>
                <Label>Slug (opcional)</Label>
                <Input value={form.slug || ''} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="acme" />
              </div>

              {company ? (
                <div>
                  <Label>Status</Label>
                  <Select value={form.status || 'active'} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Ativa</SelectItem>
                      <SelectItem value="suspended">Suspensa</SelectItem>
                      <SelectItem value="cancelled">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <>
                  <div className="border-t border-border pt-4 space-y-4">
                    <p className="text-sm font-medium text-foreground">Admin inicial</p>
                    <div>
                      <Label>Nome do admin *</Label>
                      <Input value={adminName} onChange={(e) => setAdminName(e.target.value)} placeholder="João Silva" />
                    </div>
                    <div>
                      <Label>E-mail do admin *</Label>
                      <Input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="joao@acme.com" />
                    </div>
                  </div>

                  <div className="border-t border-border pt-4 space-y-4">
                    <p className="text-sm font-medium text-foreground">Plano</p>
                    <div>
                      <Label>Plano *</Label>
                      <Select value={planId} onValueChange={setPlanId}>
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          {plans.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Status</Label>
                        <Select value={subStatus} onValueChange={setSubStatus}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="trial">Trial</SelectItem>
                            <SelectItem value="active">Ativa</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {subStatus === 'trial' && (
                        <div>
                          <Label>Dias de trial</Label>
                          <Input type="number" value={trialDays} onChange={(e) => setTrialDays(Number(e.target.value))} />
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={save} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {company ? 'Salvar' : 'Criar e convidar admin'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

// =================== Subscription Dialog ===================
const SubscriptionDialog: React.FC<{
  open: boolean;
  onOpenChange: (b: boolean) => void;
  companies: Company[];
  plans: Plan[];
  onSaved: () => void;
}> = ({ open, onOpenChange, companies, plans, onSaved }) => {
  const [companyId, setCompanyId] = useState('');
  const [planId, setPlanId] = useState('');
  const [status, setStatus] = useState('active');
  const [trialDays, setTrialDays] = useState(14);
  const [periodDays, setPeriodDays] = useState(30);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) { setCompanyId(''); setPlanId(''); setStatus('active'); setTrialDays(14); setPeriodDays(30); }
  }, [open]);

  const save = async () => {
    if (!companyId || !planId) { toast.error('Selecione empresa e plano'); return; }
    setSaving(true);
    const now = new Date();
    const trialEnd = status === 'trial' ? new Date(now.getTime() + trialDays * 86400000).toISOString() : null;
    const periodEnd = new Date(now.getTime() + periodDays * 86400000).toISOString();
    const { error } = await supabase.from('company_subscriptions').insert({
      company_id: companyId,
      plan_id: planId,
      status,
      trial_ends_at: trialEnd,
      current_period_end: periodEnd,
      current_period_start: now.toISOString(),
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Assinatura criada');
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova Assinatura</DialogTitle>
          <DialogDescription>Vincule uma empresa a um plano.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Empresa</Label>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Plano</Label>
            <Select value={planId} onValueChange={setPlanId}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {plans.filter((p) => p.is_active).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="active">Ativa</SelectItem>
                <SelectItem value="past_due">Atrasada</SelectItem>
                <SelectItem value="cancelled">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {status === 'trial' && (
            <div>
              <Label>Dias de trial</Label>
              <Input type="number" value={trialDays} onChange={(e) => setTrialDays(Number(e.target.value))} />
            </div>
          )}
          <div>
            <Label>Período (dias)</Label>
            <Input type="number" value={periodDays} onChange={(e) => setPeriodDays(Number(e.target.value))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SuperAdmin;
