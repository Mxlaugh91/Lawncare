/**
 * Import and re-export all Cloud Functions
 * This is the main entry point for Firebase Cloud Functions
 */

// Import notification-related functions
import {
  sendPushNotification,
  sendBulkNotifications,
  cleanupOldNotifications
} from './notifications';

// Export all functions so Firebase can discover and deploy them
export {
  sendPushNotification,
  sendBulkNotifications,
  cleanupOldNotifications
};

// You can add more function exports here as your project grows
// For example:
// export { someOtherFunction } from './otherModule';