"use client";

import { useCallback, useEffect, useState } from "react";

type Provider = "spotify" | "apple" | null;

type State = {
  isAuthenticated: boolean;
  provider: Provider;
  checking: boolean;
  error?: string;
};

const STORAGE_KEY = "vibely.streamingAuth";

function readStorage(): { provider: Provider; token?: string } {
  if (typeof window === "undefined") return { provider: null };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { provider: "spotify", token: undefined };
  } catch {
    return { provider: "spotify", token: undefined };
  }
}

function writeStorage(data: { provider: Provider; token?: string }) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

export function useStreamingAuth() {
  const [state, setState] = useState<State>({
    isAuthenticated: false,
    provider: null,
    checking: true,
  });

  useEffect(() => {
    const { provider, token } = readStorage();
    setState({ isAuthenticated: Boolean(token), provider, checking: false });
  }, []);

  const reconnect = useCallback(async () => {
    setState((s) => ({ ...s, checking: true, error: undefined }));
    await new Promise((r) => setTimeout(r, 800));
    const current = readStorage();
    // Simulate obtaining a token
    writeStorage({ provider: current.provider ?? "spotify", token: `tok_${Date.now()}` });
    const next = readStorage();
    setState({ isAuthenticated: Boolean(next.token), provider: next.provider, checking: false });
  }, []);

  const refresh = useCallback(async () => {
    setState((s) => ({ ...s, checking: true, error: undefined }));
    await new Promise((r) => setTimeout(r, 400));
    const current = readStorage();
    // Simulate refresh by updating token timestamp
    if (current.token) writeStorage({ provider: current.provider, token: `tok_${Date.now()}` });
    const next = readStorage();
    setState({ isAuthenticated: Boolean(next.token), provider: next.provider, checking: false });
  }, []);

  return { ...state, reconnect, refresh };
}
