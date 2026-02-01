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

describe('getTimeEntriesForLocation Performance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should measure execution time for fetching many users', async () => {
    // 50 employees -> 5 chunks of 10
    const employeeIds = Array.from({ length: 50 }, (_, i) => `emp-${i}`);

    // Create mock docs
    const mockDocs = employeeIds.map((empId, i) => ({
      id: `entry-${i}`,
      data: () => ({
        locationId: 'loc-1',
        employeeId: empId,
        date: new Date(),
        hours: 2
      })
    }));

    vi.mocked(getDocs).mockResolvedValue({
      docs: mockDocs,
      empty: false
    } as Awaited<ReturnType<typeof getDocs>>);

    // Mock getUsersByIds with a delay
    vi.mocked(userService.getUsersByIds).mockImplementation(async (ids: string[]) => {
      await new Promise(resolve => setTimeout(resolve, 50)); // 50ms delay per call
      return ids.map(id => ({ id, name: `User ${id}` }));
    });

    const startTime = performance.now();
    await timeEntryService.getTimeEntriesForLocation('loc-1');
    const endTime = performance.now();

    const duration = endTime - startTime;
    console.log(`\n[Benchmark] getTimeEntriesForLocation with 50 employees: ${duration.toFixed(2)}ms\n`);
  });
});
