import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Stat, Empty } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { verifiedTotal } from "@/lib/roles";

export const Route = createFileRoute("/_authenticated/students/$id")({
  head: () => ({ meta: [{ title: "Student experience — Hourbook" }, { name: "description", content: "Verified volunteer history." }] }),
  component: Student,
});

function Student() {
  const { id } = Route.useParams();
  const { data } = useQuery({
    queryKey: ["student", id],
    queryFn: async () => {
      const [{ data: profile }, { data: entries }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
        supabase.from("volunteer_entries").select("*").eq("student_id", id).eq("status", "verified").order("activity_date", { ascending: false }),
      ]);
      return { profile, entries: entries ?? [] };
    },
  });
  if (data && !data.profile) return <Empty>This profile isn't available. The student may have turned off recruiter visibility.</Empty>;
  if (!data) return null;
  const p = data.profile!;
  const orgs = new Set(data.entries.map((e) => e.organization));
  return (
    <>
      <Link to="/discover" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back to search</Link>
      <PageHeader title={p.full_name || "Unnamed student"} subtitle={p.summary || undefined} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Verified hours" value={verifiedTotal(data.entries as never)} />
        <Stat label="Verified entries" value={data.entries.length} />
        <Stat label="Organizations" value={orgs.size} />
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        {p.causes.map((c) => <span key={c} className="rounded-full bg-accent/40 px-3 py-1 text-sm text-accent-foreground">{c}</span>)}
        {p.skills.map((c) => <span key={c} className="rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground">{c}</span>)}
      </div>
      <h2 className="mb-4 mt-10 text-2xl font-semibold">Verified volunteer history</h2>
      {data.entries.length === 0 ? <Empty>No verified experience yet.</Empty> : (
        <ol className="space-y-3">
          {data.entries.map((e) => (
            <li key={e.id} className="rounded-lg border border-border bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-semibold text-foreground">{e.organization} <span className="font-normal text-muted-foreground">· {e.org_type}</span></div>
                <StatusBadge status={e.status} />
              </div>
              <div className="mt-1 text-sm text-muted-foreground">{e.role || "Volunteer"} · {format(new Date(e.activity_date + "T00:00"), "MMM d, yyyy")} · {Number(e.hours)} hrs</div>
              <p className="mt-2 text-sm">{e.description}</p>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
