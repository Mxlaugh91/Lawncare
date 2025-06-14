import React from 'react';
import { CheckCircle2, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const TimeEntryCompletedState = React.memo(() => {
  return (
    <Card className="card-hover border-0 bg-primary/5">
      <CardContent className="flex flex-col items-center text-center p-8 space-y-4">
        <div className="p-4 rounded-full bg-primary/10">
          <CheckCircle2 className="h-12 w-12 text-primary" />
        </div>
        <h3 className="text-xl font-semibold text-primary">Alle oppgaver fullført! 🎉</h3>
        <p className="text-muted-foreground max-w-sm">
          Flott jobba! Du har ingen steder som trenger vedlikehold denne uken.
        </p>
        <div className="flex space-x-2">
          <Badge className="bg-primary/10 text-primary border-primary/20">
            <Sparkles className="h-3 w-3 mr-1" />
            Perfekt score
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
});

TimeEntryCompletedState.displayName = 'TimeEntryCompletedState';