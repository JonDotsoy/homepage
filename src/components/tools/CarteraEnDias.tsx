import * as React from "react";
import { Plus, X, Share2, RotateCcw, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Expense = { id: string; label: string; amount: number | null };

type State = {
  balance: number | null;
  income: number | null;
  expenses: Expense[];
};

const STORAGE_KEY = "cartera-en-dias:v1";

const defaultState: State = {
  balance: null,
  income: null,
  expenses: [
    { id: "alimentacion", label: "Alimentación", amount: null },
    { id: "luz", label: "Luz", amount: null },
    { id: "agua", label: "Agua", amount: null },
    { id: "internet", label: "Internet", amount: null },
  ],
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function normalizeState(parsed: unknown): State {
  if (!parsed || typeof parsed !== "object") return clone(defaultState);
  const p = parsed as Record<string, unknown>;
  const balance =
    typeof p.balance === "number" && isFinite(p.balance) ? p.balance : null;
  const income =
    typeof p.income === "number" && isFinite(p.income) ? p.income : null;
  let expenses: Expense[];
  if (Array.isArray(p.expenses) && p.expenses.length) {
    expenses = p.expenses.map((e, i) => {
      const item = e as Record<string, unknown>;
      return {
        id: item?.id ? String(item.id) : `item-${i}-${Date.now()}`,
        label: typeof item?.label === "string" ? item.label : "Gasto",
        amount:
          typeof item?.amount === "number" && isFinite(item.amount)
            ? item.amount
            : null,
      };
    });
  } else {
    expenses = clone(defaultState.expenses);
  }
  return { balance, income, expenses };
}

function loadState(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return clone(defaultState);
    return normalizeState(JSON.parse(raw));
  } catch {
    return clone(defaultState);
  }
}

function saveState(state: State) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage unavailable — continue without persistence
  }
}

function fmtCLP(n: number | null | undefined): string {
  const value = Math.round(n || 0);
  const sign = value < 0 ? "-" : "";
  const s = String(Math.abs(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${sign}$${s}`;
}

function fmtNum(n: number, decimals: number): string {
  if (!isFinite(n)) return "0";
  return n.toLocaleString("es-CL", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++)
    binary += String.fromCharCode(bytes[i]);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlToBytes(b64url: string): Uint8Array {
  let b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function encodeState(payload: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  return bytesToBase64Url(bytes);
}

function decodeState(param: string): unknown {
  const bytes = base64UrlToBytes(param);
  return JSON.parse(new TextDecoder().decode(bytes));
}

async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through to legacy path
    }
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

function formatThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** Max safe amount, in digits, before it stops making sense as a CLP figure. */
const MAX_AMOUNT_DIGITS = 15;

function AmountInput({
  id,
  value,
  onChange,
  placeholder,
  className,
}: {
  id?: string;
  value: number | null;
  onChange: (value: number | null) => void;
  placeholder?: string;
  className?: string;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const display =
    value === null || value === undefined
      ? ""
      : formatThousands(String(Math.trunc(value)));

  // Reformatting changes the string length, so the browser's default
  // cursor-preserving behavior lands in the wrong spot. Snapping to the
  // end matches how amount inputs are typed (append digits, backspace
  // from the right) and avoids fighting the reflow on every keystroke.
  React.useEffect(() => {
    const el = inputRef.current;
    if (el && document.activeElement === el) {
      const end = el.value.length;
      el.setSelectionRange(end, end);
    }
  }, [display]);

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 shadow-xs transition-colors focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
        className,
      )}
    >
      <span className="text-sm font-medium text-muted-foreground">$</span>
      <input
        ref={inputRef}
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder={placeholder ?? "0"}
        value={display}
        onChange={(e) => {
          const digits = e.target.value
            .replace(/\D/g, "")
            .slice(0, MAX_AMOUNT_DIGITS);
          onChange(digits ? parseInt(digits, 10) : null);
        }}
        className="w-full min-w-0 bg-transparent font-mono text-sm font-medium tabular-nums text-foreground outline-none placeholder:text-muted-foreground/60"
      />
    </div>
  );
}

export default function CarteraEnDias() {
  const [state, setState] = React.useState<State>(() => clone(defaultState));
  const [hydrated, setHydrated] = React.useState(false);
  const [shareUrl, setShareUrl] = React.useState("");
  const [shareStatus, setShareStatus] = React.useState("");
  const [copied, setCopied] = React.useState(false);
  const [jsonCopied, setJsonCopied] = React.useState(false);

  React.useEffect(() => {
    let next = loadState();
    try {
      const params = new URLSearchParams(window.location.search);
      const d = params.get("d");
      if (d) {
        next = normalizeState(decodeState(d));
        setShareUrl(window.location.href);
        setShareStatus("Valores cargados desde un enlace compartido.");
      }
    } catch {
      // ignore malformed share payloads
    }
    setState(next);
    saveState(next);
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    saveState(state);
  }, [state, hydrated]);

  const totalMonthly = state.expenses.reduce(
    (sum, e) => sum + (e.amount ?? 0),
    0,
  );
  const dailyRate = totalMonthly / 30;
  const days =
    dailyRate > 0 ? Math.max(0, (state.balance ?? 0) / dailyRate) : 0;
  const months = days / 30;
  const years = days / 365;
  const monthlyBalance = (state.income ?? 0) - totalMonthly;

  let statusLabel: string;
  let statusTone: "good" | "warning" | "danger";
  if (totalMonthly <= 0) {
    statusLabel = "Ingresa tus gastos";
    statusTone = "good";
  } else if (days >= 60) {
    statusLabel = "Reserva saludable";
    statusTone = "good";
  } else if (days >= 30) {
    statusLabel = "Reserva ajustada";
    statusTone = "warning";
  } else {
    statusLabel = "Reserva crítica";
    statusTone = "danger";
  }

  const toneClasses = {
    good: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    danger: "bg-red-500/10 text-red-600 dark:text-red-400",
  } as const;
  const gaugeToneClasses = {
    good: "bg-emerald-500",
    warning: "bg-amber-500",
    danger: "bg-red-500",
  } as const;

  function updateExpense(id: string, patch: Partial<Expense>) {
    setState((s) => ({
      ...s,
      expenses: s.expenses.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }));
  }

  function removeExpense(id: string) {
    setState((s) => ({
      ...s,
      expenses: s.expenses.filter((e) => e.id !== id),
    }));
  }

  function addExpense() {
    const id = `custom-${Date.now()}`;
    setState((s) => ({
      ...s,
      expenses: [...s.expenses, { id, label: "Nuevo gasto", amount: null }],
    }));
    requestAnimationFrame(() => {
      const el = document.getElementById(`exp-label-${id}`);
      if (el instanceof HTMLInputElement) {
        el.focus();
        el.select();
      }
    });
  }

  async function handleShare() {
    try {
      const payload = {
        balance: state.balance,
        income: state.income,
        expenses: state.expenses,
      };
      const encoded = encodeState(payload);
      const url = new URL(window.location.href);
      url.searchParams.set("d", encoded);
      window.history.replaceState(null, "", url.toString());
      setShareUrl(url.toString());
      const ok = await copyToClipboard(url.toString());
      setShareStatus(
        ok ? "Enlace copiado al portapapeles." : "Copia el enlace manualmente.",
      );
    } catch {
      setShareStatus("No se pudo generar el enlace en este navegador.");
    }
  }

  function handleReset() {
    if (
      !window.confirm(
        "¿Restablecer todos los valores? Esta acción no se puede deshacer.",
      )
    ) {
      return;
    }
    const next = clone(defaultState);
    setState(next);
    saveState(next);
    setShareUrl("");
    setShareStatus("");
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.has("d")) {
        url.searchParams.delete("d");
        window.history.replaceState(null, "", url.toString());
      }
    } catch {
      // best-effort
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="sticky top-0 z-10 -mx-4 border-b border-border bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:mx-0 sm:rounded-md sm:border">
        <div className="flex flex-wrap items-baseline justify-center gap-2.5">
          <span className="font-mono text-3xl font-bold tabular-nums text-foreground">
            {fmtNum(days, 0)}
          </span>
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            días de reserva
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
              toneClasses[statusTone],
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                gaugeToneClasses[statusTone],
              )}
            />
            {statusLabel}
          </span>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleShare}
          className="flex flex-1 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <Share2 className="size-4" />
          Compartir valores
        </button>
        <button
          type="button"
          onClick={handleReset}
          aria-label="Restablecer valores"
          title="Restablecer valores"
          className="flex items-center justify-center rounded-md border border-border bg-background px-3 py-2 text-foreground shadow-xs transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <RotateCcw className="size-4" />
        </button>
      </div>

      {shareUrl && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="min-w-0 flex-1 truncate rounded-md border border-input bg-muted px-3 py-2 font-mono text-xs text-muted-foreground outline-none"
            />
            <button
              type="button"
              onClick={async () => {
                const ok = await copyToClipboard(shareUrl);
                setShareStatus(
                  ok
                    ? "Enlace copiado al portapapeles."
                    : "Selecciona y copia el enlace manualmente.",
                );
                setCopied(ok);
                if (ok) setTimeout(() => setCopied(false), 1500);
              }}
              className="flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground shadow-xs transition-colors hover:bg-accent"
            >
              {copied ? (
                <Check className="size-3.5" />
              ) : (
                <Copy className="size-3.5" />
              )}
              Copiar
            </button>
          </div>
          {shareStatus && (
            <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              {shareStatus}
            </p>
          )}
        </div>
      )}

      <div className="rounded-md border border-border p-4">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Saldo en cuenta
        </h2>
        <label
          htmlFor="balance"
          className="mb-1.5 block text-xs font-medium text-muted-foreground"
        >
          Monto disponible ahora
        </label>
        <AmountInput
          id="balance"
          value={state.balance}
          onChange={(v) => setState((s) => ({ ...s, balance: v }))}
        />
      </div>

      <div className="rounded-md border border-border p-4">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Ingreso mensual (opcional)
        </h2>
        <label
          htmlFor="income"
          className="mb-1.5 block text-xs font-medium text-muted-foreground"
        >
          Ingreso que recibes al mes
        </label>
        <AmountInput
          id="income"
          value={state.income}
          onChange={(v) => setState((s) => ({ ...s, income: v }))}
        />
      </div>

      <div className="rounded-md border border-border p-4">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Gastos mensuales
        </h2>
        <div className="flex flex-col">
          {state.expenses.map((exp) => (
            <div
              key={exp.id}
              className="grid grid-cols-[1fr_auto_auto] items-center gap-2 border-b border-border py-2 last:border-b-0"
            >
              <input
                id={`exp-label-${exp.id}`}
                type="text"
                value={exp.label}
                placeholder="Nombre del gasto"
                onChange={(e) =>
                  updateExpense(exp.id, { label: e.target.value })
                }
                className="min-w-0 bg-transparent py-1 text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground/60"
              />
              <AmountInput
                value={exp.amount}
                onChange={(v) => updateExpense(exp.id, { amount: v })}
                className="w-28 px-2.5 py-1.5"
              />
              <button
                type="button"
                onClick={() => removeExpense(exp.id)}
                aria-label="Eliminar gasto"
                className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addExpense}
          className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-accent"
        >
          <Plus className="size-4" />
          Agregar gasto
        </button>
        <div className="mt-3 flex items-baseline justify-between border-t border-border pt-3">
          <span className="text-xs font-semibold text-muted-foreground">
            Total mensual
          </span>
          <span className="font-mono text-base font-bold tabular-nums text-foreground">
            {fmtCLP(totalMonthly)}
          </span>
        </div>
      </div>

      <div className="rounded-md border border-border p-4">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Desglose
        </h2>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-md bg-muted px-2 py-2.5 text-center">
            <div className="font-mono text-lg font-bold tabular-nums text-foreground">
              {fmtNum(days, 0)}
            </div>
            <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Días
            </div>
          </div>
          <div className="rounded-md bg-muted px-2 py-2.5 text-center">
            <div className="font-mono text-lg font-bold tabular-nums text-foreground">
              {fmtNum(months, 1)}
            </div>
            <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Meses
            </div>
          </div>
          <div className="rounded-md bg-muted px-2 py-2.5 text-center">
            <div className="font-mono text-lg font-bold tabular-nums text-foreground">
              {fmtNum(years, 2)}
            </div>
            <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Años
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <div className="rounded-md bg-muted px-3 py-2.5">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Gasto diario
            </div>
            <div className="mt-0.5 font-mono text-sm font-bold tabular-nums text-foreground">
              {fmtCLP(dailyRate)}/día
            </div>
          </div>
          <div className="rounded-md bg-muted px-3 py-2.5">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Balance mensual
            </div>
            <div
              className={cn(
                "mt-0.5 font-mono text-sm font-bold tabular-nums",
                state.income
                  ? monthlyBalance >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400"
                  : "text-foreground",
              )}
            >
              {fmtCLP(monthlyBalance)}
            </div>
          </div>
        </div>
      </div>

      <details className="group rounded-md border border-border p-4">
        <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <span>Datos en memoria (JSON)</span>
          <span className="text-muted-foreground transition-transform group-open:rotate-180">
            ▾
          </span>
        </summary>
        <div className="mt-3 flex flex-col gap-2">
          <pre className="max-h-72 overflow-auto rounded-md bg-muted p-3 font-mono text-xs text-foreground">
            {JSON.stringify(state, null, 2)}
          </pre>
          <button
            type="button"
            onClick={async () => {
              const ok = await copyToClipboard(JSON.stringify(state, null, 2));
              setJsonCopied(ok);
              if (ok) setTimeout(() => setJsonCopied(false), 1500);
            }}
            className="flex items-center justify-center gap-1.5 self-start rounded-md border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground shadow-xs transition-colors hover:bg-accent"
          >
            {jsonCopied ? (
              <Check className="size-3.5" />
            ) : (
              <Copy className="size-3.5" />
            )}
            {jsonCopied ? "Copiado" : "Copiar JSON"}
          </button>
        </div>
      </details>

      <p className="text-center text-xs text-muted-foreground">
        Tus valores se guardan solo en este dispositivo.
      </p>
    </div>
  );
}
