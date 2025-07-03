import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Clock, 
  Calendar, 
  User, 
  FileText, 
  Scissors,
  Users
} from 'lucide-react';
import { TimeEntry } from '@/types';

interface TimeEntryDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  data: any[];
  type: 'timeEntries' | 'employees' | 'edgeCutting' | 'notes';
}

export const TimeEntryDetailsModal = ({ 
  isOpen, 
  onClose, 
  title, 
  data, 
  type 
}: TimeEntryDetailsModalProps) => {
  const formatDate = (date: any) => {
    if (!date) return '';
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return new Intl.DateTimeFormat('no-NO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(dateObj);
  };

  const formatDateOnly = (date: any) => {
    if (!date) return '';
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return new Intl.DateTimeFormat('no-NO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(dateObj);
  };

  const renderTimeEntries = () => (
    <div className="space-y-4">
      {data.map((entry: TimeEntry, index) => (
        <div key={entry.id || index} className="border rounded-lg p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-sm">
                {formatDate(entry.date)}
              </span>
            </div>
            <Badge variant="outline" className="bg-blue-50 text-blue-700">
              {entry.hours} timer
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600">Utført av:</span>
              <span className="font-medium">{entry.employeeName || 'Ukjent'}</span>
            </div>
            
            {entry.edgeCuttingDone && (
              <div className="flex items-center space-x-2">
                <Scissors className="h-4 w-4 text-amber-600" />
                <span className="text-amber-700 font-medium">Kantklipping utført</span>
              </div>
            )}
          </div>
          
          {entry.notes && (
            <div className="mt-3 pt-3 border-t">
              <div className="flex items-start space-x-2">
                <FileText className="h-4 w-4 text-gray-500 mt-0.5" />
                <div>
                  <span className="text-gray-600 text-sm">Notater:</span>
                  <p className="text-sm mt-1 bg-white p-2 rounded border">
                    {entry.notes}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const renderEmployees = () => (
    <div className="space-y-3">
      {data.map((employee, index) => (
        <div key={index} className="border rounded-lg p-4 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-medium">{employee.name}</h4>
                <p className="text-sm text-gray-600">
                  {employee.totalHours} timer totalt på dette stedet
                </p>
              </div>
            </div>
            <Badge variant="outline" className="bg-blue-50 text-blue-700">
              {employee.registrations} registreringer
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );

  const renderEdgeCuttingEntries = () => (
    <div className="space-y-4">
      {data.map((entry: TimeEntry, index) => (
        <div key={entry.id || index} className="border rounded-lg p-4 bg-amber-50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Scissors className="h-4 w-4 text-amber-600" />
              <span className="font-medium text-sm">
                {formatDate(entry.date)}
              </span>
            </div>
            <Badge className="bg-amber-100 text-amber-800">
              {entry.hours} timer
            </Badge>
          </div>
          
          <div className="flex items-center space-x-2 text-sm">
            <User className="h-4 w-4 text-gray-500" />
            <span className="text-gray-600">Utført av:</span>
            <span className="font-medium">{entry.employeeName || 'Ukjent'}</span>
          </div>
          
          {entry.notes && (
            <div className="mt-3 pt-3 border-t border-amber-200">
              <div className="flex items-start space-x-2">
                <FileText className="h-4 w-4 text-gray-500 mt-0.5" />
                <div>
                  <span className="text-gray-600 text-sm">Notater:</span>
                  <p className="text-sm mt-1 bg-white p-2 rounded border">
                    {entry.notes}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const renderNotes = () => (
    <div className="space-y-4">
      {data.map((noteEntry, index) => (
        <div key={index} className="border rounded-lg p-4 bg-purple-50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-purple-600" />
              <span className="font-medium text-sm">
                {formatDate(noteEntry.date)}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-xs">
                {noteEntry.hours} timer
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {noteEntry.employeeName}
              </Badge>
            </div>
          </div>
          
          <div className="bg-white p-3 rounded border">
            <p className="text-sm text-gray-700">{noteEntry.notes}</p>
          </div>
        </div>
      ))}
    </div>
  );

  const renderContent = () => {
    if (data.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            {type === 'timeEntries' && <Clock className="h-8 w-8 text-gray-400" />}
            {type === 'employees' && <Users className="h-8 w-8 text-gray-400" />}
            {type === 'edgeCutting' && <Scissors className="h-8 w-8 text-gray-400" />}
            {type === 'notes' && <FileText className="h-8 w-8 text-gray-400" />}
          </div>
          <p className="text-lg font-medium mb-2">Ingen data tilgjengelig</p>
          <p className="text-sm">
            {type === 'timeEntries' && 'Ingen timeregistreringer funnet for dette stedet.'}
            {type === 'employees' && 'Ingen ansatte har jobbet på dette stedet ennå.'}
            {type === 'edgeCutting' && 'Ingen kantklipping er registrert for dette stedet.'}
            {type === 'notes' && 'Ingen notater er registrert for dette stedet.'}
          </p>
        </div>
      );
    }

    switch (type) {
      case 'timeEntries':
        return renderTimeEntries();
      case 'employees':
        return renderEmployees();
      case 'edgeCutting':
        return renderEdgeCuttingEntries();
      case 'notes':
        return renderNotes();
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <DialogTitle className="text-lg font-semibold">
              {title}
            </DialogTitle>
          </div>
          <Separator className="mt-4" />
        </DialogHeader>
        
        <ScrollArea className="flex-1 pr-4">
          <div className="py-4">
            {renderContent()}
          </div>
        </ScrollArea>
        
        {data.length > 0 && (
          <div className="flex-shrink-0 pt-4 border-t">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>
                Viser {data.length} {data.length === 1 ? 'element' : 'elementer'}
              </span>
              <Button variant="outline" size="sm" onClick={onClose}>
                Lukk
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};