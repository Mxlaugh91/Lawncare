import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK (only if not already initialized)
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const messaging = admin.messaging();

// Define types for better type safety
interface Notification {
  userId: string;
  title: string;
  message: string;
  type?: string;
  data?: {
    locationId?: string;
    locationName?: string;
    timeEntryId?: string;
    mowerId?: string;
    mowerName?: string;
    pendingEntries?: number;
  };
  read: boolean;
  createdAt: admin.firestore.FieldValue;
}

/**
 * Cloud Function that triggers when a new notification is created in Firestore
 * and sends a push notification to the target user via FCM
 */
export const sendPushNotification = functions.firestore
  .document('notifications/{notificationId}')
  .onCreate(async (snap, context) => {
    try {
      const notificationData = snap.data() as Notification;
      const notificationId = context.params.notificationId;

      console.log('Processing notification:', notificationId, notificationData);

      // Extract notification details
      const {
        userId,
        title,
        message,
        type,
        data: customData
      } = notificationData;

      if (!userId || !title || !message) {
        console.error('Missing required notification fields:', { userId, title, message });
        return;
      }

      // Get user's FCM token from users collection
      const userDoc = await db.collection('users').doc(userId).get();
      
      if (!userDoc.exists) {
        console.error('User not found:', userId);
        return;
      }

      const userData = userDoc.data();
      const fcmToken = userData?.fcmToken;

      if (!fcmToken) {
        console.log('User has no FCM token, skipping push notification:', userId);
        return;
      }

      // Construct the FCM message
      const fcmMessage: admin.messaging.Message = {
        token: fcmToken,
        notification: {
          title: title,
          body: message,
        },
        data: {
          notificationId: notificationId,
          type: type || 'general',
          ...(customData && typeof customData === 'object' ? 
            Object.fromEntries(
              Object.entries(customData).map(([key, value]) => [
                key, 
                typeof value === 'string' ? value : JSON.stringify(value)
              ])
            ) : {}
          )
        },
        // Android specific options
        android: {
          notification: {
            icon: 'ic_notification',
            color: '#22c55e',
            channelId: 'default',
            priority: 'high' as const,
            defaultSound: true,
          },
          priority: 'high' as const,
        },
        // iOS specific options
        apns: {
          payload: {
            aps: {
              alert: {
                title: title,
                body: message,
              },
              badge: 1,
              sound: 'default',
              category: type || 'general',
            },
          },
        },
        // Web push options
        webpush: {
          notification: {
            title: title,
            body: message,
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-192x192.png',
            tag: type || 'general',
            requireInteraction: true,
            actions: getNotificationActions(type),
          },
          fcmOptions: {
            link: getNotificationLink(type),
          },
        },
      };

      // Send the message
      const response = await messaging.send(fcmMessage);
      console.log('Successfully sent push notification:', response);

      // Optionally update the notification document to mark it as sent
      await snap.ref.update({
        pushSent: true,
        pushSentAt: admin.firestore.FieldValue.serverTimestamp(),
        fcmMessageId: response,
      });

    } catch (error) {
      console.error('Error sending push notification:', error);
      
      // Update the notification document to mark the error
      await snap.ref.update({
        pushSent: false,
        pushError: error instanceof Error ? error.message : 'Unknown error',
        pushErrorAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  });

/**
 * Helper function to get notification actions based on type
 */
function getNotificationActions(type?: string): Array<{ action: string; title: string }> {
  switch (type) {
    case 'job_tagged':
      return [
        { action: 'open_time_entry', title: 'Registrer timer' },
        { action: 'dismiss', title: 'Lukk' }
      ];
    case 'time_entry_reminder':
      return [
        { action: 'open_pending', title: 'Se ufullførte' },
        { action: 'dismiss', title: 'Lukk' }
      ];
    case 'service_needed':
      return [
        { action: 'open_equipment', title: 'Se utstyr' },
        { action: 'dismiss', title: 'Lukk' }
      ];
    default:
      return [
        { action: 'open_app', title: 'Åpne app' },
        { action: 'dismiss', title: 'Lukk' }
      ];
  }
}

/**
 * Helper function to get the appropriate link based on notification type
 */
function getNotificationLink(type?: string): string {
  const baseUrl = '/Lawncare/#/employee';
  
  switch (type) {
    case 'job_tagged':
      return `${baseUrl}/timeregistrering`;
    case 'time_entry_reminder':
      return `${baseUrl}/historikk`;
    case 'manual_job_reminder':
      return baseUrl;
    case 'service_needed':
      return '/Lawncare/#/admin/vedlikehold';
    default:
      return baseUrl;
  }
}

/**
 * Optional: Cloud Function to send bulk notifications
 * Useful for sending notifications to multiple users at once
 */
export const sendBulkNotifications = functions.https.onCall(async (data, context) => {
  // Verify that the user is authenticated and is an admin
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const userDoc = await db.collection('users').doc(context.auth.uid).get();
  const userData = userDoc.data();
  
  if (!userData || userData.role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can send bulk notifications');
  }

  try {
    const { userIds, title, message, type, customData } = data;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      throw new functions.https.HttpsError('invalid-argument', 'userIds must be a non-empty array');
    }

    if (!title || !message) {
      throw new functions.https.HttpsError('invalid-argument', 'title and message are required');
    }

    // Create notifications for each user
    const batch = db.batch();
    const notifications: Array<{ id: string; userId: string }> = [];

    userIds.forEach((userId: string) => {
      const notificationRef = db.collection('notifications').doc();
      const notificationData = {
        userId,
        title,
        message,
        type: type || 'general',
        data: customData || {},
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      
      batch.set(notificationRef, notificationData);
      notifications.push({ id: notificationRef.id, userId });
    });

    await batch.commit();

    console.log(`Successfully created ${notifications.length} bulk notifications`);
    
    return {
      success: true,
      notificationsCreated: notifications.length,
      notifications: notifications
    };

  } catch (error) {
    console.error('Error sending bulk notifications:', error);
    throw new functions.https.HttpsError('internal', 'Failed to send bulk notifications');
  }
});

/**
 * Optional: Cloud Function to clean up old notifications
 * Runs daily to remove notifications older than 30 days
 */
export const cleanupOldNotifications = functions.pubsub
  .schedule('0 2 * * *') // Run daily at 2 AM
  .timeZone('Europe/Oslo')
  .onRun(async (_context) => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const oldNotificationsQuery = db
        .collection('notifications')
        .where('createdAt', '<', admin.firestore.Timestamp.fromDate(thirtyDaysAgo));

      const snapshot = await oldNotificationsQuery.get();
      
      if (snapshot.empty) {
        console.log('No old notifications to clean up');
        return;
      }

      const batch = db.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      console.log(`Successfully deleted ${snapshot.size} old notifications`);

    } catch (error) {
      console.error('Error cleaning up old notifications:', error);
    }
  });