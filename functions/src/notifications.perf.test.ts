import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as admin from 'firebase-admin';
import { processBulkNotifications } from './notifications';

// Mock firebase-admin
vi.mock('firebase-admin', () => {
  const commitMock = vi.fn().mockResolvedValue([]);
  const setMock = vi.fn();
  const batchMock = {
    set: setMock,
    commit: commitMock,
    delete: vi.fn(),
  };

  const collectionMock = {
    doc: vi.fn().mockReturnValue({ id: 'mock-doc-id' }),
  };

  const firestoreMock = {
    batch: vi.fn().mockReturnValue(batchMock),
    collection: vi.fn().mockReturnValue(collectionMock),
  };

  return {
    firestore: Object.assign(() => firestoreMock, {
      FieldValue: {
        serverTimestamp: vi.fn().mockReturnValue('mock-timestamp'),
      },
      Timestamp: {
        fromDate: vi.fn(),
      }
    }),
    messaging: vi.fn(),
    apps: [],
    initializeApp: vi.fn(),
  };
});

describe('processBulkNotifications Performance', () => {
  let db: admin.firestore.Firestore;
  let batchMock: any;

  beforeEach(() => {
    vi.clearAllMocks();
    db = admin.firestore();
    batchMock = db.batch(); // Get reference to the batch mock object
  });

  it('should process notifications for a small number of users (baseline)', async () => {
    const userIds = ['user1', 'user2', 'user3'];
    const title = 'Test Title';
    const message = 'Test Message';

    await processBulkNotifications(db, userIds, title, message);

    // db.batch() is called once inside processBulkNotifications
    // (and once in beforeEach, but we clear mocks? No, db.batch IS a mock function)
    // Wait, vi.clearAllMocks() clears call history.
    // calling db.batch() in beforeEach ADDS a call.
    // So expect(db.batch).toHaveBeenCalledTimes(2) if we count beforeEach.

    // Better: check the commit call on the batch object.
    expect(batchMock.commit).toHaveBeenCalledTimes(1);
    expect(batchMock.set).toHaveBeenCalledTimes(3);
  });

  it('should handle more than 500 users by creating multiple batches', async () => {
    // Generate 501 user IDs
    const userIds = Array.from({ length: 501 }, (_, i) => `user${i}`);
    const title = 'Test Title';
    const message = 'Test Message';

    await processBulkNotifications(db, userIds, title, message);

    // CURRENT BEHAVIOR (PRE-FIX):
    // It creates ONE batch and adds 501 operations.
    // commit is called ONCE.
    // verify this baseline first.

    // After fix, this should be 2.
    // I will write the test to expect the IMPROVED behavior, so it fails now.
    // This follows TDD/Red-Green-Refactor.

    expect(batchMock.commit).toHaveBeenCalledTimes(2);
    expect(batchMock.set).toHaveBeenCalledTimes(501);
  });
});
