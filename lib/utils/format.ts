import { format, formatDistanceToNow, isAfter, isBefore, parseISO } from 'date-fns';

/**
 * Format a date string or Date object to a readable format
 */
export function formatDate(date: string | Date, formatString = 'MMM dd, yyyy'): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, formatString);
}

/**
 * Format a date to show time remaining or time elapsed
 */
export function formatTimeDistance(date: string | Date, addSuffix = true): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(dateObj, { addSuffix });
}

/**
 * Format currency amount
 */
export function formatCurrency(
  amount: number,
  currency = '₹',
  locale = 'en-IN'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'INR',
    currencyDisplay: 'symbol',
  }).format(amount).replace('₹', currency);
}

/**
 * Format large numbers with abbreviated units (K, M, B)
 */
export function formatNumber(num: number): string {
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1) + 'B';
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

/**
 * Format distance
 */
export function formatDistance(distance: number, unit: 'km' | 'm' = 'km'): string {
  if (unit === 'km') {
    return `${distance.toFixed(1)} km`;
  }
  return `${distance.toFixed(0)} m`;
}

/**
 * Check if auction is active
 */
export function isAuctionActive(endTime: string | Date): boolean {
  const endDate = typeof endTime === 'string' ? parseISO(endTime) : endTime;
  return isAfter(endDate, new Date());
}

/**
 * Check if auction has ended
 */
export function isAuctionEnded(endTime: string | Date): boolean {
  const endDate = typeof endTime === 'string' ? parseISO(endTime) : endTime;
  return isBefore(endDate, new Date());
}

/**
 * Format phone number for Indian format
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');

  // Check if it's a valid Indian mobile number
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }

  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    const number = cleaned.slice(2);
    return `+91 ${number.slice(0, 5)} ${number.slice(5)}`;
  }

  return phone; // Return original if not recognized format
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Capitalize first letter of each word
 */
export function titleCase(str: string): string {
  return str.replace(/\w\S*/g, (txt) =>
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
}

/**
 * Generate initials from name
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
}
