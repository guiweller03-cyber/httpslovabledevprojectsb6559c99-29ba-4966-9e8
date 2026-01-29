import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Lock, Loader2, AlertCircle, Shield, Eye, EyeOff, User, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { z } from 'zod';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import petzapLogo from '@/assets/petzap-logo.png';
import { lovable } from '@/integrations/lovable/index';
import { supabase } from '@/integrations/supabase/client';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres')
});

const signupSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Senhas não conferem",
  path: ["confirmPassword"],
});

const resetSchema = z.object({
  email: z.string().email('Email inválido')
});

type ViewMode = 'login' | 'signup' | 'forgot-password' | 'reset-sent';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [viewMode, setViewMode] = useState<ViewMode>('login');
  
  const { user, signUp, signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  // Handle password reset redirect
  useEffect(() => {
    const type = searchParams.get('type');
    if (type === 'recovery') {
      // User came from password reset email
      toast.info('Você pode agora definir sua nova senha.');
    }
  }, [searchParams]);

  const clearForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setName('');
    setErrors({});
  };

  const handleViewChange = (mode: ViewMode) => {
    clearForm();
    setViewMode(mode);
  };

  const validateLoginForm = () => {
    try {
      loginSchema.parse({ email, password });
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) fieldErrors[String(err.path[0])] = err.message;
        });
        setErrors(fieldErrors);
      }
      return false;
    }
  };

  const validateSignupForm = () => {
    try {
      signupSchema.parse({ name, email, password, confirmPassword });
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) fieldErrors[String(err.path[0])] = err.message;
        });
        setErrors(fieldErrors);
      }
      return false;
    }
  };

  const validateResetForm = () => {
    try {
      resetSchema.parse({ email });
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) fieldErrors[String(err.path[0])] = err.message;
        });
        setErrors(fieldErrors);
      }
      return false;
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateLoginForm()) return;
    
    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);
    
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Credenciais inválidas. Verifique seu email e senha.');
      } else if (error.message.includes('Email not confirmed')) {
        toast.error('Email não confirmado. Verifique sua caixa de entrada.');
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success('Login realizado com sucesso!');
      navigate('/');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateSignupForm()) return;
    
    setIsLoading(true);
    
    // Update metadata with name during signup
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          full_name: name
        }
      }
    });
    
    setIsLoading(false);
    
    if (error) {
      if (error.message.includes('User already registered')) {
        toast.error('Este email já está cadastrado. Tente fazer login.');
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success('Conta criada com sucesso! Você já está logado.');
      navigate('/');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateResetForm()) return;
    
    setIsLoading(true);
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth?type=recovery`,
    });
    
    setIsLoading(false);
    
    if (error) {
      toast.error(error.message);
    } else {
      setViewMode('reset-sent');
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    
    try {
      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      
      if (error) {
        toast.error('Erro ao conectar com Google. Tente novamente.');
        console.error('Google OAuth error:', error);
      }
    } catch (err) {
      toast.error('Erro ao conectar com Google. Tente novamente.');
      console.error('Google OAuth error:', err);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const renderResetSent = () => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center space-y-4"
    >
      <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
        <CheckCircle2 className="w-8 h-8 text-emerald-600" />
      </div>
      <h2 className="text-xl font-semibold text-slate-800">Email enviado!</h2>
      <p className="text-slate-500">
        Enviamos um link de recuperação para <strong>{email}</strong>. 
        Verifique sua caixa de entrada e spam.
      </p>
      <Button
        variant="outline"
        onClick={() => handleViewChange('login')}
        className="mt-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar para o login
      </Button>
    </motion.div>
  );

  const renderForgotPassword = () => (
    <form onSubmit={handleForgotPassword} className="space-y-5">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-slate-800">Esqueceu sua senha?</h2>
        <p className="text-slate-500 text-sm mt-1">
          Digite seu email e enviaremos um link para redefinir sua senha.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reset-email" className="text-base font-medium text-slate-700">
          E-mail
        </Label>
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            id="reset-email"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`pl-12 h-12 text-base rounded-xl border-slate-200 bg-slate-50/50 
              focus:bg-white focus:border-emerald-500 focus:ring-emerald-500/20 
              transition-all duration-200
              ${errors.email ? 'border-red-400 bg-red-50/50' : ''}`}
          />
        </div>
        {errors.email && (
          <motion.p 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm text-red-500 flex items-center gap-1.5"
          >
            <AlertCircle className="w-4 h-4" />
            {errors.email}
          </motion.p>
        )}
      </div>

      <Button 
        type="submit" 
        className="w-full h-12 text-base font-semibold bg-gradient-to-r from-emerald-600 to-emerald-500 
          hover:from-emerald-700 hover:to-emerald-600 text-white rounded-xl 
          shadow-lg shadow-emerald-500/25 transition-all duration-200"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Enviando...
          </>
        ) : (
          'Enviar link de recuperação'
        )}
      </Button>

      <Button
        type="button"
        variant="ghost"
        onClick={() => handleViewChange('login')}
        className="w-full text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar para o login
      </Button>
    </form>
  );

  const renderLoginForm = () => (
    <form onSubmit={handleSignIn} className="space-y-5">
      {/* Google Sign In */}
      <Button
        type="button"
        variant="outline"
        onClick={handleGoogleSignIn}
        disabled={isGoogleLoading}
        className="w-full h-12 text-base font-medium border-slate-200 hover:bg-slate-50 
          rounded-xl transition-all duration-200 gap-3"
      >
        {isGoogleLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
        )}
        Continuar com Google
      </Button>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-white text-slate-400">ou</span>
        </div>
      </div>

      {/* Email Field */}
      <div className="space-y-2">
        <Label htmlFor="email" className="text-base font-medium text-slate-700">
          E-mail
        </Label>
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            id="email"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`pl-12 h-12 text-base rounded-xl border-slate-200 bg-slate-50/50 
              focus:bg-white focus:border-emerald-500 focus:ring-emerald-500/20 
              transition-all duration-200
              ${errors.email ? 'border-red-400 bg-red-50/50' : ''}`}
          />
        </div>
        {errors.email && (
          <motion.p 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm text-red-500 flex items-center gap-1.5"
          >
            <AlertCircle className="w-4 h-4" />
            {errors.email}
          </motion.p>
        )}
      </div>
      
      {/* Password Field */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label htmlFor="password" className="text-base font-medium text-slate-700">
            Senha
          </Label>
          <button
            type="button"
            onClick={() => handleViewChange('forgot-password')}
            className="text-sm text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
          >
            Esqueci minha senha
          </button>
        </div>
        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`pl-12 pr-12 h-12 text-base rounded-xl border-slate-200 bg-slate-50/50 
              focus:bg-white focus:border-emerald-500 focus:ring-emerald-500/20 
              transition-all duration-200
              ${errors.password ? 'border-red-400 bg-red-50/50' : ''}`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        {errors.password && (
          <motion.p 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm text-red-500 flex items-center gap-1.5"
          >
            <AlertCircle className="w-4 h-4" />
            {errors.password}
          </motion.p>
        )}
      </div>
      
      {/* Submit Button */}
      <motion.div
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <Button 
          type="submit" 
          className="w-full h-12 text-base font-semibold bg-gradient-to-r from-emerald-600 to-emerald-500 
            hover:from-emerald-700 hover:to-emerald-600 text-white rounded-xl 
            shadow-lg shadow-emerald-500/25 transition-all duration-200"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Entrando...
            </>
          ) : (
            'Entrar'
          )}
        </Button>
      </motion.div>
    </form>
  );

  const renderSignupForm = () => (
    <form onSubmit={handleSignUp} className="space-y-4">
      {/* Google Sign Up */}
      <Button
        type="button"
        variant="outline"
        onClick={handleGoogleSignIn}
        disabled={isGoogleLoading}
        className="w-full h-12 text-base font-medium border-slate-200 hover:bg-slate-50 
          rounded-xl transition-all duration-200 gap-3"
      >
        {isGoogleLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
        )}
        Cadastrar com Google
      </Button>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-white text-slate-400">ou</span>
        </div>
      </div>

      {/* Name Field */}
      <div className="space-y-2">
        <Label htmlFor="name" className="text-base font-medium text-slate-700">
          Nome completo
        </Label>
        <div className="relative">
          <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            id="name"
            type="text"
            placeholder="Seu nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`pl-12 h-12 text-base rounded-xl border-slate-200 bg-slate-50/50 
              focus:bg-white focus:border-emerald-500 focus:ring-emerald-500/20 
              transition-all duration-200
              ${errors.name ? 'border-red-400 bg-red-50/50' : ''}`}
          />
        </div>
        {errors.name && (
          <motion.p 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm text-red-500 flex items-center gap-1.5"
          >
            <AlertCircle className="w-4 h-4" />
            {errors.name}
          </motion.p>
        )}
      </div>

      {/* Email Field */}
      <div className="space-y-2">
        <Label htmlFor="signup-email" className="text-base font-medium text-slate-700">
          E-mail
        </Label>
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            id="signup-email"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`pl-12 h-12 text-base rounded-xl border-slate-200 bg-slate-50/50 
              focus:bg-white focus:border-emerald-500 focus:ring-emerald-500/20 
              transition-all duration-200
              ${errors.email ? 'border-red-400 bg-red-50/50' : ''}`}
          />
        </div>
        {errors.email && (
          <motion.p 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm text-red-500 flex items-center gap-1.5"
          >
            <AlertCircle className="w-4 h-4" />
            {errors.email}
          </motion.p>
        )}
      </div>
      
      {/* Password Field */}
      <div className="space-y-2">
        <Label htmlFor="signup-password" className="text-base font-medium text-slate-700">
          Senha
        </Label>
        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            id="signup-password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Mínimo 6 caracteres"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`pl-12 pr-12 h-12 text-base rounded-xl border-slate-200 bg-slate-50/50 
              focus:bg-white focus:border-emerald-500 focus:ring-emerald-500/20 
              transition-all duration-200
              ${errors.password ? 'border-red-400 bg-red-50/50' : ''}`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        {errors.password && (
          <motion.p 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm text-red-500 flex items-center gap-1.5"
          >
            <AlertCircle className="w-4 h-4" />
            {errors.password}
          </motion.p>
        )}
      </div>

      {/* Confirm Password Field */}
      <div className="space-y-2">
        <Label htmlFor="confirm-password" className="text-base font-medium text-slate-700">
          Confirmar senha
        </Label>
        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            id="confirm-password"
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder="Repita a senha"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={`pl-12 pr-12 h-12 text-base rounded-xl border-slate-200 bg-slate-50/50 
              focus:bg-white focus:border-emerald-500 focus:ring-emerald-500/20 
              transition-all duration-200
              ${errors.confirmPassword ? 'border-red-400 bg-red-50/50' : ''}`}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
          >
            {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        {errors.confirmPassword && (
          <motion.p 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm text-red-500 flex items-center gap-1.5"
          >
            <AlertCircle className="w-4 h-4" />
            {errors.confirmPassword}
          </motion.p>
        )}
      </div>
      
      {/* Submit Button */}
      <motion.div
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <Button 
          type="submit" 
          className="w-full h-12 text-base font-semibold bg-gradient-to-r from-emerald-600 to-emerald-500 
            hover:from-emerald-700 hover:to-emerald-600 text-white rounded-xl 
            shadow-lg shadow-emerald-500/25 transition-all duration-200"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Criando conta...
            </>
          ) : (
            'Criar conta'
          )}
        </Button>
      </motion.div>
    </form>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 flex items-center justify-center p-4">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-100/40 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-slate-100/60 rounded-full blur-3xl" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        {/* Main Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
          {/* Header */}
          <div className="px-8 pt-10 pb-6 text-center">
            {/* Logo */}
            <motion.div 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="flex flex-col items-center gap-4 mb-6"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-emerald-500/20 rounded-2xl blur-xl" />
                <img 
                  src={petzapLogo} 
                  alt="PetZap.IA" 
                  className="relative w-20 h-20 rounded-2xl object-cover shadow-lg"
                />
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-800">
                  PetZap<span className="text-emerald-600">.IA</span>
                </h1>
                <p className="text-base text-slate-500 mt-1">
                  CRM Inteligente para o Mercado Pet
                </p>
              </div>
            </motion.div>

            {/* Tab Switcher - Only show for login/signup */}
            {(viewMode === 'login' || viewMode === 'signup') && (
              <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
                <button
                  onClick={() => handleViewChange('login')}
                  className={`flex-1 py-2.5 px-4 rounded-lg text-base font-medium transition-all duration-200 ${
                    viewMode === 'login'
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Entrar
                </button>
                <button
                  onClick={() => handleViewChange('signup')}
                  className={`flex-1 py-2.5 px-4 rounded-lg text-base font-medium transition-all duration-200 ${
                    viewMode === 'signup'
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Criar conta
                </button>
              </div>
            )}
          </div>

          {/* Form Section */}
          <div className="px-8 pb-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={viewMode}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                {viewMode === 'login' && renderLoginForm()}
                {viewMode === 'signup' && renderSignupForm()}
                {viewMode === 'forgot-password' && renderForgotPassword()}
                {viewMode === 'reset-sent' && renderResetSent()}
              </motion.div>
            </AnimatePresence>

            {/* Security Badge */}
            {(viewMode === 'login' || viewMode === 'signup') && (
              <div className="flex items-center justify-center gap-2 pt-4 mt-4">
                <Shield className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-400">Dados protegidos com criptografia</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-slate-400 mt-6">
          © 2024 PetZap.IA — Todos os direitos reservados
        </p>
      </motion.div>
    </div>
  );
}
