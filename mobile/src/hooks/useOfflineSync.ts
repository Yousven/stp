import { App } from "@capacitor/app";
import { useCallback, useEffect, useState } from "react";
import { flushQueue, queueLength, type FlushResult } from "../api/offlineQueue";

/**
 * Saadab offline-järjekorra serverisse, kui ühendus taastub.
 *
 * Käivitub kolmel juhul: äpi avamisel, brauseri/WebView `online` sündmusel
 * ja äpi taasaktiveerimisel taustalt. Neid on vaja kõiki, kuna ükski üksi
 * ei kata kõiki olukordi (nt telefon oli lennurežiimis ja äpp taustal).
 */
export function useOfflineSync(onSynced?: () => void) {
  const [pending, setPending] = useState(0);
  const [lastResult, setLastResult] = useState<FlushResult | null>(null);

  const sync = useCallback(async () => {
    const before = await queueLength();
    if (before === 0) {
      setPending(0);
      return;
    }
    const result = await flushQueue();
    setLastResult(result);
    setPending(await queueLength());
    if (result.sent > 0) onSynced?.();
  }, [onSynced]);

  useEffect(() => {
    queueLength().then(setPending);
    sync();

    const onOnline = () => void sync();
    window.addEventListener("online", onOnline);

    const listener = App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) void sync();
    });

    return () => {
      window.removeEventListener("online", onOnline);
      listener.then((l) => l.remove());
    };
  }, [sync]);

  return { pending, lastResult, sync, clearResult: () => setLastResult(null) };
}
