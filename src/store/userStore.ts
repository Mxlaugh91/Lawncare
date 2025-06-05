import { create } from 'zustand';
import { User } from '@/types';
import * as userService from '@/services/userService';

interface UserState {
  users: User[];
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchUsers: () => Promise<void>;
  addEmployee: (employeeData: { email: string; name: string; }) => Promise<string>;
  getUserById: (userId: string) => Promise<User | null>;
  getUsersByIds: (userIds: string[]) => Promise<User[]>;
  
  // Computed values / Selectors
  getEmployees: () => User[];
  getAdmins: () => User[];
}

export const useUserStore = create<UserState>((set, get) => ({
  users: [],
  loading: false,
  error: null,

  fetchUsers: async () => {
    try {
      set({ loading: true, error: null });
      const employees = await userService.getAllEmployees();
      set({ users: employees, loading: false });
    } catch (error) {
      set({ error: 'Failed to fetch users', loading: false });
      throw error;
    }
  },

  addEmployee: async (employeeData) => {
    try {
      set({ loading: true, error: null });
      const employeeId = await userService.addEmployee(employeeData);
      await get().fetchUsers(); // Refresh the users list
      return employeeId;
    } catch (error) {
      set({ error: 'Failed to add employee', loading: false });
      throw error;
    }
  },

  getUserById: async (userId) => {
    try {
      return await userService.getUserById(userId);
    } catch (error) {
      set({ error: 'Failed to get user' });
      throw error;
    }
  },

  getUsersByIds: async (userIds) => {
    try {
      return await userService.getUsersByIds(userIds);
    } catch (error) {
      set({ error: 'Failed to get users' });
      throw error;
    }
  },

  // Selectors
  getEmployees: () => {
    return get().users.filter(user => user.role === 'employee');
  },

  getAdmins: () => {
    return get().users.filter(user => user.role === 'admin');
  },
}));