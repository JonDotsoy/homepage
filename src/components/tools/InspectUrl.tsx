import * as React from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHashParam } from "@/lib/useHashParams";

type UrlParam = { key: string; value: string };

type HashFormat = "json" | "url-search-params";

type UrlDetails = {
  schema: string;
  username: string;
  password: string;
  host: string;
  path: string;
  search: string;
  hash: string;
  queryParams: UrlParam[];
  hashFormat: HashFormat;
  hashParams: UrlParam[];
};

function toParams(searchParams: URLSearchParams): UrlParam[] {
  return Array.from(searchParams.entries()).map(([key, value]) => ({
    key,
    value,
  }));
}

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function tryParseJsonObject(value: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

function parseHashParams(hashContent: string): {
  format: HashFormat;
  params: UrlParam[];
} {
  const jsonObject = tryParseJsonObject(safeDecodeURIComponent(hashContent));
  if (jsonObject) {
    return {
      format: "json",
      params: Object.entries(jsonObject).map(([key, value]) => ({
        key,
        value: typeof value === "string" ? value : JSON.stringify(value),
      })),
    };
  }

  return {
    format: "url-search-params",
    params: toParams(new URLSearchParams(hashContent)),
  };
}

function parseUrl(value: string): UrlDetails | null {
  try {
    const url = new URL(value);
    const hashContent = url.hash.replace(/^#/, "");
    const { format: hashFormat, params: hashParams } =
      parseHashParams(hashContent);

    return {
      schema: url.protocol.replace(/:$/, ""),
      username: url.username,
      password: url.password,
      host: url.host,
      path: url.pathname,
      search: url.search,
      hash: url.hash,
      queryParams: toParams(url.searchParams),
      hashFormat,
      hashParams,
    };
  } catch {
    return null;
  }
}

function tryParseJsonValue(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function serializeHashParams(format: HashFormat, params: UrlParam[]): string {
  if (format === "json") {
    const jsonObject: Record<string, unknown> = {};
    for (const param of params) {
      jsonObject[param.key] = tryParseJsonValue(param.value);
    }
    return JSON.stringify(jsonObject);
  }

  const searchParams = new URLSearchParams();
  for (const param of params) {
    searchParams.append(param.key, param.value);
  }
  return searchParams.toString();
}

const hashFormatLabel: Record<HashFormat, string> = {
  json: "JSON",
  "url-search-params": "URL Search Params",
};

type UrlField =
  | "schema"
  | "username"
  | "password"
  | "host"
  | "path"
  | "search"
  | "hash";

function applyFieldToUrl(base: URL, field: UrlField, value: string): string {
  if (field === "schema") {
    // `URL#protocol` refuses to switch between special (http, https, ftp,
    // file, ws, wss) and non-special schemes, so arbitrary values (e.g.
    // "mailto", "foo") are rewritten by hand instead.
    const scheme = value.replace(/:+$/, "");
    if (!scheme) {
      // An empty scheme would produce an unparsable url (e.g. "://host"),
      // wiping out the whole details panel. Ignore it, same as the native
      // setters do for an empty host below.
      return base.toString();
    }
    const remainder = base.href.slice(base.protocol.length);
    return `${scheme}:${remainder}`;
  }

  const url = new URL(base.toString());
  switch (field) {
    case "username":
      url.username = value;
      break;
    case "password":
      url.password = value;
      break;
    case "host":
      url.host = value;
      break;
    case "path":
      url.pathname = value.startsWith("/") ? value : `/${value}`;
      break;
    case "search":
      url.search = value;
      break;
    case "hash":
      url.hash = value;
      break;
  }
  return url.toString();
}

function useInputUrl() {
  const [url, setUrl] = useHashParam("url");
  const [touched, setTouched] = React.useState(url !== "");

  const details = React.useMemo(() => parseUrl(url.trim()), [url]);

  const updateField = React.useCallback(
    (field: UrlField, value: string) => {
      let base: URL;
      try {
        base = new URL(url.trim());
      } catch {
        return;
      }
      setUrl(applyFieldToUrl(base, field, value));
      setTouched(true);
    },
    [url, setUrl],
  );

  const addQueryParam = React.useCallback(
    (key: string, value: string) => {
      let base: URL;
      try {
        base = new URL(url.trim());
      } catch {
        return;
      }
      base.searchParams.append(key, value);
      setUrl(base.toString());
      setTouched(true);
    },
    [url, setUrl],
  );

  const updateQueryParam = React.useCallback(
    (index: number, field: "key" | "value", value: string) => {
      let base: URL;
      try {
        base = new URL(url.trim());
      } catch {
        return;
      }
      const params = toParams(base.searchParams);
      if (!params[index]) return;
      params[index] = { ...params[index], [field]: value };

      const nextSearchParams = new URLSearchParams();
      for (const param of params) {
        nextSearchParams.append(param.key, param.value);
      }
      base.search = nextSearchParams.toString();
      setUrl(base.toString());
      setTouched(true);
    },
    [url, setUrl],
  );

  const addHashParam = React.useCallback(
    (key: string, value: string) => {
      let base: URL;
      try {
        base = new URL(url.trim());
      } catch {
        return;
      }
      const { format, params } = parseHashParams(
        base.hash.replace(/^#/, ""),
      );
      params.push({ key, value });
      base.hash = serializeHashParams(format, params);
      setUrl(base.toString());
      setTouched(true);
    },
    [url, setUrl],
  );

  const updateHashParam = React.useCallback(
    (index: number, field: "key" | "value", value: string) => {
      let base: URL;
      try {
        base = new URL(url.trim());
      } catch {
        return;
      }
      const { format, params } = parseHashParams(
        base.hash.replace(/^#/, ""),
      );
      if (!params[index]) return;
      params[index] = { ...params[index], [field]: value };
      base.hash = serializeHashParams(format, params);
      setUrl(base.toString());
      setTouched(true);
    },
    [url, setUrl],
  );

  return {
    url,
    setUrl,
    details,
    touched,
    setTouched,
    updateField,
    addQueryParam,
    updateQueryParam,
    addHashParam,
    updateHashParam,
  };
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = React.useState(false);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout>>();

  React.useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  const handleCopy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      // Ignore clipboard failures (unsupported browser, missing permission).
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={!value}
      aria-label={copied ? "Copiado" : "Copiar"}
      title={copied ? "Copiado" : "Copiar"}
      className={cn(
        "inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors",
        "hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-40",
      )}
    >
      {copied ? (
        <Check className="size-3.5 text-foreground" />
      ) : (
        <Copy className="size-3.5" />
      )}
    </button>
  );
}

// A plain controlled <input> whose `value` is fully derived from the parsed
// url snaps back mid-keystroke whenever the browser's URL setters normalize
// what was just typed (e.g. a trailing ":" with no port yet is stripped from
// `host`), and it loses focus whenever the outer list re-keys on content
// change. This keeps showing exactly what the user types while focused, and
// only resyncs to the canonical (possibly normalized) value on blur.
function EditableText({
  id,
  value,
  onChange,
  placeholder,
  className,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className: string;
}) {
  const [local, setLocal] = React.useState(value);
  const focusedRef = React.useRef(false);

  React.useEffect(() => {
    if (!focusedRef.current) setLocal(value);
  }, [value]);

  return (
    <input
      id={id}
      type="text"
      autoComplete="off"
      spellCheck={false}
      placeholder={placeholder}
      value={local}
      onFocus={() => {
        focusedRef.current = true;
      }}
      onBlur={() => {
        focusedRef.current = false;
        setLocal(value);
      }}
      onChange={(event) => {
        setLocal(event.target.value);
        onChange(event.target.value);
      }}
      className={className}
    />
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-border py-3 last:border-b-0">
      <label
        htmlFor={`field-${label}`}
        className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
      >
        {label}
      </label>
      <div className="flex items-center justify-between gap-2">
        <EditableText
          id={`field-${label}`}
          placeholder="(vacío)"
          value={value}
          onChange={onChange}
          className="w-full break-all bg-transparent font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
        <CopyButton value={value} />
      </div>
    </div>
  );
}

function AddParamRow({
  onAdd,
}: {
  onAdd: (key: string, value: string) => void;
}) {
  const [draftKey, setDraftKey] = React.useState("");
  const [draftValue, setDraftValue] = React.useState("");

  const handleAdd = () => {
    // A key isn't required: the draft can be added with just a value (or
    // even both empty) and the resulting param is appended as-is.
    onAdd(draftKey, draftValue);
    setDraftKey("");
    setDraftValue("");
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="flex items-center gap-2 pt-1">
      <input
        type="text"
        autoComplete="off"
        spellCheck={false}
        placeholder="key"
        value={draftKey}
        onChange={(event) => setDraftKey(event.target.value)}
        onKeyDown={handleKeyDown}
        className="w-1/3 rounded-md border border-input bg-background px-2 py-1 font-mono text-xs text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring"
      />
      <input
        type="text"
        autoComplete="off"
        spellCheck={false}
        placeholder="value"
        value={draftValue}
        onChange={(event) => setDraftValue(event.target.value)}
        onKeyDown={handleKeyDown}
        className="flex-1 rounded-md border border-input bg-background px-2 py-1 font-mono text-xs text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring"
      />
      <button
        type="button"
        onClick={handleAdd}
        className="shrink-0 rounded-md border border-input px-2 py-1 text-xs text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        Agregar
      </button>
    </div>
  );
}

function ParamsTable({
  title,
  params,
  emptyMessage,
  onAdd,
  onUpdate,
}: {
  title: string;
  params: UrlParam[];
  emptyMessage: string;
  onAdd?: (key: string, value: string) => void;
  onUpdate?: (index: number, field: "key" | "value", value: string) => void;
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
          {params.map((param, index) =>
            onUpdate ? (
              <li
                key={index}
                className="flex items-center gap-2 border-b border-border pb-2 last:border-b-0 last:pb-0"
              >
                <EditableText
                  placeholder="key"
                  value={param.key}
                  onChange={(value) => onUpdate(index, "key", value)}
                  className="w-1/3 shrink-0 bg-transparent font-mono text-xs text-muted-foreground outline-none placeholder:text-muted-foreground"
                />
                <EditableText
                  placeholder="(vacío)"
                  value={param.value}
                  onChange={(value) => onUpdate(index, "value", value)}
                  className="min-w-0 flex-1 break-all bg-transparent font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
                <CopyButton value={param.value} />
              </li>
            ) : (
              <li
                key={index}
                className="flex flex-col gap-0.5 border-b border-border pb-2 last:border-b-0 last:pb-0"
              >
                <span className="font-mono text-xs text-muted-foreground">
                  {param.key}
                </span>
                <div className="flex items-center justify-between gap-2">
                  <span className="break-all font-mono text-sm text-foreground">
                    {param.value || (
                      <span className="text-muted-foreground">(vacío)</span>
                    )}
                  </span>
                  <CopyButton value={param.value} />
                </div>
              </li>
            ),
          )}
        </ul>
      )}
      {onAdd && <AddParamRow onAdd={onAdd} />}
    </div>
  );
}

export default function InspectUrl() {
  const {
    url,
    setUrl,
    details,
    touched,
    setTouched,
    updateField,
    addQueryParam,
    updateQueryParam,
    addHashParam,
    updateHashParam,
  } = useInputUrl();
  const isInvalid = touched && url.trim() !== "" && !details;

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
          value={url}
          onChange={(event) => setUrl(event.target.value)}
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
            <Field
              label="Schema"
              value={details.schema}
              onChange={(value) => updateField("schema", value)}
            />
            <Field
              label="Username"
              value={details.username}
              onChange={(value) => updateField("username", value)}
            />
            <Field
              label="Password"
              value={details.password}
              onChange={(value) => updateField("password", value)}
            />
            <Field
              label="Host"
              value={details.host}
              onChange={(value) => updateField("host", value)}
            />
            <Field
              label="Path"
              value={details.path}
              onChange={(value) => updateField("path", value)}
            />
            <Field
              label="Search"
              value={details.search}
              onChange={(value) => updateField("search", value)}
            />
            <Field
              label="Hash"
              value={details.hash}
              onChange={(value) => updateField("hash", value)}
            />
          </div>

          <ParamsTable
            title="Query params"
            params={details.queryParams}
            emptyMessage="No hay parámetros de búsqueda."
            onAdd={addQueryParam}
            onUpdate={updateQueryParam}
          />

          <ParamsTable
            title={`Hash params (${hashFormatLabel[details.hashFormat]})`}
            params={details.hashParams}
            emptyMessage="No hay parámetros en el hash."
            onAdd={addHashParam}
            onUpdate={updateHashParam}
          />
        </div>
      )}
    </div>
  );
}
