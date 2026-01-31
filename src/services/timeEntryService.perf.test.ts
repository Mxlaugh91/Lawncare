import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as timeEntryService from './timeEntryService';
import * as locationService from './locationService';
import * as userService from './userService';
import { getDocs } from 'firebase/firestore';

// Mock dependencies
vi.mock('./firebase', () => ({
  db: {}
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  getDocs: vi.fn(),
  doc: vi.fn(),
}));

// Mock services
vi.mock('./locationService', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual as any,
    getLocationById: vi.fn(),
    getLocationsByIds: vi.fn(),
  };
});

vi.mock('./userService', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual as any,
    getUserById: vi.fn(),
    getUsersByIds: vi.fn(),
  };
});

describe('getRecentTimeEntries Performance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should demonstrate optimized batch fetching', async () => {
    // Setup mock data
    const mockDocs = Array.from({ length: 5 }, (_, i) => ({
      id: `entry-${i}`,
      data: () => ({
        locationId: `loc-${i}`,
        employeeId: `emp-${i}`,
        date: new Date(),
        hours: 2
      })
    }));

    (getDocs as any).mockResolvedValue({
      docs: mockDocs,
      empty: false
    });

    (locationService.getLocationsByIds as any).mockResolvedValue(
      mockDocs.map((_, i) => ({ id: `loc-${i}`, name: `Location ${i}` }))
    );
    (userService.getUsersByIds as any).mockResolvedValue(
      mockDocs.map((_, i) => ({ id: `emp-${i}`, name: `User ${i}` }))
    );

    await timeEntryService.getRecentTimeEntries(5);

    // Verify batch calls
    expect(locationService.getLocationsByIds).toHaveBeenCalledTimes(1);
    expect(userService.getUsersByIds).toHaveBeenCalledTimes(1);

    // Verify single fetches are NOT called
    expect(locationService.getLocationById).not.toHaveBeenCalled();
    expect(userService.getUserById).not.toHaveBeenCalled();
  });
});
