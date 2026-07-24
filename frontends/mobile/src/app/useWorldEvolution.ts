import { useCallback, useEffect, useRef, useState } from "react";
import { worldApi, type WorldState } from "./worldApi";

export function useWorldEvolution(pollMs = 4000) {
  const [world, setWorld] = useState<WorldState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const next = await worldApi.getWorld();
      if (!mounted.current) return;
      setWorld(next);
      setError(null);
    } catch (reason) {
      if (!mounted.current) return;
      setError(reason instanceof Error ? reason.message : "World engine is offline");
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    refresh();
    const timer = window.setInterval(refresh, pollMs);
    return () => {
      mounted.current = false;
      window.clearInterval(timer);
    };
  }, [pollMs, refresh]);

  return { world, error, refresh };
}
