export const EDIT_REFRESH_INTERVAL = 1500; // 1.5 second debounce
export const AUTO_REFRESH_INTERVAL = 3000; // 3 seconds

export const COLLATERAL_TYPES = [
  { value: "USDC", label: "USDC", default: true },
  { value: "SOL", label: "SOL", default: false }
] as const;

// Get all bi-weekly expiration dates between two dates for the calendar
export function getBiWeeklyDates(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = [];
  let currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 14);
  }
  return dates;
}

export const startDate = new Date(2025, 0, 1); // January 1st, 2025
export const endDate = new Date(2026, 0, 1);   // January 1st, 2026
export const allowedDates = getBiWeeklyDates(startDate, endDate); 