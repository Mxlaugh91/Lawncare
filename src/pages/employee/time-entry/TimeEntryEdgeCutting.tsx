import React from 'react';
import { Scissors, Zap, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface TimeEntryEdgeCuttingProps {
  edgeCuttingDone: boolean;
  edgeCuttingNeeded: boolean;
  onEdgeCuttingChange: (checked: boolean) => void;
}

export const TimeEntryEdgeCutting = React.memo(({ 
  edgeCuttingDone, 
  edgeCuttingNeeded, 
  onEdgeCuttingChange 
}: TimeEntryEdgeCuttingProps) => {
  const handleChange = React.useCallback((checked: boolean) => {
    onEdgeCuttingChange(checked);
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  }, [onEdgeCuttingChange]);

  return (
    <Card className="card-hover">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between p-4 rounded-xl bg-amber-50 border border-amber-200">
          <div className="flex-1">
            <Label htmlFor="edgeCuttingDone" className="text-base font-semibold flex items-center">
              <div className="p-2 rounded-full bg-amber-100 mr-3">
                <Scissors className="h-5 w-5 text-amber-600" />
              </div>
              Kantklipping utført
            </Label>
            {edgeCuttingNeeded && !edgeCuttingDone && (
              <p className="text-sm text-amber-700 flex items-center mt-2 ml-11 animate-pulse">
                <Zap className="mr-1 h-3 w-3" />
                Anbefales for dette stedet
              </p>
            )}
            {edgeCuttingDone && (
              <p className="text-sm text-primary flex items-center mt-2 ml-11">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Kantklipping registrert
              </p>
            )}
          </div>
          <Switch
            id="edgeCuttingDone"
            checked={edgeCuttingDone}
            onCheckedChange={handleChange}
            className="scale-125 data-[state=checked]:bg-primary"
          />
        </div>
      </CardContent>
    </Card>
  );
});

TimeEntryEdgeCutting.displayName = 'TimeEntryEdgeCutting';