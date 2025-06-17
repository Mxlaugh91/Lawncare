import React from 'react';
import { FileText, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { UseFormRegister } from 'react-hook-form';

interface TimeEntryNotesProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  register: UseFormRegister<any>;
}

export const TimeEntryNotes = React.memo(({ 
  isOpen, 
  onOpenChange, 
  register 
}: TimeEntryNotesProps) => {
  return (
    <Collapsible open={isOpen} onOpenChange={onOpenChange}>
      <Card className="card-hover">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/30 active:bg-muted transition-all duration-200">
            <CardTitle className="flex items-center justify-between text-lg font-semibold">
              <div className="flex items-center">
                <div className="p-2 rounded-full bg-primary/10 mr-3">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div className="flex flex-col items-start">
                  <span>Notater</span>
                  <span className="text-xs text-muted-foreground font-normal">Legg til merknader om jobben</span>
                </div>
                <Badge variant="outline" className="ml-3">Valgfritt</Badge>
              </div>
              <ChevronDown className={`h-5 w-5 transition-transform duration-300 text-muted-foreground ${isOpen ? 'rotate-180' : ''}`} />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>
            <Textarea
              placeholder="💭 Skriv eventuelle merknader om jobben her..."
              className="min-h-[100px] resize-none border-2 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
              {...register('notes')}
            />
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
});

TimeEntryNotes.displayName = 'TimeEntryNotes';