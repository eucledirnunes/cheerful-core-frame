import React, { useState, useEffect } from 'react';
import { Download, Database, Users, FolderOpen, Code2, Copy, Check, FileText, Loader2, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const TABLE_GROUPS = [
  {
    label: 'CRM & Vendas',
    icon: Database,
    tables: [
      { id: 'contacts', name: 'Contatos', desc: 'Lista de contatos do WhatsApp' },
      { id: 'conversations', name: 'Conversas', desc: 'Threads de conversa' },
      { id: 'messages', name: 'Mensagens', desc: 'Histórico completo de mensagens' },
      { id: 'deals', name: 'Deals', desc: 'Oportunidades do pipeline' },
      { id: 'deal_activities', name: 'Atividades', desc: 'Notas e tarefas dos deals' },
      { id: 'pipeline_stages', name: 'Estágios Pipeline', desc: 'Colunas do Kanban' },
      { id: 'appointments', name: 'Agendamentos', desc: 'Reuniões agendadas' },
      { id: 'tag_definitions', name: 'Tags', desc: 'Definições de etiquetas' },
    ],
  },
  {
    label: 'Equipe & Usuários',
    icon: Users,
    tables: [
      { id: '__users__', name: 'Usuários (Auth)', desc: 'Usuários autenticados do sistema' },
      { id: 'profiles', name: 'Perfis', desc: 'Dados estendidos de usuários' },
      { id: 'user_roles', name: 'Roles', desc: 'Permissões de usuário' },
      { id: 'teams', name: 'Times', desc: 'Times configurados' },
      { id: 'team_members', name: 'Membros', desc: 'Membros dos times' },
      { id: 'team_functions', name: 'Funções', desc: 'Funções (closer, sdr, etc)' },
    ],
  },
  {
    label: 'Configurações & Integrações',
    icon: Shield,
    tables: [
      { id: 'nina_settings', name: 'Config Nina (IA)', desc: 'Configurações do agente IA' },
      { id: 'design_settings', name: 'Design', desc: 'Cores, fontes, logos' },
      { id: 'system_settings', name: 'Sistema', desc: 'Configurações globais' },
      { id: 'whatsapp_instances', name: 'Instâncias WhatsApp', desc: 'Conexões WhatsApp' },
      { id: 'broadcast_campaigns', name: 'Campanhas', desc: 'Campanhas de broadcast' },
      { id: 'broadcast_recipients', name: 'Destinatários', desc: 'Recipients de campanhas' },
      { id: 'knowledge_files', name: 'Base Conhecimento', desc: 'Arquivos da KB' },
    ],
  },
  {
    label: 'Storage & Logs',
    icon: FolderOpen,
    tables: [
      { id: '__storage__', name: 'Storage', desc: 'Lista de arquivos em buckets' },
      { id: 'conversation_states', name: 'Estados Conversa', desc: 'Estado de cada conversa' },
    ],
  },
];

const Backup: React.FC = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [schemaSql, setSchemaSql] = useState<string>('');
  const [loadingSchema, setLoadingSchema] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      setIsAdmin(!!data);
    };
    checkAdmin();
  }, [user]);

  const downloadCsv = async (tableId: string, fileName: string) => {
    setDownloading(tableId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão expirada');

      const url = `https://tukwmrnuxxouhvqjrros.supabase.co/functions/v1/admin-export-data`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
        },
        body: JSON.stringify({ table: tableId }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const csv = await res.text();
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${fileName}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      toast.success(`${fileName} exportado com sucesso`);
    } catch (e: any) {
      toast.error(`Falha ao exportar: ${e.message}`);
    } finally {
      setDownloading(null);
    }
  };

  const loadSchema = async () => {
    setLoadingSchema(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão expirada');

      const url = `https://tukwmrnuxxouhvqjrros.supabase.co/functions/v1/admin-export-schema`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
        },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erro' }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const sql = await res.text();
      setSchemaSql(sql);
      toast.success('Schema carregado');
    } catch (e: any) {
      toast.error(`Falha: ${e.message}`);
    } finally {
      setLoadingSchema(false);
    }
  };

  const copySchema = async () => {
    if (!schemaSql) return;
    await navigator.clipboard.writeText(schemaSql);
    setCopied(true);
    toast.success('SQL copiado para a área de transferência');
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadSchema = () => {
    if (!schemaSql) return;
    const blob = new Blob([schemaSql], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `schema_${new Date().toISOString().split('T')[0]}.sql`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  if (isAdmin === null) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
        <Shield className="w-12 h-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold text-foreground">Acesso restrito</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          Esta área é exclusiva para administradores. Solicite acesso a um admin do sistema.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-1">Backup & Export</h1>
          <p className="text-sm text-muted-foreground">
            Exporte dados do sistema em CSV e gere SQL para migração entre projetos.
          </p>
        </header>

        <Tabs defaultValue="csv" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="csv">
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </TabsTrigger>
            <TabsTrigger value="schema">
              <Code2 className="w-4 h-4 mr-2" />
              Schema SQL
            </TabsTrigger>
          </TabsList>

          <TabsContent value="csv" className="space-y-6">
            {TABLE_GROUPS.map((group) => {
              const Icon = group.icon;
              return (
                <section
                  key={group.label}
                  className="bg-card border border-border rounded-xl p-5"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Icon className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-semibold text-foreground">{group.label}</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {group.tables.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => downloadCsv(t.id, t.name.replace(/\s+/g, '_').toLowerCase())}
                        disabled={downloading === t.id}
                        className="text-left p-3 rounded-lg border border-border bg-background hover:bg-secondary/40 hover:border-primary/40 transition-all disabled:opacity-50 disabled:cursor-wait group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-foreground truncate">
                              {t.name}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                              {t.desc}
                            </div>
                          </div>
                          {downloading === t.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-primary flex-shrink-0" />
                          ) : (
                            <Download className="w-4 h-4 text-muted-foreground group-hover:text-primary flex-shrink-0" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              );
            })}
          </TabsContent>

          <TabsContent value="schema" className="space-y-4">
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Schema completo do banco
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    SQL com extensions, tipos, tabelas, RLS, functions e triggers para recriar em outro projeto Supabase.
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {!schemaSql ? (
                    <button
                      onClick={loadSchema}
                      disabled={loadingSchema}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2"
                    >
                      {loadingSchema ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Gerando...
                        </>
                      ) : (
                        <>
                          <Code2 className="w-4 h-4" />
                          Gerar SQL
                        </>
                      )}
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={copySchema}
                        className="px-3 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors flex items-center gap-2"
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        {copied ? 'Copiado!' : 'Copiar'}
                      </button>
                      <button
                        onClick={downloadSchema}
                        className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Baixar .sql
                      </button>
                    </>
                  )}
                </div>
              </div>

              {schemaSql && (
                <div className="relative">
                  <pre className="bg-background border border-border rounded-lg p-4 text-xs overflow-auto max-h-[60vh] font-mono text-foreground/90">
                    {schemaSql}
                  </pre>
                </div>
              )}

              {!schemaSql && !loadingSchema && (
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center text-sm text-muted-foreground">
                  Clique em "Gerar SQL" para visualizar o schema completo do banco.
                </div>
              )}
            </div>

            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 text-xs text-amber-200/80">
              <strong className="text-amber-300">⚠️ Importante:</strong> Este SQL é um esqueleto reconstruído por introspecção.
              Para um dump 100% fiel (com índices, constraints e dados), use <code className="bg-background/50 px-1 rounded">pg_dump</code> diretamente no banco.
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Backup;
