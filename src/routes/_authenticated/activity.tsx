import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/use-auth";
import { PageHeader, Empty } from "@/components/PageHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/activity")({
  head: () => ({ meta: [{ title: "Activity log — Hourbook" }, { name: "description", content: "Permanent record of verification decisions." }] }),
  component: Activity,
});

function Activity() {
  const { data: me } = useMe();
  const { data = [] } = useQuery({
    queryKey: ["activity"],
    enabled: me?.role === "admin",
    queryFn: async () => {
      const { data: logs } = await supabase.from("verification_log").select("*").order("created_at", { ascending: false }).limit(500);
      const ids = [...new Set((logs ?? []).flatMap((l) => [l.actor_id, l.student_id]).filter(Boolean) as string[])];
      const { data: profiles } = ids.length ? await supabase.from("profiles").select("id,full_name").in("id", ids) : { data: [] };
      const n = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
      return (logs ?? []).map((l) => ({ ...l, actor: (l.actor_id && n.get(l.actor_id)) || "System", student: n.get(l.student_id) || "—" }));
    },
  });
  if (me && me.role !== "admin") return <Empty>Only admins can view the activity log.</Empty>;
  return (
    <>
      <PageHeader title="Verification activity log" subtitle="A permanent, read-only record of every submission and decision. Entries cannot be edited or deleted." />
      {data.length === 0 ? <Empty>No activity yet.</Empty> : (
        <div className="rounded-lg border border-border bg-card">
          <Table>
            <TableHeader><TableRow><TableHead>When</TableHead><TableHead>Actor</TableHead><TableHead>Action</TableHead><TableHead>Student</TableHead><TableHead>Reason</TableHead></TableRow></TableHeader>
            <TableBody>
              {data.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="whitespace-nowrap">{format(new Date(l.created_at), "MMM d, yyyy h:mm a")}</TableCell>
                  <TableCell>{l.actor}</TableCell>
                  <TableCell className="font-semibold capitalize">{l.action}</TableCell>
                  <TableCell>{l.student}</TableCell>
                  <TableCell className="max-w-xs text-muted-foreground">{l.reason || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
