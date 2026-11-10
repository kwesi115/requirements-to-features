import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Stat, Empty } from "@/components/PageHeader";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/events/$id")({
  head: () => ({ meta: [{ title: "Event roster — Hourbook" }, { name: "description", content: "Participants and attendance." }] }),
  component: Roster,
});

function Roster() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["roster", id],
    queryFn: async () => {
      const [{ data: event }, { data: roster }] = await Promise.all([
        supabase.from("events").select("*").eq("id", id).maybeSingle(),
        supabase.rpc("event_roster", { _event: id }),
      ]);
      return { event, roster: roster ?? [] };
    },
  });
  if (!data) return null;
  if (!data.event) return <Empty>Event not found.</Empty>;
  const ev = data.event;
  const started = new Date(ev.starts_at) <= new Date();

  async function mark(regId: string, attended: boolean) {
    const { error } = await supabase.from("event_registrations").update({ attended }).eq("id", regId);
    if (error) { toast.error(error.message); return; }
    if (attended) toast.success("Marked present — a draft hours entry was added to the student's record");
    qc.invalidateQueries({ queryKey: ["roster", id] });
  }

  return (
    <>
      <Link to="/events" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> All events</Link>
      <PageHeader title={ev.title} subtitle={`${format(new Date(ev.starts_at), "EEEE, MMMM d · h:mm a")} · ${ev.location}`} />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Registered" value={`${data.roster.length} / ${ev.capacity}`} />
        <Stat label="Present" value={data.roster.filter((r) => r.attended).length} />
        <Stat label="Hours per attendee" value={Number(ev.duration_hours)} />
      </div>
      {!started && <p className="mb-4 rounded-md bg-muted p-3 text-sm text-muted-foreground">Attendance can be marked once the event has started.</p>}
      {data.roster.length === 0 ? <Empty>No one has registered yet.</Empty> : (
        <div className="rounded-lg border border-border bg-card">
          <Table>
            <TableHeader><TableRow><TableHead>Participant</TableHead><TableHead>Registered</TableHead><TableHead className="text-right">Present</TableHead></TableRow></TableHeader>
            <TableBody>
              {data.roster.map((r) => (
                <TableRow key={r.registration_id}>
                  <TableCell className="font-medium">{r.full_name || "Unnamed student"}</TableCell>
                  <TableCell>{format(new Date(r.registered_at), "MMM d, yyyy")}</TableCell>
                  <TableCell className="text-right">
                    <Checkbox checked={r.attended} disabled={!started || r.attended} onCheckedChange={(v) => mark(r.registration_id, v === true)} aria-label={`Mark ${r.full_name} present`} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
