import * as React from "react";
import { cn } from "@/lib/utils";

type UrlParam = { key: string; value: string };

type UrlDetails = {
  schema: string;
  host: string;
  path: string;
  search: string;
  hash: string;
  queryParams: UrlParam[];
  hashParams: UrlParam[];
};

function toParams(searchParams: URLSearchParams): UrlParam[] {
  return Array.from(searchParams.entries()).map(([key, value]) => ({
    key,
    value,
  }));
}

function parseUrl(value: string): UrlDetails | null {
  try {
    const url = new URL(value);
    const hashContent = url.hash.replace(/^#/, "");
    const hashParams = toParams(new URLSearchParams(hashContent));

    return {
      schema: url.protocol.replace(/:$/, ""),
      host: url.host,
      path: url.pathname,
      search: url.search,
      hash: url.hash,
      queryParams: toParams(url.searchParams),
      hashParams,
    };
  } catch {
    return null;
  }
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-border py-3 last:border-b-0">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="break-all font-mono text-sm text-foreground">
        {value || <span className="text-muted-foreground">(vacío)</span>}
      </span>
    </div>
  );
}

function ParamsTable({
  title,
  params,
  emptyMessage,
}: {
  title: string;
  params: UrlParam[];
  emptyMessage: string;
}) {
  return (
    <div className="rounded-md border border-border p-4">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </span>
      {params.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {params.map((param, index) => (
            <li
              key={`${param.key}-${index}`}
              className="flex flex-col gap-0.5 border-b border-border pb-2 last:border-b-0 last:pb-0"
            >
              <span className="font-mono text-xs text-muted-foreground">
                {param.key}
              </span>
              <span className="break-all font-mono text-sm text-foreground">
                {param.value || (
                  <span className="text-muted-foreground">(vacío)</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function InspectUrl() {
  const [input, setInput] = React.useState("");
  const [touched, setTouched] = React.useState(false);

  const details = React.useMemo(() => parseUrl(input.trim()), [input]);
  const isInvalid = touched && input.trim() !== "" && !details;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label
          htmlFor="url-input"
          className="text-sm font-medium text-foreground"
        >
          URL
        </label>
        <input
          id="url-input"
          type="text"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          placeholder="https://example.com/path?foo=bar"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onBlur={() => setTouched(true)}
          className={cn(
            "w-full rounded-md border bg-background px-3 py-2 font-mono text-sm shadow-xs outline-none transition-colors",
            "focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring",
            isInvalid ? "border-destructive" : "border-input",
          )}
        />
        {isInvalid && (
          <p className="text-sm text-destructive">La URL no es válida.</p>
        )}
      </div>

      {details && (
        <div className="flex flex-col gap-4">
          <div className="rounded-md border border-border p-4">
            <Field label="Schema" value={details.schema} />
            <Field label="Host" value={details.host} />
            <Field label="Path" value={details.path} />
            <Field label="Search" value={details.search} />
            <Field label="Hash" value={details.hash} />
          </div>

          <ParamsTable
            title="Query params"
            params={details.queryParams}
            emptyMessage="No hay parámetros de búsqueda."
          />

          <ParamsTable
            title="Hash params"
            params={details.hashParams}
            emptyMessage="No hay parámetros en el hash."
          />
        </div>
      )}
    </div>
  );
}
