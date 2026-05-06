import { useEffect, useState, useCallback, useRef } from "react";

export function useToast() {
  const [message, setMessage] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  const show = useCallback((msg: string) => {
    setMessage(msg);
    if (timerRef.current != null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setMessage(null), 1700);
  }, []);

  useEffect(
    () => () => {
      if (timerRef.current != null) window.clearTimeout(timerRef.current);
    },
    [],
  );

  return { message, show };
}
