import { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useFirebaseMessaging } from '@/hooks/useFirebaseMessaging';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { LanguageSelector } from '@/components/LanguageSelector';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  LayoutDashboard, 
  Clock, 
  History, 
  LogOut,
  User,
  Globe
} from 'lucide-react';

interface EmployeeLayoutProps {
  children: React.ReactNode;
}

const EmployeeLayout = ({ children }: EmployeeLayoutProps) => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isLanguageSelectorOpen, setIsLanguageSelectorOpen] = useState(false);
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Initialize Firebase messaging
  useFirebaseMessaging();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  const getInitials = () => {
    if (!currentUser?.email) return 'U';
    return currentUser.email.charAt(0).toUpperCase();
  };

  const menuItems = [
    { to: '/employee', label: t('navigation.dashboard'), icon: <LayoutDashboard className="h-5 w-5" /> },
    { to: '/employee/timeregistrering', label: t('navigation.timeEntry'), icon: <Clock className="h-5 w-5" /> },
    { to: '/employee/historikk', label: t('navigation.history'), icon: <History className="h-5 w-5" /> },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Navigation Bar with integrated navigation */}
      <header className="sticky top-0 z-40 glass-effect border-b border-border/40">
        <div className="max-w-screen-xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo and Desktop Navigation */}
            <div className="flex items-center space-x-8">
              <div 
                className="flex items-center cursor-pointer" 
                onClick={() => navigate('/employee')}
              >
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold mr-2">
                  PP
                </div>
                <h1 className="text-xl font-semibold text-primary">PlenPilot</h1>
              </div>

              {/* Desktop Navigation */}
              <nav className="hidden md:flex items-center space-x-1">
                {menuItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors nav-item ${
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`
                    }
                    end={item.to === '/employee'}
                  >
                    {item.icon}
                    <span className="ml-2">{item.label}</span>
                  </NavLink>
                ))}
              </nav>
            </div>

            {/* Notifications, User Menu and Mobile Toggle */}
            <div className="flex items-center gap-4">
              <NotificationBell />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsLanguageSelectorOpen(true)}
              >
                <Globe className="h-5 w-5" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8 bg-primary/10 text-primary">
                      <AvatarFallback>{getInitials()}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{currentUser?.email}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">
                          Ansatt
                        </span>
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{t('auth.logout')}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm md:hidden">
          <div className="pt-16 pb-6 px-4 space-y-1">
            {menuItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center px-4 py-3 text-base font-medium rounded-lg transition-colors nav-item ${
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted'
                  }`
                }
                onClick={() => setIsMobileMenuOpen(false)}
                end={item.to === '/employee'}
              >
                {item.icon}
                <span className="ml-2">{item.label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-auto pb-16 md:pb-6">
          <div className="max-w-screen-xl mx-auto px-6 py-6">
            {children}
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 glass-effect border-t border-border/40">
          <div className="flex justify-around">
            {menuItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex flex-col items-center py-3 px-4 text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`
                }
                end={item.to === '/employee'}
              >
                {item.icon}
                <span className="mt-1 text-xs">{item.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
      
      <LanguageSelector
        isOpen={isLanguageSelectorOpen}
        onClose={() => setIsLanguageSelectorOpen(false)}
      />
    </div>
  );
};

export default EmployeeLayout;