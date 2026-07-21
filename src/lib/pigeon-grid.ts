/** Keep in sync with `.pigeon-grid-inbox` in `src/app/globals.css`. */
export const PIGEON_INBOX_GRID_BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024
} as const;

export const PIGEON_INBOX_GRID_COLUMNS = {
  default: 2,
  sm: 3,
  lg: 4
} as const;

export function getPigeonInboxGridColumns(viewportWidth: number): number {
  if (viewportWidth >= PIGEON_INBOX_GRID_BREAKPOINTS.lg) {
    return PIGEON_INBOX_GRID_COLUMNS.lg;
  }
  if (viewportWidth >= PIGEON_INBOX_GRID_BREAKPOINTS.sm) {
    return PIGEON_INBOX_GRID_COLUMNS.sm;
  }
  return PIGEON_INBOX_GRID_COLUMNS.default;
}

export function padGridCells<T>(items: T[], columns: number): (T | null)[] {
  const padded: (T | null)[] = [...items];
  const remainder = padded.length % columns;
  if (remainder !== 0) {
    for (let i = 0; i < columns - remainder; i++) {
      padded.push(null);
    }
  }
  return padded;
}
