import { create } from 'zustand';
import { Notification } from '@/types';
import * as notificationService from '@/services/notificationService';

interface NotificationState {
  notifications: Notification[];
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchUnreadNotifications: (userId: string) => Promise<void>;
  addNotification: (notificationData: Omit<Notification, 'id' | 'createdAt' | 'read'>) => Promise<string>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: (userId: string) => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  loading: false,
  error: null,

  fetchUnreadNotifications: async (userId) => {
    try {
      set({ loading: true, error: null });
      const notifications = await notificationService.getUnreadNotifications(userId);
      set({ notifications, loading: false });
    } catch (error) {
      set({ error: 'Failed to fetch notifications', loading: false });
      throw error;
    }
  },

  addNotification: async (notificationData) => {
    try {
      set({ loading: true, error: null });
      const notificationId = await notificationService.addNotification(notificationData);
      await get().fetchUnreadNotifications(notificationData.userId);
      return notificationId;
    } catch (error) {
      set({ error: 'Failed to add notification', loading: false });
      throw error;
    }
  },

  markAsRead: async (notificationId) => {
    try {
      set({ loading: true, error: null });
      await notificationService.markNotificationAsRead(notificationId);
      set(state => ({
        notifications: state.notifications.filter(n => n.id !== notificationId),
        loading: false,
      }));
    } catch (error) {
      set({ error: 'Failed to mark notification as read', loading: false });
      throw error;
    }
  },

  markAllAsRead: async (userId) => {
    try {
      set({ loading: true, error: null });
      await notificationService.markAllNotificationsAsRead(userId);
      set({ notifications: [], loading: false });
    } catch (error) {
      set({ error: 'Failed to mark all notifications as read', loading: false });
      throw error;
    }
  },
}));