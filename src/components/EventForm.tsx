import { toast } from "sonner";
import { z } from "zod";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Tables } from "@/integrations/supabase/types";
import { useState } from "react";

export const eventSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(150),
  organization: z.string().trim().min(1, "Organization is required").max(150),
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
  location: z.string().trim().min(1, "Location is required").max(200),
  description: z.string().trim().max(4000),
  duration_hours: z.coerce.number().gt(0, "Duration must be more than 0").max(24),
  capacity: z.coerce.number().int("Capacity must be a whole number").min(1, "Capacity must be at least 1").max(10000),
}).refine((v) => new Date(`${v.date}T${v.time}`) > new Date(), { message: "Event must be in the future", path: ["date"] });

export function EventForm({ event, defaultOrg, registered = 0, onDone }: { event?: Tables<"events"> | undefined; defaultOrg: string; registered?: number; onDone: () => void }) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const start = event ? new Date(event.starts_at) : null;

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget));
    const parsed = eventSchema.safeParse(f);
    const errs: Record<string, string> = {};
    if (!parsed.success) parsed.error.issues.forEach((i) => (errs[String(i.path[0])] = i.message));
    else if (parsed.data.capacity < registered) errs["capacity"] = `Capacity can't be below the ${registered} people already registered`;
    setErrors(errs);
    if (!parsed.success || Object.keys(errs).length) return;
    const { date, time, ...rest } = parsed.data;
    const payload = { ...rest, starts_at: new Date(`${date}T${time}`).toISOString() };
    setBusy(true);
    const { error } = event ? await supabase.from("events").update(payload).eq("id", event.id) : await supabase.from("events").insert(payload);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(event ? (event.status === "published" ? "Saved — registered participants were notified" : "Event saved") : "Draft event created");
    onDone();
  }
  const err = (k: string) => errors[k] && <p className="mt-1 text-xs text-destructive">{errors[k]}</p>;
  return (
    <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2"><Label htmlFor="title">Title *</Label><Input id="title" name="title" defaultValue={event?.title} maxLength={150} />{err("title")}</div>
      <div className="sm:col-span-2"><Label htmlFor="organization">Organization *</Label><Input id="organization" name="organization" defaultValue={event?.organization ?? defaultOrg} maxLength={150} />{err("organization")}</div>
      <div><Label htmlFor="date">Date *</Label><Input id="date" name="date" type="date" min={format(new Date(), "yyyy-MM-dd")} defaultValue={start ? format(start, "yyyy-MM-dd") : ""} />{err("date")}</div>
      <div><Label htmlFor="time">Start time *</Label><Input id="time" name="time" type="time" defaultValue={start ? format(start, "HH:mm") : "09:00"} />{err("time")}</div>
      <div><Label htmlFor="duration_hours">Duration (hours) *</Label><Input id="duration_hours" name="duration_hours" type="number" step="0.25" min="0.25" max="24" defaultValue={event?.duration_hours ?? 2} />{err("duration_hours")}</div>
      <div><Label htmlFor="capacity">Capacity *</Label><Input id="capacity" name="capacity" type="number" min={Math.max(1, registered)} max="10000" defaultValue={event?.capacity ?? 20} />{err("capacity")}</div>
      <div className="sm:col-span-2"><Label htmlFor="location">Location *</Label><Input id="location" name="location" defaultValue={event?.location} maxLength={200} />{err("location")}</div>
      <div className="sm:col-span-2"><Label htmlFor="description">Description</Label><Textarea id="description" name="description" rows={4} defaultValue={event?.description} maxLength={4000} /></div>
      <div className="flex justify-end sm:col-span-2"><Button type="submit" disabled={busy}>{event ? "Save changes" : "Create draft"}</Button></div>
    </form>
  );
}
