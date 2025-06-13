import { useEffect, useState } from 'react';
import { getMessaging, getToken, onMessage, MessagePayload } from 'firebase/messaging';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import * as userService from '@/services/userService';

const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

export const useFirebaseMessaging = () => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  const requestPermissionAndGetToken = async () => {
    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      setPermission(permission);

      if (permission === 'granted' && currentUser) {
        const messaging = getMessaging();
        
        // Get FCM token
        const token = await getToken(messaging, {
          vapidKey: vapidKey
        });

        if (token) {
          setFcmToken(token);
          
          // Save token to user profile in Firestore
          await userService.updateUserFCMToken(currentUser.uid, token);
          
          console.log('FCM token saved to user profile:', token);
        } else {
          console.log('No registration token available.');
        }
      }
    } catch (error) {
      console.error('Error getting FCM token:', error);
      toast({
        title: 'Varsel-tillatelse',
        description: 'Kunne ikke aktivere push-varsler. Sjekk nettleserinnstillinger.',
        variant: 'destructive',
      });
    }
  };

  const setupMessageListener = () => {
    if (!currentUser) return;

    const messaging = getMessaging();
    
    // Listen for foreground messages
    const unsubscribe = onMessage(messaging, (payload: MessagePayload) => {
      console.log('Foreground message received:', payload);
      
      const { notification, data } = payload;
      
      if (notification) {
        // Show toast notification when app is in foreground
        toast({
          title: notification.title || 'Nytt varsel',
          description: notification.body || 'Du har mottatt et nytt varsel',
        });

        // Handle different notification types
        if (data?.type) {
          handleNotificationAction(data);
        }
      }
    });

    return unsubscribe;
  };

  const handleNotificationAction = (data: any) => {
    const { type, locationId, timeEntryId, pendingEntries } = data;
    
    switch (type) {
      case 'job_tagged':
        // Could navigate to time entry form or show specific dialog
        console.log('Job tagged notification:', { locationId, timeEntryId });
        break;
      case 'time_entry_reminder':
        // Could navigate to pending time entries
        console.log('Time entry reminder:', { pendingEntries });
        break;
      case 'manual_job_reminder':
        // Could navigate to dashboard or time entry form
        console.log('Manual job reminder received');
        break;
      case 'service_needed':
        // Could navigate to equipment page
        console.log('Service needed notification');
        break;
      default:
        console.log('Unknown notification type:', type);
    }
  };

  const clearFCMToken = async () => {
    if (currentUser) {
      try {
        await userService.removeUserFCMToken(currentUser.uid);
        setFcmToken(null);
        console.log('FCM token cleared from user profile');
      } catch (error) {
        console.error('Error clearing FCM token:', error);
      }
    }
  };

  useEffect(() => {
    if (currentUser && 'serviceWorker' in navigator && 'Notification' in window) {
      // Check current permission status
      setPermission(Notification.permission);
      
      // Set up message listener
      const unsubscribe = setupMessageListener();
      
      // Auto-request permission if not already decided
      if (Notification.permission === 'default') {
        requestPermissionAndGetToken();
      } else if (Notification.permission === 'granted') {
        requestPermissionAndGetToken();
      }

      return unsubscribe;
    }
  }, [currentUser]);

  return {
    fcmToken,
    permission,
    requestPermissionAndGetToken,
    clearFCMToken,
  };
};