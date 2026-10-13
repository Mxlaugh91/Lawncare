import { LocationStatus, LocationWithStatus } from '@/types';

/**
 * Shared display helpers for the operations list (desktop table + mobile
 * cards). Grass cutting and edge cutting are rendered from their own per-type
 * status so completing one never marks the other as done.
 */
export const renderLocationStatus = (status: LocationStatus) => {
  switch (status) {
    case 'fullfort':
      return <span className="text-primary font-medium">Fullført</span>;
    case 'ikke_utfort':
      return <span className="text-destructive">Ikke utført</span>;
    default:
      return <span className="text-amber-600">Planlagt</span>;
  }
};

export const getMaintenanceStatusDisplay = (location: LocationWithStatus) =>
  !location.isDueForMaintenanceInSelectedWeek
    ? 'Ikke aktuelt'
    : renderLocationStatus(location.maintenanceStatus);

export const getEdgeCuttingStatusDisplay = (location: LocationWithStatus) =>
  !location.isDueForEdgeCuttingInSelectedWeek
    ? 'Ikke aktuelt'
    : renderLocationStatus(location.edgeCuttingStatus);

const toDate = (value: unknown): Date | null => {
  if (!value) return null;
  const maybeTimestamp = value as { toDate?: () => Date };
  if (typeof maybeTimestamp.toDate !== 'function') return null;
  try {
    const date = maybeTimestamp.toDate();
    return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
  } catch {
    return null;
  }
};

/**
 * Latest completion date for a location. Falls back to the denormalized
 * `lastMaintenanceAt`/`lastEdgeCuttingAt` fields on the location document,
 * which are the only completion data available to non-admins.
 */
export const formatLatestEntryDate = (location: LocationWithStatus) => {
  const dates = [
    toDate(location.timeEntries?.[0]?.date),
    toDate(location.lastMaintenanceAt),
    toDate(location.lastEdgeCuttingAt),
  ].filter((date): date is Date => Boolean(date));

  if (dates.length === 0) {
    return 'Ikke registrert';
  }

  const latest = dates.reduce((a, b) => (a.getTime() >= b.getTime() ? a : b));
  return new Intl.DateTimeFormat('no-NO', { weekday: 'long' }).format(latest);
};

export const getLocationTotalHours = (location: LocationWithStatus) => {
  if (!location.timeEntries || location.timeEntries.length === 0) {
    return 0;
  }
  return location.timeEntries.reduce((total, entry) => total + entry.hours, 0);
};

export const getLocationEmployeeSummary = (location: LocationWithStatus) => {
  if (location.timeEntries && location.timeEntries.length > 0) {
    // Get unique employee names
    const uniqueEmployees = Array.from(
      new Set(location.timeEntries.map(entry => entry.employeeName).filter(Boolean))
    );

    if (uniqueEmployees.length === 1) {
      return uniqueEmployees[0];
    }

    if (uniqueEmployees.length > 1) {
      // Show first employee + count of others
      const additionalCount = uniqueEmployees.length - 1;
      return `${uniqueEmployees[0]} (+${additionalCount} andre)`;
    }
  }

  // Fall back to the denormalized performer names on the location document.
  const performers = Array.from(new Set(
    [location.lastMaintenanceByName, location.lastEdgeCuttingByName].filter(Boolean)
  ));

  if (performers.length === 0) {
    return 'Ikke registrert';
  }

  return performers.join(', ');
};
