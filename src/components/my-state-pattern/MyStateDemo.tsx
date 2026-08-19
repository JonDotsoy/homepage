import {
  atom,
  computed,
  onMount,
  type ReadableAtom,
  type WritableAtom,
} from "nanostores";
import { type RefObject, useEffect, useMemo, useRef, useState } from "react";

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

const FEED_PAGE_SIZE = 5;
const FEED_TOTAL_PAGES = 4;

type FeedItem = { id: number; title: string };
type FeedPage = { items: FeedItem[]; nextCursor: number | null };
type FeedState = {
  items: FeedItem[];
  cursor: number | null;
  hasMore: boolean;
  loading: boolean;
  error: unknown;
};

const IDLE_FEED: FeedState = {
  items: [],
  cursor: null,
  hasMore: true,
  loading: true,
  error: null,
};

// Simula una API paginada: `cursor` identifica la página a pedir (null =
// primera), y cada respuesta trae su propio `nextCursor` — el estado que
// hay que guardar para poder seguir pidiendo "la siguiente" sin volver a
// pedir lo ya cargado.
function simulateFeedPage(
  cursor: number | null,
  config: Config,
  signal: AbortSignal,
): Promise<FeedPage> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = setTimeout(() => {
      if (config.forceError) {
        reject(new Error("No se pudo cargar la página"));
        return;
      }
      const page = cursor ?? 0;
      const start = page * FEED_PAGE_SIZE;
      const items = Array.from({ length: FEED_PAGE_SIZE }, (_, i) => ({
        id: start + i + 1,
        title: `Artículo #${start + i + 1}`,
      }));
      const nextPage = page + 1;
      resolve({
        items,
        nextCursor: nextPage < FEED_TOTAL_PAGES ? nextPage : null,
      });
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

// A diferencia de Resource<T>, este store no reemplaza su valor en cada
// respuesta: lo acumula (`items: [...prev.items, ...page.items]`). El
// "state para continuar la paginación" es el cursor de la última página
// resuelta, guardado junto a los items.
function createFeedStore(log: (text: string) => void): {
  $feed: WritableAtom<FeedState>;
  config: Config;
  loadMore: () => void;
} {
  const $feed = atom<FeedState>(IDLE_FEED);
  const config: Config = { forceError: false, delayMs: 900 };
  let controller: AbortController | null = null;

  function loadPage(cursor: number | null, reason: string) {
    controller?.abort();
    const ownController = new AbortController();
    controller = ownController;
    const { signal } = ownController;

    log(`[$feed] ${reason}`);
    $feed.set({ ...$feed.get(), loading: true, error: null });

    t(simulateFeedPage(cursor, config, signal)).then(([ok, error, page]) => {
      if (signal.aborted) {
        log("[$feed] fetch de página abortado, se descarta");
        return;
      }
      if (!ok) {
        $feed.set({ ...$feed.get(), loading: false, error });
        log("[$feed] t() resolvió → ok:false");
        return;
      }
      const prev = $feed.get();
      $feed.set({
        items: [...prev.items, ...page.items],
        cursor: page.nextCursor,
        hasMore: page.nextCursor !== null,
        loading: false,
        error: null,
      });
      log(`[$feed] t() resolvió → ok:true, +${page.items.length} items`);
    });
  }

  onMount($feed, () => {
    // Solo pide la primera página si todavía no hay nada: un remount
    // rápido (desmontar y volver a montar antes del onStop) no debería
    // tirar los items que ya se acumularon.
    if ($feed.get().items.length === 0) {
      loadPage(null, "onMount → sin items todavía, pide la primera página");
    } else {
      log("[$feed] onMount → ya había items, no repite la primera página");
    }

    return () => {
      log("[$feed] onStop → aborta la página en curso, conserva los items");
      controller?.abort();
    };
  });

  return {
    $feed,
    config,
    loadMore: () => {
      const state = $feed.get();
      if (!state.hasMore || state.loading) return;
      loadPage(state.cursor, "cargar más → siguiente página con el cursor");
    },
  };
}

type ImageParams = {
  text: string;
  width: number;
  height: number;
  bg: string;
  fg: string;
};

const DEFAULT_IMAGE_PARAMS: ImageParams = {
  text: "my-state",
  width: 320,
  height: 160,
  bg: "1c1917",
  fg: "ffffff",
};

const IMAGE_SIZE_PRESETS: Array<Pick<ImageParams, "width" | "height">> = [
  { width: 320, height: 160 },
  { width: 240, height: 240 },
  { width: 480, height: 200 },
];

// No hay recurso remoto que pedir: $params guarda lo que el usuario escribe,
// y $imageUrl deriva sincrónicamente la URL a partir de esos parámetros con
// un `computed` normal. No necesita onMount porque no hay nada async que
// activar perezosamente — el navegador hace el fetch de la imagen solo,
// declarativamente, al poner esa URL en un <img src>.
function createImageParamsStore(): {
  $params: WritableAtom<ImageParams>;
  $imageUrl: ReadableAtom<string>;
} {
  const $params = atom<ImageParams>(DEFAULT_IMAGE_PARAMS);
  const $imageUrl = computed($params, (params) => {
    const text = encodeURIComponent(params.text.trim() || " ");
    return `https://placehold.co/${params.width}x${params.height}/${params.bg}/${params.fg}?text=${text}`;
  });
  return { $params, $imageUrl };
}

// A diferencia de useGatedValue, este store no tiene onMount ni efectos
// secundarios que activar: leer .get() en cualquier momento es inofensivo,
// así que basta con un subscribe normal (lo mismo que hace useStore de
// @nanostores/react).
function useLiveValue<T>(store: ReadableAtom<T>): T {
  const [value, setValue] = useState(() => store.get());
  useEffect(() => store.listen(setValue), [store]);
  return value;
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

// Cada tarjeta lleva su propio registro de actividad: nada se comparte
// entre ejemplos, así montar/desmontar uno no ensucia el log de otro.
function useCardLog() {
  const [log, setLog] = useState<Entry[]>([]);
  const idRef = useRef(0);
  const logRef = useRef<HTMLDivElement>(null);

  const push = (text: string) => {
    idRef.current += 1;
    setLog((prev) => [
      ...prev.slice(-19),
      {
        id: idRef.current,
        time: new Date().toLocaleTimeString("es-CL", { hour12: false }),
        text,
      },
    ]);
  };

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [log]);

  return { log, push, logRef };
}

function LogPanel({
  log,
  logRef,
}: {
  log: Entry[];
  logRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      ref={logRef}
      className="h-24 overflow-y-auto rounded-md border border-stone-200 bg-white p-2 font-mono text-[10px] leading-relaxed text-stone-600"
    >
      {log.length === 0 && (
        <p className="text-stone-400">
          Sin actividad. Móntalo para ver su ciclo de vida.
        </p>
      )}
      {log.map((entry) => (
        <p key={entry.id}>
          <span className="text-stone-400">{entry.time}</span> {entry.text}
        </p>
      ))}
    </div>
  );
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

function ResourceCard({ def }: { def: ResourceDef }) {
  const [active, setActive] = useState(false);
  const { log, push, logRef } = useCardLog();

  // Este ejemplo es independiente: su propio store, su propio config y su
  // propio ciclo de vida, sin depender de ningún otro ejemplo de la página.
  const { store, config, retry } = useMemo(() => {
    // nanostores espera ~1s (STORE_UNMOUNT_DELAY) tras el último unsubscribe
    // antes de llamar el onUnmount; el delay simulado debe ser mayor a eso
    // para que desmontar durante la carga demuestre un abort real.
    const config: Config = { forceError: false, delayMs: 2200 };
    const demoStore = createDemoStore(def, config, push);
    return { store: demoStore.$resource, config, retry: demoStore.retry };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const state = useGatedValue<Resource<unknown>>(store, active, [
    true,
    null,
    null,
  ]);
  const [, error, data] = state;
  const [forceError, setForceError] = useState(config.forceError);

  const handleToggle = () => {
    setActive((prev) => {
      const next = !prev;
      push(
        next
          ? "subscribe() → primer subscriptor, se activa onMount"
          : "unsubscribe → sin subscriptores, se agenda onStop",
      );
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-stone-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <code className="text-sm font-semibold text-stone-800">${def.key}</code>
        <StatusPill state={state} />
      </div>

      <button
        onClick={handleToggle}
        className={
          "rounded-md px-2.5 py-1 text-xs font-semibold transition-colors " +
          (active
            ? "bg-stone-900 text-white hover:bg-stone-700"
            : "bg-emerald-600 text-white hover:bg-emerald-500")
        }
      >
        {active ? "Desmontar (unsubscribe)" : "Montar (subscribe)"}
      </button>

      <div>
        <p className="mb-1 text-[11px] font-medium text-stone-500">
          Último estado
        </p>
        <pre className="overflow-x-auto rounded-md bg-stone-50 p-2 text-[11px] leading-relaxed text-stone-700">
          {`[${state[0]}, ${
            error
              ? JSON.stringify(String((error as Error)?.message ?? error))
              : "null"
          }, ${data ? JSON.stringify(data) : "null"}]`}
        </pre>
      </div>

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
          onClick={retry}
          disabled={!active}
          className="rounded-md border border-stone-300 bg-white px-2.5 py-1 font-medium text-stone-700 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Reintentar
        </button>
      </div>

      <div>
        <p className="mb-1 text-[11px] font-medium text-stone-500">
          Registro de actividad
        </p>
        <LogPanel log={log} logRef={logRef} />
      </div>
    </div>
  );
}

function SseCard() {
  const [active, setActive] = useState(false);
  const { log, push, logRef } = useCardLog();

  const { store, config, reconnect } = useMemo(() => {
    const demo = createSseDemoStore(push);
    return {
      store: demo.$resource,
      config: demo.config,
      reconnect: demo.reconnect,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const state = useGatedValue<Resource<SseTick>>(store, active, [
    true,
    null,
    null,
  ]);
  const [loading, error, data] = state;
  const [forceError, setForceError] = useState(config.forceError);

  const handleToggle = () => {
    setActive((prev) => {
      const next = !prev;
      push(
        next
          ? "subscribe() → primer subscriptor, se activa onMount"
          : "unsubscribe → sin subscriptores, se agenda onStop",
      );
      return next;
    });
  };

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

      <button
        onClick={handleToggle}
        className={
          "rounded-md px-2.5 py-1 text-xs font-semibold transition-colors " +
          (active
            ? "bg-stone-900 text-white hover:bg-stone-700"
            : "bg-emerald-600 text-white hover:bg-emerald-500")
        }
      >
        {active ? "Desmontar (unsubscribe)" : "Montar (subscribe)"}
      </button>

      <div>
        <p className="mb-1 text-[11px] font-medium text-stone-500">
          Último estado
        </p>
        <pre className="overflow-x-auto rounded-md bg-stone-50 p-2 text-[11px] leading-relaxed text-stone-700">
          {`[${state[0]}, ${
            error
              ? JSON.stringify(String((error as Error)?.message ?? error))
              : "null"
          }, ${data ? JSON.stringify(data) : "null"}]`}
        </pre>
      </div>

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
          onClick={reconnect}
          disabled={!active}
          className="rounded-md border border-stone-300 bg-white px-2.5 py-1 font-medium text-stone-700 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Reconectar
        </button>
      </div>

      <div>
        <p className="mb-1 text-[11px] font-medium text-stone-500">
          Registro de actividad
        </p>
        <LogPanel log={log} logRef={logRef} />
      </div>
    </div>
  );
}

function FeedCard() {
  const [active, setActive] = useState(false);
  const { log, push, logRef } = useCardLog();

  const { store, config, loadMore } = useMemo(() => {
    const demo = createFeedStore(push);
    return { store: demo.$feed, config: demo.config, loadMore: demo.loadMore };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const state = useGatedValue<FeedState>(store, active, IDLE_FEED);
  const [forceError, setForceError] = useState(config.forceError);
  const containerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const handleToggle = () => {
    setActive((prev) => {
      const next = !prev;
      push(
        next
          ? "subscribe() → primer subscriptor, se activa onMount"
          : "unsubscribe → sin subscriptores, se agenda onStop",
      );
      return next;
    });
  };

  // Infinite scroll real: observa el centinela al final de la lista y
  // pide la siguiente página cuando entra en el viewport del contenedor.
  useEffect(() => {
    if (!active || !state.hasMore || state.loading) return;
    const root = containerRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { root, rootMargin: "40px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [active, state.hasMore, state.loading, loadMore]);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-stone-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <code className="text-sm font-semibold text-stone-800">$feed</code>
        {state.error ? (
          <StatusPill state={[false, state.error, null]} />
        ) : state.loading ? (
          <StatusPill state={[true, null, null]} />
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            {state.items.length} items
          </span>
        )}
      </div>

      <button
        onClick={handleToggle}
        className={
          "rounded-md px-2.5 py-1 text-xs font-semibold transition-colors " +
          (active
            ? "bg-stone-900 text-white hover:bg-stone-700"
            : "bg-emerald-600 text-white hover:bg-emerald-500")
        }
      >
        {active ? "Desmontar (unsubscribe)" : "Montar (subscribe)"}
      </button>

      <p className="mb-[-8px] text-[11px] font-medium text-stone-500">
        Último estado ({state.items.length} items acumulados)
      </p>
      <div
        ref={containerRef}
        className="h-40 overflow-y-auto rounded-md border border-stone-100 bg-stone-50 text-[11px] text-stone-700"
      >
        {state.items.map((item) => (
          <div key={item.id} className="border-b border-stone-100 px-2 py-1.5">
            {item.title}
          </div>
        ))}
        {state.hasMore ? (
          <div
            ref={sentinelRef}
            className="px-2 py-3 text-center text-stone-400"
          >
            {state.loading ? "Cargando más…" : "— desplázate para cargar más —"}
          </div>
        ) : (
          <div className="px-2 py-3 text-center text-stone-400">
            — fin del feed —
          </div>
        )}
      </div>

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
          forzar error de página
        </label>
        <button
          onClick={loadMore}
          disabled={!active || !state.hasMore || state.loading}
          className="rounded-md border border-stone-300 bg-white px-2.5 py-1 font-medium text-stone-700 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Cargar más
        </button>
      </div>

      {state.error ? (
        <p className="text-[11px] text-red-600">
          {String((state.error as Error)?.message ?? state.error)}
        </p>
      ) : null}

      <div>
        <p className="mb-1 text-[11px] font-medium text-stone-500">
          Registro de actividad
        </p>
        <LogPanel log={log} logRef={logRef} />
      </div>
    </div>
  );
}

function ImageParamsCard() {
  // También es independiente: no depende de que ningún otro ejemplo se
  // haya montado, y tampoco tiene ciclo de vida propio que gatear.
  const { $params: paramsStore, $imageUrl: imageUrlStore } = useMemo(
    () => createImageParamsStore(),
    [],
  );
  const params = useLiveValue(paramsStore);
  const imageUrl = useLiveValue(imageUrlStore);
  const [text, setText] = useState(params.text);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-stone-200 bg-white p-4 sm:flex-row">
      <img
        src={imageUrl}
        alt={params.text || "placeholder"}
        width={params.width}
        height={params.height}
        className="h-auto w-full max-w-[200px] rounded-md border border-stone-100 sm:w-1/2"
      />

      <div className="flex flex-1 flex-col gap-3">
        <div className="flex items-center justify-between">
          <code className="text-sm font-semibold text-stone-800">
            $imageUrl
          </code>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-600">
            sin onMount, solo computed
          </span>
        </div>

        <label className="flex flex-col gap-1 text-xs text-stone-600">
          Texto
          <input
            type="text"
            value={text}
            onChange={(event) => {
              const value = event.target.value;
              setText(value);
              // Debounce: solo escribe en $params (y por lo tanto pide una
              // nueva imagen al servicio de placeholder) 300ms después del
              // último tecleo, no en cada keystroke.
              if (debounceRef.current) clearTimeout(debounceRef.current);
              debounceRef.current = setTimeout(() => {
                paramsStore.set({ ...paramsStore.get(), text: value });
              }, 300);
            }}
            className="rounded-md border border-stone-300 px-2 py-1 text-xs"
          />
        </label>

        <div className="flex flex-wrap gap-1.5">
          {IMAGE_SIZE_PRESETS.map((size) => (
            <button
              key={`${size.width}x${size.height}`}
              onClick={() => paramsStore.set({ ...paramsStore.get(), ...size })}
              className={
                "rounded-md border px-2 py-1 text-[11px] font-medium transition-colors " +
                (params.width === size.width && params.height === size.height
                  ? "border-stone-900 bg-stone-900 text-white"
                  : "border-stone-300 bg-white text-stone-700 hover:bg-stone-100")
              }
            >
              {size.width}×{size.height}
            </button>
          ))}
        </div>

        <pre className="overflow-x-auto rounded-md bg-stone-50 p-2 text-[11px] leading-relaxed text-stone-700">
          {imageUrl}
        </pre>
      </div>
    </div>
  );
}

export default function MyStateDemo() {
  // El único estado que vive en el padre: un contador para forzar un
  // remount completo de cada tarjeta (cada una crea sus propios stores,
  // su propio log y su propio "montado/desmontado" — nada se comparte).
  const [resetKey, setResetKey] = useState(0);

  return (
    <div className="flex flex-col gap-6 rounded-xl border border-stone-200 bg-stone-50/50 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-stone-500">
          Cada tarjeta de abajo es un ejemplo independiente: su propio botón
          montar/desmontar, su propio registro de actividad, y su propio campo
          con el último estado. Ninguna depende de que otra esté montada.
        </p>
        <button
          onClick={() => setResetKey((k) => k + 1)}
          className="shrink-0 rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-100"
        >
          Reiniciar todos los ejemplos
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {RESOURCE_DEFS.map((def) => (
          <ResourceCard key={`${def.key}-${resetKey}`} def={def} />
        ))}
      </div>

      <div>
        <p className="mb-1 text-xs font-medium text-stone-500">
          Streaming (SSE): mismo ciclo <code>onMount</code>/
          <code>onUnmount</code>, un recurso que no se resuelve una sola vez
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <SseCard key={`sse-${resetKey}`} />
        </div>
      </div>

      <div>
        <p className="mb-1 text-xs font-medium text-stone-500">
          Infinite scroll: store incremental, el cursor de la última página es
          el estado que permite continuar la paginación
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <FeedCard key={`feed-${resetKey}`} />
        </div>
      </div>

      <div>
        <p className="mb-1 text-xs font-medium text-stone-500">
          Parámetros reactivos: <code>computed</code> sin <code>onMount</code>,
          no hay nada remoto que pedir perezosamente
        </p>
        <ImageParamsCard key={`image-${resetKey}`} />
      </div>
    </div>
  );
}
