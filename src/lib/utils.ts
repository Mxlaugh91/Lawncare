import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getISOWeekNumber(date: Date): number {
  const target = new Date(date.valueOf());
  const dayNumber = (date.getDay() + 6) % 7; // Adjust day number to make Monday = 0
  target.setDate(target.getDate() - dayNumber + 3); // Nearest Thursday
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
}

export function getISOWeekDates(weekNumber: number): {
  start: string;
  end: string;
} {
  const currentYear = new Date().getFullYear();
  const januaryFirst = new Date(currentYear, 0, 1);
  
  // Find first Thursday of the year
  const firstThursday = new Date(currentYear, 0, 1 + ((4 - januaryFirst.getDay()) + 7) % 7);
  
  // Calculate Monday of week 1
  const firstWeekStart = new Date(firstThursday);
  firstWeekStart.setDate(firstThursday.getDate() - 3);
  
  // Calculate start of the target week
  const weekStart = new Date(firstWeekStart);
  weekStart.setDate(firstWeekStart.getDate() + (weekNumber - 1) * 7);
  
  // Calculate end of the week (Sunday)
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const formatter = new Intl.DateTimeFormat('no-NO', { 
    day: '2-digit', 
    month: '2-digit',
    year: 'numeric'
  });

  return {
    start: formatter.format(weekStart),
    end: formatter.format(weekEnd)
  };
}

export function getWeekday(date: Date): string {
  const weekdays = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag'];
  return weekdays[date.getDay()];
}