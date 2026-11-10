import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

export function EntryLog({ entryId }: { entryId: string }) {
  const { data = [] } = useQuery({
    queryKey: ["log", entryId],
    queryFn: async () => (await supabase.from("verification_log").select("*").eq("entry_id", entryId).order("created_at")).data ?? [],
  });
  if (!data.length) return <p className="text-sm text-muted-foreground">No activity yet.</p>;
  return (
    <ol className="space-y-2 border-l-2 border-border pl-4">
      {data.map((l) => (
        <li key={l.id} className="text-sm">
          <span className="font-semibold capitalize text-foreground">{l.action}</span>
          <span className="text-muted-foreground"> · {format(new Date(l.created_at), "MMM d, yyyy h:mm a")}</span>
          {l.reason && <div className="text-muted-foreground">“{l.reason}”</div>}
        </li>
      ))}
    </ol>
  );
}

export async function openEvidence(path: string) {
  const { data, error } = await supabase.storage.from("evidence").createSignedUrl(path, 300);
  if (error || !data) return alert("Could not open evidence");
  window.open(data.signedUrl, "_blank", "noopener");
}
