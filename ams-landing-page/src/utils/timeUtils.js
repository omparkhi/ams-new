/**
 * Indian Standard Time (IST) 12-Hour Clock Utility
 * Converts 24-hour timestamps (e.g., "15:04:50", "09:00", "18:30:00")
 * into standard Indian 12-hour format with AM/PM (e.g., "03:04:50 PM", "09:00 AM", "06:30 PM").
 */

/**
 * Format any time string into 12-hour IST format (e.g., "03:04:50 PM")
 * @param {string|Date} timeStr - Time string like "15:04:50" or Date object
 * @param {boolean} includeSeconds - Whether to include seconds (default: true)
 * @returns {string} Formatted 12-hour time string
 */
export function formatTimeIST(timeStr, includeSeconds = true) {
  if (!timeStr || timeStr === '—' || timeStr === '-' || timeStr === 'No Check-in') {
    return '—';
  }

  // Already formatted with AM/PM
  if (typeof timeStr === 'string' && (timeStr.includes('AM') || timeStr.includes('PM') || timeStr.includes('am') || timeStr.includes('pm'))) {
    return timeStr;
  }

  // Handle standard HH:MM:SS or HH:MM strings
  if (typeof timeStr === 'string' && timeStr.includes(':')) {
    const parts = timeStr.trim().split(':');
    if (parts.length >= 2) {
      let hours = parseInt(parts[0], 10);
      const minutes = parts[1].padStart(2, '0');
      const seconds = parts[2] ? parts[2].padStart(2, '0') : null;

      if (isNaN(hours)) return timeStr;

      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // 0 becomes 12
      const formattedHours = String(hours).padStart(2, '0');

      if (seconds !== null && includeSeconds) {
        return `${formattedHours}:${minutes}:${seconds} ${ampm}`;
      }
      return `${formattedHours}:${minutes} ${ampm}`;
    }
  }

  // Fallback for Date objects or ISO strings
  try {
    const d = new Date(timeStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: includeSeconds ? '2-digit' : undefined,
        hour12: true
      });
    }
  } catch (e) {
    // Ignore and return original
  }

  return timeStr;
}

/**
 * Format shift time like "09:00:00" -> "09:00 AM" or "18:00:00" -> "06:00 PM"
 * @param {string} timeStr - Time string
 * @returns {string} Formatted shift time without seconds
 */
export function formatShiftTime(timeStr) {
  if (!timeStr || timeStr === '—' || timeStr === '-') return '09:00 AM';
  return formatTimeIST(timeStr, false);
}

/**
 * Returns current live time in 12-hour IST format (e.g. "03:04:50 PM")
 */
export function getLiveTimeIST(includeSeconds = true) {
  return new Date().toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: includeSeconds ? '2-digit' : undefined,
    hour12: true
  });
}

