// src/components/admin/locations/LocationHistoricalNotes.tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Calendar } from 'lucide-react';
import { TimeEntry } from '@/types';

interface LocationHistoricalNotesProps {
  timeEntries: TimeEntry[];
  loading: boolean;
  onCardClick: (type: 'timeEntries' | 'employees' | 'edgeCutting' | 'notes') => void;
}

export const LocationHistoricalNotes: React.FC<LocationHistoricalNotesProps> = ({
  timeEntries,
  loading,
  onCardClick,
}) => {
  const getNotesFromTimeEntries = () => {
    return timeEntries
      .filter(entry => entry.notes && entry.notes.trim() !== '')
      .map(entry => ({
        date: entry.date,
        employeeName: entry.employeeName,
        notes: entry.notes,
        hours: entry.hours
      }));
  };

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

  const notes = getNotesFromTimeEntries();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <FileText className="mr-2 h-5 w-5 text-purple-600" />
            Historiske notater fra timeregistreringer
          </div>
          {notes.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCardClick('notes')}
            >
              Se alle ({notes.length})
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="animate-pulse space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded" />
            ))}
          </div>
        ) : notes.length > 0 ? (
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-3">
              {notes.slice(0, 3).map((noteEntry, index) => (
                <div key={index} className="border rounded-lg p-3 bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium">
                        {formatDate(noteEntry.date)}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {noteEntry.hours} timer
                      </Badge>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {noteEntry.employeeName}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-700 bg-white p-2 rounded border">
                    {noteEntry.notes}
                  </p>
                </div>
              ))}
              {notes.length > 3 && (
                <div className="text-center pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onCardClick('notes')}
                  >
                    Se alle {notes.length} notater
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <FileText className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <p>Ingen notater registrert for dette stedet ennå.</p>
            <p className="text-sm mt-2">
              Notater fra timeregistreringer vil vises her når de blir lagt til.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};