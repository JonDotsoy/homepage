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
type FeedPage = { items: FeedItem[]; hasMore: boolean };
type FeedState = {
  items: FeedItem[];
  hasMore: boolean;
  loading: boolean;
  error: unknown;
};

const IDLE_FEED: FeedState = {
  items: [],
  hasMore: true,
  loading: true,
  error: null,
};

// Simula una API paginada: `cursor` es directamente el número de página
// (0, 1, 2…), y la respuesta dice si queda algo más para pedir.
function simulateFeedPage(
  cursor: number,
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
      const start = cursor * FEED_PAGE_SIZE;
      const items = Array.from({ length: FEED_PAGE_SIZE }, (_, i) => ({
        id: start + i + 1,
        title: `Artículo #${start + i + 1}`,
      }));
      resolve({ items, hasMore: cursor + 1 < FEED_TOTAL_PAGES });
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

// Mismo patrón que $params/$search: dos stores separados. $cursor no sabe
// nada de fetch — solo guarda qué página toca pedir. $feed es el único
// con onMount, y al montarse se subscribe a $cursor con subscribe() (así
// la página 0 sale de inmediato). A diferencia de $search, la respuesta
// no reemplaza el valor: se concatena a los items que ya había.
function createFeedStore(log: (text: string) => void): {
  $cursor: WritableAtom<number>;
  $feed: WritableAtom<FeedState>;
  config: Config;
  loadMore: () => void;
} {
  const $cursor = atom<number>(0);
  const $feed = atom<FeedState>(IDLE_FEED);
  const config: Config = { forceError: false, delayMs: 900 };
  let controller: AbortController | null = null;
  // Un remount rápido no debería repetir la última página ya cargada:
  // subscribe() dispara de nuevo con el cursor actual al re-montar, así
  // que hay que distinguir "cursor nuevo" de "el mismo de la vez pasada".
  let lastFetchedCursor: number | null = null;

  onMount($feed, () => {
    log("onMount → subscribe a $cursor");

    const unsubscribe = $cursor.subscribe((cursor) => {
      if (cursor === lastFetchedCursor) {
        log("cursor sin cambios desde el último fetch, no repite la página");
        return;
      }
      lastFetchedCursor = cursor;

      controller?.abort();
      const ownController = new AbortController();
      controller = ownController;
      const { signal } = ownController;
      $feed.set({ ...$feed.get(), loading: true, error: null });

      t(simulateFeedPage(cursor, config, signal)).then(([ok, error, page]) => {
        if (signal.aborted) {
          log("fetch de página abortado, se descarta");
          return;
        }
        const prev = $feed.get();
        $feed.set(
          ok
            ? {
                items: [...prev.items, ...page.items],
                hasMore: page.hasMore,
                loading: false,
                error: null,
              }
            : { ...prev, loading: false, error },
        );
        log(`t() resolvió → ok:${ok}`);
      });
    });

    return () => {
      log("onStop → unsubscribe de $cursor, aborta la página en curso");
      unsubscribe();
      controller?.abort();
    };
  });

  return {
    $cursor,
    $feed,
    config,
    loadMore: () => {
      const state = $feed.get();
      if (!state.hasMore || state.loading) return;
      $cursor.set($cursor.get() + 1);
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

type SearchItem = { id: number; title: string };

const SEARCH_CATALOG: SearchItem[] = [
  { id: 1, title: "my-state pattern" },
  { id: 2, title: "nanostores" },
  { id: 3, title: "onMount / onUnmount" },
  { id: 4, title: "AbortController" },
  { id: 5, title: "EventSource (SSE)" },
  { id: 6, title: "computed" },
  { id: 7, title: "infinite scroll" },
  { id: 8, title: "cursor de paginación" },
];

// Simula un endpoint de búsqueda: filtra el catálogo local tras un delay,
// y respeta cancelación real vía AbortSignal, igual que un fetch de verdad.
function simulateSearch(
  query: string,
  signal: AbortSignal,
): Promise<SearchItem[]> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = setTimeout(() => {
      const q = query.trim().toLowerCase();
      resolve(
        q
          ? SEARCH_CATALOG.filter((item) =>
              item.title.toLowerCase().includes(q),
            )
          : SEARCH_CATALOG,
      );
    }, 500);
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

// Variante de "parámetros reactivos" que sí pide algo remoto: dos stores
// separados. $params guarda lo que el usuario escribe, sin lógica propia.
// $search es el que tiene onMount: al montarse, se subscribe a $params y
// dispara el fetch correspondiente — y vuelve a hacerlo cada vez que
// $params cambia, cancelando el fetch anterior primero.
function createSearchStore(log: (text: string) => void): {
  $params: WritableAtom<string>;
  $search: WritableAtom<Resource<SearchItem[]>>;
} {
  const $params = atom<string>("");
  const $search = atom<Resource<SearchItem[]>>([true, null, null]);
  let controller: AbortController | null = null;

  onMount($search, () => {
    log("onMount → subscribe a $params");

    // subscribe (a diferencia de listen) dispara también con el valor
    // ACTUAL de $params, así el primer fetch sale de inmediato al montar,
    // igual que cualquier otro recurso de la página — y sigue disparando
    // con cada cambio posterior.
    const unsubscribe = $params.subscribe((query) => {
      controller?.abort();
      const ownController = new AbortController();
      controller = ownController;
      $search.set([true, null, null]);

      t(simulateSearch(query, ownController.signal)).then(
        ([ok, error, data]) => {
          if (ownController.signal.aborted) {
            log("fetch abortado (cambió $params antes de resolver)");
            return;
          }
          $search.set(ok ? [false, null, data] : [false, error, null]);
          log(`t() resolvió → ok:${ok}`);
        },
      );
    });

    return () => {
      log("onStop → unsubscribe de $params, aborta el fetch en curso");
      unsubscribe();
      controller?.abort();
    };
  });

  return { $params, $search };
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

  const { store, cursorStore, config, loadMore } = useMemo(() => {
    const demo = createFeedStore(push);
    return {
      store: demo.$feed,
      cursorStore: demo.$cursor,
      config: demo.config,
      loadMore: demo.loadMore,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const state = useGatedValue<FeedState>(store, active, IDLE_FEED);
  // $cursor no tiene onMount: leer su valor en cualquier momento es
  // inofensivo, así que no necesita el mismo gateo que $feed.
  const cursor = useLiveValue(cursorStore);
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
        Último estado ({state.items.length} items, <code>$cursor</code> ={" "}
        {cursor})
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

function SearchCard() {
  const [active, setActive] = useState(false);
  const { log, push, logRef } = useCardLog();

  const { $params, $search } = useMemo(
    () => createSearchStore(push),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const [loading, error, data] = useGatedValue<Resource<SearchItem[]>>(
    $search,
    active,
    [true, null, null],
  );
  const [text, setText] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        <code className="text-sm font-semibold text-stone-800">$search</code>
        <StatusPill state={[loading, error, data]} />
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

      <label className="flex flex-col gap-1 text-xs text-stone-600">
        $params (texto)
        <input
          type="text"
          value={text}
          placeholder="onMount, computed, cursor…"
          onChange={(event) => {
            const value = event.target.value;
            setText(value);
            // Solo escribe en $params (y por lo tanto, si $search está
            // montado, cancela el fetch en curso y dispara uno nuevo)
            // 300ms después del último tecleo.
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => {
              $params.set(value);
            }, 300);
          }}
          className="rounded-md border border-stone-300 px-2 py-1 text-xs"
        />
      </label>

      <div>
        <p className="mb-1 text-[11px] font-medium text-stone-500">
          Último estado ({data?.length ?? 0} resultados)
        </p>
        <div className="h-24 overflow-y-auto rounded-md border border-stone-100 bg-stone-50 text-[11px] text-stone-700">
          {data?.length ? (
            data.map((item) => (
              <div
                key={item.id}
                className="border-b border-stone-100 px-2 py-1.5"
              >
                {item.title}
              </div>
            ))
          ) : (
            <p className="px-2 py-3 text-center text-stone-400">
              {active ? "Sin resultados" : "Móntalo para buscar"}
            </p>
          )}
        </div>
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
          Parámetros reactivos: dos variantes. Una deriva un valor sin fetch (
          <code>computed</code>, sin <code>onMount</code>); la otra reacciona a
          cada cambio de parámetro con un fetch cancelable
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <ImageParamsCard key={`image-${resetKey}`} />
          <SearchCard key={`search-${resetKey}`} />
        </div>
      </div>
    </div>
  );
}
