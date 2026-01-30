import { describe, it, expect } from 'vitest';
import { getISOWeekNumber, getISOWeekDates } from './utils';

describe('utils', () => {
  describe('getISOWeekNumber', () => {
    it('should return the correct week number for a given date', () => {
      // 2024 starts on a Monday. Week 1 is the first week with at least 4 days in the new year.
      // Jan 1 2024 is Monday. So it is Week 1.
      expect(getISOWeekNumber(new Date('2024-01-01T12:00:00'))).toBe(1);
      expect(getISOWeekNumber(new Date('2024-01-07T12:00:00'))).toBe(1);
      expect(getISOWeekNumber(new Date('2024-01-08T12:00:00'))).toBe(2);

      // 2023-12-31 is Sunday. Week 52 of 2023.
      expect(getISOWeekNumber(new Date('2023-12-31T12:00:00'))).toBe(52);
    });
  });

  describe('getISOWeekDates', () => {
    it('should return the correct start and end dates for a given week', () => {
      const { start, end } = getISOWeekDates(1, 2024);

      // Week 1 of 2024: Jan 1st (Mon) to Jan 7th (Sun)
      expect(start.getFullYear()).toBe(2024);
      expect(start.getMonth()).toBe(0); // Jan
      expect(start.getDate()).toBe(1);

      expect(end.getFullYear()).toBe(2024);
      expect(end.getMonth()).toBe(0); // Jan
      expect(end.getDate()).toBe(7);
    });

     it('should handle week crossing months', () => {
      // Week 5 of 2024: Jan 29th (Mon) to Feb 4th (Sun)
      const { start, end } = getISOWeekDates(5, 2024);

      expect(start.getMonth()).toBe(0); // Jan
      expect(start.getDate()).toBe(29);

      expect(end.getMonth()).toBe(1); // Feb
      expect(end.getDate()).toBe(4);
    });
  });
});
