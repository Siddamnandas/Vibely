import { track } from "@/lib/analytics";

type InstallChoice = { outcome: "accepted" | "dismissed"; platform?: string };

class AppInstallService {
  private deferredPrompt: any = null;

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("beforeinstallprompt", (e: any) => {
        // Prevent the mini-infobar from appearing
        e.preventDefault();
        this.deferredPrompt = e;
        try {
          track("pwa_install_prompt_available", {} as any);
        } catch {}
      });
    }
  }

  isInstallationSupported(): boolean {
    return typeof window !== "undefined";
  }

  canShowInstallPrompt(): boolean {
    return !!this.deferredPrompt;
  }

  async showInstallPrompt(): Promise<InstallChoice> {
    if (!this.deferredPrompt) {
      return { outcome: "dismissed", platform: "web" };
    }

    try {
      await this.deferredPrompt.prompt();
      const choice: InstallChoice = await this.deferredPrompt.userChoice;
      track(choice.outcome === "accepted" ? "pwa_install_accepted" : "pwa_install_dismissed", {
        platform: choice.platform ?? "web",
        can_install: true,
      } as any);
      this.deferredPrompt = null;
      return choice;
    } catch {
      track("pwa_install_prompt_failed", {} as any);
      return { outcome: "dismissed", platform: "web" };
    }
  }

  isAppInstalled(): boolean {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(display-mode: standalone)").matches;
  }
}

export const appInstallService = new AppInstallService();

