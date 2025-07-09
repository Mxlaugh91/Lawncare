import React from 'react';
import { useTranslation } from 'react-i18next';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TimeEntrySubmitButtonProps {
  isSubmitting: boolean;
  onSubmit: () => void;
}

export const TimeEntrySubmitButton = React.memo(({ 
  isSubmitting, 
  onSubmit 
}: TimeEntrySubmitButtonProps) => {
  const { t } = useTranslation();

  return (
    <div className="sticky bottom-4 z-10">
      <Button 
        onClick={onSubmit}
        className="w-full h-16 text-lg font-semibold bg-primary hover:bg-primary/90 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] button-effect" 
        disabled={isSubmitting}
        size="lg"
      >
        {isSubmitting ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3" />
            {t('timeEntry.submitting')}
          </>
        ) : (
          <>
            <Save className="mr-3 h-5 w-5" />
            {t('timeEntry.submitButton')}
          </>
        )}
      </Button>
    </div>
  );
});

TimeEntrySubmitButton.displayName = 'TimeEntrySubmitButton';