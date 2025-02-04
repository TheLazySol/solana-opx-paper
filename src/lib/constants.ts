import { format } from 'date-fns'

// Helper function to format the date
const formatExpirationDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return format(date, "MMMM do, yyyy");
}

export type ExpirationDate = {
  value: string
  label: string
  isMonthly: boolean
}

export const EXPIRATION_DATES: ExpirationDate[] = [
  { value: '2025-01-31', label: formatExpirationDate('2025-01-31'), isMonthly: true },
  { value: '2025-02-14', label: formatExpirationDate('2025-02-14'), isMonthly: false },
  { value: '2025-02-28', label: formatExpirationDate('2025-02-28'), isMonthly: true },
  { value: '2025-03-03', label: formatExpirationDate('2025-03-03'), isMonthly: false },
  { value: '2025-03-14', label: formatExpirationDate('2025-03-14'), isMonthly: true },
  { value: '2025-03-28', label: formatExpirationDate('2025-03-28'), isMonthly: false },
  { value: '2025-03-31', label: formatExpirationDate('2025-03-31'), isMonthly: true },
  { value: '2025-04-11', label: formatExpirationDate('2025-04-11'), isMonthly: false },
  { value: '2025-04-25', label: formatExpirationDate('2025-04-25'), isMonthly: true },
  { value: '2025-05-01', label: formatExpirationDate('2025-05-01'), isMonthly: false },
  { value: '2025-05-09', label: formatExpirationDate('2025-05-09'), isMonthly: true }
  // Add more dates as needed
] 