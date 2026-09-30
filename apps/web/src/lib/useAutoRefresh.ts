import { useEffect, useRef } from 'react';

/**
 * Периодически вызывает callback, пока страница видима.
 * При возврате вкладки/приложения в фокус вызывает сразу и перезапускает таймер.
 * В фоне таймер останавливается, чтобы не тратить запросы.
 */
export function useAutoRefresh(
  callback: () => void,
  intervalMs: number,
  enabled = true,
) {
  const cbRef = useRef(callback);
  useEffect(() => {
    cbRef.current = callback;
  });

  useEffect(() => {
    if (!enabled) return;

    let timer: number | null = null;

    const start = () => {
      if (timer !== null) return;
      timer = window.setInterval(() => {
        if (document.visibilityState === 'visible') cbRef.current();
      }, intervalMs);
    };

    const stop = () => {
      if (timer !== null) {
        window.clearInterval(timer);
        timer = null;
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        cbRef.current(); // сразу обновить при возврате
        start();
      } else {
        stop();
      }
    };

    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [intervalMs, enabled]);
}