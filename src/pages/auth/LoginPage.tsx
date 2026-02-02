import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LanguageSelector } from '@/components/LanguageSelector';
import { Grab as Grass, Globe } from 'lucide-react';

// Type for global version
declare const __VERSION__: string;

const LoginPage = () => {
  const { login } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLanguageSelectorOpen, setIsLanguageSelectorOpen] = useState(false);

  const loginSchema = z.object({
    email: z.string().max(100, t('errors.validationError')).email(t('errors.validationError')),
    password: z.string().min(6, t('errors.validationError')).max(100, t('errors.validationError')),
  });

  type LoginFormValues = z.infer<typeof loginSchema>;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    try {
      setLoading(true);
      setError(null);
      
      const isAdmin = await login(data.email, data.password);
      navigate(isAdmin ? '/admin' : '/employee', { replace: true });
      
    } catch (err) {
      console.error('Login failed:', err);
      setError(t('auth.loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  // Få kort versjon (bare "123v" delen)
  const getShortVersion = () => {
    try {
      return __VERSION__.split('_')[0]; // "123v"
    } catch {
      return 'dev';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 relative">
      <div className="absolute top-4 right-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsLanguageSelectorOpen(true)}
        >
          <Globe className="h-5 w-5" />
        </Button>
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
            <Grass className="h-6 w-6 text-green-700" />
          </div>
          <CardTitle className="text-2xl font-bold">{t('auth.loginTitle')}</CardTitle>
          <CardDescription>
            {t('auth.loginDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">{t('auth.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="din.epost@example.com"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">{t('auth.password')}</Label>
                <Input
                  id="password"
                  type="password"
                  {...register('password')}
                />
                {errors.password && (
                  <p className="text-sm text-red-500">{errors.password.message}</p>
                )}
              </div>
            </div>
            
            <Button 
              type="submit" 
              className="w-full mt-6 bg-green-700 hover:bg-green-800"
              disabled={loading}
            >
              {loading ? t('auth.loggingIn') : t('auth.loginButton')}
            </Button>
          </form>
        </CardContent>
        
        {/* ALTERNATIV 1: Legg versjon i eksisterende footer */}
        <CardFooter className="flex flex-col text-center text-sm text-gray-500 space-y-1">
          <div>{t('auth.contactAdmin')}</div>
          <div>PlenPilot v{getShortVersion()}</div>
        </CardFooter>
      </Card>
      
      <LanguageSelector
        isOpen={isLanguageSelectorOpen}
        onClose={() => setIsLanguageSelectorOpen(false)}
      />
      
      {/* ALTERNATIV 2: Versjon i hjørnet (bruk ENTEN CardFooter ELLER corner) */}
      {/* <div className="absolute bottom-4 right-4 text-xs text-gray-400">
        v{getShortVersion()}
      </div> */}
      
      {/* ALTERNATIV 3: Versjon under hele Card'en (bruk ENTEN CardFooter ELLER dette) */}
      {/* <div className="mt-4 text-center text-xs text-gray-400">
        PlenPilot v{getShortVersion()}
      </div> */}
    </div>
  );
};

export default LoginPage;