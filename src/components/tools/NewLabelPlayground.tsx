import * as React from "react";
import NewLabel from "@/components/ui/NewLabel.tsx";

function toDateInputValue(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function toDateTimeInputValue(timestamp: number): string {
  const d = new Date(timestamp);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function NewLabelPlayground() {
  const [text, setText] = React.useState("Nuevo");
  const [releaseDate, setReleaseDate] = React.useState(() =>
    toDateInputValue(Date.now()),
  );
  const [expirationDays, setExpirationDays] = React.useState(30);
  const [now, setNow] = React.useState(() => Date.now());

  const releaseTimestamp = new Date(releaseDate).getTime();
  const elapsedDays = isFinite(releaseTimestamp)
    ? (now - releaseTimestamp) / (1000 * 60 * 60 * 24)
    : NaN;
  const visible =
    isFinite(elapsedDays) && elapsedDays >= 0 && elapsedDays <= expirationDays;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="rounded-md border border-border p-4">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Propiedades
        </h2>

        <div className="flex flex-col gap-3">
          <div>
            <label
              htmlFor="text"
              className="mb-1.5 block text-xs font-medium text-muted-foreground"
            >
              text
            </label>
            <input
              id="text"
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
          </div>

          <div>
            <label
              htmlFor="releaseDate"
              className="mb-1.5 block text-xs font-medium text-muted-foreground"
            >
              releaseDate
            </label>
            <input
              id="releaseDate"
              type="date"
              value={releaseDate}
              onChange={(e) => setReleaseDate(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
          </div>

          <div>
            <label
              htmlFor="expirationDays"
              className="mb-1.5 block text-xs font-medium text-muted-foreground"
            >
              expirationDays
            </label>
            <input
              id="expirationDays"
              type="number"
              min={0}
              step={1}
              value={expirationDays}
              onChange={(e) =>
                setExpirationDays(
                  Number.isFinite(e.target.valueAsNumber)
                    ? e.target.valueAsNumber
                    : 0,
                )
              }
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
          </div>

          <div>
            <label
              htmlFor="now"
              className="mb-1.5 block text-xs font-medium text-muted-foreground"
            >
              now
            </label>
            <div className="flex gap-2">
              <input
                id="now"
                type="datetime-local"
                value={toDateTimeInputValue(now)}
                onChange={(e) => {
                  const v = new Date(e.target.value).getTime();
                  if (isFinite(v)) setNow(v);
                }}
                className="w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              />
              <button
                type="button"
                onClick={() => setNow(Date.now())}
                className="shrink-0 rounded-md border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground shadow-xs transition-colors hover:bg-accent"
              >
                Ahora
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-md border border-border p-4">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Preview
        </h2>
        <div className="flex min-h-12 items-center gap-2 rounded-md bg-muted px-3 py-3">
          <span className="text-sm font-medium text-foreground">
            ¿Cuántos días te quedan?
          </span>
          <NewLabel
            text={text}
            releaseDate={releaseDate}
            expirationDays={expirationDays}
            now={now}
          />
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-md bg-muted px-3 py-2">
            <dt className="font-semibold uppercase tracking-wide text-muted-foreground">
              Días transcurridos
            </dt>
            <dd className="mt-0.5 font-mono text-foreground">
              {isFinite(elapsedDays) ? elapsedDays.toFixed(2) : "—"}
            </dd>
          </div>
          <div className="rounded-md bg-muted px-3 py-2">
            <dt className="font-semibold uppercase tracking-wide text-muted-foreground">
              Estado
            </dt>
            <dd
              className={
                "mt-0.5 font-mono " +
                (visible
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400")
              }
            >
              {visible ? "visible" : "oculto"}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
