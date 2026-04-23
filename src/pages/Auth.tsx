import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Mail, Lock, User, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';
import { z } from 'zod';
import talviLogo from '@/assets/talvi-logo.png';

const emailSchema = z.string().email('Email inválido');
const passwordSchema = z.string().min(6, 'Senha deve ter pelo menos 6 caracteres');
const nameSchema = z.string().min(2, 'Nome deve ter pelo menos 2 caracteres');

const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; fullName?: string }>({});
  const [registrationEnabled, setRegistrationEnabled] = useState<boolean | null>(true);

  const { signIn, signUp, user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRegistrationSetting = async () => {
      const { data } = await supabase
        .from('system_settings')
        .select('registration_enabled')
        .limit(1)
        .maybeSingle();
      if (data) setRegistrationEnabled(data.registration_enabled);
      else setRegistrationEnabled(true);
    };
    fetchRegistrationSetting();
  }, []);

  useEffect(() => {
    if (!loading && user) navigate('/dashboard', { replace: true });
  }, [user, loading, navigate]);

  const validateForm = (): boolean => {
    const newErrors: { email?: string; password?: string; fullName?: string } = {};
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) newErrors.email = emailResult.error.errors[0].message;
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) newErrors.password = passwordResult.error.errors[0].message;
    if (!isLogin) {
      const nameResult = nameSchema.safeParse(fullName);
      if (!nameResult.success) newErrors.fullName = nameResult.error.errors[0].message;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) toast.error('Email ou senha incorretos');
          else if (error.message.includes('Email not confirmed')) toast.error('Por favor, confirme seu email antes de fazer login');
          else toast.error(error.message);
          return;
        }
        toast.success('Login realizado com sucesso!');
        navigate('/dashboard', { replace: true });
      } else {
        const { error } = await signUp(email, password, fullName);
        if (error) {
          if (error.message.includes('User already registered')) toast.error('Este email já está cadastrado. Tente fazer login.');
          else toast.error(error.message);
          return;
        }
        toast.success('Conta criada com sucesso!');
        navigate('/dashboard', { replace: true });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white/60" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex">
      {/* LEFT — Brand panel */}
      <aside className="hidden lg:flex lg:w-1/2 relative overflow-hidden border-r border-white/10">
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
            backgroundSize: '80px 80px',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-[#0a0a0a] pointer-events-none" />

        <Link
          to="/"
          className="absolute top-8 left-10 z-20 text-[10px] uppercase tracking-[0.4em] text-white/40 hover:text-white/80 transition"
        >
          ← Voltar ao site
        </Link>

        <div className="relative z-10 flex flex-col justify-center items-center w-full px-12">
          <img
            src={talviLogo}
            alt="Talvi by AIVVO"
            className="w-full max-w-md object-contain mb-10 select-none pointer-events-none"
            draggable={false}
          />
          <p className="text-[11px] uppercase tracking-[0.5em] text-white/50 text-center max-w-sm leading-relaxed">
            Operação comercial autônoma
            <br />
            no WhatsApp
          </p>
        </div>

        <div className="absolute bottom-8 left-10 right-10 flex items-center justify-end text-[10px] uppercase tracking-[0.3em] text-white/30">
          <span>by AIVVO</span>
        </div>
      </aside>

      {/* RIGHT — Form */}
      <main className="flex-1 flex items-center justify-center px-6 py-12 relative">
        <Link to="/" className="lg:hidden absolute top-6 left-6 flex items-center gap-2">
          <div className="w-7 h-7 border border-white/20 flex items-center justify-center">
            <span className="text-[10px] font-bold tracking-[0.2em]">T</span>
          </div>
          <span className="text-[10px] uppercase tracking-[0.3em] text-white/60">Talvi</span>
        </Link>

        <div className="w-full max-w-sm">
          <div className="mb-10">
            <p className="text-[10px] uppercase tracking-[0.4em] text-white/40 mb-4">
              {isLogin ? 'Acesso' : 'Cadastro'}
            </p>
            <h1 className="text-3xl md:text-4xl font-extralight tracking-tight leading-tight mb-3">
              {isLogin ? (
                <>Bem-vindo<br /><span className="font-semibold">de volta.</span></>
              ) : (
                <>Crie sua<br /><span className="font-semibold">conta.</span></>
              )}
            </h1>
            <p className="text-sm text-white/50 font-light">
              {isLogin ? 'Entre para acessar sua plataforma.' : 'Configure seu sistema em minutos.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-[10px] uppercase tracking-[0.3em] text-white/60">
                  Nome completo
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Seu nome"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-10 bg-white/5 border-white/10 h-11 text-white placeholder:text-white/30"
                  />
                </div>
                {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-[10px] uppercase tracking-[0.3em] text-white/60">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-white/5 border-white/10 h-11 text-white placeholder:text-white/30"
                />
              </div>
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-[10px] uppercase tracking-[0.3em] text-white/60">
                Senha
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 bg-white/5 border-white/10 h-11 text-white placeholder:text-white/30"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 bg-white text-black hover:bg-white/90 transition text-[11px] uppercase tracking-[0.3em] font-medium flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {isLogin ? 'Entrar' : 'Criar conta'}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {registrationEnabled !== false && (
            <div className="mt-8 pt-6 border-t border-white/10 text-center">
              <p className="text-xs text-white/50">
                {isLogin ? 'Não tem uma conta?' : 'Já tem uma conta?'}
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setErrors({});
                  }}
                  className="ml-2 text-white hover:text-white/70 font-medium transition uppercase tracking-[0.2em] text-[10px]"
                >
                  {isLogin ? 'Criar conta' : 'Fazer login'}
                </button>
              </p>
            </div>
          )}

          <p className="text-center text-[10px] uppercase tracking-[0.3em] text-white/30 mt-10">
            Talvi · by AIVVO
          </p>
        </div>
      </main>
    </div>
  );
};

export default Auth;
