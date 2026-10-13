import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDocs, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  Unsubscribe
} from 'firebase/firestore';
import { db } from './firebase';
import { Notification } from '@/types';

const unreadNotificationsQuery = (userId: string) => query(
  collection(db, 'notifications'),
  where('userId', '==', userId),
  where('read', '==', false),
  orderBy('createdAt', 'desc')
);

export const addNotification = async (notificationData: Omit<Notification, 'id' | 'createdAt' | 'read'>) => {
  try {
    const docRef = await addDoc(collection(db, 'notifications'), {
      ...notificationData,
      read: false,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding notification:', error);
    throw new Error('Could not create notification');
  }
};

export const getUnreadNotifications = async (userId: string) => {
  try {
    const querySnapshot = await getDocs(unreadNotificationsQuery(userId));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Notification[];
  } catch (error) {
    console.error('Error getting unread notifications:', error);
    throw new Error('Could not fetch notifications');
  }
};

/**
 * Live unread notifications for a user. Keeps the notification bell in sync
 * without a page reload. Remember to call the returned unsubscribe function
 * from the effect cleanup.
 */
export const subscribeToUnreadNotifications = (
  userId: string,
  onNotifications: (notifications: Notification[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  return onSnapshot(
    unreadNotificationsQuery(userId),
    (querySnapshot) => {
      onNotifications(
        querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Notification[]
      );
    },
    (error) => {
      console.error('Error subscribing to unread notifications:', error);
      onError?.(error);
    }
  );
};

export const markNotificationAsRead = async (notificationId: string) => {
  try {
    const docRef = doc(db, 'notifications', notificationId);
    await updateDoc(docRef, {
      read: true
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw new Error('Could not update notification');
  }
};

export const markAllNotificationsAsRead = async (userId: string) => {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('read', '==', false)
    );
    
    const querySnapshot = await getDocs(q);
    const updatePromises = querySnapshot.docs.map(doc => 
      updateDoc(doc.ref, { read: true })
    );
    
    await Promise.all(updatePromises);
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw new Error('Could not update notifications');
  }
};