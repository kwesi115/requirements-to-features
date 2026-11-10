import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Empty } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Hourbook" }, { name: "description", content: "Review decisions and event updates." }] }),
  component: Notifications,
});

function Notifications() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => (await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(200)).data ?? [],
  });
  async function markAll() {
    await supabase.from("notifications").update({ read: true }).eq("read", false);
    qc.invalidateQueries({ queryKey: ["notifications"] });
  }
  async function markOne(id: string) {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["notifications"] });
  }
  return (
    <>
      <PageHeader title="Notifications" subtitle="Review decisions and changes to events you've registered for." action={<Button variant="outline" onClick={markAll}>Mark all read</Button>} />
      {data.length === 0 ? <Empty>No notifications yet.</Empty> : (
        <ul className="space-y-2">
          {data.map((n) => (
            <li key={n.id} className={`flex items-start gap-4 rounded-lg border p-4 ${n.read ? "border-border bg-card" : "border-primary/40 bg-secondary"}`}>
              <div className="flex-1">
                <div className="font-semibold text-foreground">{n.title}</div>
                <div className="text-sm text-muted-foreground">{n.body}</div>
                <div className="mt-1 text-xs text-muted-foreground">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</div>
              </div>
              {n.link && <Button asChild size="sm" variant="ghost" onClick={() => markOne(n.id)}><Link to={n.link}>Open</Link></Button>}
              {!n.read && <Button size="sm" variant="ghost" onClick={() => markOne(n.id)}>Mark read</Button>}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
