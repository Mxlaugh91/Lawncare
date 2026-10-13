import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Globe } from 'lucide-react';

interface LanguageSelectorProps {
  isOpen: boolean;
  onClose: () => void;
}

const languages = [
  { code: 'no', name: 'norwegian', flag: '🇳🇴' },
  { code: 'pl', name: 'polish', flag: '🇵🇱' },
  // "uk" is the valid language tag for Ukrainian (previously the invalid "ua").
  { code: 'uk', name: 'ukrainian', flag: '🇺🇦' },
];

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ isOpen, onClose }) => {
  const { t, i18n } = useTranslation();
  const resolvedLanguage = i18n.resolvedLanguage ?? 'no';
  const [selectedLanguage, setSelectedLanguage] = useState(resolvedLanguage);

  // Keep the selection in sync when the language changes elsewhere.
  useEffect(() => {
    setSelectedLanguage(i18n.resolvedLanguage ?? 'no');
  }, [i18n.resolvedLanguage]);

  const handleLanguageSelect = (languageCode: string) => {
    setSelectedLanguage(languageCode);
  };

  const handleApplyLanguage = () => {
    i18n.changeLanguage(selectedLanguage);
    onClose();
  };

  const handleCancel = () => {
    setSelectedLanguage(resolvedLanguage); // Reset to current language
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xs mx-auto p-4">
        <DialogHeader>
          <DialogTitle className="flex items-center text-base">
            <Globe className="mr-2 h-5 w-5 text-primary" />
            {t('language.title')}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {t('language.description')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-2 py-2" role="radiogroup" aria-label={t('language.title')}>
          {languages.map((language) => (
            <button
              key={language.code}
              type="button"
              role="radio"
              aria-checked={selectedLanguage === language.code}
              className={`w-full flex items-center justify-between p-2 rounded-md border cursor-pointer transition-all duration-200 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                selectedLanguage === language.code
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50'
              }`}
              onClick={() => handleLanguageSelect(language.code)}
            >
              <div className="flex items-center space-x-3">
                <span className="text-lg">{language.flag}</span>
                <span className="font-medium text-sm">
                  {t(`language.${language.name}`)}
                </span>
              </div>
              
              <div className="flex items-center space-x-1">
                {resolvedLanguage === language.code && (
                  <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">
                    Aktiv
                  </Badge>
                )}
                {selectedLanguage === language.code && (
                  <div className="w-3.5 h-3.5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-2 h-2 text-primary-foreground" />
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

        <div className="flex justify-end space-x-2 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancel}
          >
            {t('language.cancel')}
          </Button>
          <Button
            size="sm"
            onClick={handleApplyLanguage}
            disabled={selectedLanguage === resolvedLanguage}
          >
            {t('language.apply')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};