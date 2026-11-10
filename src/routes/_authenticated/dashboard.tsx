import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/use-auth";
import { PageHeader, Stat } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { loggedTotal, verifiedTotal, type EntryStatus } from "@/lib/roles";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Overview — Hourbook" }, { name: "description", content: "Your Hourbook overview." }] }),
  component: Dashboard,
});

function Dashboard() {
  const { data: me } = useMe();
  const role = me?.role;
  const { data } = useQuery({
    queryKey: ["overview", role],
    enabled: !!role,
    queryFn: async () => {
      if (role === "student") {
        const { data } = await supabase.from("volunteer_entries").select("hours,status");
        const rows = (data ?? []) as { hours: number; status: EntryStatus }[];
        return { a: verifiedTotal(rows), b: loggedTotal(rows), c: rows.filter((r) => r.status === "pending").length, d: rows.filter((r) => r.status === "rejected" || r.status === "flagged").length };
      }
      if (role === "admin") {
        const [p, f, v] = await Promise.all([
          supabase.from("volunteer_entries").select("id", { count: "exact", head: true }).eq("status", "pending"),
          supabase.from("volunteer_entries").select("id", { count: "exact", head: true }).eq("status", "flagged"),
          supabase.from("volunteer_entries").select("id", { count: "exact", head: true }).eq("status", "verified"),
        ]);
        return { a: p.count ?? 0, b: f.count ?? 0, c: v.count ?? 0, d: 0 };
      }
      if (role === "recruiter") {
        const { data } = await supabase.rpc("search_students", {});
        return { a: data?.length ?? 0, b: (data ?? []).reduce((s, r) => s + Number(r.verified_hours), 0), c: 0, d: 0 };
      }
      const { data } = await supabase.from("events").select("status");
      const rows = data ?? [];
      return { a: rows.filter((r) => r.status === "published").length, b: rows.filter((r) => r.status === "draft").length, c: rows.filter((r) => r.status === "cancelled").length, d: 0 };
    },
  });
  const name = me?.profile?.full_name?.split(" ")[0] || "there";

  return (
    <>
      <PageHeader title={`Hello, ${name}`} subtitle="Here's where things stand today." />
      {role === "student" && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Verified hours" value={data?.a ?? "—"} />
            <Stat label="Logged hours" value={data?.b ?? "—"} hint="Excludes drafts" />
            <Stat label="Awaiting review" value={data?.c ?? "—"} />
            <Stat label="Needs your attention" value={data?.d ?? "—"} hint="Rejected or flagged" />
          </div>
          <div className="mt-8 flex flex-wrap gap-3"><Button asChild><Link to="/hours">Log hours</Link></Button><Button asChild variant="outline"><Link to="/events">Find events</Link></Button></div>
        </>
      )}
      {role === "admin" && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Pending review" value={data?.a ?? "—"} />
            <Stat label="Flagged" value={data?.b ?? "—"} />
            <Stat label="Verified entries" value={data?.c ?? "—"} />
          </div>
          <div className="mt-8"><Button asChild><Link to="/review">Open review queue</Link></Button></div>
        </>
      )}
      {role === "recruiter" && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Stat label="Discoverable students" value={data?.a ?? "—"} />
            <Stat label="Verified hours across them" value={data?.b ?? "—"} />
          </div>
          <div className="mt-8"><Button asChild><Link to="/discover">Search students</Link></Button></div>
        </>
      )}
      {role === "org_leader" && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Published events" value={data?.a ?? "—"} />
            <Stat label="Drafts" value={data?.b ?? "—"} />
            <Stat label="Cancelled" value={data?.c ?? "—"} />
          </div>
          <div className="mt-8"><Button asChild><Link to="/events">Manage events</Link></Button></div>
        </>
      )}
    </>
  );
}
