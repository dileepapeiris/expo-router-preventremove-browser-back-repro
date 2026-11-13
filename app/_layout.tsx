import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { HistoryStatus } from '../components/HistoryStatus';

// Web only: records every history command Expo Router issues, plus popstate events, in
// `globalThis.historyLog`. The trace script prints it after each step.
function useHistoryLog() {
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const g = globalThis as any;
    if (g.historyLog) return;
    g.historyLog = [];
    const started = performance.now();
    const log = (what: string) =>
      g.historyLog.push(
        `${(performance.now() - started).toFixed(0).padStart(6)}ms ${what}  (url=${location.pathname}, history.length=${history.length})`
      );
    const h = window.history;
    const original = { go: h.go, pushState: h.pushState, replaceState: h.replaceState };
    h.go = function (delta?: number) {
      log(`history.go(${delta})`);
      return original.go.call(this, delta);
    };
    h.pushState = function (state: any, title: string, url?: string | URL | null) {
      log(`pushState(${JSON.stringify(state)}, ${url})`);
      return original.pushState.call(this, state, title, url);
    };
    h.replaceState = function (state: any, title: string, url?: string | URL | null) {
      log(`replaceState(${JSON.stringify(state)}, ${url})`);
      return original.replaceState.call(this, state, title, url);
    };
    window.addEventListener('popstate', () => log(`popstate state=${JSON.stringify(history.state)}`));
  }, []);
}

export default function Layout() {
  useHistoryLog();
  return (
    <>
      <HistoryStatus />
      <Stack />
    </>
  );
}
