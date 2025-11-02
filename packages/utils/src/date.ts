import {
  format,
  formatDistance,
  formatRelative,
  parseISO,
  isValid,
  addDays,
  subDays,
  startOfDay,
  endOfDay,
  isAfter,
  isBefore,
} from 'date-fns';

export const formatDate = (date: Date | string, pattern: string = 'PPP'): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, pattern);
};

export const formatRelativeDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return formatDistance(dateObj, new Date(), { addSuffix: true });
};

export const formatRelativeToNow = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return formatRelative(dateObj, new Date());
};

export const isValidDate = (date: unknown): date is Date => {
  return date instanceof Date && isValid(date);
};

export const isValidISOString = (dateString: string): boolean => {
  const date = parseISO(dateString);
  return isValid(date);
};

export const addDaysToDate = (date: Date | string, days: number): Date => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return addDays(dateObj, days);
};

export const subtractDaysFromDate = (date: Date | string, days: number): Date => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return subDays(dateObj, days);
};

export const getStartOfDay = (date: Date | string): Date => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return startOfDay(dateObj);
};

export const getEndOfDay = (date: Date | string): Date => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return endOfDay(dateObj);
};

export const isDateAfter = (date: Date | string, compareDate: Date | string): boolean => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const compareDateObj = typeof compareDate === 'string' ? parseISO(compareDate) : compareDate;
  return isAfter(dateObj, compareDateObj);
};

export const isDateBefore = (date: Date | string, compareDate: Date | string): boolean => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const compareDateObj = typeof compareDate === 'string' ? parseISO(compareDate) : compareDate;
  return isBefore(dateObj, compareDateObj);
};
