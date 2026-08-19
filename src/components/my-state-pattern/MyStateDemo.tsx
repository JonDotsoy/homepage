import { atom, computed, onMount, type WritableAtom } from "nanostores";
import { useEffect, useMemo, useRef, useState } from "react";

type Resource<T> = [loading: boolean, error: unknown, data: T | null];

type Ok<T> = [ok: true, error: null, data: T];
type Err = [ok: false, error: unknown, data: null];

const t = async <T,>(promise: Promise<T>): Promise<Ok<T> | Err> => {
  try {
    const data = await promise;
    return [true, null, data];
  } catch (error) {
    return [false, error, null];
  }
};

type Entry = { id: number; time: string; text: string };

type Config = { forceError: boolean; delayMs: number };

type ResourceDef = {
  key: "session" | "recentArticles" | "serverHealth";
  sample: unknown;
};

const RESOURCE_DEFS: ResourceDef[] = [
  { key: "session", sample: { user: "jondotsoy", plan: "pro" } },
  {
    key: "recentArticles",
    sample: [{ id: "my-state-pattern" }, { id: "otro-articulo" }],
  },
  { key: "serverHealth", sample: { status: "ok", latencyMs: 42 } },
];

// Simula fetch(url, { signal }): si el signal aborta antes de que el
// timer dispare, rechaza con un AbortError real y limpia el timer, igual
// que haría el navegador con una petición de red cancelada de verdad.
function simulate(
  def: ResourceDef,
  config: Config,
  signal: AbortSignal,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = setTimeout(() => {
      if (config.forceError) reject(new Error(`No se pudo obtener ${def.key}`));
      else resolve(def.sample);
    }, config.delayMs);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

function createDemoStore(
  def: ResourceDef,
  config: Config,
  log: (text: string) => void,
): { $resource: WritableAtom<Resource<unknown>>; retry: () => void } {
  const $resource = atom<Resource<unknown>>([true, null, null]);
  let controller: AbortController | null = null;

  // Un único punto de entrada para disparar el fetch, usado tanto por
  // onMount como por el botón "Reintentar": aborta cualquier petición
  // anterior antes de empezar una nueva, así nunca hay dos en carrera.
  function run(reason: string) {
    controller?.abort();
    const ownController = new AbortController();
    controller = ownController;
    const { signal } = ownController;

    log(`[$${def.key}] ${reason}`);
    $resource.set([true, null, null]);

    t(simulate(def, config, signal)).then(([ok, error, data]) => {
      if (signal.aborted) {
        log(`[$${def.key}] fetch abortado, se descarta la respuesta`);
        return;
      }
      $resource.set([false, error, data as unknown]);
      log(`[$${def.key}] t() resolvió → ok:${ok}`);
    });
  }

  onMount($resource, () => {
    run("onMount → nadie escuchaba, ahora sí: fetch()");

    // Esto es el "onUnmount": nanostores llama esta función cuando el
    // último subscriptor se va (con ~1s de gracia para evitar abortar
    // por un remount rápido). Es el lugar correcto para cancelar
    // cualquier petición en curso vía AbortController.
    return () => {
      log(`[$${def.key}] onStop → controller.abort() del fetch en curso`);
      controller?.abort();
    };
  });

  return { $resource, retry: () => run("reintento manual") };
}

type SseTick = { tick: number; value: number };

// Simula un EventSource: en vez de resolver una vez, empuja mensajes
// periódicos al store mientras está "conectado". onUnmount cierra la
// conexión (clearInterval aquí, `source.close()` con un EventSource real)
// en vez de abortar una petición puntual — mismo contrato, otro recurso.
function createSseDemoStore(log: (text: string) => void): {
  $resource: WritableAtom<Resource<SseTick>>;
  config: Config;
  reconnect: () => void;
} {
  const $resource = atom<Resource<SseTick>>([true, null, null]);
  const config: Config = { forceError: false, delayMs: 700 };
  let timer: ReturnType<typeof setInterval> | null = null;

  function close() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  function connect(reason: string) {
    close();
    log(`[$liveMetrics] ${reason}`);
    $resource.set([true, null, null]);

    let tick = 0;
    timer = setInterval(() => {
      if (config.forceError) {
        log("[$liveMetrics] conexión perdida (source.onerror)");
        $resource.set([false, new Error("Conexión SSE perdida"), null]);
        close();
        return;
      }
      tick += 1;
      if (tick === 1) log("[$liveMetrics] primer mensaje (source.onmessage)");
      $resource.set([
        false,
        null,
        { tick, value: Math.round(Math.random() * 100) },
      ]);
    }, config.delayMs);
  }

  onMount($resource, () => {
    connect("onMount → abre EventSource");

    return () => {
      log("[$liveMetrics] onStop → source.close()");
      close();
    };
  });

  return {
    $resource,
    config,
    reconnect: () => connect("reconectar (nuevo EventSource)"),
  };
}

// Reading `store.get()` on a nanostores atom momentarily mounts it (even
// without a lasting listener), which would trigger onMount's fetch as a
// side effect of rendering. To keep "nobody is watching" truly inert
// (including during SSR), never touch the store until `active` is true.
function useGatedValue<T>(store: WritableAtom<T>, active: boolean, idle: T): T {
  const [value, setValue] = useState<T>(idle);

  useEffect(() => {
    if (!active) {
      setValue(idle);
      return;
    }
    setValue(store.get());
    return store.listen(setValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, active]);

  return value;
}

function StatusPill({ state }: { state: Resource<unknown> }) {
  const [loading, error] = state;
  if (loading)
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
        <span className="size-1.5 animate-pulse rounded-full bg-amber-500" />
        loading
      </span>
    );
  if (error)
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
        <span className="size-1.5 rounded-full bg-red-500" />
        error
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
      <span className="size-1.5 rounded-full bg-emerald-500" />
      ok
    </span>
  );
}

function ResourceCard({
  def,
  store,
  config,
  active,
  onRetry,
}: {
  def: ResourceDef;
  store: WritableAtom<Resource<unknown>>;
  config: Config;
  active: boolean;
  onRetry: () => void;
}) {
  const state = useGatedValue<Resource<unknown>>(store, active, [
    true,
    null,
    null,
  ]);
  const [, error, data] = state;
  const [forceError, setForceError] = useState(config.forceError);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-stone-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <code className="text-sm font-semibold text-stone-800">${def.key}</code>
        <StatusPill state={state} />
      </div>

      <pre className="overflow-x-auto rounded-md bg-stone-50 p-2 text-[11px] leading-relaxed text-stone-700">
        {`[${state[0]}, ${
          error
            ? JSON.stringify(String((error as Error)?.message ?? error))
            : "null"
        }, ${data ? JSON.stringify(data) : "null"}]`}
      </pre>

      <div className="flex items-center justify-between gap-2 text-xs">
        <label className="flex items-center gap-1.5 text-stone-600">
          <input
            type="checkbox"
            checked={forceError}
            onChange={() => {
              config.forceError = !config.forceError;
              setForceError(config.forceError);
            }}
            className="size-3.5"
          />
          forzar error
        </label>
        <button
          onClick={onRetry}
          disabled={!active}
          className="rounded-md border border-stone-300 bg-white px-2.5 py-1 font-medium text-stone-700 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}

function SseCard({
  store,
  config,
  active,
  onReconnect,
}: {
  store: WritableAtom<Resource<SseTick>>;
  config: Config;
  active: boolean;
  onReconnect: () => void;
}) {
  const state = useGatedValue<Resource<SseTick>>(store, active, [
    true,
    null,
    null,
  ]);
  const [loading, error, data] = state;
  const [forceError, setForceError] = useState(config.forceError);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-stone-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <code className="text-sm font-semibold text-stone-800">
          $liveMetrics
        </code>
        {loading ? (
          <StatusPill state={state} />
        ) : error ? (
          <StatusPill state={state} />
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-800">
            <span className="size-1.5 animate-pulse rounded-full bg-sky-500" />
            streaming
          </span>
        )}
      </div>

      <pre className="overflow-x-auto rounded-md bg-stone-50 p-2 text-[11px] leading-relaxed text-stone-700">
        {`[${state[0]}, ${
          error
            ? JSON.stringify(String((error as Error)?.message ?? error))
            : "null"
        }, ${data ? JSON.stringify(data) : "null"}]`}
      </pre>

      <div className="flex items-center justify-between gap-2 text-xs">
        <label className="flex items-center gap-1.5 text-stone-600">
          <input
            type="checkbox"
            checked={forceError}
            onChange={() => {
              config.forceError = !config.forceError;
              setForceError(config.forceError);
            }}
            className="size-3.5"
          />
          simular corte
        </label>
        <button
          onClick={onReconnect}
          disabled={!active}
          className="rounded-md border border-stone-300 bg-white px-2.5 py-1 font-medium text-stone-700 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Reconectar
        </button>
      </div>
    </div>
  );
}

export default function MyStateDemo() {
  const [active, setActive] = useState(false);
  const [log, setLog] = useState<Entry[]>([]);
  const [generation, setGeneration] = useState(0);
  const logRef = useRef<HTMLDivElement>(null);
  const logIdRef = useRef(0);

  const pushLog = (text: string) => {
    logIdRef.current += 1;
    setLog((prev) => [
      ...prev.slice(-49),
      {
        id: logIdRef.current,
        time: new Date().toLocaleTimeString("es-CL", { hour12: false }),
        text,
      },
    ]);
  };

  const { stores, retries, configs, $home, sse } = useMemo(() => {
    const configs: Record<string, Config> = {};
    const stores: Record<string, WritableAtom<Resource<unknown>>> = {};
    const retries: Record<string, () => void> = {};
    for (const def of RESOURCE_DEFS) {
      // nanostores espera ~1s (STORE_UNMOUNT_DELAY) tras el último
      // unsubscribe antes de llamar el onUnmount; el delay simulado debe
      // ser mayor a eso para que desmontar durante la carga demuestre un
      // abort real y no una simple carrera ganada por el fetch.
      const config: Config = { forceError: false, delayMs: 2200 };
      configs[def.key] = config;
      const demoStore = createDemoStore(def, config, pushLog);
      stores[def.key] = demoStore.$resource;
      retries[def.key] = demoStore.retry;
    }
    const $home = computed(
      RESOURCE_DEFS.map((d) => stores[d.key]),
      (...states) =>
        Object.fromEntries(RESOURCE_DEFS.map((d, i) => [d.key, states[i]])),
    );
    // $liveMetrics no entra a $home: no es un recurso de una sola
    // resolución, pero comparte el mismo contrato onMount/onUnmount.
    const sse = createSseDemoStore(pushLog);
    return { stores, retries, configs, $home, sse };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generation]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [log]);

  const idleHome = useMemo(
    () =>
      Object.fromEntries(RESOURCE_DEFS.map((d) => [d.key, [true, null, null]])),
    [],
  );
  const homeState = useGatedValue($home, active, idleHome);

  const handleToggleSubscribe = () => {
    setActive((prev) => {
      const next = !prev;
      pushLog(
        next
          ? "$home.subscribe() → primer subscriptor, se activa onMount de cada recurso"
          : "$home unsubscribe → sin subscriptores, se limpia cada recurso",
      );
      return next;
    });
  };

  const handleRemount = () => {
    setActive(false);
    setLog([]);
    setGeneration((g) => g + 1);
    pushLog("Stores recreados desde cero (simula recargar la página)");
  };

  return (
    <div className="flex flex-col gap-6 rounded-xl border border-stone-200 bg-stone-50/50 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-stone-800">
            $home = computed([$session, $recentArticles, $serverHealth])
          </p>
          <p className="text-xs text-stone-500">
            Nada se pide hasta que alguien se suscribe a <code>$home</code>.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRemount}
            className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-100"
          >
            Recargar página
          </button>
          <button
            onClick={handleToggleSubscribe}
            className={
              "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors " +
              (active
                ? "bg-stone-900 text-white hover:bg-stone-700"
                : "bg-emerald-600 text-white hover:bg-emerald-500")
            }
          >
            {active ? "Desmontar (unsubscribe)" : "Montar HomePage (subscribe)"}
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {RESOURCE_DEFS.map((def) => (
          <ResourceCard
            key={`${def.key}-${generation}`}
            def={def}
            store={stores[def.key]}
            config={configs[def.key]}
            active={active}
            onRetry={retries[def.key]}
          />
        ))}
      </div>

      <div>
        <p className="mb-1 text-xs font-medium text-stone-500">
          Streaming (SSE): mismo ciclo <code>onMount</code>/
          <code>onUnmount</code>, un recurso que no se resuelve una sola vez
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <SseCard
            key={`sse-${generation}`}
            store={sse.$resource}
            config={sse.config}
            active={active}
            onReconnect={sse.reconnect}
          />
        </div>
      </div>

      <div>
        <p className="mb-1 text-xs font-medium text-stone-500">
          Estado combinado de la página ($home.get())
        </p>
        <pre className="max-h-32 overflow-auto rounded-md bg-stone-900 p-3 text-[11px] leading-relaxed text-stone-100">
          {JSON.stringify(homeState, null, 2)}
        </pre>
      </div>

      <div>
        <p className="mb-1 text-xs font-medium text-stone-500">
          Registro de actividad (onMount / onStop / t())
        </p>
        <div
          ref={logRef}
          className="h-32 overflow-y-auto rounded-md border border-stone-200 bg-white p-2 font-mono text-[11px] leading-relaxed text-stone-600"
        >
          {log.length === 0 && (
            <p className="text-stone-400">
              Sin actividad todavía. Monta la página para ver los fetch
              dispararse.
            </p>
          )}
          {log.map((entry) => (
            <p key={entry.id}>
              <span className="text-stone-400">{entry.time}</span> {entry.text}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
