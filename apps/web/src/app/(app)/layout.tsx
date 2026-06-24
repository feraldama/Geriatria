import { AppShell } from "@/components/app-shell";

// Layout del área autenticada. El middleware ya garantiza que haya sesión.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
