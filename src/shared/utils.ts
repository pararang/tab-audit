/**
 * Formats minutes into human-readable time string.
 * @param minutes - Number of minutes to format
 * @returns Formatted string (e.g., "30m", "1h 30m", "2h 0m")
 * @example formatTime(30) // "30m"
 * @example formatTime(90) // "1h 30m"
 * @example formatTime(60) // "1h 0m"
 */
export function formatTime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}
