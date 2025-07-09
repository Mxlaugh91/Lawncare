import React from 'react';
import { useTranslation } from 'react-i18next';
import { Wrench, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Mower } from '@/types';

interface TimeEntryEquipmentProps {
  mowers: Mower[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onMowerChange: (value: string) => void;
}

export const TimeEntryEquipment = React.memo(({ 
  mowers, 
  isOpen, 
  onOpenChange, 
  onMowerChange 
}: TimeEntryEquipmentProps) => {
  const { t } = useTranslation();

  const handleMowerChange = React.useCallback((value: string) => {
    onMowerChange(value === 'none' ? '' : value);
  }, [onMowerChange]);

  return (
    <Collapsible open={isOpen} onOpenChange={onOpenChange}>
      <Card className="card-hover">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 active:bg-muted transition-all duration-200">
            <CardTitle className="flex items-center justify-between text-lg font-semibold">
              <div className="flex items-center">
                <div className="p-2 rounded-full bg-muted mr-3">
                  <Wrench className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex flex-col items-start">
                  <span>{t('timeEntry.equipment')}</span>
                  <span className="text-xs text-muted-foreground font-normal">{t('timeEntry.equipmentDescription')}</span>
                </div>
                <Badge variant="outline" className="ml-3">{t('timeEntry.optional')}</Badge>
              </div>
              <ChevronDown className={`h-5 w-5 transition-transform duration-300 text-muted-foreground ${isOpen ? 'rotate-180' : ''}`} />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>
            <Select onValueChange={handleMowerChange}>
              <SelectTrigger className="h-12 border-2 hover:border-primary/50 transition-colors">
                <SelectValue placeholder={t('timeEntry.selectMower')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none" className="py-3">
                  <span className="text-muted-foreground">{t('timeEntry.noMowerUsed')}</span>
                </SelectItem>
                {mowers.map((mower) => (
                  <SelectItem key={mower.id} value={mower.id} className="py-3">
                    <div className="flex flex-col">
                      <span className="font-medium">{mower.name}</span>
                      <span className="text-sm text-muted-foreground">{mower.model}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
});

TimeEntryEquipment.displayName = 'TimeEntryEquipment';