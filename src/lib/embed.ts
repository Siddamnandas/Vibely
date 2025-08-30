export function isEmbedded(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.self !== window.top;
  } catch {
    // Accessing window.top can throw in some sandboxed contexts
    return true;
  }
}

export function isVSCodeWebview(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname || "";
  return host.endsWith(".vscode-webview.net") || window.location.protocol === "vscode-webview:";
}

