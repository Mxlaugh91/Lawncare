import { useState, useEffect } from 'react'; import { Input } from '@/components/ui/input'; import { Button } from '@/components/ui/button'; import { Popover, PopoverContent, PopoverTrigger, } from "@/components/ui/popover"; import { Search, Calendar } from 'lucide-react'; import { getISOWeekDates } from '@/lib/utils'; import { useSettingsStore } from '@/store/settingsStore';
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




Uke {selectedWeek}




Sesong: Uke {startWeek} - {endWeek}
{weeks.map(week => ( <Button key={week} variant={selectedWeek === week ? "default" : "ghost"} className="h-9 w-full" onClick={() => handleWeekSelect(week)} > {week} ))}
); };
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

{/* Mobile layout: Search and week selector side by side */}
<Input type="search" placeholder="Søk etter sted..." className="pl-8" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />

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