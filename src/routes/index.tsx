import { createFileRoute, Link } from "@tanstack/react-router";
import { BadgeCheck, CalendarDays, ClipboardCheck, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hourbook — Volunteer hours, verified" },
      { name: "description", content: "Students log volunteer hours, admins verify them, recruiters discover proven community experience, and organizations run events." },
      { property: "og:title", content: "Hourbook — Volunteer hours, verified" },
      { property: "og:description", content: "Log, verify and showcase student volunteer hours. Run community events with built-in sign-up and attendance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const roles = [
  { icon: ClipboardCheck, name: "Students", text: "Log hours with evidence, track verification status, and build a profile recruiters can trust." },
  { icon: BadgeCheck, name: "Admins", text: "Work through a review queue, approve, reject or flag with a reason — every decision is logged." },
  { icon: Search, name: "Recruiters", text: "Find opted-in students by verified hours, causes, skills and organization type." },
  { icon: CalendarDays, name: "Organization Leaders", text: "Publish events, cap registrations, take attendance and turn it into hours drafts." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="font-display text-2xl font-semibold text-primary">Hourbook</span>
        <Button asChild variant="outline"><Link to="/auth">Sign in</Link></Button>
      </header>
      <main className="mx-auto max-w-6xl px-6">
        <section className="grid gap-10 py-16 md:grid-cols-[1.3fr_1fr] md:py-24">
          <div>
            <p className="mb-4 inline-block rounded-full bg-accent px-3 py-1 text-xs font-bold uppercase tracking-widest text-accent-foreground">Community service, on the record</p>
            <h1 className="text-5xl font-semibold leading-[1.05] text-foreground md:text-7xl">Every hour you give, <em className="text-primary">verified.</em></h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground">Hourbook keeps a trustworthy record of student volunteer work — from the first sign-up to the verified total a recruiter sees.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg"><Link to="/auth">Get started</Link></Button>
            </div>
          </div>
          <div className="relative rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Verified hours</div>
            <div className="font-display text-7xl font-semibold text-primary">128.5</div>
            <div className="mt-6 space-y-3 text-sm">
              {[["Food Bank Shift", "4 hrs", "Verified"], ["River Cleanup", "3 hrs", "Pending"], ["Reading Buddies", "2 hrs", "Verified"]].map(([a, b, c]) => (
                <div key={a} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
                  <span className="font-medium text-foreground">{a}</span>
                  <span className="text-muted-foreground">{b} · <span className={c === "Verified" ? "text-success" : "text-warning-foreground"}>{c}</span></span>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="grid gap-4 pb-24 sm:grid-cols-2 lg:grid-cols-4">
          {roles.map((r) => (
            <div key={r.name} className="rounded-lg border border-border bg-card p-6">
              <r.icon className="h-6 w-6 text-primary" aria-hidden />
              <h2 className="mt-4 text-xl font-semibold text-foreground">{r.name}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{r.text}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
