export const FOLDER_COLOR_PALETTE = [
  "#f59e0b",
  "#22c55e",
  "#3b82f6",
  "#a855f7",
  "#06b6d4",
  "#ec4899",
  "#ef4444",
  "#84cc16"
] as const;

export const DEFAULT_FOLDER_COLOR: string = FOLDER_COLOR_PALETTE[0];

export function normalizeFolderColor(color: string | null | undefined, fallback: string = DEFAULT_FOLDER_COLOR): string {
  if (!color) {
    return fallback;
  }
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color.toLowerCase() : fallback;
}

export function pickFolderColor(index: number): string {
  return FOLDER_COLOR_PALETTE[index % FOLDER_COLOR_PALETTE.length] as string;
}
