import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { CalendarDays, MapPin, Plus, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/use-auth";
import { PageHeader, Empty } from "@/components/PageHeader";
import { EventForm } from "@/components/EventForm";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { spotsLeft } from "@/lib/roles";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/events/")({
  head: () => ({ meta: [{ title: "Events — Hourbook" }, { name: "description", content: "Browse and manage volunteer events." }] }),
  component: Events,
});

type Ev = Tables<"events">;

function useEvents() {
  return useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const [{ data: events }, { data: counts }, { data: regs }] = await Promise.all([
        supabase.from("events").select("*").order("starts_at"),
        supabase.rpc("event_counts"),
        supabase.from("event_registrations").select("event_id,attended"),
      ]);
      const c = new Map((counts ?? []).map((r) => [r.event_id, Number(r.registered)]));
      const mine = new Map((regs ?? []).map((r) => [r.event_id, r.attended]));
      return (events ?? []).map((e) => ({ ...e, registered: c.get(e.id) ?? 0, mine: mine.has(e.id), attended: mine.get(e.id) ?? false }));
    },
  });
}

function EventMeta({ e }: { e: Ev & { registered: number } }) {
  return (
    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
      <span className="inline-flex items-center gap-1"><CalendarDays className="h-4 w-4" />{format(new Date(e.starts_at), "EEE, MMM d · h:mm a")} · {Number(e.duration_hours)} hrs</span>
      <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" />{e.location}</span>
      <span className="inline-flex items-center gap-1"><Users className="h-4 w-4" />{e.registered}/{e.capacity} registered</span>
    </div>
  );
}

function Events() {
  const { data: me } = useMe();
  if (!me) return null;
  return me.role === "org_leader" ? <LeaderEvents orgName={me.profile?.organization_name ?? ""} /> : <StudentEvents canRegister={me.role === "student"} />;
}

function StudentEvents({ canRegister }: { canRegister: boolean }) {
  const qc = useQueryClient();
  const { data = [] } = useEvents();
  const now = new Date();
  const upcoming = data.filter((e) => e.status === "published" && new Date(e.starts_at) > now);
  const mine = data.filter((e) => e.mine);

  async function register(id: string) {
    const { error } = await supabase.from("event_registrations").insert({ event_id: id });
    if (error) return toast.error(error.message.includes("full") ? "Sorry, this event is full." : error.message);
    toast.success("You're registered");
    qc.invalidateQueries({ queryKey: ["events"] });
  }
  async function unregister(id: string) {
    const { error } = await supabase.from("event_registrations").delete().eq("event_id", id);
    if (error) return toast.error(error.message);
    toast.success("Registration cancelled");
    qc.invalidateQueries({ queryKey: ["events"] });
  }

  return (
    <>
      <PageHeader title="Volunteer events" subtitle="Sign up for upcoming opportunities. Attended events become draft hours in your record." />
      <Tabs defaultValue="browse">
        <TabsList><TabsTrigger value="browse">Upcoming</TabsTrigger><TabsTrigger value="mine">My registrations ({mine.length})</TabsTrigger></TabsList>
        <TabsContent value="browse" className="mt-6 grid gap-4 md:grid-cols-2">
          {upcoming.length === 0 ? <div className="md:col-span-2"><Empty>No upcoming events right now.</Empty></div> : upcoming.map((e) => {
            const left = spotsLeft(e.capacity, e.registered);
            return (
              <article key={e.id} className="flex flex-col rounded-lg border border-border bg-card p-5">
                <div className="text-xs font-semibold uppercase tracking-wider text-primary">{e.organization}</div>
                <h3 className="mt-1 text-xl font-semibold text-foreground">{e.title}</h3>
                <EventMeta e={e} />
                {e.description && <p className="mt-3 line-clamp-3 text-sm">{e.description}</p>}
                <div className="mt-auto flex items-center justify-between pt-4">
                  <span className={`text-sm font-semibold ${left === 0 ? "text-destructive" : "text-success"}`}>{left === 0 ? "Full" : `${left} spots left`}</span>
                  {canRegister && (e.mine
                    ? <Button variant="outline" onClick={() => unregister(e.id)}>Cancel registration</Button>
                    : <Button disabled={left === 0} onClick={() => register(e.id)}>Register</Button>)}
                </div>
              </article>
            );
          })}
        </TabsContent>
        <TabsContent value="mine" className="mt-6 space-y-3">
          {mine.length === 0 ? <Empty>You haven't registered for any events.</Empty> : mine.map((e) => (
            <article key={e.id} className="rounded-lg border border-border bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-lg font-semibold">{e.title}</h3>
                <span className="text-sm font-semibold">{e.status === "cancelled" ? <span className="text-destructive">Cancelled</span> : e.attended ? <span className="text-success">Attended — draft hours ready</span> : "Registered"}</span>
              </div>
              <EventMeta e={e} />
            </article>
          ))}
        </TabsContent>
      </Tabs>
    </>
  );
}

function LeaderEvents({ orgName }: { orgName: string }) {
  const qc = useQueryClient();
  const { data = [] } = useEvents();
  const [editing, setEditing] = useState<(Ev & { registered: number }) | "new" | null>(null);
  const [cancelling, setCancelling] = useState<Ev | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["events"] });

  async function setStatus(e: Ev, status: "published" | "cancelled") {
    const { error } = await supabase.from("events").update({ status }).eq("id", e.id);
    if (error) return toast.error(error.message);
    toast.success(status === "published" ? "Event published" : "Event cancelled — participants notified");
    setCancelling(null);
    refresh();
  }
  async function remove(e: Ev) {
    const { error } = await supabase.from("events").delete().eq("id", e.id);
    if (error) return toast.error(error.message);
    refresh();
  }

  return (
    <>
      <PageHeader title="My events" subtitle="Create drafts, publish when ready, and take attendance afterwards." action={<Button onClick={() => setEditing("new")}><Plus className="mr-1 h-4 w-4" /> New event</Button>} />
      <div className="space-y-3">
        {data.length === 0 ? <Empty>No events yet. Create your first one.</Empty> : data.map((e) => (
          <article key={e.id} className="rounded-lg border border-border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-semibold">{e.title}</h3>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold uppercase ${e.status === "published" ? "bg-success/15 text-success" : e.status === "cancelled" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}>{e.status}</span>
                </div>
                <EventMeta e={e} />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm"><Link to="/events/$id" params={{ id: e.id }}>Roster</Link></Button>
                {e.status !== "cancelled" && <Button variant="outline" size="sm" onClick={() => setEditing(e)}>Edit</Button>}
                {e.status === "draft" && <><Button size="sm" onClick={() => setStatus(e, "published")}>Publish</Button><Button size="sm" variant="ghost" onClick={() => remove(e)}>Delete</Button></>}
                {e.status === "published" && <Button size="sm" variant="destructive" onClick={() => setCancelling(e)}>Cancel event</Button>}
              </div>
            </div>
          </article>
        ))}
      </div>
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing === "new" ? "New event" : "Edit event"}</DialogTitle></DialogHeader>
          {editing && <EventForm event={editing === "new" ? undefined : editing} registered={editing === "new" ? 0 : editing.registered} defaultOrg={orgName} onDone={() => { setEditing(null); refresh(); }} />}
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!cancelling} onOpenChange={(o) => !o && setCancelling(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Cancel “{cancelling?.title}”?</AlertDialogTitle><AlertDialogDescription>Everyone registered will be notified. Cancelled events can't be reopened.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Keep event</AlertDialogCancel><AlertDialogAction onClick={() => cancelling && setStatus(cancelling, "cancelled")}>Cancel event</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
