import AppShell from "@/components/layout/app-shell";

export default function AppPagesLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
