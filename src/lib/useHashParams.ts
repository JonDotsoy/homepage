import * as React from "react";
import { atom, onMount } from "nanostores";
import { useStore } from "@nanostores/react";

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

const $hashParams = atom<URLSearchParams>(readHashParams());

onMount($hashParams, () => {
  const handleHashChange = () => $hashParams.set(readHashParams());
  window.addEventListener("hashchange", handleHashChange);
  return () => window.removeEventListener("hashchange", handleHashChange);
});

function setHashParam(key: string, value: string) {
  const next = new URLSearchParams($hashParams.get());
  if (value) {
    next.set(key, value);
  } else {
    next.delete(key);
  }
  writeHashParams(next);
  $hashParams.set(next);
}

/**
 * Keeps a `URLSearchParams` synced with `location.hash` in both directions:
 * calling `setHashParam` updates the hash, and external hash changes
 * (back/forward navigation, manual edits) update the returned params.
 */
export function useHashParams() {
  const params = useStore($hashParams);
  return { params, setHashParam };
}

/** Convenience wrapper around `useHashParams` for a single hash param. */
export function useHashParam(key: string): [string, (value: string) => void] {
  const params = useStore($hashParams);
  const setValue = React.useCallback(
    (value: string) => setHashParam(key, value),
    [key],
  );
  return [params.get(key) ?? "", setValue];
}
