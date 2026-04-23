import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MessageSquare, Calendar, Users, Kanban, Bot, Zap, ShieldCheck, BarChart3 } from 'lucide-react';

const WHATSAPP_NUMBER = '5548996911268';
const WHATSAPP_DISPLAY = '+55 48 99691-1268';
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
  'Olá! Gostaria de conhecer o Talvi.'
)}`;

const features = [
  { icon: Bot, title: 'IA Conversacional', desc: 'Agente de IA que atende clientes 24/7 com contexto e inteligência real.' },
  { icon: MessageSquare, title: 'WhatsApp Nativo', desc: 'Integração direta via Evolution API. Multi-instância, multi-equipe.' },
  { icon: Kanban, title: 'Pipeline Visual', desc: 'Kanban arrastar-e-soltar. Cada negócio do lead ao fechamento.' },
  { icon: Calendar, title: 'Agendamentos', desc: 'Marca, confirma e remarca compromissos automaticamente.' },
  { icon: Users, title: 'Equipe & Funções', desc: 'Multi-usuário com permissões, distribuição e handoff humano.' },
  { icon: BarChart3, title: 'Dashboards', desc: 'Métricas em tempo real. Conversões, SLA, performance da IA.' },
  { icon: Zap, title: 'Disparos em Massa', desc: 'Campanhas segmentadas com validação de números.' },
  { icon: ShieldCheck, title: 'Multi-Tenant', desc: 'Arquitetura isolada por empresa. Segurança com os seus dados.' },
];

const Landing: React.FC = () => {
  useEffect(() => {
    document.title = 'Talvi by AIVVO — Operação comercial autônoma no WhatsApp';
    const meta = document.querySelector('meta[name="description"]');
    const desc = 'Talvi by AIVVO: plataforma de IA para vender, atender e agendar no WhatsApp. Pipeline, equipe, dashboards e agente Nina 24/7.';
    if (meta) meta.setAttribute('content', desc);
    else {
      const m = document.createElement('meta');
      m.name = 'description';
      m.content = desc;
      document.head.appendChild(m);
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white antialiased selection:bg-white selection:text-black">
      {/* NAV */}
      <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-md bg-[#0a0a0a]/70 border-b border-white/5">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 border border-white/20 flex items-center justify-center">
              <span className="text-xs font-bold tracking-[0.2em]">T</span>
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold tracking-[0.3em] uppercase">Talvi</p>
              <p className="text-[9px] tracking-[0.4em] text-white/40 uppercase">by AIVVO</p>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-10 text-xs uppercase tracking-[0.2em] text-white/60">
            <a href="#produto" className="hover:text-white transition">Produto</a>
            <a href="#recursos" className="hover:text-white transition">Recursos</a>
            <a href="#contato" className="hover:text-white transition">Contato</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              to="/auth"
              className="hidden sm:inline-block text-xs uppercase tracking-[0.2em] text-white/70 hover:text-white transition"
            >
              Entrar
            </Link>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs uppercase tracking-[0.2em] px-5 py-2.5 bg-white text-black hover:bg-white/90 transition font-medium"
            >
              Solicitar Acesso
            </a>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section id="produto" className="pt-32 pb-24 lg:pt-44 lg:pb-40 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
            backgroundSize: '80px 80px',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0a0a0a] pointer-events-none" />

        <div className="relative max-w-[1400px] mx-auto px-6 lg:px-12">
          <p className="text-[10px] uppercase tracking-[0.5em] text-white/40 mb-8">
            Operação comercial autônoma
          </p>
          <h1 className="text-5xl md:text-7xl lg:text-[8rem] font-extralight tracking-tight leading-[0.95] mb-8">
            A IA
            <br />
            <span className="font-semibold">atende.</span>
            <br />
            <span className="text-white/40">Sua equipe fecha</span>
          </h1>
          <p className="text-lg md:text-xl text-white/60 max-w-2xl font-light leading-relaxed mb-12">
            Talvi é a plataforma da AIVVO para empresas que vendem, atendem e agendam pelo WhatsApp — com IA que trabalha junto com sua equipe, não no lugar dela.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center justify-center gap-3 px-8 py-4 bg-white text-black hover:bg-white/90 transition text-sm uppercase tracking-[0.25em] font-medium"
            >
              Solicitar demonstração
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </a>
            <a
              href="#recursos"
              className="inline-flex items-center justify-center gap-3 px-8 py-4 border border-white/20 hover:border-white/60 text-white transition text-sm uppercase tracking-[0.25em] font-medium"
            >
              Ver como funciona
            </a>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="border-y border-white/10 bg-black/40">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 grid grid-cols-2 md:grid-cols-4 divide-x divide-white/10">
          {[
            { v: '24/7', l: 'Atendimento IA' },
            { v: '∞', l: 'Conversas paralelas' },
            { v: '<2s', l: 'Tempo de resposta' },
            { v: '100%', l: 'Multi-tenant' },
          ].map((s, i) => (
            <div key={i} className="py-12 px-6 text-center">
              <p className="text-4xl md:text-5xl font-extralight mb-2">{s.v}</p>
              <p className="text-[10px] uppercase tracking-[0.3em] text-white/40">{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="recursos" className="py-24 lg:py-40">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <div className="mb-20 max-w-3xl">
            <p className="text-[10px] uppercase tracking-[0.5em] text-white/40 mb-6">
              Sistema completo
            </p>
            <h2 className="text-4xl md:text-6xl font-extralight tracking-tight leading-[1.05]">
              Tudo o que sua operação
              <br />
              <span className="font-semibold">precisa rodar sozinha.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 border-l border-t border-white/10">
            {features.map((f, i) => (
              <div
                key={i}
                className="p-8 lg:p-10 border-r border-b border-white/10 hover:bg-white/[0.02] transition group"
              >
                <f.icon className="w-7 h-7 text-white/80 mb-6 group-hover:text-white transition" strokeWidth={1.25} />
                <h3 className="text-base font-medium mb-3 tracking-wide">{f.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed font-light">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="contato" className="py-24 lg:py-40 border-t border-white/10 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
            backgroundSize: '120px 120px',
          }}
        />
        <div className="relative max-w-[1400px] mx-auto px-6 lg:px-12 text-center">
          <p className="text-[10px] uppercase tracking-[0.5em] text-white/40 mb-8">
            Comece agora
          </p>
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-extralight tracking-tight leading-[1.05] mb-8">
            Fale com a equipe
            <br />
            <span className="font-semibold">no WhatsApp.</span>
          </h2>
          <p className="text-base md:text-lg text-white/50 max-w-xl mx-auto font-light mb-12">
            Sem formulário. Sem espera. Mande uma mensagem e veja o Talvi em ação.
          </p>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center justify-center gap-3 px-10 py-5 bg-white text-black hover:bg-white/90 transition text-sm uppercase tracking-[0.25em] font-medium"
          >
            {WHATSAPP_DISPLAY}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/10 py-10">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 border border-white/20 flex items-center justify-center">
              <span className="text-[10px] font-bold tracking-[0.2em]">T</span>
            </div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/40">
              Talvi · by AIVVO · {new Date().getFullYear()}
            </p>
          </div>
          <div className="flex items-center gap-8 text-[10px] uppercase tracking-[0.3em] text-white/40">
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="hover:text-white transition">
              WhatsApp
            </a>
            <Link to="/auth" className="hover:text-white transition">
              Entrar
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
