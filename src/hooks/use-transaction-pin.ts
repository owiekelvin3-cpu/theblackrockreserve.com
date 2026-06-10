"use client";

import { useCallback, useRef, useState } from "react";

export function useTransactionPin() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const executorRef = useRef<((pin: string) => Promise<void>) | null>(null);

  const requestPin = useCallback((executor: (pin: string) => Promise<void>) => {
    executorRef.current = executor;
    setError("");
    setOpen(true);
  }, []);

  const closePin = useCallback(() => {
    if (loading) return;
    setOpen(false);
    setError("");
    executorRef.current = null;
  }, [loading]);

  const confirmPin = useCallback(async (pin: string) => {
    if (!executorRef.current) return;
    setLoading(true);
    setError("");
    try {
      await executorRef.current(pin);
      setOpen(false);
      executorRef.current = null;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transaction failed");
    } finally {
      setLoading(false);
    }
  }, []);

  return { open, loading, error, requestPin, closePin, confirmPin };
}
