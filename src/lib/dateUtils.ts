const MONTH_MAP: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/**
 * Robust date parser for bank statements.
 * Handles ISO (YYYY-MM-DD), International/Indian (DD/MM/YYYY or DD-MM-YYYY),
 * and written formats (27 Sep 2026, Sep 27 2026).
 * Fixes the classic bug where DD/MM/YYYY was parsed by Date.parse as MM/DD/YYYY,
 * causing transactions after the 12th of the month to return NaN or 0 and get buried.
 */
export function parseDateToTimestamp(dateStr: string | undefined): number {
  if (!dateStr) return 0;
  const s = String(dateStr).trim();

  // 1. ISO format: YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    return new Date(year, month, day).getTime();
  }

  // 2. Named month format: e.g. "27 Sep 2026", "27-Sep-2026", "Sep 27, 2026", "27 Sep"
  const namedMatch1 = s.match(/(\d{1,2})[-/\s]+([a-zA-Z]{3,9})[-/\s]*(\d{2,4})?/);
  const namedMatch2 = s.match(/([a-zA-Z]{3,9})[-/\s]+(\d{1,2})[-/\s,]*(\d{2,4})?/);

  if (namedMatch1 && isNaN(Number(namedMatch1[2]))) {
    const day = parseInt(namedMatch1[1], 10);
    const monthName = namedMatch1[2].toLowerCase().slice(0, 3);
    let year = namedMatch1[3] ? parseInt(namedMatch1[3], 10) : new Date().getFullYear();
    if (year < 100) year += 2000;
    const month = MONTH_MAP[monthName];
    if (month !== undefined) {
      return new Date(year, month, day).getTime();
    }
  } else if (namedMatch2) {
    const monthName = namedMatch2[1].toLowerCase().slice(0, 3);
    const day = parseInt(namedMatch2[2], 10);
    let year = namedMatch2[3] ? parseInt(namedMatch2[3], 10) : new Date().getFullYear();
    if (year < 100) year += 2000;
    const month = MONTH_MAP[monthName];
    if (month !== undefined) {
      return new Date(year, month, day).getTime();
    }
  }

  // 3. DD/MM/YYYY or DD-MM-YYYY (Bank statements in India, UK, Europe, Australia)
  const dmyMatch = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    let year = parseInt(dmyMatch[3], 10);
    if (year < 100) year += 2000;
    return new Date(year, month, day).getTime();
  }

  const fallback = Date.parse(s);
  return isNaN(fallback) ? 0 : fallback;
}

/**
 * Format any bank statement date string to a clean, human-readable display e.g. "27 Sep 2026".
 */
export function formatDisplayDate(dateStr: string | undefined): string {
  if (!dateStr) return "";
  const timestamp = parseDateToTimestamp(dateStr);
  if (!timestamp) return dateStr;
  const d = new Date(timestamp);
  const day = d.getDate();
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day < 10 ? `0${day}` : day} ${month} ${year}`;
}
