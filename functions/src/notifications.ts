import { onDocumentCreated, onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onCall } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK (only if not already initialized)
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const messaging = admin.messaging();

// Firestore caps a single write batch at 500 operations.
const FIRESTORE_BATCH_LIMIT = 500;

// Maximum number of unique recipients accepted by a single sendBulkNotifications call.
const MAX_BULK_RECIPIENTS = 500;

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

interface BulkNotificationData {
  userIds: string[];
  title: string;
  message: string;
  type?: string;
  customData?: Record<string, unknown>;
}

/**
 * Cloud Function that triggers when a new notification is created in Firestore
 * and sends a push notification to the target user via FCM
 */
export const sendPushNotification = onDocumentCreated(
  'notifications/{notificationId}',
  async (event) => {
    try {
      const snap = event.data;
      if (!snap) {
        console.error('No data in document snapshot');
        return;
      }

      const notificationData = snap.data() as Notification;
      const notificationId = event.params.notificationId;

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
          ...(customData && typeof customData === 'object' ? 
            Object.fromEntries(
              Object.entries(customData).map(([key, value]) => [
                key, 
                typeof value === 'string' ? value : JSON.stringify(value)
              ])
            ) : {}
          ),
          // System keys are set after customData so they cannot be overridden.
          notificationId: notificationId,
          type: type || 'general',
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
      if (event.data) {
        await event.data.ref.update({
          pushSent: false,
          pushError: error instanceof Error ? error.message : 'Unknown error',
          pushErrorAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }
  }
);

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
export const sendBulkNotifications = onCall<BulkNotificationData>(
  async (request) => {
    // Verify that the user is authenticated and is an admin
    if (!request.auth) {
      throw new Error('User must be authenticated');
    }

    const userDoc = await db.collection('users').doc(request.auth.uid).get();
    const userData = userDoc.data();
    
    if (!userData || userData.role !== 'admin') {
      throw new Error('Only admins can send bulk notifications');
    }

    try {
      const { userIds: rawUserIds, title, message, type, customData } = request.data;

      if (!rawUserIds || !Array.isArray(rawUserIds) || rawUserIds.length === 0) {
        throw new Error('userIds must be a non-empty array');
      }

      // De-duplicate and cap the recipient list so a single call cannot fan out indefinitely.
      const userIds = Array.from(
        new Set(rawUserIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0))
      );

      if (userIds.length === 0) {
        throw new Error('userIds must contain at least one non-empty string');
      }

      if (userIds.length > MAX_BULK_RECIPIENTS) {
        throw new Error(`userIds must contain at most ${MAX_BULK_RECIPIENTS} unique recipients`);
      }

      if (!title || !message) {
        throw new Error('title and message are required');
      }

      // Create notifications for each user
      const notifications = await processBulkNotifications(
        db,
        userIds,
        title,
        message,
        type,
        customData
      );

      console.log(`Successfully created ${notifications.length} bulk notifications`);
      
      return {
        success: true,
        notificationsCreated: notifications.length,
        notifications: notifications
      };

    } catch (error) {
      console.error('Error sending bulk notifications:', error);
      throw new Error('Failed to send bulk notifications');
    }
  }
);

/**
 * Helper function to process bulk notifications
 * Extracted for better testing and batch handling
 */
export async function processBulkNotifications(
  db: admin.firestore.Firestore,
  userIds: string[],
  title: string,
  message: string,
  type?: string,
  customData?: Record<string, unknown>
): Promise<Array<{ id: string; userId: string }>> {
  const notifications: Array<{ id: string; userId: string }> = [];
  const BATCH_SIZE = 500;

  // Split userIds into chunks
  const chunks: string[][] = [];
  for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
    chunks.push(userIds.slice(i, i + BATCH_SIZE));
  }

  // Process batches in parallel
  await Promise.all(chunks.map(async (chunk) => {
    const batch = db.batch();

    chunk.forEach((userId) => {
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
  }));

  return notifications;
}

/**
 * Optional: Cloud Function to clean up old notifications
 * Runs daily to remove notifications older than 30 days
 */
export const cleanupOldNotifications = onSchedule(
  {
    schedule: '0 2 * * *', // Run daily at 2 AM
    timeZone: 'Europe/Oslo'
  },
  async () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoff = admin.firestore.Timestamp.fromDate(thirtyDaysAgo);

    let totalDeleted = 0;

    try {
      // Firestore caps a batch at 500 writes, so delete in pages until no
      // stale notifications remain instead of committing one giant batch.
      for (;;) {
        const snapshot = await db
          .collection('notifications')
          .where('createdAt', '<', cutoff)
          .limit(FIRESTORE_BATCH_LIMIT)
          .get();

        if (snapshot.empty) {
          break;
        }

        const batch = db.batch();
        snapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });
        await batch.commit();

        totalDeleted += snapshot.size;
        console.log(`Deleted ${snapshot.size} old notifications (${totalDeleted} total this run)`);
      }

      if (totalDeleted === 0) {
        console.log('No old notifications to clean up');
      } else {
        console.log(`Successfully deleted ${totalDeleted} old notifications`);
      }
    } catch (error) {
      // Re-throw so the failure is visible in Cloud Logging and the next run can retry.
      console.error(`Error cleaning up old notifications after deleting ${totalDeleted} documents:`, error);
      throw error;
    }
  }
);

/**
 * Shapes a users document into the exact fields mirrored in userDirectory.
 */
function buildUserDirectoryEntry(user: Record<string, unknown>): {
  name: string;
  role: string;
  updatedAt: admin.firestore.FieldValue;
} {
  return {
    name: typeof user.name === 'string' ? user.name : '',
    role: typeof user.role === 'string' ? user.role : '',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
}

/**
 * Keeps the userDirectory mirror collection in sync with the users collection.
 * The mirror only contains { name, role, updatedAt } so client reads can be locked down.
 */
export const syncUserDirectory = onDocumentWritten(
  'users/{userId}',
  async (event) => {
    const userId = event.params.userId;

    const after = event.data?.after;
    if (!after) {
      console.error('syncUserDirectory: no event data for user', userId);
      return;
    }

    const userDirectoryRef = db.collection('userDirectory').doc(userId);

    // User document deleted: remove the mirror document as well.
    if (!after.exists) {
      await userDirectoryRef.delete();
      console.log(`Removed userDirectory entry for deleted user ${userId}`);
      return;
    }

    await userDirectoryRef.set(buildUserDirectoryEntry(after.data() ?? {}));
    console.log(`Synced userDirectory entry for user ${userId}`);
  }
);

/**
 * Admin-only callable that backfills the userDirectory mirror for users that
 * existed before syncUserDirectory was deployed. Safe to re-run (idempotent).
 */
export const backfillUserDirectory = onCall(async (request) => {
  if (!request.auth) {
    throw new Error('User must be authenticated');
  }

  const callerDoc = await db.collection('users').doc(request.auth.uid).get();
  if (callerDoc.data()?.role !== 'admin') {
    throw new Error('Only admins can backfill the user directory');
  }

  let lastUserId: string | undefined;
  let totalSynced = 0;

  for (;;) {
    let usersQuery: admin.firestore.Query = db
      .collection('users')
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(FIRESTORE_BATCH_LIMIT);

    if (lastUserId) {
      usersQuery = usersQuery.startAfter(lastUserId);
    }

    const snapshot = await usersQuery.get();
    if (snapshot.empty) {
      break;
    }

    const batch = db.batch();
    snapshot.docs.forEach((userDoc) => {
      batch.set(db.collection('userDirectory').doc(userDoc.id), buildUserDirectoryEntry(userDoc.data()));
    });
    await batch.commit();

    totalSynced += snapshot.size;
    lastUserId = snapshot.docs[snapshot.docs.length - 1].id;

    if (snapshot.size < FIRESTORE_BATCH_LIMIT) {
      break;
    }
  }

  console.log(`Backfilled ${totalSynced} userDirectory entries`);
  return { success: true, usersSynced: totalSynced };
});