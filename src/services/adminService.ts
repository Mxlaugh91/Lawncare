import { getISOWeekNumber } from '@/lib/utils';
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
    // Get current week number
    const currentWeek = getISOWeekNumber(new Date());
    
    // Get locations with their weekly status
    const locationsWithStatus = await locationService.getLocationsWithWeeklyStatus(currentWeek);
    
    // Calculate remaining and completed locations
    const remainingLocations = locationsWithStatus.filter(
      loc => loc.status === 'ikke_utfort' || loc.status === 'planlagt'
    ).length;

    const completedThisWeek = locationsWithStatus.filter(
      loc => loc.status === 'fullfort'
    ).length;
    
    // Get weekly aggregated hours by employee
    const weeklyHours = await timeEntryService.getWeeklyAggregatedHoursByEmployee();
    
    // Get recent time entries
    const recentEntries = await timeEntryService.getRecentTimeEntries(5);
    
    return {
      remainingLocations,
      completedThisWeek,
      totalLocations: locationsWithStatus.length,
      activeEmployees: Object.keys(weeklyHours).length,
      recentActivity: recentEntries
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    throw new Error('Could not fetch dashboard statistics');
  }
};