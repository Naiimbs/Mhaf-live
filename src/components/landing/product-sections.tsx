import Link from "next/link";
import { ArrowRight, CalendarCheck2, Link2, Video } from "lucide-react";
import { Button } from "@/components/ui/button";

const meetingTypes = [
  {
    number: "01",
    icon: CalendarCheck2,
    title: "Let guests book a slot",
    description: "Set your availability and share a booking page. A confirmed appointment appears on your calendar with its own meeting room.",
    tag: "Booking + meeting",
  },
  {
    number: "02",
    icon: Link2,
    title: "Schedule directly",
    description: "Choose a time in your host workspace and create a meeting link without asking anyone to book through a public schedule.",
    tag: "Meeting, no booking",
  },
  {
    number: "03",
    icon: Video,
    title: "Start an instant call",
    description: "Create a room when you are ready to meet. Share the room link with the people you want to invite.",
    tag: "Instant meeting",
  },
];

export function ProductSections() {
  return (
    <>
      <section id="workflow" className="border-y border-border bg-muted/20 py-20 sm:py-24">
        <div className="container max-w-7xl px-4 sm:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">A simpler meeting workflow</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Bookings and meetings, together.</h2>
            <p className="mt-4 text-sm leading-6 text-muted-foreground sm:text-base">Choose the path that fits the conversation. Each event lives in the host workspace; guests only need the link you share with them.</p>
          </div>
          <div id="meeting-types" className="mt-12 grid gap-4 md:grid-cols-3">
            {meetingTypes.map(({ number, icon: Icon, title, description, tag }) => (
              <article key={number} className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-transform hover:-translate-y-0.5">
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div>
                  <span className="font-mono text-xs text-muted-foreground">{number}</span>
                </div>
                <h3 className="mt-6 text-lg font-semibold tracking-tight">{title}</h3>
                <p className="mt-2 min-h-[72px] text-sm leading-6 text-muted-foreground">{description}</p>
                <span className="mt-5 inline-flex rounded-full border border-border bg-muted/50 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">{tag}</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-24">
        <div className="container max-w-7xl px-4 sm:px-8">
          <div className="grid items-center gap-10 rounded-3xl border border-border bg-card p-7 shadow-sm sm:p-10 lg:grid-cols-[1fr_auto] lg:p-12">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Built around your calendar</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">One clear place to plan the next conversation.</h2>
              <p className="mt-4 text-sm leading-6 text-muted-foreground sm:text-base">See confirmed bookings and host-created meetings together, keep your availability in view, and open a room from the event when it is time to meet.</p>
            </div>
            <Button size="lg" asChild className="gap-2">
              <Link href="/register">Get started <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
