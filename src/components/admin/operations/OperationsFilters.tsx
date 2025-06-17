import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Search, Calendar } from 'lucide-react';
import { getISOWeekDates } from '@/lib/utils';
import { useSettingsStore } from '@/store/settingsStore';

interface OperationsFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedWeek: number;
  onWeekChange: (week: number) => void;
}

const WeekSelector = ({ 
  selectedWeek, 
  onWeekChange,
  startWeek = 1,
  endWeek = 53
}: { 
  selectedWeek: number; 
  onWeekChange: (week: number) => void;
  startWeek?: number;
  endWeek?: number;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Generate weeks array based on season settings
  const weeks = Array.from(
    { length: endWeek - startWeek + 1 }, 
    (_, i) => startWeek + i
  );
  
  const { start, end } = getISOWeekDates(selectedWeek);

  // Format dates using Norwegian locale
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('no-NO', {
      day: '2-digit',
      month: '2-digit'
    });
  };

  const handleWeekSelect = (week: number) => {
    onWeekChange(week);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-[170px] justify-start">
          <Calendar className="mr-2 h-4 w-4" />
          Uke {selectedWeek} ({formatDate(start)} - {formatDate(end)})
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <div className="p-4">
          <div className="text-sm text-muted-foreground mb-3">
            Sesong: Uke {startWeek} - {endWeek}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {weeks.map(week => (
              <Button
                key={week}
                variant={selectedWeek === week ? "default" : "ghost"}
                className="h-9 w-full"
                onClick={() => handleWeekSelect(week)}
              >
                {week}
              </Button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export const OperationsFilters = ({ 
  searchQuery, 
  setSearchQuery, 
  selectedWeek, 
  onWeekChange 
}: OperationsFiltersProps) => {
  const { seasonSettings, fetchSeasonSettings } = useSettingsStore();

  // Fetch season settings on component mount
  useEffect(() => {
    if (!seasonSettings) {
      fetchSeasonSettings();
    }
  }, [seasonSettings, fetchSeasonSettings]);

  return (
    <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0 mb-6">
      <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 md:items-center">
        <div className="relative flex-grow max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Søk etter sted eller adresse..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <WeekSelector 
          selectedWeek={selectedWeek} 
          onWeekChange={onWeekChange}
          startWeek={seasonSettings?.startWeek || 18}
          endWeek={seasonSettings?.endWeek || 42}
        />
      </div>
    </div>
  );
};