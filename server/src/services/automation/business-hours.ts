// Business Hours Configuration
// Monday - Saturday: 09:00 - 18:00 (Pakistan Time)

const BUSINESS_HOURS = {
  start: 9,   // 9 AM
  end: 18,    // 6 PM
  days: [1, 2, 3, 4, 5, 6], // Monday=1, Saturday=6, Sunday=0
};

/**
 * Check if current time is within business hours
 */
export function isWithinBusinessHours(): boolean {
  const now = new Date();

  // Convert to Pakistan Time (UTC+5)
  const pakistanTime = new Date(now.getTime() + (5 * 60 * 60 * 1000));
  const hours = pakistanTime.getUTCHours();
  const day = pakistanTime.getUTCDay();

  // Check if it's a business day
  if (!BUSINESS_HOURS.days.includes(day)) {
    return false;
  }

  // Check if within business hours
  return hours >= BUSINESS_HOURS.start && hours < BUSINESS_HOURS.end;
}

/**
 * Get the next business hour
 */
export function getNextBusinessHour(): Date {
  const now = new Date();

  // Convert to Pakistan Time (UTC+5)
  const pakistanTime = new Date(now.getTime() + (5 * 60 * 60 * 1000));
  let hours = pakistanTime.getUTCHours();
  let day = pakistanTime.getUTCDay();

  // If currently in business hours, return next hour
  if (isWithinBusinessHours()) {
    const next = new Date(now);
    next.setHours(next.getHours() + 1);
    return next;
  }

  // Find next business day
  let daysToAdd = 0;
  while (true) {
    const nextDay = (day + daysToAdd) % 7;
    if (BUSINESS_HOURS.days.includes(nextDay)) {
      break;
    }
    daysToAdd++;
  }

  // Calculate next business hour
  const next = new Date(now);
  next.setDate(next.getDate() + daysToAdd);
  next.setHours(BUSINESS_HOURS.start, 0, 0, 0);

  // If that's in the past, add a day
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }

  return next;
}

/**
 * Format business hours for display
 */
export function getBusinessHoursString(): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const startDay = days[BUSINESS_HOURS.days[0]];
  const endDay = days[BUSINESS_HOURS.days[BUSINESS_HOURS.days.length - 1]];

  return `${startDay} - ${endDay}, ${BUSINESS_HOURS.start}:00 - ${BUSINESS_HOURS.end}:00 (Pakistan Time)`;
}
