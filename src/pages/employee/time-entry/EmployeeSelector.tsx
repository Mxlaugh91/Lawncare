import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Users, ChevronDown, CheckCircle2, UserPlus, UserMinus } from 'lucide-react';
import { User } from '@/types';

interface EmployeeSelectorProps {
  employees: User[];
  selectedEmployees: string[];
  onEmployeeToggle: (employeeId: string) => void;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const EmployeeSelector = React.memo(({ 
  employees, 
  selectedEmployees, 
  onEmployeeToggle,
  isOpen = false,
  onOpenChange 
}: EmployeeSelectorProps) => {
  const { t } = useTranslation();
  const [internalOpen, setInternalOpen] = React.useState(isOpen);
  const open = onOpenChange ? isOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  const handleEmployeeToggle = React.useCallback((employeeId: string) => {
    // Add haptic feedback simulation for PWA
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
    onEmployeeToggle(employeeId);
  }, [onEmployeeToggle]);

  if (employees.length === 0) {
    return null;
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="card-hover overflow-hidden">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 active:bg-muted transition-all duration-200 select-none">
            <CardTitle className="flex items-center justify-between text-lg font-semibold">
              <div className="flex items-center">
                <div className="p-2 rounded-full bg-primary/10 mr-3">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div className="flex flex-col items-start">
                  <span>{t('timeEntry.teamMembers')}</span>
                  <span className="text-xs text-muted-foreground font-normal">{t('timeEntry.teamMembersDescription')}</span>
                </div>
                <Badge 
                  variant={selectedEmployees.length > 0 ? "default" : "outline"} 
                  className={`ml-3 transition-all duration-200 ${
                    selectedEmployees.length > 0 
                      ? 'bg-primary/10 text-primary border-primary/20' 
                      : ''
                  }`}
                >
                  {selectedEmployees.length > 0 ? (
                    <>
                      <UserPlus className="h-3 w-3 mr-1" />
                      {selectedEmployees.length} {t('timeEntry.selected')}
                    </>
                  ) : (
                    t('timeEntry.optional')
                  )}
                </Badge>
              </div>
              <ChevronDown className={`h-5 w-5 transition-transform duration-300 text-muted-foreground ${open ? 'rotate-180' : ''}`} />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top">
          <CardContent className="pt-0">
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground mb-3 p-2 bg-muted/50 rounded-lg">
                👥 {t('timeEntry.selectColleagues')}
              </div>
              {employees.map((employee, index) => {
                const isSelected = selectedEmployees.includes(employee.id);
                return (
                  <div
                    key={employee.id}
                    className={`group flex items-center space-x-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 transform active:scale-[0.98] ${
                      isSelected
                        ? 'border-primary/50 bg-primary/5 shadow-md'
                        : 'border-border hover:border-primary/30 hover:bg-muted/30 hover:shadow-sm'
                    }`}
                    onClick={() => handleEmployeeToggle(employee.id)}
                    style={{
                      animationDelay: `${index * 50}ms`
                    }}
                  >
                    <div className="relative">
                      <Avatar className={`h-12 w-12 ring-2 transition-all duration-200 ${
                        isSelected 
                          ? 'ring-primary/50 ring-offset-2' 
                          : 'ring-transparent group-hover:ring-primary/20 group-hover:ring-offset-1'
                      }`}>
                        <AvatarFallback className={`font-semibold transition-colors duration-200 ${
                          isSelected 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
                        }`}>
                          {employee.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {isSelected && (
                        <div className="absolute -top-1 -right-1 bg-primary rounded-full p-1 animate-in zoom-in-50 duration-200">
                          <CheckCircle2 className="h-3 w-3 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold truncate transition-colors duration-200 ${
                        isSelected ? 'text-primary' : ''
                      }`}>
                        {employee.name}
                      </p>
                      <p className={`text-sm truncate transition-colors duration-200 ${
                        isSelected ? 'text-primary/70' : 'text-muted-foreground'
                      }`}>
                        {employee.email}
                      </p>
                    </div>
                    
                    <div className={`p-2 rounded-full transition-all duration-200 ${
                      isSelected 
                        ? 'bg-primary/10 text-primary' 
                        : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
                    }`}>
                      {isSelected ? (
                        <UserMinus className="h-4 w-4" />
                      ) : (
                        <UserPlus className="h-4 w-4" />
                      )}
                    </div>
                  </div>
                );
              })}
              
              {selectedEmployees.length > 0 && (
                <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-lg animate-in slide-in-from-bottom-2 duration-300">
                  <p className="text-sm text-primary font-medium">
                    {t('timeEntry.taggedEmployeesNotification', { count: selectedEmployees.length })}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
});

EmployeeSelector.displayName = 'EmployeeSelector';