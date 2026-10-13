import { useCallback, useEffect, useState } from 'react';
import { getMessaging, getToken, isSupported, onMessage, MessagePayload } from 'firebase/messaging';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import * as userService from '@/services/userService';

const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

// FCM needs service workers and the Notification API to be available.
const canUseMessaging = () =>
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'Notification' in window;

/**
 * Foreground toast text is derived from the FCM `type`/`data` payload so it
 * follows the active language. The push payload mirrors the stored
 * notification document (Norwegian), which remains the fallback whenever no
 * template applies.
 */
const getForegroundNotificationText = (
  t: TFunction,
  notification: MessagePayload['notification'],
  data?: Record<string, string | undefined>
): { title: string; body: string } => {
  const fallbackTitle = notification?.title || data?.title || t('notifications.newNotification');
  const fallbackBody = notification?.body || data?.body || t('notifications.newNotificationDescription');

  switch (data?.type) {
    case 'job_tagged': {
      const location = data.locationName;
      return {
        title: t('notifications.jobTagged'),
        body: location
          ? t('notifications.jobTaggedDescription', { location })
          : fallbackBody,
      };
    }
    case 'time_entry_reminder': {
      const rawCount = data.pendingEntries;
      const count = rawCount ? Number(rawCount) : NaN;
      return {
        title: t('notifications.timeEntryReminder'),
        body: Number.isFinite(count)
          ? t('notifications.timeEntryReminderDescription', { count })
          : fallbackBody,
      };
    }
    case 'manual_job_reminder':
      return {
        title: t('notifications.manualJobReminder'),
        body: t('notifications.manualJobReminderDescription'),
      };
    case 'service_needed':
      return {
        title: t('notifications.serviceNeeded'),
        body: t('notifications.serviceNeededDescription'),
      };
    default:
      return { title: fallbackTitle, body: fallbackBody };
  }
};

// Side-effect free logging of the notification types we know about.
const handleNotificationAction = (data: Record<string, string | undefined>) => {
  const { type, locationId, timeEntryId, pendingEntries } = data;

  switch (type) {
    case 'job_tagged':
      console.log('Job tagged notification:', { locationId, timeEntryId });
      break;
    case 'time_entry_reminder':
      console.log('Time entry reminder:', { pendingEntries });
      break;
    case 'manual_job_reminder':
      console.log('Manual job reminder received');
      break;
    case 'service_needed':
      console.log('Service needed notification');
      break;
    default:
      console.log('Unknown notification type:', type);
  }
};

export const useFirebaseMessaging = () => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>(() =>
    canUseMessaging() ? Notification.permission : 'default'
  );

  // Permission is only ever requested from an explicit user action (the
  // "Aktiver varsler" control in the layouts). Never call this on mount:
  // browsers ignore or auto-block permission prompts without a user gesture.
  const requestPermissionAndGetToken = useCallback(async () => {
    if (!canUseMessaging()) {
      console.warn('Push notifications are not supported in this browser.');
      return;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result !== 'granted') {
        if (result === 'denied') {
          toast({
            title: 'Varsler blokkert',
            description: 'Push-varsler er blokkert. Tillat varsler i nettleserinnstillingene.',
            variant: 'destructive',
          });
        }
        return;
      }

      if (!currentUser) return;

      if (!(await isSupported())) {
        console.warn('Firebase Messaging is not supported in this browser.');
        return;
      }

      const messaging = getMessaging();

      // Use the registration created by vite-plugin-pwa when it exists.
      const registration = 'serviceWorker' in navigator
        ? await navigator.serviceWorker.ready
        : undefined;

      const token = await getToken(messaging, {
        vapidKey,
        ...(registration ? { serviceWorkerRegistration: registration } : {}),
      });

      if (!token) {
        console.log('No registration token available.');
        return;
      }

      setFcmToken(token);

      // Save token to user profile in Firestore
      await userService.updateUserFCMToken(currentUser.uid, token);
      console.log('FCM token saved to user profile.');
    } catch (error) {
      console.error('Error getting FCM token:', error);
      toast({
        title: 'Varsel-tillatelse',
        description: 'Kunne ikke aktivere push-varsler. Sjekk nettleserinnstillinger.',
        variant: 'destructive',
      });
    }
  }, [currentUser, toast]);

  // Foreground message listener. Skipped silently on browsers without
  // messaging support so a missing API can never blank the app.
  useEffect(() => {
    if (!currentUser || !canUseMessaging()) return;

    setPermission(Notification.permission);

    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    const setupMessageListener = async () => {
      try {
        if (!(await isSupported())) {
          console.warn('Firebase Messaging is not supported in this browser.');
          return;
        }
        if (cancelled) return;

        const messaging = getMessaging();

        unsubscribe = onMessage(messaging, (payload: MessagePayload) => {
          const { notification, data } = payload;

          if (!notification && !data) return;

          // Show localized toast notification when app is in foreground
          const { title, body } = getForegroundNotificationText(t, notification, data);
          toast({
            title,
            description: body,
          });

          if (data?.type) {
            handleNotificationAction(data);
          }
        });
      } catch (error) {
        console.warn('Foreground push messages are unavailable:', error);
      }
    };

    setupMessageListener();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [currentUser, toast, t]);

  const clearFCMToken = useCallback(async () => {
    if (!currentUser) return;

    try {
      await userService.removeUserFCMToken(currentUser.uid);
      setFcmToken(null);
      console.log('FCM token cleared from user profile');
    } catch (error) {
      console.error('Error clearing FCM token:', error);
    }
  }, [currentUser]);

  return {
    fcmToken,
    permission,
    requestPermissionAndGetToken,
    clearFCMToken,
  };
};
