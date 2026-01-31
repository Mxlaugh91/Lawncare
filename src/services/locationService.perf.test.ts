import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getLocationsWithWeeklyStatus } from './locationService';
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
  Timestamp: {
    fromDate: (date: Date) => date,
  }
}));

describe('getLocationsWithWeeklyStatus Performance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should measure execution time for batch fetching', async () => {
    const NUM_LOCATIONS = 91;
    const DELAY_MS = 50;

    // Create mock locations
    const mockLocations = Array.from({ length: NUM_LOCATIONS }, (_, i) => ({
      id: `loc-${i}`,
      data: () => ({
        name: `Location ${i}`,
        isArchived: false,
        maintenanceFrequency: 1,
        edgeCuttingFrequency: 1,
        startWeek: 1
      })
    }));

    let callCount = 0;
    (getDocs as any).mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
      callCount++;

      // First call is locations
      if (callCount === 1) {
         return {
           docs: mockLocations,
           empty: false
         };
      }

      // Subsequent calls are time entries (and users if any)
      // Return empty to avoid triggering user loop
      return {
        docs: [],
        empty: true
      };
    });

    const start = Date.now();
    await getLocationsWithWeeklyStatus(10);
    const end = Date.now();
    const duration = end - start;

    console.log(`Execution time: ${duration}ms`);

    // With 91 locations and chunk size 30, we have 4 chunks.
    // 1 call for locations (50ms)
    // 4 calls for chunks (parallel: 50ms)
    // Total approx 100ms.
    // We expect it to be much faster than sequential (which was > 500ms)
    expect(duration).toBeLessThan(200);
  });
});
