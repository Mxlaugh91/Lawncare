import React, { useState } from 'react';
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
  { code: 'ua', name: 'ukrainian', flag: '🇺🇦' },
];

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ isOpen, onClose }) => {
  const { t, i18n } = useTranslation();
  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language);

  const handleLanguageSelect = (languageCode: string) => {
    setSelectedLanguage(languageCode);
  };

  const handleApplyLanguage = () => {
    i18n.changeLanguage(selectedLanguage);
    onClose();
  };

  const handleCancel = () => {
    setSelectedLanguage(i18n.language); // Reset to current language
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm mx-4">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Globe className="mr-2 h-5 w-5 text-primary" />
            {t('language.title')}
          </DialogTitle>
          <DialogDescription>
            {t('language.description')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-2 py-3">
          {languages.map((language) => (
            <div
              key={language.code}
              className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:bg-muted/50 ${
                selectedLanguage === language.code
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/30'
              }`}
              onClick={() => handleLanguageSelect(language.code)}
            >
              <div className="flex items-center space-x-2">
                <span className="text-xl">{language.flag}</span>
                <span className="font-medium text-sm">
                  {t(`language.${language.name}`)}
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                {i18n.language === language.code && (
                  <Badge variant="secondary" className="text-xs px-2 py-0">
                    Aktiv
                  </Badge>
                )}
                {selectedLanguage === language.code && (
                  <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-primary-foreground" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end space-x-2 pt-3 border-t">
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
            disabled={selectedLanguage === i18n.language}
          >
            {t('language.apply')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};