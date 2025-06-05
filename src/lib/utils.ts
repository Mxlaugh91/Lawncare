import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getISOWeekNumber(date: Date): number {
  const target = new Date(date.valueOf());
  const dayNumber = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNumber + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
}

export function getISOWeekDates(weekNumber: number, year: number = new Date().getFullYear()) {
  // Create a date object for January 1st of the given year
  const januaryFirst = new Date(year, 0, 1);
  
  // Get the Thursday in week 1 and add the appropriate number of weeks
  const firstThursday = new Date(januaryFirst);
  firstThursday.setDate(januaryFirst.getDate() + (4 - januaryFirst.getDay()) + ((weekNumber - 1) * 7));
  
  // Get Monday by subtracting 3 days from Thursday
  const weekStart = new Date(firstThursday);
  weekStart.setDate(firstThursday.getDate() - 3);
  
  // Get Sunday by adding 6 days to Monday
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  
  return {
    start: weekStart,
    end: weekEnd
  };
}