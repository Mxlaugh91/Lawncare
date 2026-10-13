import { useTranslation } from 'react-i18next';
import { Bell, BellOff } from 'lucide-react';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';

interface NotificationSettingsItemsProps {
  permission: NotificationPermission;
  onEnable: () => void;
  onDisable: () => void;
}

/**
 * Push notification opt-in control for the layout user menus.
 * The browser permission prompt only ever runs from this explicit user action.
 */
export function NotificationSettingsItems({
  permission,
  onEnable,
  onDisable,
}: NotificationSettingsItemsProps) {
  const { t } = useTranslation();

  if (permission === 'granted') {
    return (
      <DropdownMenuItem onClick={onDisable}>
        <BellOff className="mr-2 h-4 w-4" />
        <span>{t('notifications.disablePush')}</span>
      </DropdownMenuItem>
    );
  }

  if (permission === 'denied') {
    return (
      <DropdownMenuItem disabled>
        <BellOff className="mr-2 h-4 w-4" />
        <span>{t('notifications.pushBlocked')}</span>
      </DropdownMenuItem>
    );
  }

  return (
    <DropdownMenuItem onClick={onEnable}>
      <Bell className="mr-2 h-4 w-4" />
      <span>{t('notifications.enablePush')}</span>
    </DropdownMenuItem>
  );
}
