"use client";

import { FOLDER_COLOR_PALETTE } from "@/lib/folder-colors";

type FolderColorPickerProps = {
  value: string;
  onChange: (color: string) => void;
  compact?: boolean;
};

export function FolderColorPicker({ value, onChange, compact = false }: FolderColorPickerProps) {
  const size = compact ? "h-5 w-5" : "h-7 w-7";
  const gap = compact ? "gap-1" : "gap-2";

  return (
    <div className={`flex flex-wrap ${gap}`}>
      {FOLDER_COLOR_PALETTE.map((color) => (
        <button
          key={color}
          type="button"
          aria-label={`Folder color ${color}`}
          className={`${size} shrink-0 border-2 transition ${value === color ? "border-white" : "border-transparent"}`}
          style={{ backgroundColor: color }}
          onClick={() => onChange(color)}
        />
      ))}
    </div>
  );
}
