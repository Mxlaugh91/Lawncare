import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs 
} from 'firebase/firestore';
import { db } from './firebase';
import * as locationService from './locationService';
import * as timeEntryService from './timeEntryService';

export interface DashboardStats {
  remainingLocations: number;
  completedThisWeek: number;
  totalLocations: number;
  activeEmployees: number;
  recentActivity: any[];
}

export const getDashboardStats = async (): Promise<DashboardStats> => {
  try {
    // Get all active locations
    const activeLocations = await locationService.getActiveLocations();
    
    // Get locations due for service
    const dueLocations = await locationService.getLocationsDueForService();
    
    // Get weekly aggregated hours by employee
    const weeklyHours = await timeEntryService.getWeeklyAggregatedHoursByEmployee();
    
    // Get recent time entries
    const recentEntries = await timeEntryService.getRecentTimeEntries(5);
    
    return {
      remainingLocations: dueLocations.length,
      completedThisWeek: recentEntries.length,
      totalLocations: activeLocations.length,
      activeEmployees: Object.keys(weeklyHours).length,
      recentActivity: recentEntries
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    throw new Error('Could not fetch dashboard statistics');
  }
};