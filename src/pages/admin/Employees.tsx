import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, UserPlus, Bell, Clock, Briefcase } from 'lucide-react';
import { User } from '@/types';
import * as userService from '@/services/userService';
import * as timeEntryService from '@/services/timeEntryService';
import * as notificationService from '@/services/notificationService';
import { useToast } from '@/hooks/use-toast';

const AdminEmployees = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredEmployees, setFilteredEmployees] = useState<User[]>([]);
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoading(true);
        const employeeData = await userService.getAllEmployees();
        setEmployees(employeeData);
        setFilteredEmployees(employeeData);
      } catch (error) {
        console.error('Error fetching employees:', error);
        toast({
          title: 'Feil',
          description: 'Kunne ikke hente ansatte. Prøv igjen senere.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, [toast]);

  useEffect(() => {
    // Filter employees based on search query
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      const filtered = employees.filter(
        employee => 
          employee.name.toLowerCase().includes(lowerQuery) || 
          employee.email.toLowerCase().includes(lowerQuery)
      );
      setFilteredEmployees(filtered);
    } else {
      setFilteredEmployees(employees);
    }
  }, [searchQuery, employees]);

  const handleSendTimeEntryReminder = async (employee: User) => {
    try {
      setSendingReminder(employee.id);
      
      // Get pending time entries for this employee
      const pendingEntries = await timeEntryService.getPendingTimeEntriesForEmployee(employee.id);
      
      if (pendingEntries.length === 0) {
        toast({
          title: 'Ingen ufullførte registreringer',
          description: `${employee.name} har ingen ufullførte timeregistreringer.`,
        });
        return;
      }

      // Send notification about pending time entries
      await notificationService.addNotification({
        userId: employee.id,
        title: 'Påminnelse: Ufullførte timeregistreringer',
        message: `Du har ${pendingEntries.length} ufullførte timeregistrering${pendingEntries.length > 1 ? 'er' : ''} som venter på å bli fullført.`,
        type: 'time_entry_reminder',
        data: {
          pendingEntries: pendingEntries.length
        }
      });

      toast({
        title: 'Påminnelse sendt',
        description: `Påminnelse om ${pendingEntries.length} ufullførte timeregistrering${pendingEntries.length > 1 ? 'er' : ''} ble sendt til ${employee.name}.`,
      });
    } catch (error) {
      console.error('Error sending time entry reminder:', error);
      toast({
        title: 'Feil',
        description: 'Kunne ikke sende påminnelse. Prøv igjen senere.',
        variant: 'destructive',
      });
    } finally {
      setSendingReminder(null);
    }
  };

  const handleSendManualJobReminder = async (employee: User) => {
    try {
      setSendingReminder(employee.id);
      
      // Send manual job reminder notification
      await notificationService.addNotification({
        userId: employee.id,
        title: 'Jobbpåminnelse fra administrator',
        message: 'Du har fått en påminnelse om å sjekke dine tildelte oppgaver og timeregistreringer.',
        type: 'manual_job_reminder'
      });

      toast({
        title: 'Jobbpåminnelse sendt',
        description: `Manuell jobbpåminnelse ble sendt til ${employee.name}.`,
      });
    } catch (error) {
      console.error('Error sending manual job reminder:', error);
      toast({
        title: 'Feil',
        description: 'Kunne ikke sende jobbpåminnelse. Prøv igjen senere.',
        variant: 'destructive',
      });
    } finally {
      setSendingReminder(null);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('no-NO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Ansatte</h1>
        <div className="flex space-x-2">
          <Button>
            <UserPlus className="mr-2 h-4 w-4" />
            Legg til ny ansatt
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Administrer ansatte</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4">
            <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 md:items-center">
              <div className="relative flex-grow max-w-md">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Søk etter navn eller e-post..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Navn</TableHead>
                    <TableHead>E-post</TableHead>
                    <TableHead>Rolle</TableHead>
                    <TableHead>Registrert</TableHead>
                    <TableHead>Påminnelser</TableHead>
                    <TableHead className="text-right">Handlinger</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24">
                        <div className="flex items-center justify-center">
                          Laster ansatte...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredEmployees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24">
                        <div className="flex flex-col items-center justify-center text-center">
                          <p className="text-sm text-muted-foreground">
                            Ingen ansatte funnet
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEmployees.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell className="font-medium">
                          {employee.name}
                        </TableCell>
                        <TableCell>{employee.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {employee.role === 'admin' ? 'Administrator' : 'Ansatt'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {formatDate(employee.createdAt.toDate())}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                disabled={sendingReminder === employee.id}
                              >
                                <Bell className="mr-2 h-4 w-4" />
                                {sendingReminder === employee.id ? 'Sender...' : 'Send påminnelse'}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                onClick={() => handleSendTimeEntryReminder(employee)}
                                disabled={sendingReminder === employee.id}
                              >
                                <Clock className="mr-2 h-4 w-4" />
                                Ufullførte timeregistreringer
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleSendManualJobReminder(employee)}
                                disabled={sendingReminder === employee.id}
                              >
                                <Briefcase className="mr-2 h-4 w-4" />
                                Manuell jobbpåminnelse
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">
                            Rediger
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminEmployees;