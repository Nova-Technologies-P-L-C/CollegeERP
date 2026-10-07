"use client";

import { useSyncExternalStore, useCallback } from "react";

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

export function useStoredState<T>(key: string, defaultValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const fullKey = `cmp_filter_${key}`;

  const getSnapshot = useCallback(() => {
    if (typeof window === "undefined") return null;
    try {
      return window.sessionStorage.getItem(fullKey);
    } catch {
      return null;
    }
  }, [fullKey]);

  const getServerSnapshot = useCallback(() => null, []);

  const rawValue = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  let value: T = defaultValue;
  if (rawValue !== null) {
    try {
      value = JSON.parse(rawValue) as T;
    } catch {
      value = defaultValue;
    }
  }

  const setStoredState = useCallback(
    (newValue: T | ((val: T) => T)) => {
      try {
        if (typeof window !== "undefined") {
          const currentItem = window.sessionStorage.getItem(fullKey);
          const currentVal = currentItem !== null ? (JSON.parse(currentItem) as T) : defaultValue;
          const nextValue = typeof newValue === "function" ? (newValue as (val: T) => T)(currentVal) : newValue;
          window.sessionStorage.setItem(fullKey, JSON.stringify(nextValue));
          window.dispatchEvent(new Event("storage"));
        }
      } catch {
        /* ignore */
      }
    },
    [fullKey, defaultValue]
  );

  return [value, setStoredState];
}
