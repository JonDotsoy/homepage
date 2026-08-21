import * as React from "react";

function readHashParams(): URLSearchParams {
  if (typeof window === "undefined") return new URLSearchParams();
  return new URLSearchParams(window.location.hash.replace(/^#/, ""));
}

function writeHashParams(params: URLSearchParams) {
  const query = params.toString();
  const hash = query ? `#${query}` : "";
  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}${window.location.search}${hash}`,
  );
}

/**
 * Keeps a `URLSearchParams` synced with `location.hash` in both directions:
 * calling `setHashParam` updates the hash, and external hash changes
 * (back/forward navigation, manual edits) update the returned params.
 */
export function useHashParams() {
  const [params, setParams] = React.useState<URLSearchParams>(readHashParams);

  React.useEffect(() => {
    const handleHashChange = () => setParams(readHashParams());
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const setHashParam = React.useCallback((key: string, value: string) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
      writeHashParams(next);
      return next;
    });
  }, []);

  return { params, setHashParam };
}

/** Convenience wrapper around `useHashParams` for a single hash param. */
export function useHashParam(key: string): [string, (value: string) => void] {
  const { params, setHashParam } = useHashParams();
  const setValue = React.useCallback(
    (value: string) => setHashParam(key, value),
    [key, setHashParam],
  );
  return [params.get(key) ?? "", setValue];
}
