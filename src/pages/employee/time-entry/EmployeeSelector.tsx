import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Users, ChevronDown, CheckCircle2 } from 'lucide-react';
import { User } from '@/types';

interface EmployeeSelectorProps {
  employees: User[];
  selectedEmployees: string[];
  onEmployeeToggle: (employeeId: string) => void;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const EmployeeSelector = ({ 
  employees, 
  selectedEmployees, 
  onEmployeeToggle,
  isOpen = false,
  onOpenChange 
}: EmployeeSelectorProps) => {
  const [internalOpen, setInternalOpen] = useState(isOpen);
  const open = onOpenChange ? isOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  if (employees.length === 0) {
    return null;
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="flex items-center justify-between text-lg">
              <div className="flex items-center">
                <Users className="mr-2 h-5 w-5 text-muted-foreground" />
                Andre på jobb
                <Badge variant="outline" className="ml-2">
                  {selectedEmployees.length > 0 ? `${selectedEmployees.length} valgt` : 'Valgfritt'}
                </Badge>
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>
            <div className="space-y-3">
              {employees.map((employee) => (
                <div
                  key={employee.id}
                  className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-all active:scale-95 ${
                    selectedEmployees.includes(employee.id)
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground'
                  }`}
                  onClick={() => onEmployeeToggle(employee.id)}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className={selectedEmployees.includes(employee.id) ? 'bg-primary text-primary-foreground' : ''}>
                      {employee.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{employee.name}</p>
                    <p className="text-sm text-muted-foreground truncate">{employee.email}</p>
                  </div>
                  {selectedEmployees.includes(employee.id) && (
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};