import { useState, useCallback, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useFirebaseMessaging } from '@/hooks/useFirebaseMessaging';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
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
  FileSpreadsheet, 
  Users, 
  Archive, 
  Settings, 
  PenTool as Tool, 
  Menu, 
  X, 
  LogOut, 
  User,
  MapPin
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

interface MenuItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
  description?: string;
}

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Initialize Firebase messaging
  useFirebaseMessaging();

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isMobileMenuOpen]);

  // Prevent scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  const handleLogout = useCallback(async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Failed to log out', error);
      setIsLoggingOut(false);
    }
  }, [logout, navigate]);

  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(prev => !prev);
  }, []);

  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  const getInitials = useCallback(() => {
    if (!currentUser?.email) return 'U';
    const email = currentUser.email;
    const parts = email.split('@')[0].split('.');
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    return email.charAt(0).toUpperCase();
  }, [currentUser?.email]);

  const getDisplayName = useCallback(() => {
    if (!currentUser?.email) return 'Bruker';
    const emailPart = currentUser.email.split('@')[0];
    const parts = emailPart.split('.');
    if (parts.length >= 2) {
      return parts.map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
    }
    return emailPart.charAt(0).toUpperCase() + emailPart.slice(1);
  }, [currentUser?.email]);

  const menuItems: MenuItem[] = [
    { 
      to: '/admin', 
      label: 'Oversikt', 
      icon: <LayoutDashboard className="mr-2 h-4 w-4" />,
      description: 'Dashboard og statistikk'
    },
    { 
      to: '/admin/drift', 
      label: 'Drift', 
      icon: <FileSpreadsheet className="mr-2 h-4 w-4" />,
      description: 'Timeregistrering og rapporter'
    },
    { 
      to: '/admin/steder', 
      label: 'Steder', 
      icon: <MapPin className="mr-2 h-4 w-4" />,
      description: 'Administrer arbeidsplasser'
    },
    { 
      to: '/admin/ansatte', 
      label: 'Ansatte', 
      icon: <Users className="mr-2 h-4 w-4" />,
      description: 'Brukeradministrasjon'
    },
    { 
      to: '/admin/vedlikehold', 
      label: 'Vedlikehold', 
      icon: <Tool className="mr-2 h-4 w-4" />,
      description: 'Vedlikeholdsoppgaver'
    },
    { 
      to: '/admin/arkiv', 
      label: 'Arkiv', 
      icon: <Archive className="mr-2 h-4 w-4" />,
      description: 'Arkiverte elementer'
    },
    { 
      to: '/admin/innstillinger', 
      label: 'Innstillinger', 
      icon: <Settings className="mr-2 h-4 w-4" />,
      description: 'Systeminnstillinger'
    },
  ];

  const isCurrentPath = useCallback((path: string) => {
    if (path === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(path);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 glass-effect border-b border-border/40">
        <div className="max-w-screen-xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo and Desktop Navigation */}
            <div className="flex items-center space-x-8">
              <button 
                className="flex items-center focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg p-1 -m-1 transition-colors hover:bg-muted" 
                onClick={() => navigate('/admin')}
                aria-label="Gå til dashboard"
              >
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold mr-2">
                  PP
                </div>
                <h1 className="text-xl font-semibold text-primary">PlenPilot</h1>
              </button>

              {/* Desktop Navigation */}
              <nav className="hidden md:flex items-center space-x-1" role="navigation" aria-label="Hovednavigering">
                {menuItems.slice(0, 5).map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 nav-item focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 ${
                      isCurrentPath(item.to)
                        ? 'bg-primary/10 text-primary shadow-sm'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                    aria-current={isCurrentPath(item.to) ? 'page' : undefined}
                    title={item.description}
                  >
                    {item.icon}
                    {item.label}
                    {item.badge && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {item.badge}
                      </Badge>
                    )}
                  </NavLink>
                ))}
              </nav>
            </div>

            {/* User Menu and Mobile Toggle */}
            <div className="flex items-center gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="relative h-8 w-8 rounded-full focus:ring-2 focus:ring-primary focus:ring-offset-2" 
                    aria-label="Brukermeny"
                  >
                    <Avatar className="h-8 w-8 bg-primary/10 text-primary">
                      <AvatarFallback className="text-sm font-medium">
                        {getInitials()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{getDisplayName()}</p>
                      <p className="text-xs leading-none text-muted-foreground truncate">
                        {currentUser?.email}
                      </p>
                      <div className="pt-1">
                        <Badge variant="outline" className="text-xs">
                          Administrator
                        </Badge>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <NavLink 
                      to="/admin/innstillinger" 
                      className="flex items-center w-full focus:bg-accent"
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Innstillinger</span>
                    </NavLink>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handleLogout} 
                    className="text-destructive focus:text-destructive"
                    disabled={isLoggingOut}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{isLoggingOut ? 'Logger ut...' : 'Logg ut'}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <Button 
                variant="ghost" 
                size="icon" 
                className="md:hidden focus:ring-2 focus:ring-primary focus:ring-offset-2" 
                onClick={toggleMobileMenu}
                aria-label={isMobileMenuOpen ? 'Lukk meny' : 'Åpne meny'}
                aria-expanded={isMobileMenuOpen}
                aria-controls="mobile-menu"
              >
                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm md:hidden"
          onClick={closeMobileMenu}
        >
          <div 
            className="pt-16 pb-6 px-4 space-y-1 max-h-screen overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            id="mobile-menu"
            role="navigation"
            aria-label="Mobil navigering"
          >
            {menuItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={`flex items-center px-4 py-3 text-base font-medium rounded-lg transition-all duration-200 nav-item focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 ${
                  isCurrentPath(item.to)
                    ? 'bg-primary/10 text-primary shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
                onClick={closeMobileMenu}
                aria-current={isCurrentPath(item.to) ? 'page' : undefined}
              >
                {item.icon}
                <div className="flex-1">
                  <div>{item.label}</div>
                  {item.description && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {item.description}
                    </div>
                  )}
                </div>
                {item.badge && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {item.badge}
                  </Badge>
                )}
              </NavLink>
            ))}
            
            <div className="pt-4 mt-4 border-t border-border">
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex items-center w-full px-4 py-3 text-base font-medium text-destructive rounded-lg transition-colors hover:bg-destructive/10 focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-1 disabled:opacity-50"
              >
                <LogOut className="mr-2 h-4 w-4" />
                {isLoggingOut ? 'Logger ut...' : 'Logg ut'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-auto" role="main">
          <div className="max-w-screen-xl mx-auto px-6 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;