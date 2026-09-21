import * as React from "react";
import { cn } from "@/lib/utils";

export interface NewLabelProps {
  /** Text shown inside the badge. */
  text?: string;
  /** When the feature was released. Accepts anything `Date` can parse, or a timestamp. */
  releaseDate: string | number | Date;
  /** How many days after `releaseDate` the badge stays visible. */
  expirationDays: number;
  /** Reference "current" time, as a timestamp. Defaults to `Date.now()`. */
  now?: number;
  className?: string;
}

function toTimestamp(value: string | number | Date): number {
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

/**
 * Small animated "new" badge that hides itself once `expirationDays` have
 * passed since `releaseDate`, so callers never need to remember to remove it.
 */
export default function NewLabel({
  text = "Nuevo",
  releaseDate,
  expirationDays,
  now = Date.now(),
  className,
}: NewLabelProps) {
  const released = toTimestamp(releaseDate);
  if (!isFinite(released)) return null;

  const elapsedDays = (now - released) / (1000 * 60 * 60 * 24);
  if (elapsedDays < 0 || elapsedDays > expirationDays) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400",
        className,
      )}
    >
      <span className="relative flex size-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
        <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
      </span>
      {text}
    </span>
  );
}
