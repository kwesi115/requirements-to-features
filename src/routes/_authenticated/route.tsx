import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bell, BookOpen, CalendarDays, ClipboardCheck, History, LayoutDashboard, LogOut, Search, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/use-auth";
import { ROLE_LABELS, type AppRole } from "@/lib/roles";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: Layout,
});

type NavItem = { to: string; label: string; icon: typeof Bell };
const NAV: Record<AppRole, NavItem[]> = {
  student: [
    { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { to: "/hours", label: "My hours", icon: BookOpen },
    { to: "/events", label: "Events", icon: CalendarDays },
    { to: "/profile", label: "Profile", icon: UserRound },
  ],
  admin: [
    { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { to: "/review", label: "Review queue", icon: ClipboardCheck },
    { to: "/activity", label: "Activity log", icon: History },
    { to: "/profile", label: "Profile", icon: UserRound },
  ],
  recruiter: [
    { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { to: "/discover", label: "Discover students", icon: Search },
    { to: "/profile", label: "Profile", icon: UserRound },
  ],
  org_leader: [
    { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { to: "/events", label: "My events", icon: CalendarDays },
    { to: "/profile", label: "Profile", icon: UserRound },
  ],
};

function Layout() {
  const { data: me } = useMe();
  const navigate = useNavigate();
  const { data: unread = 0 } = useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: async () => {
      const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("read", false);
      return count ?? 0;
    },
    refetchInterval: 30000,
  });
  const role = me?.role ?? "student";
  const items = [...NAV[role], { to: "/notifications", label: "Notifications", icon: Bell }];

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="flex shrink-0 flex-col bg-sidebar text-sidebar-foreground md:sticky md:top-0 md:h-screen md:w-64">
        <div className="px-6 py-6">
          <Link to="/dashboard" className="font-display text-2xl font-semibold text-sidebar-primary">Hourbook</Link>
          {me && <div className="mt-1 text-xs uppercase tracking-wider opacity-70">{ROLE_LABELS[role]}</div>}
        </div>
        <nav className="flex flex-1 gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-visible">
          {items.map((i) => (
            <Link
              key={i.to}
              to={i.to}
              className="flex items-center gap-3 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium opacity-85 transition hover:bg-sidebar-accent hover:opacity-100"
              activeProps={{ className: "bg-sidebar-accent !opacity-100 text-sidebar-accent-foreground" }}
            >
              <i.icon className="h-4 w-4" aria-hidden />
              {i.label}
              {i.to === "/notifications" && unread > 0 && (
                <span className="ml-auto rounded-full bg-sidebar-primary px-2 text-xs font-bold text-sidebar-primary-foreground">{unread}</span>
              )}
            </Link>
          ))}
        </nav>
        <div className="hidden border-t border-sidebar-border p-4 md:block">
          <div className="truncate text-sm font-semibold">{me?.profile?.full_name || me?.user.email}</div>
          <div className="truncate text-xs opacity-60">{me?.user.email}</div>
          <button
            onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/auth" }); }}
            className="mt-3 flex items-center gap-2 text-sm opacity-80 hover:opacity-100"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 px-5 py-8 md:px-10 md:py-10">
        <div className="mx-auto max-w-6xl"><Outlet /></div>
      </main>
    </div>
  );
}
